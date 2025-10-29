'use server'

import { createHash } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'

import * as unzipper from 'unzipper'
import { Prisma, UploadKind, UploadStatus } from '@prisma/client'

import { db } from '@/lib/db'
import {
  downloadSupabaseObject,
  getSupabaseUploadsBucketName,
  uploadSupabaseObject,
} from '@/lib/storage'

export const MOCK_STORAGE_PREFIX = 'mock://'
export const CHUNKED_STORAGE_PREFIX = 'chunked://'
const CHUNK_MANIFEST_VERSION = 1
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

async function writeMockStorageFile(storageKey: string, payload: Buffer): Promise<void> {
  const filePath = await resolveMockStoragePath(storageKey)
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, payload)
}

function shouldFallbackToMockStorage(error: Error): boolean {
  const message = error.message?.toLowerCase() ?? ''
  return (
    message.includes('maximum allowed size') ||
    message.includes('exceeded the maximum allowed size') ||
    message.includes('payload too large') ||
    message.includes('request entity too large') ||
    message.includes('bucket not found') ||
    message.includes('fetch failed')
  )
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

  const isMockStorage = upload.storageKey?.startsWith(MOCK_STORAGE_PREFIX) ?? false

  try {
    const payload = await loadUploadBuffer(upload.storageKey ?? null)
    const downloadUrl = await resolveUploadDownloadUrl({
      id: upload.id,
      storageKey: upload.storageKey,
      url: upload.url,
      filename: upload.filename,
      originalName: upload.originalName,
    })

    const extractedRecords: Prisma.ExtractedFileCreateManyInput[] = []

    if (upload.kind === UploadKind.zip) {
      const directory = await unzipper.Open.buffer(payload)
      const entries = directory.files.filter((entry) => entry.type !== 'Directory')
      const limitedEntries = entries.slice(0, MAX_ZIP_ENTRIES)

      if (entries.length > MAX_ZIP_ENTRIES) {
        console.warn(
          `[uploads] zip entries truncated for upload ${upload.id}: ${entries.length} -> ${MAX_ZIP_ENTRIES}`,
        )
      }

      if (limitedEntries.length > 0) {
        const bucket = getSupabaseUploadsBucketName()

        for (const entry of limitedEntries) {
          const filename = entry.path.split('/').filter(Boolean).pop() ?? entry.path
          const ext = filename.split('.').pop()?.toLowerCase() ?? ''
          const isPdf = ext === 'pdf'
          const metadata: Record<string, unknown> = {
            path: entry.path,
            size:
              typeof entry.uncompressedSize === 'number'
                ? entry.uncompressedSize
                : null,
            type: entry.type,
          }

          let docHash: string
          let storageKey: string | null = null
          let storageBucket: string | null = null

          if (isPdf) {
            const pdfBuffer = await entry.buffer()
            docHash = createHash('sha256').update(pdfBuffer).digest('hex')
            const objectKey = [
              'tenders',
              upload.tenderId,
              'extracted',
              upload.id,
              `${docHash}.pdf`,
            ]
              .filter(Boolean)
              .join('/')

            try {
              await uploadSupabaseObject(bucket, objectKey, pdfBuffer, {
                contentType: 'application/pdf',
                cacheControl: '86400',
              })

              storageKey = objectKey
              storageBucket = bucket
              metadata.size = pdfBuffer.length
              metadata.mimeType = 'application/pdf'
            } catch (error) {
              if (
                error instanceof Error &&
                (isMockStorage || shouldFallbackToMockStorage(error))
              ) {
                console.warn(
                  `[uploads] Supabase upload failed for ${upload.id}, falling back to mock storage`,
                  {
                    entry: entry.path,
                    message: error.message,
                  },
                )

                const fallbackKey = `${MOCK_STORAGE_PREFIX}${upload.id}/${docHash}.pdf`
                await writeMockStorageFile(fallbackKey, pdfBuffer)

                storageKey = fallbackKey
                storageBucket = null
                metadata.size = pdfBuffer.length
                metadata.mimeType = 'application/pdf'
                metadata.storageFallback = 'mock'
              } else {
                throw error
              }
            }
          } else {
            const hashSource = `${upload.id}:${entry.path}:${entry.uncompressedSize ?? ''}`
            docHash = createHash('sha256').update(hashSource).digest('hex')
          }

          metadata.docHash = docHash
          if (storageKey) {
            metadata.storageKey = storageKey
            metadata.storageBucket = storageBucket
          }

          extractedRecords.push({
            filename,
            page: null,
            content: null,
            metadata: metadata as Prisma.InputJsonValue,
            tenderId: upload.tenderId,
            uploadId: upload.id,
            docHash,
            storageBucket,
            storageKey,
          })
        }
      }
    } else {
      const bucket = upload.storageKey?.startsWith(MOCK_STORAGE_PREFIX)
        ? null
        : getSupabaseUploadsBucketName()
      const docHash = createHash('sha256').update(payload).digest('hex')
      const metadata: Record<string, unknown> = {
        size: upload.size,
        mimeType: upload.mimeType,
        kind: upload.kind,
        docHash,
      }
      if (upload.storageKey) {
        metadata.storageKey = upload.storageKey
      }
      if (bucket) {
        metadata.storageBucket = bucket
      }

      extractedRecords.push({
        filename: upload.originalName,
        page: null,
        content: null,
        metadata: metadata as Prisma.InputJsonValue,
        tenderId: upload.tenderId,
        uploadId: upload.id,
        docHash,
        storageBucket: bucket,
        storageKey: upload.storageKey ?? null,
      })
    }

    await db.$transaction(async (tx) => {
      await tx.extractedFile.deleteMany({
        where: { uploadId: upload.id },
      })

      if (extractedRecords.length > 0) {
        await tx.extractedFile.createMany({
          data: extractedRecords,
          skipDuplicates: true,
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
