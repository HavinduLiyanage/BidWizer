'use server'

import { readFile } from 'fs/promises'
import { join } from 'path'

import * as unzipper from 'unzipper'
import { Prisma, UploadKind, UploadStatus } from '@prisma/client'

import { db } from '@/lib/db'
import { createSupabaseServiceClient } from '@/lib/storage'
import { readEnvVar } from '@/lib/env'

const MOCK_STORAGE_PREFIX = 'mock://'
const DEFAULT_BUCKET_NAME = 'tender-uploads'
const MAX_ZIP_ENTRIES = 2000

function getSupabaseBucketName(): string {
  return (
    readEnvVar('SUPABASE_TENDER_UPLOADS_BUCKET') ??
    readEnvVar('SUPABASE_STORAGE_UPLOADS_BUCKET') ??
    DEFAULT_BUCKET_NAME
  )
}

function resolveMockStoragePath(storageKey: string): string {
  const withoutPrefix = storageKey.slice(MOCK_STORAGE_PREFIX.length)
  const [uploadId, ...rest] = withoutPrefix.split('/')

  if (!uploadId) {
    throw new Error(`Invalid mock storage key: ${storageKey}`)
  }

  const filename = rest.join('/') || 'original.bin'
  return join(process.cwd(), '.uploads', uploadId, filename)
}

async function loadUploadBuffer(storageKey: string | null): Promise<Buffer> {
  if (!storageKey) {
    throw new Error('Upload is missing storageKey')
  }

  if (storageKey.startsWith(MOCK_STORAGE_PREFIX)) {
    const filePath = resolveMockStoragePath(storageKey)
    return readFile(filePath)
  }

  const supabaseUrl = readEnvVar('SUPABASE_URL')
  const supabaseServiceRole = readEnvVar('SUPABASE_SERVICE_ROLE')

  if (!supabaseUrl || !supabaseServiceRole) {
    throw new Error('Supabase storage variables are not configured')
  }

  const bucketName = getSupabaseBucketName()
  const supabaseClient = createSupabaseServiceClient()
  const { data, error } = await supabaseClient.storage.from(bucketName).download(storageKey)

  if (error || !data) {
    throw new Error(`Failed to download upload payload: ${error?.message ?? 'unknown error'}`)
  }

  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function triggerUploadIngestion(uploadId: string): Promise<void> {
  if (!uploadId) {
    throw new Error('uploadId is required to trigger ingestion')
  }

  const upload = await db.upload.findUnique({
    where: { id: uploadId },
    select: {
      id: true,
      kind: true,
      storageKey: true,
      size: true,
      mimeType: true,
      originalName: true,
      tenderId: true,
    },
  })

  if (!upload) {
    console.warn(`[uploads] ingestion skipped: upload ${uploadId} not found`)
    return
  }

  try {
    const payload = await loadUploadBuffer(upload.storageKey ?? null)

    await db.$transaction(async (tx) => {
      await tx.extractedFile.deleteMany({
        where: { uploadId: upload.id },
      })

      if (upload.kind === UploadKind.zip) {
        const directory = await unzipper.Open.buffer(payload)
        const entries = directory.files.filter((entry) => entry.type !== 'Directory')
        const limitedEntries = entries.slice(0, MAX_ZIP_ENTRIES)

        if (entries.length > MAX_ZIP_ENTRIES) {
          console.warn(
            `[uploads] zip entries truncated for upload ${upload.id}: ${entries.length} -> ${MAX_ZIP_ENTRIES}`
          )
        }

        if (limitedEntries.length > 0) {
          await tx.extractedFile.createMany({
            data: limitedEntries.map((entry) => ({
              filename: entry.path.split('/').filter(Boolean).pop() ?? entry.path,
              page: null,
              content: null,
              metadata: {
                path: entry.path,
                size:
                  typeof entry.uncompressedSize === 'number'
                    ? entry.uncompressedSize
                    : null,
                type: entry.type,
              } as Prisma.InputJsonValue,
              tenderId: upload.tenderId,
              uploadId: upload.id,
            })),
          })
        }
      } else {
        await tx.extractedFile.create({
          data: {
            filename: upload.originalName,
            page: null,
            content: null,
            metadata: {
              size: upload.size,
              mimeType: upload.mimeType,
              kind: upload.kind,
            } as Prisma.InputJsonValue,
            tenderId: upload.tenderId,
            uploadId: upload.id,
          },
        })
      }

      await tx.upload.update({
        where: { id: upload.id },
        data: {
          status: UploadStatus.COMPLETED,
          error: null,
        },
      })
    })
  } catch (error) {
    console.error(`[uploads] ingestion failed for ${uploadId}:`, error)

    await db.upload.update({
      where: { id: uploadId },
      data: {
        status: UploadStatus.FAILED,
        error: error instanceof Error ? error.message : 'Ingestion failed',
      },
    })
  }
}
