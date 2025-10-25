export type IndexPhase = 'queued' | 'manifest' | 'embedding' | 'finalize' | 'ready' | 'failed'

export interface IndexProgressSnapshot {
  docHash: string
  phase: IndexPhase
  percent: number
  batchesDone: number
  totalBatches: number
  etaSeconds: number | null
  message: string | null
  updatedAt: number
}

export interface IndexResumeState {
  lastFile?: string | null
  lastPage?: number | null
  lastOffset?: number | null
  batchesProcessed?: number | null
}

export interface ManifestFileEntry {
  fileId: string
  path: string
  sha256: string
  pages: number
  size: number
  skipped?: boolean
}

export interface ManifestStats {
  totalChunks: number
  totalPages: number
  totalTokens: number
  chunkSize: number
  chunkOverlap: number
  embeddingModel: string
  embeddingDimensions: number
}

export interface ArtifactManifest {
  version: number
  schema: string
  docHash: string
  orgId: string
  tenderId: string
  createdAt: string
  updatedAt: string
  stats: ManifestStats
  files: ManifestFileEntry[]
  hasHnswIndex: boolean
  checksum: string
}

export interface ChunkRecord {
  chunkId: string
  fileId: string
  page: number
  offset: number
  length: number
  md5: string
  text?: string
}

export interface FileNameMapEntry {
  path: string
  name: string
  pages: number
}

export type FileNameMap = Record<string, FileNameMapEntry>

export interface LoadedArtifact {
  docHash: string
  manifest: ArtifactManifest
  chunks: ChunkRecord[]
  embeddings: Float32Array
  embeddingsF16Bytes: Uint8Array
  dims: number
  names: FileNameMap
  bytes: number
  hnsw?: VectorSearchAdapter | null
}

export interface VectorMatch {
  index: number
  score: number
}

export interface VectorSearchAdapter {
  readonly dims: number
  search(vector: Float32Array, topK: number, filter?: (index: number) => boolean): Promise<VectorMatch[]>
  close?(): void | Promise<void>
}
