import 'dotenv/config'
import { createHash } from 'crypto'
import { mkdir, rm, writeFile, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import os from 'os'
import { basename, join } from 'path'

import { IndexArtifactStatus, PrismaClient } from '@prisma/client'
import { Queue, Worker, type Job } from 'bullmq'
import { gzipSync } from 'fflate'
import unzipper from 'unzipper'
import { PDFParse } from 'pdf-parse'
import tar from 'tar-stream'

import {
  acquireIndexLock,
  buildProgressSnapshot,
  getBullQueueConnection,
  getRedisClient,
  releaseIndexLock,
  renewIndexLock,
  writeIndexResumeState,
  writeIndexProgress,
} from '../../lib/redis'
import type { ArtifactInnerFile } from '../../lib/indexing/artifacts'
import {
  ArtifactManifest,
  ChunkRecord,
  FileNameMap,
} from '../../lib/indexing/types'
import {
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_EMBEDDING_MODEL,
  INDEX_CHUNKS_FILENAME,
  INDEX_EMBEDDINGS_FILENAME,
  INDEX_FILE_MAP_FILENAME,
  INDEX_HNSW_FILENAME,
  INDEX_MANIFEST_FILENAME,
  INDEX_ARTIFACT_VERSION,
  INDEX_QUEUE_NAME,
  LOCK_HEARTBEAT_INTERVAL_MS,
} from '../../lib/indexing/constants'
import {
  buildArtifactStorageKey,
  computeDocHashFromBuffer,
} from '../../lib/indexing/artifacts'
import { encodeFloat32ToFloat16, embedTexts } from '../../lib/embedding'
import {
  downloadSupabaseObject,
  getSupabaseIndexBucketName,
  getSupabaseUploadsBucketName,
  uploadSupabaseObject,
} from '../../lib/storage'

const prisma = new PrismaClient()

interface BuildManifestJobData {
  docHash: string
  orgId: string
  tenderId: string
  uploadStorageKey: string
  uploadBucket?: string
  artifactVersion?: number
}

interface EmbedBatchJobData extends BuildManifestJobData {
  chunkSize?: number
  chunkOverlap?: number
  embeddingModel?: string
  batchSize?: number
}

interface FinalizeArtifactJobData extends BuildManifestJobData {
  manifestPath?: string
}

interface WorkspaceFile {
  fileId: string
  originalPath: string
  diskPath: string
  sha256: string
  size: number
  pages: number
}

interface WorkspaceState {
  docHash: string
  orgId: string
  tenderId: string
  artifactVersion: number
  files: WorkspaceFile[]
  createdAt: string
  embeddingModel: string
  embeddingDimensions: number
  chunkSize: number
  chunkOverlap: number
  totalChunks: number
  totalPages: number
  totalTokens: number
}

function getWorkspaceRoot(): string {
  return join(os.tmpdir(), 'bidwizer-index')
}

function getWorkspacePath(docHash: string): string {
  return join(getWorkspaceRoot(), docHash)
}

function getWorkspaceFile(docHash: string, ...segments: string[]): string {
  return join(getWorkspacePath(docHash), ...segments)
}

async function ensureWorkspace(docHash: string): Promise<void> {
  await mkdir(getWorkspacePath(docHash), { recursive: true })
  await mkdir(getWorkspaceFile(docHash, 'pdfs'), { recursive: true })
}

async function cleanupWorkspace(docHash: string): Promise<void> {
  const workspace = getWorkspacePath(docHash)
  if (existsSync(workspace)) {
    await rm(workspace, { recursive: true, force: true })
  }
}

async function handleBuildManifest(
  job: Job<BuildManifestJobData>,
  queue: Queue,
): Promise<void> {
  const data = job.data
  const docHash = data.docHash
  const redis = getRedisClient()

  const lockAcquired = await acquireIndexLock(redis, docHash)
  if (!lockAcquired) {
    job.log(`Lock already held for ${docHash}, skipping`)
    return
  }

  const heartbeat = startHeartbeat(redis, docHash)
  try {
    await ensureWorkspace(docHash)
    await prisma.indexArtifact.upsert({
      where: { docHash },
      create: {
        docHash,
        orgId: data.orgId,
        tenderId: data.tenderId,
        version: data.artifactVersion ?? INDEX_ARTIFACT_VERSION,
        status: IndexArtifactStatus.BUILDING,
        storageKey: '',
        totalChunks: 0,
        totalPages: 0,
        bytesApprox: 0,
      },
      update: {
        status: IndexArtifactStatus.BUILDING,
      },
    })

    await writeIndexProgress(
      redis,
      docHash,
      buildProgressSnapshot({
        docHash,
        phase: 'manifest',
        percent: 3,
        batchesDone: 0,
        totalBatches: 0,
        message: 'Downloading source archive',
      }),
    )

    const uploadBucket = data.uploadBucket ?? getSupabaseUploadsBucketName()
    const zipBuffer = await downloadSupabaseObject(uploadBucket, data.uploadStorageKey)
    const computedHash = computeDocHashFromBuffer(zipBuffer)
    if (computedHash !== docHash) {
      job.log(`Doc hash mismatch: expected ${docHash}, computed ${computedHash}`)
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
        message: 'Scanning archive contents',
      }),
    )

    const directory = await unzipper.Open.buffer(zipBuffer)
    const pdfEntries = directory.files.filter(
      (entry: any) =>
        entry.type !== 'Directory' &&
        typeof entry.path === 'string' &&
        entry.path.toLowerCase().endsWith('.pdf'),
    )

    const workspaceFiles: WorkspaceFile[] = []

    for (const entry of pdfEntries) {
      const entryPath = entry.path
      const fileBuffer = await entry.buffer()
      const fileHash = createHash('sha256').update(fileBuffer).digest('hex')
      const fileId = createStableFileId(entryPath)
      const diskPath = getWorkspaceFile(docHash, 'pdfs', `${fileId}.pdf`)
      await writeFile(diskPath, fileBuffer)

      workspaceFiles.push({
        fileId,
        originalPath: entryPath,
        diskPath,
        sha256: fileHash,
        size: fileBuffer.byteLength,
        pages: 0,
      })
    }

    const workspaceState: WorkspaceState = {
      docHash,
      orgId: data.orgId,
      tenderId: data.tenderId,
      artifactVersion: data.artifactVersion ?? INDEX_ARTIFACT_VERSION,
      files: workspaceFiles,
      createdAt: new Date().toISOString(),
      embeddingModel: DEFAULT_EMBEDDING_MODEL,
      embeddingDimensions: 0,
      chunkSize: DEFAULT_CHUNK_SIZE,
      chunkOverlap: DEFAULT_CHUNK_OVERLAP,
      totalChunks: 0,
      totalPages: 0,
      totalTokens: 0,
    }

    await writeFile(
      getWorkspaceFile(docHash, 'state.json'),
      JSON.stringify(workspaceState, null, 2),
      'utf-8',
    )

    await writeIndexProgress(
      redis,
      docHash,
      buildProgressSnapshot({
        docHash,
        phase: 'manifest',
        percent: 25,
        batchesDone: 0,
        totalBatches: 0,
        message: `Discovered ${workspaceFiles.length} PDFs`,
      }),
    )

    // Enqueue embedding stage
    await queue.add(
      'embed-batch',
      {
        ...data,
        chunkSize: workspaceState.chunkSize,
        chunkOverlap: workspaceState.chunkOverlap,
        embeddingModel: workspaceState.embeddingModel,
      },
      {
        removeOnComplete: true,
        removeOnFail: false,
      },
    )
  } catch (error) {
    await markArtifactFailed(data, error as Error)
    throw error
  } finally {
    clearInterval(heartbeat)
  }
}

async function handleEmbedBatch(
  job: Job<EmbedBatchJobData>,
  queue: Queue,
): Promise<void> {
  const data = job.data
  const { docHash } = data
  const redis = getRedisClient()
  const heartbeat = startHeartbeat(redis, docHash)

  try {
    const workspaceState = await readWorkspaceState(docHash)
    const chunkSize = data.chunkSize ?? workspaceState.chunkSize
    const chunkOverlap = data.chunkOverlap ?? workspaceState.chunkOverlap
    const embeddingModel = data.embeddingModel ?? workspaceState.embeddingModel
    const batchSize = data.batchSize ?? 80
    workspaceState.embeddingModel = embeddingModel
    let embeddingDims = workspaceState.embeddingDimensions

    const chunkRecords: ChunkRecord[] = []
    const embeddingsPacked: Uint8Array[] = []
    const namesMap: FileNameMap = {}

    let accumulatedTexts: string[] = []
    let batchesDone = 0
    let totalChunks = 0
    let totalPages = 0
    let totalTokens = 0

    for (const file of workspaceState.files) {
      const pdfBuffer = await readFile(file.diskPath)

      const parser = new PDFParse({ data: pdfBuffer })
      const textResult = await parser.getText()
      await parser.destroy().catch(() => undefined)

      const pages =
        textResult.pages.length > 0
          ? textResult.pages.map((page) => page.text ?? '')
          : splitPdfByPage(textResult.text)
      file.pages = pages.length
      namesMap[file.fileId] = {
        path: file.originalPath,
        name: basename(file.originalPath),
        pages: file.pages,
      }

      for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
        const pageText = normalizeWhitespace(pages[pageIndex])
        if (!pageText) continue

        const pageChunks = chunkText(pageText, chunkSize, chunkOverlap)
        for (const chunk of pageChunks) {
          const chunkId = `${file.fileId}:${totalChunks.toString().padStart(6, '0')}`
          const md5 = createHash('md5').update(chunk).digest('hex')
          chunkRecords.push({
            chunkId,
            fileId: file.fileId,
            page: pageIndex + 1,
            offset: 0,
            length: chunk.length,
            md5,
            text: chunk,
          })
          accumulatedTexts.push(chunk)
          totalChunks += 1
          totalTokens += estimateTokens(chunk)
        }

        await writeIndexResumeState(redis, docHash, {
          lastFile: file.fileId,
          lastPage: pageIndex + 1,
          batchesProcessed: batchesDone,
        })
      }

      totalPages += file.pages

      if (accumulatedTexts.length >= batchSize) {
        const result = await embedBatch(
          accumulatedTexts,
          embeddingModel,
        )
        embeddingDims = result.dims
        embeddingsPacked.push(result.packed)
        accumulatedTexts = []
        batchesDone += 1

        await writeIndexProgress(
          redis,
          docHash,
          buildProgressSnapshot({
            docHash,
            phase: 'embedding',
            percent: Math.min(90, 30 + batchesDone * 5),
            batchesDone,
            totalBatches: batchesDone + 1,
            message: `Embedding chunks (${batchesDone} batches completed)`,
          }),
        )
      }
    }

    if (accumulatedTexts.length > 0) {
      const result = await embedBatch(accumulatedTexts, embeddingModel)
      embeddingDims = result.dims
      embeddingsPacked.push(result.packed)
      batchesDone += 1
    }

    workspaceState.totalChunks = totalChunks
    workspaceState.totalPages = totalPages
    workspaceState.totalTokens = totalTokens
    workspaceState.embeddingDimensions = embeddingDims

    const manifest = buildManifest(workspaceState, chunkRecords, embeddingModel)
    const manifestPath = getWorkspaceFile(docHash, INDEX_MANIFEST_FILENAME)
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')

    const chunkLines = chunkRecords.map((chunk) => JSON.stringify(chunk)).join('\n')
    const chunksCompressed = gzipSync(Buffer.from(chunkLines, 'utf-8'))
    await writeFile(getWorkspaceFile(docHash, INDEX_CHUNKS_FILENAME), Buffer.from(chunksCompressed))

    const embeddingsBuffer = Buffer.concat(embeddingsPacked.map((part) => Buffer.from(part)))
    await writeFile(getWorkspaceFile(docHash, INDEX_EMBEDDINGS_FILENAME), embeddingsBuffer)

    await writeFile(
      getWorkspaceFile(docHash, INDEX_FILE_MAP_FILENAME),
      JSON.stringify(namesMap, null, 2),
      'utf-8',
    )

    await writeFile(
      getWorkspaceFile(docHash, 'state.json'),
      JSON.stringify(workspaceState, null, 2),
      'utf-8',
    )

    await writeIndexProgress(
      redis,
      docHash,
      buildProgressSnapshot({
        docHash,
        phase: 'embedding',
        percent: 95,
        batchesDone,
        totalBatches: batchesDone,
        message: 'Embedding completed',
      }),
    )

    await queue.add(
      'finalize-artifact',
      data,
      {
        removeOnComplete: true,
        removeOnFail: false,
      },
    )
  } catch (error) {
    await markArtifactFailed(data, error as Error)
    throw error
  } finally {
    clearInterval(heartbeat)
  }
}

async function handleFinalizeArtifact(job: Job<FinalizeArtifactJobData>): Promise<void> {
  const data = job.data
  const docHash = data.docHash
  const redis = getRedisClient()
  const heartbeat = startHeartbeat(redis, docHash)

  try {
    await writeIndexProgress(
      redis,
      docHash,
      buildProgressSnapshot({
        docHash,
        phase: 'finalize',
        percent: 96,
        batchesDone: 0,
        totalBatches: 0,
        message: 'Packaging artifact',
      }),
    )

    const workspaceState = await readWorkspaceState(docHash)
    const manifestBuffer = await readFile(getWorkspaceFile(docHash, INDEX_MANIFEST_FILENAME))
    const chunksBuffer = await readFile(getWorkspaceFile(docHash, INDEX_CHUNKS_FILENAME))
    const embeddingsBuffer = await readFile(
      getWorkspaceFile(docHash, INDEX_EMBEDDINGS_FILENAME),
    )
    const namesBuffer = await readFile(getWorkspaceFile(docHash, INDEX_FILE_MAP_FILENAME))

    const pack = tar.pack()
    const artifactEntries: Array<[ArtifactInnerFile, Buffer]> = [
      [INDEX_MANIFEST_FILENAME, manifestBuffer],
      [INDEX_CHUNKS_FILENAME, chunksBuffer],
      [INDEX_EMBEDDINGS_FILENAME, embeddingsBuffer],
      [INDEX_FILE_MAP_FILENAME, namesBuffer],
    ]
    const hnswPath = getWorkspaceFile(docHash, INDEX_HNSW_FILENAME)
    if (existsSync(hnswPath)) {
      const hnswBuffer = await readFile(hnswPath)
      artifactEntries.push([INDEX_HNSW_FILENAME, hnswBuffer])
    }
    const tarBuffer = await packArtifact(pack, artifactEntries)

    const compressedBuffer = Buffer.from(gzipSync(tarBuffer))
    const bucket = getSupabaseIndexBucketName()
    const storageKey = buildArtifactStorageKey({
      orgId: data.orgId,
      tenderId: data.tenderId,
      docHash,
      version: workspaceState.artifactVersion,
    })

    await uploadSupabaseObject(bucket, storageKey, compressedBuffer, {
      cacheControl: '86400',
      contentType: 'application/gzip',
    })

    await prisma.indexArtifact.upsert({
      where: { docHash },
      create: {
        docHash,
        orgId: data.orgId,
        tenderId: data.tenderId,
        version: workspaceState.artifactVersion,
        status: IndexArtifactStatus.READY,
        storageKey,
        totalChunks: workspaceState.totalChunks,
        totalPages: workspaceState.totalPages,
        bytesApprox: compressedBuffer.byteLength,
      },
      update: {
        status: IndexArtifactStatus.READY,
        storageKey,
        totalChunks: workspaceState.totalChunks,
        totalPages: workspaceState.totalPages,
        bytesApprox: compressedBuffer.byteLength,
        version: workspaceState.artifactVersion,
      },
    })

    await writeIndexProgress(
      redis,
      docHash,
      buildProgressSnapshot({
        docHash,
        phase: 'ready',
        percent: 100,
        batchesDone: 0,
        totalBatches: 0,
        message: 'Artifact uploaded',
      }),
    )

    await releaseIndexLock(redis, docHash)
    await cleanupWorkspace(docHash)
  } catch (error) {
    await markArtifactFailed(data, error as Error)
    throw error
  } finally {
    clearInterval(heartbeat)
  }
}

async function embedBatch(chunks: string[], model: string): Promise<{ packed: Uint8Array; dims: number }> {
  const batch = await embedTexts(chunks, { model })
  return {
    packed: encodeFloat32ToFloat16(batch.embeddings),
    dims: batch.dims,
  }
}

function buildManifest(
  workspace: WorkspaceState,
  chunks: ChunkRecord[],
  embeddingModel: string,
): ArtifactManifest {
  const stats = {
    totalChunks: workspace.totalChunks,
    totalPages: workspace.totalPages,
    totalTokens: workspace.totalTokens,
    chunkSize: workspace.chunkSize,
    chunkOverlap: workspace.chunkOverlap,
    embeddingModel,
    embeddingDimensions: workspace.embeddingDimensions,
  }

  const manifest: ArtifactManifest = {
    version: workspace.artifactVersion,
    schema: 'bidwizer.index.v1',
    docHash: workspace.docHash,
    orgId: workspace.orgId,
    tenderId: workspace.tenderId,
    createdAt: workspace.createdAt,
    updatedAt: new Date().toISOString(),
    stats,
    files: workspace.files.map((file) => ({
      fileId: file.fileId,
      path: file.originalPath,
      sha256: file.sha256,
      pages: file.pages,
      size: file.size,
    })),
    hasHnswIndex: false,
    checksum: '',
  }

  const checksum = createHash('sha256')
  checksum.update(JSON.stringify(manifest.stats))
  checksum.update(JSON.stringify(manifest.files))
  checksum.update(workspace.docHash)
  manifest.checksum = checksum.digest('hex')
  return manifest
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
    if (nextStart <= start) {
      start = end
    } else {
      start = nextStart
    }
    if (start >= text.length) {
      break
    }
  }
  return chunks
}

function splitPdfByPage(text: string): string[] {
  return text.split(/\f/g)
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

async function readWorkspaceState(docHash: string): Promise<WorkspaceState> {
  const buffer = await readFile(getWorkspaceFile(docHash, 'state.json'), 'utf-8')
  return JSON.parse(buffer) as WorkspaceState
}

function createStableFileId(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  return createHash('sha1').update(normalized).digest('hex')
}

function startHeartbeat(redis: ReturnType<typeof getRedisClient>, docHash: string): NodeJS.Timeout {
  return setInterval(() => {
    renewIndexLock(redis, docHash).catch((error) => {
      console.warn(`[worker] Failed to renew lock for ${docHash}:`, error)
    })
  }, LOCK_HEARTBEAT_INTERVAL_MS)
}

async function packArtifact(
  pack: tar.Pack,
  entries: Array<[ArtifactInnerFile, Buffer]>,
): Promise<Buffer> {
  const chunks: Buffer[] = []
  const completion = new Promise<void>((resolve, reject) => {
    pack.on('data', (chunk) => chunks.push(chunk as Buffer))
    pack.on('error', reject)
    pack.on('end', resolve)
  })

  for (const [filename, buffer] of entries) {
    pack.entry({ name: filename }, buffer)
  }
  pack.finalize()

  await completion
  return Buffer.concat(chunks)
}

async function markArtifactFailed(jobData: BuildManifestJobData, error: Error): Promise<void> {
  const redis = getRedisClient()
  await prisma.indexArtifact.upsert({
    where: { docHash: jobData.docHash },
    update: {
      status: IndexArtifactStatus.FAILED,
    },
    create: {
      docHash: jobData.docHash,
      orgId: jobData.orgId,
      tenderId: jobData.tenderId,
      version: jobData.artifactVersion ?? INDEX_ARTIFACT_VERSION,
      status: IndexArtifactStatus.FAILED,
      storageKey: '',
      totalChunks: 0,
      totalPages: 0,
      bytesApprox: 0,
    },
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
  await cleanupWorkspace(jobData.docHash)
  await releaseIndexLock(redis, jobData.docHash)
}

async function bootstrap(): Promise<void> {
  const queue = new Queue(INDEX_QUEUE_NAME, {
    connection: getBullQueueConnection(),
    defaultJobOptions: {
      removeOnComplete: true,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    },
  })

  const worker = new Worker(
    INDEX_QUEUE_NAME,
    async (job) => {
      if (job.name === 'build-manifest') {
        await handleBuildManifest(job as Job<BuildManifestJobData>, queue)
        return
      }
      if (job.name === 'embed-batch') {
        await handleEmbedBatch(job as Job<EmbedBatchJobData>, queue)
        return
      }
      if (job.name === 'finalize-artifact') {
        await handleFinalizeArtifact(job as Job<FinalizeArtifactJobData>)
        return
      }
      throw new Error(`Unsupported job name: ${job.name}`)
    },
    {
      connection: getBullQueueConnection(),
      concurrency: 2,
    },
  )

  worker.on('failed', async (job, err) => {
    if (!job) return
    console.error(`[worker] Job ${job.id} failed:`, err)
  })

  worker.on('completed', async (job) => {
    if (!job) return
    console.info(`[worker] Job ${job.name} (${job.id}) completed`)
  })

  process.on('SIGINT', async () => {
    console.log('[worker] Gracefully shutting down')
    await worker.close()
    await queue.close()
    await prisma.$disconnect()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.log('[worker] Termination signal received')
    await worker.close()
    await queue.close()
    await prisma.$disconnect()
    process.exit(0)
  })
}

bootstrap().catch((error) => {
  console.error('Failed to start index worker:', error)
  process.exit(1)
})
