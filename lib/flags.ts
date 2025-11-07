import { env } from './env'

export const flags = {
  emailProvider: env.EMAIL_PROVIDER,
  planEnforcement: env.PLAN_ENFORCEMENT_ENABLED === true,
  watermark: env.WATERMARK_ENABLED,
  pdfOverlayMode: env.PDF_OVERLAY_MODE,
  storageDriver: env.STORAGE_DRIVER,
  queueDriver: env.QUEUE_DRIVER,
  ingestionMode: env.INGESTION_MODE,
  retrievalTopK: Number.isFinite(env.RETRIEVAL_TOP_K) && env.RETRIEVAL_TOP_K > 0 ? env.RETRIEVAL_TOP_K : 8,
  embedBatchSize:
    Number.isFinite(env.EMBED_BATCH_SIZE) && env.EMBED_BATCH_SIZE > 0 ? env.EMBED_BATCH_SIZE : 128,
  partialReadyThreshold:
    Number.isFinite(env.PARTIAL_READY_THRESHOLD) && env.PARTIAL_READY_THRESHOLD > 0
      ? Math.min(1, env.PARTIAL_READY_THRESHOLD)
      : 0.2,
} as const
