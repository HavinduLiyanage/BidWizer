import { readEnvVar } from '../env'

export const INDEX_ARTIFACT_VERSION = 1
export const INDEX_ARTIFACT_FILENAME = 'index.v1.tar.gz'
export const INDEX_MANIFEST_FILENAME = 'manifest.json'
export const INDEX_CHUNKS_FILENAME = 'chunks.jsonl.gz'
export const INDEX_EMBEDDINGS_FILENAME = 'embeddings.f16.bin'
export const INDEX_HNSW_FILENAME = 'hnsw.index'
export const INDEX_FILE_MAP_FILENAME = 'names.map.json'

export const ARTIFACT_STORAGE_PREFIX = 'tenders'

export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small'
export const DEFAULT_EMBEDDING_DIMENSION = 1536
export const DEFAULT_CHUNK_SIZE = 1024
export const DEFAULT_CHUNK_OVERLAP = 160

export const MAX_ARTIFACT_CACHE_ENTRIES = 5
export const MAX_ARTIFACT_CACHE_BYTES = 512 * 1024 * 1024 // 512 MB default cache budget

export const LOCK_HEARTBEAT_INTERVAL_MS = 25_000
export const PROGRESS_TTL_SECONDS = 12 * 60 * 60

const DEFAULT_INDEX_QUEUE_NAME = 'tender-indexing'
export const INDEX_QUEUE_NAME =
  readEnvVar('BIDWIZER_INDEX_QUEUE') || DEFAULT_INDEX_QUEUE_NAME
