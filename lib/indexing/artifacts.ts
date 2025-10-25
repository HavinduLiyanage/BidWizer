import crypto from 'crypto'
import { join as joinPath } from 'path'

import {
  ARTIFACT_STORAGE_PREFIX,
  INDEX_ARTIFACT_FILENAME,
  INDEX_ARTIFACT_VERSION,
  INDEX_CHUNKS_FILENAME,
  INDEX_EMBEDDINGS_FILENAME,
  INDEX_FILE_MAP_FILENAME,
  INDEX_HNSW_FILENAME,
  INDEX_MANIFEST_FILENAME,
} from '@/lib/indexing/constants'

export interface ArtifactStorageDescriptor {
  storageKey: string
  bucket: string
}

export interface ArtifactPathParams {
  orgId: string
  tenderId: string
  docHash: string
  version?: number
}

export function buildArtifactStorageKey(params: ArtifactPathParams): string {
  const version = params.version ?? INDEX_ARTIFACT_VERSION
  return [
    ARTIFACT_STORAGE_PREFIX,
    params.orgId,
    params.tenderId,
    'indexes',
    params.docHash,
    `v${version}`,
    INDEX_ARTIFACT_FILENAME,
  ].join('/')
}

export function buildArtifactWorkingDirectory(baseDir: string, docHash: string): string {
  return joinPath(baseDir, docHash)
}

export function artifactInnerPath(filename: ArtifactInnerFile): string {
  return filename
}

export type ArtifactInnerFile =
  | typeof INDEX_MANIFEST_FILENAME
  | typeof INDEX_CHUNKS_FILENAME
  | typeof INDEX_EMBEDDINGS_FILENAME
  | typeof INDEX_FILE_MAP_FILENAME
  | typeof INDEX_HNSW_FILENAME

export const ARTIFACT_INNER_FILES: ArtifactInnerFile[] = [
  INDEX_MANIFEST_FILENAME,
  INDEX_CHUNKS_FILENAME,
  INDEX_EMBEDDINGS_FILENAME,
  INDEX_FILE_MAP_FILENAME,
  INDEX_HNSW_FILENAME,
]

export function computeDocHashFromBuffer(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

export function computeDocHashFromList(items: string[]): string {
  const sorted = [...items].sort((a, b) => a.localeCompare(b))
  const hash = crypto.createHash('sha256')
  for (const item of sorted) {
    hash.update(item)
    hash.update('|')
  }
  return hash.digest('hex')
}

export interface ArtifactKeyComponents {
  orgId: string
  tenderId: string
  docHash: string
  version: number
}

export function parseArtifactStorageKey(storageKey: string): ArtifactKeyComponents | null {
  const segments = storageKey.split('/').filter(Boolean)

  if (segments.length < 6) {
    return null
  }

  const [prefix, orgId, tenderId, indexesSegment, docHash, versionSegment, filename] = segments.slice(-7)

  if (prefix !== ARTIFACT_STORAGE_PREFIX || indexesSegment !== 'indexes') {
    return null
  }

  const versionMatch = /^v(\d+)$/.exec(versionSegment)
  if (!versionMatch) {
    return null
  }

  if (filename !== INDEX_ARTIFACT_FILENAME) {
    return null
  }

  return {
    orgId,
    tenderId,
    docHash,
    version: Number.parseInt(versionMatch[1], 10),
  }
}
