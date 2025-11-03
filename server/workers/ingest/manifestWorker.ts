import { UploadKind, UploadStatus, DocStatus, PrismaClient } from '@prisma/client'
import { Worker, type Job } from 'bullmq'
import * as unzipper from 'unzipper'

import { log } from '@/lib/log'
import { computeDocumentPriority } from '@/lib/ingest/priority'
import { buildDocumentStoragePaths, manifestKey } from '@/lib/ingest/paths'
import {
  enqueueChunkJob,
  enqueueEmbedJob,
  enqueueExtractJob,
  enqueueSummaryJob,
  QUEUE_NAMES,
} from '@/lib/ingest/queues'
import { probePdf, hashBuffer } from '@/lib/ingest/pdf'
import type { ManifestDocumentRecord, ManifestJobPayload } from '@/lib/ingest/types'
import {
  getSupabaseIndexBucketName,
  exists,
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

type DocumentQueueEntry = {
  id: string
  docHash: string
  filename: string
  bytes: number
  storage: ManifestDocumentRecord['storage']
  pages: number | null
  hasText: boolean | null
  status: DocStatus
}

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
  const baseMeta = { uploadId, tenderId, orgId, jobId: job.id ?? null }
  log('ingest:manifest', 'starting', baseMeta)

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
    log('ingest:manifest', 'upload-missing', { ...baseMeta })
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

    await putJson(manifestKey(orgId, tenderId), {
      uploadId,
      generatedAt: new Date().toISOString(),
      documents: [],
    })

    log('ingest:manifest', 'completed', { ...baseMeta, documents: 0 })
    return
  }

  try {
    const payload = await loadUploadBuffer(upload.storageKey ?? null)

    const manifestEntries: ManifestDocumentRecord[] = []
    const extractedRecords: Parameters<typeof prisma.extractedFile.createMany>[0]['data'] = []
    const documentsToQueue: DocumentQueueEntry[] = []

    if (upload.kind === UploadKind.zip) {
      const directory = await unzipper.Open.buffer(payload)
      const entries = directory.files.filter((entry) => entry.type !== 'Directory')
      const limitedEntries = entries.slice(0, MAX_ZIP_ENTRIES)

      if (entries.length > MAX_ZIP_ENTRIES) {
        log('ingest:manifest', 'zip-truncated', {
          ...baseMeta,
          totalEntries: entries.length,
          processedEntries: limitedEntries.length,
        })
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
          status: document.status,
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
        status: document.status,
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

    await putJson(manifestKey(orgId, tenderId), {
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
    })

    let queuedCount = 0
    let skippedCount = 0

    for (const entry of documentsToQueue) {
      const decision = await determineNextStage(entry)
      if (decision.kind === null) {
        skippedCount += 1
        continue
      }

      const priority = computeDocumentPriority(entry.filename, entry.bytes)
      const basePayload = {
        orgId,
        tenderId,
        documentId: entry.id,
        docHash: entry.docHash,
        storage: entry.storage,
        uploadId,
        filename: entry.filename,
      }

      switch (decision.kind) {
        case 'extract': {
          await enqueueExtractJob(basePayload, { priority })
          break
        }
        case 'chunk': {
          await enqueueChunkJob(
            {
              ...basePayload,
              extractedPages: entry.pages ?? 0,
            },
            { priority },
          )
          break
        }
        case 'embed': {
          await enqueueEmbedJob(
            {
              ...basePayload,
              chunkCount: decision.chunkCount,
            },
            { priority },
          )
          break
        }
        case 'summary': {
          await enqueueSummaryJob(
            {
              ...basePayload,
              chunkCount: decision.sectionCount,
            },
            { priority },
          )
          break
        }
      }

      queuedCount += 1
    }

    log('ingest:manifest', 'queue-summary', {
      ...baseMeta,
      documents: documentsToQueue.length,
      queued: queuedCount,
      skipped: skippedCount,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log('ingest:manifest', 'error', { ...baseMeta, error: message })
    await prisma.upload.update({
      where: { id: uploadId },
      data: {
        status: UploadStatus.FAILED,
        error: error instanceof Error ? error.message : 'Manifest ingest failed',
      },
    })
  }
}

type StageDecision =
  | { kind: 'extract' }
  | { kind: 'chunk' }
  | { kind: 'embed'; chunkCount: number }
  | { kind: 'summary'; sectionCount: number }
  | { kind: null }

async function determineNextStage(entry: DocumentQueueEntry): Promise<StageDecision> {
  if (entry.status === DocStatus.READY) {
    return { kind: null }
  }

  const extractedExists = await exists(entry.storage.extractedKey)
  if (!extractedExists) {
    return { kind: 'extract' }
  }

  const chunksExists = await exists(entry.storage.chunksKey)
  if (!chunksExists) {
    return { kind: 'chunk' }
  }

  const sectionCount = await prisma.documentSection.count({ where: { documentId: entry.id } })
  if (sectionCount === 0) {
    return { kind: 'embed', chunkCount: 0 }
  }

  const summaryExists = await exists(entry.storage.summaryKey)
  if (!summaryExists) {
    return { kind: 'summary', sectionCount }
  }

  return { kind: null }
}
