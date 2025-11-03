import { readFile } from 'node:fs/promises'
import { gunzipSync, gzipSync } from 'node:zlib'

import { DocStatus, PrismaClient } from '@prisma/client'
import { Worker, type Job } from 'bullmq'

import { log } from '@/lib/log'
import { chunkText } from '@/lib/ingest/pdf'
import { enqueueEmbedJob, QUEUE_NAMES } from '@/lib/ingest/queues'
import type { ChunkJobPayload } from '@/lib/ingest/types'
import { DEFAULT_CHUNK_OVERLAP, DEFAULT_CHUNK_SIZE } from '@/lib/indexing/constants'
import {
  exists,
  downloadSupabaseObject,
  uploadSupabaseObject,
} from '@/lib/storage'
import {
  resolveMockStoragePath,
  MOCK_STORAGE_PREFIX,
} from '@/lib/uploads'
import { createRedisConnection, withLock } from '@/lib/redis'

const prisma = new PrismaClient()
const LOCK_TTL_MS = 60_000

interface ExtractedPage {
  page: number
  text: string
}

export function startChunkWorker(): Worker<ChunkJobPayload> {
  return new Worker<ChunkJobPayload>(
    QUEUE_NAMES.chunk,
    async (job) => {
      await processChunkJob(job)
    },
    {
      connection: createRedisConnection(),
      concurrency: 8,
    },
  )
}

async function processChunkJob(job: Job<ChunkJobPayload>): Promise<void> {
  const { storage, documentId, docHash, orgId, tenderId } = job.data
  const baseMeta = {
    jobId: job.id ?? null,
    orgId,
    tenderId,
    documentId,
    docHash,
  }

  const lockKey = `lock:${docHash}:chunk`
  const result = await withLock(lockKey, LOCK_TTL_MS, async () => {
    try {
      log('ingest:chunk', 'starting', baseMeta)

      const alreadyExists = await exists(storage.chunksKey)
      if (alreadyExists) {
        log('ingest:chunk', 'artifact-exists', { ...baseMeta, path: storage.chunksKey })
        await prisma.document.update({
          where: { id: documentId },
          data: { status: DocStatus.EMBEDDING, error: null },
        })

        const existingChunkCount = await prisma.documentSection.count({
          where: { documentId },
        })

        await enqueueEmbedJob(
          {
            ...job.data,
            chunkCount: existingChunkCount,
          },
          { priority: job.opts.priority },
        )
        return
      }

      await prisma.document.update({
        where: { id: documentId },
        data: { status: DocStatus.CHUNKING, error: null },
      })

      const buffer = await loadArtifact(storage.extractedKey, storage.bucket)
      const raw = gunzipSync(buffer).toString('utf8')
      const pages = raw
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line) as ExtractedPage)

      const chunks: Array<{
        pageStart: number
        pageEnd: number
        text: string
        heading: string | null
      }> = []

      for (const page of pages) {
        const windows = chunkText(page.text ?? '', DEFAULT_CHUNK_SIZE, DEFAULT_CHUNK_OVERLAP)
        if (windows.length === 0) {
          continue
        }
        for (const text of windows) {
          chunks.push({
            pageStart: page.page,
            pageEnd: page.page,
            text,
            heading: null,
          })
        }
      }

      const jsonl = chunks
        .map((chunk, index) =>
          JSON.stringify({
            id: `${docHash}:${index}`,
            pageStart: chunk.pageStart,
            pageEnd: chunk.pageEnd,
            heading: chunk.heading,
            text: chunk.text,
          }),
        )
        .join('\n')

      const compressed = gzipSync(Buffer.from(jsonl, 'utf8'))

      await uploadSupabaseObject(storage.bucket, storage.chunksKey, compressed, {
        contentType: 'application/gzip',
        cacheControl: '3600',
      })

      await prisma.document.update({
        where: { id: documentId },
        data: { status: DocStatus.EMBEDDING, error: null },
      })

      await enqueueEmbedJob(
        {
          ...job.data,
          chunkCount: chunks.length,
        },
        { priority: job.opts.priority },
      )

      log('ingest:chunk', 'completed', { ...baseMeta, chunks: chunks.length })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Chunking failed'
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocStatus.FAILED,
          error: message.slice(0, 500),
        },
      })
      log('ingest:chunk', 'error', { ...baseMeta, error: message })
      throw error
    }
  })

  if (result === null) {
    log('ingest:chunk', 'lock-skipped', baseMeta)
  }
}

async function loadArtifact(storageKey: string, bucket: string): Promise<Buffer> {
  if (storageKey.startsWith(MOCK_STORAGE_PREFIX)) {
    const path = await resolveMockStoragePath(storageKey)
    return readFile(path)
  }
  return downloadSupabaseObject(bucket, storageKey)
}
