import { readFile } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'

import { DocStatus, PrismaClient } from '@prisma/client'
import { Worker, type Job } from 'bullmq'

import { log } from '@/lib/log'
import { embedMany } from '@/lib/ai/openai'
import { flags } from '@/lib/flags'
import { enqueueSummaryJob, QUEUE_NAMES } from '@/lib/ingest/queues'
import type { EmbedJobPayload } from '@/lib/ingest/types'
import {
  downloadSupabaseObject,
} from '@/lib/storage'
import {
  resolveMockStoragePath,
  MOCK_STORAGE_PREFIX,
} from '@/lib/uploads'
import { createRedisConnection, withLock } from '@/lib/redis'

const prisma = new PrismaClient()
const LOCK_TTL_MS = 60_000
const EMBED_TX_TIMEOUT_MS = 60_000

interface ChunkRecord {
  id: string
  pageStart: number
  pageEnd: number
  heading: string | null
  text: string
}

export function startEmbedWorker(): Worker<EmbedJobPayload> {
  return new Worker<EmbedJobPayload>(
    QUEUE_NAMES.embed,
    async (job) => {
      await processEmbedJob(job)
    },
    {
      connection: createRedisConnection(),
      concurrency: 16,
    },
  )
}

async function processEmbedJob(job: Job<EmbedJobPayload>): Promise<void> {
  const { storage, documentId, docHash, orgId, tenderId } = job.data
  const baseMeta = {
    jobId: job.id ?? null,
    orgId,
    tenderId,
    documentId,
    docHash,
  }

  const lockKey = `lock:${docHash}:embed`
  const result = await withLock(lockKey, LOCK_TTL_MS, async () => {
    try {
      log('ingest:embed', 'starting', baseMeta)

      const existingSections = await prisma.documentSection.count({ where: { documentId } })
      if (existingSections > 0) {
        log('ingest:embed', 'artifact-exists', { ...baseMeta, sections: existingSections })
        await prisma.document.update({
          where: { id: documentId },
          data: { status: DocStatus.SUMMARIZING, error: null },
        })

        await enqueueSummaryJob(
          {
            ...job.data,
            chunkCount: existingSections,
          },
          { priority: job.opts.priority },
        )
        return
      }

      await prisma.document.update({
        where: { id: documentId },
        data: { status: DocStatus.EMBEDDING, error: null },
      })

      const buffer = await loadChunks(storage.chunksKey, storage.bucket)
      const raw = gunzipSync(buffer).toString('utf8')
      const records = raw
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line) as ChunkRecord)

      const batchSize = Math.max(1, Math.min(flags.embedBatchSize, 512))
      const embeddings: number[][] = []

      for (let start = 0; start < records.length; start += batchSize) {
        const slice = records.slice(start, start + batchSize)
        const response = await embedMany(slice.map((item) => item.text))
        embeddings.push(...response.vectors)
      }

      await prisma.$transaction(async (tx) => {
        await tx.documentSection.deleteMany({ where: { documentId } })
        const CHUNK_INSERT_BATCH = 50
        for (let start = 0; start < records.length; start += CHUNK_INSERT_BATCH) {
          const slice = records.slice(start, start + CHUNK_INSERT_BATCH)
          await tx.documentSection.createMany({
            data: slice.map((record, index) => ({
              documentId,
              pageStart: record.pageStart,
              pageEnd: record.pageEnd,
              heading: record.heading,
              text: record.text,
              embedding: embeddings[start + index] ?? [],
            })),
          })
        }
      }, { timeout: EMBED_TX_TIMEOUT_MS })

      await prisma.document.update({
        where: { id: documentId },
        data: { status: DocStatus.SUMMARIZING, error: null },
      })

      await enqueueSummaryJob(
        {
          ...job.data,
          chunkCount: records.length,
        },
        { priority: job.opts.priority },
      )

      log('ingest:embed', 'completed', { ...baseMeta, sections: records.length })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Embedding failed'
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocStatus.FAILED,
          error: message.slice(0, 500),
        },
      })
      log('ingest:embed', 'error', { ...baseMeta, error: message })
      throw error
    }
  })

  if (result === null) {
    log('ingest:embed', 'lock-skipped', baseMeta)
  }
}

async function loadChunks(storageKey: string, bucket: string): Promise<Buffer> {
  if (storageKey.startsWith(MOCK_STORAGE_PREFIX)) {
    const path = await resolveMockStoragePath(storageKey)
    return readFile(path)
  }
  return downloadSupabaseObject(bucket, storageKey)
}
