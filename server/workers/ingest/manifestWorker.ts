import { UploadKind, UploadStatus, DocStatus, PrismaClient } from '@prisma/client'
import { Worker, type Job } from 'bullmq'
import * as unzipper from 'unzipper'

import { computeDocumentPriority } from '@/lib/ingest/priority'
import { buildDocumentStoragePaths, manifestKey } from '@/lib/ingest/paths'
import { enqueueExtractJob, QUEUE_NAMES } from '@/lib/ingest/queues'
import { probePdf, hashBuffer } from '@/lib/ingest/pdf'
import type { ManifestDocumentRecord, ManifestJobPayload } from '@/lib/ingest/types'
import {
  getSupabaseIndexBucketName,
  putJson,
  uploadSupabaseObject,
} from '@/lib/storage'
import {
  loadUploadBuffer,
  MOCK_STORAGE_PREFIX,
  parseMockStorageKey,
  resolveUploadDownloadUrl,
  shouldFallbackToMockStorage,
  writeMockStorageFile,
} from '@/lib/uploads'
import { createRedisConnection } from '@/lib/redis'

const MAX_ZIP_ENTRIES = 2000
const INDEX_BUCKET = getSupabaseIndexBucketName()

const prisma = new PrismaClient()

export function startManifestWorker(): Worker<ManifestJobPayload> {
  return new Worker<ManifestJobPayload>(
    QUEUE_NAMES.manifest,
    async (job) => {
      await processManifestJob(job)
    },
    {
      connection: createRedisConnection(),
      concurrency: 1,
    },
  )
}

async function processManifestJob(job: Job<ManifestJobPayload>): Promise<void> {
  const { uploadId, tenderId, orgId } = job.data

  const upload = await prisma.upload.findUnique({
    where: { id: uploadId },
    select: {
      id: true,
      kind: true,
      size: true,
      mimeType: true,
      originalName: true,
      filename: true,
      storageKey: true,
      url: true,
      tenderId: true,
      status: true,
    },
  })

  if (!upload || upload.tenderId !== tenderId) {
    console.warn('[manifest-worker] upload missing or mismatched', { uploadId, tenderId })
    return
  }

  if (upload.kind === UploadKind.image) {
    const downloadUrl = await resolveUploadDownloadUrl({
      id: upload.id,
      storageKey: upload.storageKey,
      url: upload.url,
      filename: upload.filename,
      originalName: upload.originalName,
    })

    await prisma.$transaction(async (tx) => {
      await tx.extractedFile.deleteMany({ where: { uploadId } })
      await tx.upload.update({
        where: { id: uploadId },
        data: {
          status: UploadStatus.COMPLETED,
          error: null,
          url: downloadUrl,
        },
      })
    })

    await putJson(
      { bucket: INDEX_BUCKET, key: manifestKey(orgId, tenderId) },
      {
        uploadId,
        generatedAt: new Date().toISOString(),
        documents: [],
      },
    )

    return
  }

  try {
    const payload = await loadUploadBuffer(upload.storageKey ?? null)

    const manifestEntries: ManifestDocumentRecord[] = []
    const extractedRecords: Parameters<typeof prisma.extractedFile.createMany>[0]['data'] = []
    const documentsToQueue: Array<{
      id: string
      docHash: string
      filename: string
      bytes: number
      storage: ManifestDocumentRecord['storage']
      pages: number | null
      hasText: boolean | null
    }> = []

    if (upload.kind === UploadKind.zip) {
      const directory = await unzipper.Open.buffer(payload)
      const entries = directory.files.filter((entry) => entry.type !== 'Directory')
      const limitedEntries = entries.slice(0, MAX_ZIP_ENTRIES)

      if (entries.length > MAX_ZIP_ENTRIES) {
        console.warn(
          `[manifest-worker] zip entries truncated for upload ${uploadId}: ${entries.length} -> ${MAX_ZIP_ENTRIES}`,
        )
      }

      if (limitedEntries.length === 0) {
        throw new Error('Zip archive did not contain any files')
      }

      for (const entry of limitedEntries) {
        const filename = entry.path.split('/').filter(Boolean).pop() ?? entry.path
        const ext = filename.split('.').pop()?.toLowerCase() ?? ''

        if (ext !== 'pdf') {
          continue
        }

        const pdfBuffer = await entry.buffer()
        const docHash = hashBuffer(pdfBuffer)
        const storagePaths = {
          ...buildDocumentStoragePaths({ orgId, tenderId, docHash }),
          bucket: INDEX_BUCKET,
        }
        const bucketKey = storagePaths.rawKey

        const probe = probePdf(pdfBuffer)
        const bytes = pdfBuffer.length

        try {
          await uploadSupabaseObject(INDEX_BUCKET, bucketKey, pdfBuffer, {
            contentType: 'application/pdf',
            cacheControl: '86400',
          })
        } catch (error) {
          if (error instanceof Error && shouldFallbackToMockStorage(error)) {
            const fallbackKey = `${MOCK_STORAGE_PREFIX}${uploadId}/${docHash}/raw.pdf`
            await writeMockStorageFile(fallbackKey, pdfBuffer)
            storagePaths.rawKey = fallbackKey
          } else {
            throw error
          }
        }

        const document = await prisma.document.upsert({
          where: {
            orgId_tenderId_docHash: {
              orgId,
              tenderId,
              docHash,
            },
          },
          update: {
            title: filename,
            bytes,
            status: DocStatus.PENDING,
            error: null,
            hasText: probe.hasText ?? true,
            pages: probe.pages ?? 0,
          },
          create: {
            orgId,
            tenderId,
            docHash,
            title: filename,
            bytes,
            status: DocStatus.PENDING,
            hasText: probe.hasText ?? true,
            pages: probe.pages ?? 0,
          },
        })

        manifestEntries.push({
          documentId: document.id,
          docHash,
          filename,
          bytes,
          mime: 'application/pdf',
          storage: storagePaths,
          status: DocStatus.PENDING,
          pages: probe.pages,
          hasText: probe.hasText,
        })

        extractedRecords.push({
          filename,
          page: null,
          content: null,
          metadata: {
            path: entry.path,
            size: entry.uncompressedSize ?? bytes,
            type: entry.type,
            docHash,
            mimeType: 'application/pdf',
            storageKey: storagePaths.rawKey,
            storageBucket: storagePaths.rawKey.startsWith(MOCK_STORAGE_PREFIX)
              ? null
              : storagePaths.bucket,
          },
          tenderId,
          uploadId,
          docHash,
          storageBucket: storagePaths.rawKey.startsWith(MOCK_STORAGE_PREFIX)
            ? null
            : INDEX_BUCKET,
          storageKey: storagePaths.rawKey,
        })

        documentsToQueue.push({
          id: document.id,
          docHash,
          filename,
          bytes,
          storage: storagePaths,
          pages: probe.pages,
          hasText: probe.hasText,
        })
      }
    } else {
      const docHash = hashBuffer(payload)
      const filename = upload.originalName ?? upload.filename ?? 'document.pdf'
      const storagePaths = {
        ...buildDocumentStoragePaths({ orgId, tenderId, docHash }),
        bucket: INDEX_BUCKET,
      }
      const probe = probePdf(payload)

      try {
        await uploadSupabaseObject(INDEX_BUCKET, storagePaths.rawKey, payload, {
          contentType: upload.mimeType ?? 'application/pdf',
          cacheControl: '86400',
        })
      } catch (error) {
        if (error instanceof Error && shouldFallbackToMockStorage(error)) {
          const fallbackKey = `${MOCK_STORAGE_PREFIX}${uploadId}/${docHash}/raw.pdf`
          await writeMockStorageFile(fallbackKey, payload)
          storagePaths.rawKey = fallbackKey
        } else {
          throw error
        }
      }

      const document = await prisma.document.upsert({
        where: {
          orgId_tenderId_docHash: {
            orgId,
            tenderId,
            docHash,
          },
        },
        update: {
          title: filename,
          bytes: upload.size ?? payload.length,
          status: DocStatus.PENDING,
          error: null,
          hasText: probe.hasText ?? true,
          pages: probe.pages ?? 0,
        },
        create: {
          orgId,
          tenderId,
          docHash,
          title: filename,
          bytes: upload.size ?? payload.length,
          status: DocStatus.PENDING,
          hasText: probe.hasText ?? true,
          pages: probe.pages ?? 0,
        },
      })

      manifestEntries.push({
        documentId: document.id,
        docHash,
        filename,
        bytes: upload.size ?? payload.length,
        mime: upload.mimeType ?? 'application/pdf',
        storage: storagePaths,
        status: DocStatus.PENDING,
        pages: probe.pages,
        hasText: probe.hasText,
      })

      extractedRecords.push({
        filename,
        page: null,
        content: null,
        metadata: {
          size: upload.size ?? payload.length,
          mimeType: upload.mimeType ?? 'application/pdf',
          docHash,
          storageKey: storagePaths.rawKey,
          storageBucket: storagePaths.rawKey.startsWith(MOCK_STORAGE_PREFIX)
            ? null
            : storagePaths.bucket,
        },
        tenderId,
        uploadId,
        docHash,
        storageBucket: storagePaths.rawKey.startsWith(MOCK_STORAGE_PREFIX)
          ? null
          : storagePaths.bucket,
        storageKey: storagePaths.rawKey,
      })

      documentsToQueue.push({
        id: document.id,
        docHash,
        filename,
        bytes: upload.size ?? payload.length,
        storage: storagePaths,
        pages: probe.pages,
        hasText: probe.hasText,
      })
    }

    await prisma.$transaction(async (tx) => {
      await tx.extractedFile.deleteMany({ where: { uploadId } })
      if (extractedRecords.length > 0) {
        await tx.extractedFile.createMany({ data: extractedRecords, skipDuplicates: true })
      }
      await tx.upload.update({
        where: { id: uploadId },
        data: {
          status: UploadStatus.COMPLETED,
          error: null,
        },
      })
    })

    await putJson(
      { bucket: INDEX_BUCKET, key: manifestKey(orgId, tenderId) },
      {
        uploadId,
        generatedAt: new Date().toISOString(),
        documents: manifestEntries.map((entry) => ({
          documentId: entry.documentId,
          fileName: entry.filename,
          bytes: entry.bytes,
          mime: entry.mime,
          docHash: entry.docHash,
          hasText: entry.hasText ?? null,
          pageCount: entry.pages ?? null,
          status: entry.status,
        })),
      },
    )

    for (const entry of documentsToQueue) {
      const priority = computeDocumentPriority(entry.filename, entry.bytes)
      await enqueueExtractJob(
        {
          orgId,
          tenderId,
          documentId: entry.id,
          docHash: entry.docHash,
          storage: entry.storage,
          uploadId,
          filename: entry.filename,
        },
        { priority },
      )
    }
  } catch (error) {
    console.error('[manifest-worker] failed', { uploadId, error })
    await prisma.upload.update({
      where: { id: uploadId },
      data: {
        status: UploadStatus.FAILED,
        error: error instanceof Error ? error.message : 'Manifest ingest failed',
      },
    })
  }
}
