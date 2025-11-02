import 'dotenv/config'

import { IndexArtifactStatus, Prisma, PrismaClient } from '@prisma/client'
import { Worker, type Job } from 'bullmq'
import { PDFParse } from 'pdf-parse'

import { embedMany } from '../../lib/ai/openai'
import { LOCK_HEARTBEAT_INTERVAL_MS } from '../../lib/indexing/constants'
import { connection, INDEX_QUEUE, indexingQueue } from '../../lib/queue'
import {
  buildProgressSnapshot,
  getRedisClient,
  releaseIndexLock,
  renewIndexLock,
  writeIndexProgress,
} from '../../lib/redis'
import { loadUploadBuffer } from '../../lib/uploads'
import { env } from '../../lib/env'
import { startIngestWorkers } from './ingest'

const CHUNK_SIZE = 1500
const CHUNK_OVERLAP = 200

interface IndexJobData {
  tenderId: string
  fileId: string
  docHash: string
}

function adjustDatabaseUrlForPgBouncer(url: string | undefined): string | undefined {
  if (!url) return url
  try {
    const parsed = new URL(url)
    const hasOverride =
      parsed.searchParams.has('pgbouncer') ||
      parsed.searchParams.has('preparedStatements') ||
      parsed.searchParams.has('statement_cache_size')

    if (!hasOverride) {
      parsed.searchParams.set('pgbouncer', 'true')
      if (!parsed.searchParams.has('connection_limit')) {
        parsed.searchParams.set('connection_limit', '1')
      }
      console.log('[worker] adjusted DATABASE_URL for PgBouncer compatibility')
    }
    return parsed.toString()
  } catch {
    return url
  }
}

const prismaDatabaseUrl = adjustDatabaseUrlForPgBouncer(env.DATABASE_URL)
const prismaOptions: Prisma.PrismaClientOptions = {
  log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
}

if (prismaDatabaseUrl) {
  prismaOptions.datasources = {
    db: {
      url: prismaDatabaseUrl,
    },
  }
}

const prisma = new PrismaClient(prismaOptions)

startIngestWorkers()

console.log('[worker] boot', {
  INDEX_QUEUE,
  DATABASE_URL: Boolean(env.DATABASE_URL),
  REDIS_URL: Boolean(env.REDIS_URL ?? env.UPSTASH_REDIS_URL),
  SUPABASE_URL: Boolean(env.SUPABASE_URL),
  SUPABASE_SERVICE_ROLE_KEY: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
  OPENAI_API_KEY: Boolean(env.OPENAI_API_KEY),
})

function startHeartbeat(redis: ReturnType<typeof getRedisClient>, docHash: string): NodeJS.Timeout {
  return setInterval(() => {
    renewIndexLock(redis, docHash).catch((error) => {
      console.warn(`[worker] Failed to renew lock for ${docHash}:`, error)
    })
  }, LOCK_HEARTBEAT_INTERVAL_MS)
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim()
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(text.length, start + chunkSize)
    const chunk = text.slice(start, end).trim()
    if (chunk.length > 0) {
      chunks.push(chunk)
    }
    if (end === text.length) break
    const nextStart = Math.max(0, end - overlap)
    start = nextStart <= start ? end : nextStart
  }
  return chunks
}

function splitPdfByPage(text: string): string[] {
  return text.split(/\f/g)
}

async function markArtifactFailed(
  jobData: IndexJobData,
  error: Error,
  redis: ReturnType<typeof getRedisClient>,
): Promise<void> {
  console.error('[worker] failed to index file', {
    docHash: jobData.docHash,
    fileId: jobData.fileId,
    tenderId: jobData.tenderId,
    message: error.message,
  })

  await prisma.indexArtifact.updateMany({
    where: { docHash: jobData.docHash },
    data: { status: IndexArtifactStatus.FAILED },
  })

  await writeIndexProgress(
    redis,
    jobData.docHash,
    buildProgressSnapshot({
      docHash: jobData.docHash,
      phase: 'failed',
      percent: 100,
      batchesDone: 0,
      totalBatches: 0,
      message: error.message,
    }),
  )

  await releaseIndexLock(redis, jobData.docHash).catch(() => undefined)
}

async function processIndexJob(job: Job<IndexJobData>): Promise<void> {
  const data = job.data
  const { docHash, fileId, tenderId } = data
  const redis = getRedisClient()
  const heartbeat = startHeartbeat(redis, docHash)

  try {
    console.log('[worker] start per-file index', { docHash, fileId, tenderId })
    await renewIndexLock(redis, docHash).catch(() => undefined)

    const extracted = await prisma.extractedFile.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        tenderId: true,
        docHash: true,
        storageBucket: true,
        storageKey: true,
        metadata: true,
        filename: true,
      },
    })

    if (!extracted) {
      throw new Error('Extracted file not found')
    }
    if (extracted.docHash !== docHash) {
      throw new Error('Doc hash mismatch for extracted file')
    }
    if (extracted.tenderId !== tenderId) {
      throw new Error('Extracted file belongs to a different tender')
    }
    if (!extracted.storageKey) {
      throw new Error('Extracted file is missing storage metadata')
    }

    const artifact = await prisma.indexArtifact.findUnique({
      where: { docHash },
    })
    if (!artifact) {
      throw new Error('Index artifact is missing for this document')
    }

    await writeIndexProgress(
      redis,
      docHash,
      buildProgressSnapshot({
        docHash,
        phase: 'manifest',
        percent: 10,
        batchesDone: 0,
        totalBatches: 0,
        message: 'Downloading PDF',
      }),
    )

    const pdfBuffer = await loadUploadBuffer(extracted.storageKey, {
      bucket: extracted.storageBucket ?? undefined,
    })

    await writeIndexProgress(
      redis,
      docHash,
      buildProgressSnapshot({
        docHash,
        phase: 'embedding',
        percent: 35,
        batchesDone: 0,
        totalBatches: 1,
        message: 'Parsing PDF pages',
      }),
    )

    const parser = new PDFParse({ data: pdfBuffer })
    const parsed = await parser.getText()
    await parser.destroy().catch(() => undefined)

    const rawPages =
      parsed.pages.length > 0
        ? parsed.pages.map((page) => page.text ?? '')
        : splitPdfByPage(parsed.text ?? '')

    const chunkInputs: Array<{ content: string; page: number | null }> = []
    for (let pageIndex = 0; pageIndex < rawPages.length; pageIndex += 1) {
      const normalized = normalizeWhitespace(rawPages[pageIndex] ?? '')
      if (!normalized) continue
      const pageChunks = chunkText(normalized, CHUNK_SIZE, CHUNK_OVERLAP)
      for (const chunk of pageChunks) {
        chunkInputs.push({ content: chunk, page: pageIndex + 1 })
      }
    }

    await writeIndexProgress(
      redis,
      docHash,
      buildProgressSnapshot({
        docHash,
        phase: 'embedding',
        percent: chunkInputs.length > 0 ? 55 : 45,
        batchesDone: 0,
        totalBatches: 1,
        message: `Embedding ${chunkInputs.length} chunks`,
      }),
    )

    console.log('[worker] embedding %d chunks', chunkInputs.length, {
      docHash,
      fileId,
    })

    let embeddings: number[][] = []
    if (chunkInputs.length > 0) {
      const embedResult = await embedMany(chunkInputs.map((entry) => entry.content))
      embeddings = embedResult.vectors
      if (embeddings.length !== chunkInputs.length) {
        throw new Error(
          `Embedding result mismatch (${embeddings.length} vs ${chunkInputs.length})`,
        )
      }
    }

    const chunkRows: Prisma.ChunkCreateManyInput[] = chunkInputs.map((entry, index) => ({
      content: entry.content,
      embedding: (embeddings[index] ?? []) as Prisma.InputJsonValue,
      page: entry.page,
      tenderId,
      extractedFileId: fileId,
    }))

    await prisma.$transaction(
      async (tx) => {
        await tx.chunk.deleteMany({ where: { extractedFileId: fileId } })
        
        // Process in batches to avoid timeout with large embedding data
        if (chunkRows.length > 0) {
          const BATCH_SIZE = 50
          for (let i = 0; i < chunkRows.length; i += BATCH_SIZE) {
            const batch = chunkRows.slice(i, i + BATCH_SIZE)
            await tx.chunk.createMany({ data: batch })
          }
        }
        
        await tx.indexArtifact.update({
          where: { docHash },
          data: {
            status: IndexArtifactStatus.READY,
            totalChunks: chunkRows.length,
            totalPages: rawPages.length,
            storageKey: artifact.storageKey ?? extracted.storageKey ?? artifact.storageKey,
            bytesApprox: pdfBuffer.length,
          },
        })
      },
      {
        timeout: 30000, // 30 seconds to handle embedding inserts
      }
    )

    await writeIndexProgress(
      redis,
      docHash,
      buildProgressSnapshot({
        docHash,
        phase: 'ready',
        percent: 100,
        batchesDone: 1,
        totalBatches: 1,
        message: chunkRows.length > 0 ? 'Index ready' : 'No textual content extracted',
      }),
    )

    console.log('[worker] ✅ marked READY', {
      docHash,
      fileId,
      totalChunks: chunkRows.length,
    })

    await releaseIndexLock(redis, docHash).catch(() => undefined)
  } catch (error) {
    await markArtifactFailed(data, error as Error, redis)
    throw error
  } finally {
    clearInterval(heartbeat)
  }
}

const worker = new Worker(INDEX_QUEUE, processIndexJob, {
  connection,
  concurrency: 2,
})

worker.on('active', (job) => {
  if (!job) return
  console.log('[worker] active', job.id, job.name)
})

worker.on('progress', (job, progress) => {
  if (!job) return
  console.log('[worker] progress', job.id, job.name, progress)
})

worker.on('completed', (job) => {
  if (!job) return
  console.log('[worker] completed', job.id, job.name)
})

worker.on('failed', (job, err) => {
  console.error('[worker] failed', job?.id, job?.name, err?.message)
})

process.on('SIGINT', async () => {
  console.log('[worker] shutting down (SIGINT)')
  await worker.close()
  await indexingQueue.close()
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('[worker] shutting down (SIGTERM)')
  await worker.close()
  await indexingQueue.close()
  await prisma.$disconnect()
  process.exit(0)
})
