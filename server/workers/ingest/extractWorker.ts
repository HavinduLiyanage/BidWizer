import { readFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'

import { DocStatus, PrismaClient } from '@prisma/client'
import { Worker, type Job } from 'bullmq'
import { PDFParse } from 'pdf-parse'

import { normalizeWhitespace } from '@/lib/ingest/pdf'
import { enqueueChunkJob, QUEUE_NAMES } from '@/lib/ingest/queues'
import type { ExtractJobPayload } from '@/lib/ingest/types'
import {
  downloadSupabaseObject,
  uploadSupabaseObject,
} from '@/lib/storage'
import {
  resolveMockStoragePath,
  MOCK_STORAGE_PREFIX,
} from '@/lib/uploads'
import {
  acquireIndexLock,
  buildProgressSnapshot,
  getRedisClient,
  releaseIndexLock,
  renewIndexLock,
  writeIndexProgress,
} from '@/lib/redis'
import { createRedisConnection } from '@/lib/redis'

const prisma = new PrismaClient()

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
  const { documentId, docHash, storage } = job.data
  const redis = getRedisClient()
  const lockAcquired = await acquireIndexLock(redis, docHash)

  if (!lockAcquired) {
    return
  }

  const heartbeat = setInterval(() => {
    void renewIndexLock(redis, docHash)
  }, 15_000)

  try {
    const document = await prisma.document.update({
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
  } catch (error) {
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocStatus.FAILED,
        error: error instanceof Error ? error.message : 'Extraction failed',
      },
    })
    throw error
  } finally {
    clearInterval(heartbeat)
    await releaseIndexLock(redis, docHash)
  }
}

async function loadRawPdf(storageKey: string, bucket: string): Promise<Buffer> {
  if (storageKey.startsWith(MOCK_STORAGE_PREFIX)) {
    const path = await resolveMockStoragePath(storageKey)
    return readFile(path)
  }
  return downloadSupabaseObject(bucket, storageKey)
}
