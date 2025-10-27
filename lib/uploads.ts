'use server'

import { readFile } from 'fs/promises'
import { join } from 'path'

import * as unzipper from 'unzipper'
import { Prisma, UploadKind, UploadStatus } from '@prisma/client'

import { db } from '@/lib/db'
import { downloadSupabaseObject, getSupabaseUploadsBucketName } from '@/lib/storage'

const MOCK_STORAGE_PREFIX = 'mock://'
const MAX_ZIP_ENTRIES = 2000
const DEFAULT_STORED_FILENAME = 'original.bin'

function parseMockStorageKey(storageKey: string): { uploadId: string; filename: string } {
  const withoutPrefix = storageKey.slice(MOCK_STORAGE_PREFIX.length)
  const [uploadId, ...rest] = withoutPrefix.split('/')

  if (!uploadId) {
    throw new Error(`Invalid mock storage key: ${storageKey}`)
  }

  const filename = rest.join('/') || DEFAULT_STORED_FILENAME
  return { uploadId, filename }
}

async function resolveMockStoragePath(storageKey: string): Promise<string> {
  const { uploadId, filename } = parseMockStorageKey(storageKey)
  return join(process.cwd(), '.uploads', uploadId, filename)
}

export async function resolveUploadDownloadUrl(params: {
  id: string
  storageKey: string | null | undefined
  url?: string | null | undefined
  filename?: string | null | undefined
  originalName?: string | null | undefined
}): Promise<string | null> {
  if (params.url) {
    return params.url
  }

  const storageKey = params.storageKey
  if (!storageKey) {
    return null
  }

  if (storageKey.startsWith(MOCK_STORAGE_PREFIX)) {
    const { uploadId, filename } = parseMockStorageKey(storageKey)
    const effectiveFilename =
      filename || params.filename || params.originalName || DEFAULT_STORED_FILENAME
    const effectiveUploadId = uploadId || params.id
    return `/api/uploads/mock-storage/${effectiveUploadId}?filename=${encodeURIComponent(
      effectiveFilename,
    )}`
  }

  return null
}

export async function loadUploadBuffer(
  storageKey: string | null,
  options: { bucket?: string } = {},
): Promise<Buffer> {
  if (!storageKey) {
    throw new Error('Upload is missing storageKey')
  }

  if (storageKey.startsWith(MOCK_STORAGE_PREFIX)) {
    const filePath = await resolveMockStoragePath(storageKey)
    return readFile(filePath)
  }

  const bucketName = options.bucket ?? getSupabaseUploadsBucketName()
  return downloadSupabaseObject(bucketName, storageKey)
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
      filename: true,
      url: true,
      tenderId: true,
    },
  })

  if (!upload) {
    console.warn(`[uploads] ingestion skipped: upload ${uploadId} not found`)
    return
  }

  try {
    const payload = await loadUploadBuffer(upload.storageKey ?? null)
    const downloadUrl = await resolveUploadDownloadUrl({
      id: upload.id,
      storageKey: upload.storageKey,
      url: upload.url,
      filename: upload.filename,
      originalName: upload.originalName,
    })

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
          url: downloadUrl,
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
