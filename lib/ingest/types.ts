import type { DocStatus } from '@prisma/client'

import type { DocumentStoragePaths } from '@/lib/ingest/paths'

export interface ManifestJobPayload {
  uploadId: string
  orgId: string
  tenderId: string
}

export interface BaseIngestJobPayload {
  orgId: string
  tenderId: string
  documentId: string
  docHash: string
  storage: {
    bucket: string
    rawKey: string
    extractedKey: string
    chunksKey: string
    summaryKey: string
  }
  uploadId: string
  filename: string
}

export type ExtractJobPayload = BaseIngestJobPayload
export type ChunkJobPayload = BaseIngestJobPayload & {
  extractedPages: number
}
export type EmbedJobPayload = BaseIngestJobPayload & {
  chunkCount: number
}
export type SummaryJobPayload = BaseIngestJobPayload & {
  chunkCount: number
}

export interface ManifestDocumentRecord {
  documentId: string
  docHash: string
  filename: string
  bytes: number
  mime: string
  storage: DocumentStoragePaths & { bucket: string }
  status: DocStatus
  pages?: number | null
  hasText?: boolean | null
}
