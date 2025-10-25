import { basename } from 'path'
import { Readable } from 'stream'

import { gunzipSync } from 'fflate'
import tar from 'tar-stream'

import { LruCache } from '@/lib/cache'
import {
  MAX_ARTIFACT_CACHE_BYTES,
  MAX_ARTIFACT_CACHE_ENTRIES,
} from '@/lib/indexing/constants'
import {
  INDEX_CHUNKS_FILENAME,
  INDEX_EMBEDDINGS_FILENAME,
  INDEX_FILE_MAP_FILENAME,
  INDEX_HNSW_FILENAME,
  INDEX_MANIFEST_FILENAME,
} from '@/lib/indexing/constants'
import type {
  ArtifactManifest,
  ChunkRecord,
  FileNameMap,
  LoadedArtifact,
  VectorMatch,
  VectorSearchAdapter,
} from '@/lib/indexing/types'
import { downloadSupabaseObject, getSupabaseIndexBucketName } from '@/lib/storage'

interface LoadArtifactParams {
  storageKey: string
  bucket?: string
  docHash?: string
  preferCache?: boolean
}

const artifactCache = new LruCache<LoadedArtifact>({
  maxEntries: MAX_ARTIFACT_CACHE_ENTRIES,
  maxSizeBytes: MAX_ARTIFACT_CACHE_BYTES,
  onDispose: (artifact) => {
    artifact.hnsw?.close?.()
  },
})

export function getCachedArtifact(docHash: string): LoadedArtifact | undefined {
  return artifactCache.get(docHash)
}

export function releaseCachedArtifact(docHash: string): boolean {
  return artifactCache.delete(docHash)
}

export async function loadArtifact(params: LoadArtifactParams): Promise<LoadedArtifact> {
  const bucket = params.bucket ?? getSupabaseIndexBucketName()
  const cached = params.docHash ? getCachedArtifact(params.docHash) : undefined
  if (cached && params.preferCache !== false) {
    return cached
  }

  const payload = await downloadSupabaseObject(bucket, params.storageKey)
  const artifact = await unpackArtifact(payload)

  if (params.docHash && artifact.docHash !== params.docHash) {
    throw new Error(
      `Artifact doc hash mismatch. Expected ${params.docHash}, got ${artifact.docHash}`,
    )
  }

  artifactCache.set(artifact.docHash, artifact, artifact.bytes)
  return artifact
}

async function unpackArtifact(buffer: Buffer): Promise<LoadedArtifact> {
  const tarBuffer = Buffer.from(gunzipSync(buffer))

  const files = await extractTarEntries(tarBuffer)

  const manifestBuffer = files.get(INDEX_MANIFEST_FILENAME)
  if (!manifestBuffer) {
    throw new Error('Artifact missing manifest.json')
  }
  const manifest = JSON.parse(manifestBuffer.toString('utf-8')) as ArtifactManifest

  const namesBuffer = files.get(INDEX_FILE_MAP_FILENAME)
  const names: FileNameMap = namesBuffer
    ? (JSON.parse(namesBuffer.toString('utf-8')) as FileNameMap)
    : {}

  const chunksBuffer = files.get(INDEX_CHUNKS_FILENAME)
  if (!chunksBuffer) {
    throw new Error('Artifact missing chunks.jsonl.gz')
  }
  const decompressedChunks = Buffer.from(gunzipSync(chunksBuffer))
  const chunkRecords = parseChunkJsonl(decompressedChunks.toString('utf-8'))

  const embeddingsBuffer = files.get(INDEX_EMBEDDINGS_FILENAME)
  if (!embeddingsBuffer) {
    throw new Error('Artifact missing embeddings.f16.bin')
  }

  const dims = manifest.stats.embeddingDimensions
  if (dims <= 0) {
    throw new Error(`Manifest embedding dimensions invalid: ${dims}`)
  }

  const embeddingsF16Bytes = new Uint8Array(
    embeddingsBuffer.buffer,
    embeddingsBuffer.byteOffset,
    embeddingsBuffer.length,
  )
  const embeddings = decodeFloat16Embeddings(embeddingsF16Bytes, dims)

  const hnswBuffer = files.get(INDEX_HNSW_FILENAME)
  let hnsw: VectorSearchAdapter | null = null
  if (hnswBuffer && hnswBuffer.byteLength > 0) {
    // TODO: plug actual HNSW implementation; placeholder retains buffer for future use.
    hnsw = null
  }

  const namesSize = namesBuffer?.byteLength ?? 0
  const hnswSize = hnswBuffer?.byteLength ?? 0
  const bytes =
    manifestBuffer.byteLength + namesSize + chunksBuffer.byteLength + embeddingsBuffer.byteLength + hnswSize

  return {
    docHash: manifest.docHash,
    manifest,
    chunks: chunkRecords,
    embeddings,
    embeddingsF16Bytes,
    dims,
    names,
    bytes,
    hnsw,
  }
}

async function extractTarEntries(buffer: Buffer): Promise<Map<string, Buffer>> {
  const extract = tar.extract()
  const result = new Map<string, Buffer>()

  const completion = new Promise<void>((resolve, reject) => {
    extract.on('entry', (header, stream, next) => {
      const chunks: Buffer[] = []
      stream.on('data', (chunk) => chunks.push(chunk as Buffer))
      stream.on('error', reject)
      stream.on('end', () => {
        result.set(basename(header.name), Buffer.concat(chunks))
        next()
      })
      stream.resume()
    })
    extract.on('finish', resolve)
    extract.on('error', reject)
  })

  Readable.from(buffer).pipe(extract)
  await completion
  return result
}

function parseChunkJsonl(jsonl: string): ChunkRecord[] {
  const chunks: ChunkRecord[] = []
  const lines = jsonl.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const parsed = JSON.parse(trimmed) as ChunkRecord
      chunks.push(parsed)
    } catch (error) {
      console.warn('[indexing] Failed to parse chunk JSON line:', error)
    }
  }
  return chunks
}

export async function searchArtifactVectors(
  artifact: LoadedArtifact,
  queryEmbedding: Float32Array,
  topK: number,
): Promise<VectorMatch[]> {
  if (artifact.hnsw) {
    return artifact.hnsw.search(queryEmbedding, topK)
  }
  return bruteForceSearch(artifact, queryEmbedding, topK)
}

function bruteForceSearch(
  artifact: LoadedArtifact,
  queryEmbedding: Float32Array,
  topK: number,
): VectorMatch[] {
  const { embeddings, dims } = artifact
  const totalVectors = embeddings.length / dims
  const scores: VectorMatch[] = []

  for (let index = 0; index < totalVectors; index += 1) {
    const score = dotProduct(embeddings, queryEmbedding, index * dims, dims)
    scores.push({ index, score })
  }

  scores.sort((a, b) => b.score - a.score)
  return scores.slice(0, Math.min(topK, scores.length))
}

function dotProduct(
  embeddings: Float32Array,
  vector: Float32Array,
  start: number,
  length: number,
): number {
  let sum = 0
  for (let i = 0; i < length; i += 1) {
    sum += embeddings[start + i] * vector[i]
  }
  return sum
}

function decodeFloat16Embeddings(data: Uint8Array, dims: number): Float32Array {
  if (data.byteLength % 2 !== 0) {
    throw new Error(`Float16 embedding buffer must be even length, got ${data.byteLength}`)
  }
  const totalValues = data.byteLength / 2
  const output = new Float32Array(totalValues)
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)

  for (let i = 0; i < totalValues; i += 1) {
    const raw = view.getUint16(i * 2, true)
    output[i] = float16ToFloat32(raw)
  }

  if (output.length % dims !== 0) {
    throw new Error(
      `Embedding vector length ${output.length} not divisible by dimensions ${dims}`,
    )
  }

  return output
}

function float16ToFloat32(value: number): number {
  const sign = (value & 0x8000) << 16
  let exponent = value & 0x7c00
  let fraction = value & 0x03ff

  if (exponent === 0x7c00) {
    exponent = 0xff << 23
  } else if (exponent !== 0) {
    exponent = ((exponent >> 10) + (127 - 15)) << 23
  } else if (fraction !== 0) {
    // Subnormal number
    let exp = -1
    fraction <<= 1
    while ((fraction & 0x0400) === 0) {
      fraction <<= 1
      exp -= 1
    }
    fraction &= 0x03ff
    exponent = ((exp + 127) << 23) & 0x7f800000
  }

  const fractionShifted = (fraction & 0x03ff) << 13
  const floatView = new DataView(new ArrayBuffer(4))
  floatView.setUint32(0, sign | exponent | fractionShifted, false)
  return floatView.getFloat32(0, false)
}
