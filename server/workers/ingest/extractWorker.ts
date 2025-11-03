import { readFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'

import { DocStatus, PrismaClient } from '@prisma/client'
import { Worker, type Job } from 'bullmq'
import { PDFParse } from 'pdf-parse'

import { log } from '@/lib/log'
import { normalizeWhitespace } from '@/lib/ingest/pdf'
import { enqueueChunkJob, QUEUE_NAMES } from '@/lib/ingest/queues'
import type { ExtractJobPayload } from '@/lib/ingest/types'
import { exists, downloadSupabaseObject, uploadSupabaseObject } from '@/lib/storage'
import { resolveMockStoragePath, MOCK_STORAGE_PREFIX } from '@/lib/uploads'
import {
  buildProgressSnapshot,
  getRedisClient,
  withLock,
  writeIndexProgress,
} from '@/lib/redis'
import { createRedisConnection } from '@/lib/redis'

const prisma = new PrismaClient()
const LOCK_TTL_MS = 60_000

export function startExtractWorker(): Worker<ExtractJobPayload> {
  return new Worker<ExtractJobPayload>(
    QUEUE_NAMES.extract,
    async (job) => {
      await processExtractJob(job)
    },
    {
      connection: createRedisConnection(),
      concurrency: 4,
    },
  )
}

async function processExtractJob(job: Job<ExtractJobPayload>): Promise<void> {
  const { documentId, docHash, storage, orgId, tenderId } = job.data
  const redis = getRedisClient()
  const baseMeta = {
    jobId: job.id ?? null,
    orgId,
    tenderId,
    documentId,
    docHash,
  }

  const lockKey = `lock:${docHash}:extract`
  const result = await withLock(lockKey, LOCK_TTL_MS, async () => {
    try {
      log('ingest:extract', 'starting', baseMeta)

      const alreadyExists = await exists(storage.extractedKey)
      if (alreadyExists) {
        log('ingest:extract', 'artifact-exists', { ...baseMeta, path: storage.extractedKey })
        await prisma.document.update({
          where: { id: documentId },
          data: { status: DocStatus.CHUNKING, error: null },
        })

        const document = await prisma.document.findUnique({
          where: { id: documentId },
          select: { pages: true },
        })

        await enqueueChunkJob(
          {
            ...job.data,
            extractedPages: document?.pages ?? 0,
          },
          {
            priority: job.opts.priority,
          },
        )
        return
      }

      await prisma.document.update({
        where: { id: documentId },
        data: { status: DocStatus.EXTRACTING, error: null },
      })

      const pdfBuffer = await loadRawPdf(storage.rawKey, storage.bucket)

      await writeIndexProgress(
        redis,
        docHash,
        buildProgressSnapshot({
          docHash,
          phase: 'extract',
          percent: 15,
          batchesDone: 0,
          totalBatches: 0,
          message: 'Parsing PDF',
        }),
      )

      const parser = new PDFParse({ data: pdfBuffer })
      const parsed = await parser.getText()
      await parser.destroy().catch(() => undefined)

      const pages: string[] =
        parsed.pages.length > 0
          ? parsed.pages.map((page) => normalizeWhitespace(page.text ?? ''))
          : (parsed.text ?? '').split(/\f/g).map((page) => normalizeWhitespace(page))

      const jsonl = pages
        .map((content, index) =>
          JSON.stringify({
            page: index + 1,
            text: content,
          }),
        )
        .join('\n')

      const compressed = gzipSync(Buffer.from(jsonl, 'utf8'))

      await uploadSupabaseObject(storage.bucket, storage.extractedKey, compressed, {
        contentType: 'application/gzip',
        cacheControl: '3600',
      })

      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocStatus.CHUNKING,
          pages: pages.length,
          hasText: pages.some((page) => page.length > 0),
          bytes: pdfBuffer.length,
        },
      })

      await enqueueChunkJob(
        {
          ...job.data,
          extractedPages: pages.length,
        },
        {
          priority: job.opts.priority,
        },
      )

      log('ingest:extract', 'completed', { ...baseMeta, pages: pages.length })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Extraction failed'
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocStatus.FAILED,
          error: message.slice(0, 500),
        },
      })
      log('ingest:extract', 'error', { ...baseMeta, error: message })
      throw error
    }
  })

  if (result === null) {
    log('ingest:extract', 'lock-skipped', baseMeta)
  }
}

async function loadRawPdf(storageKey: string, bucket: string): Promise<Buffer> {
  if (storageKey.startsWith(MOCK_STORAGE_PREFIX)) {
    const path = await resolveMockStoragePath(storageKey)
    return readFile(path)
  }
  return downloadSupabaseObject(bucket, storageKey)
}
