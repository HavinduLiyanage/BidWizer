import type { Worker } from 'bullmq'

import { startChunkWorker } from '@/server/workers/ingest/chunkWorker'
import { startEmbedWorker } from '@/server/workers/ingest/embedWorker'
import { startExtractWorker } from '@/server/workers/ingest/extractWorker'
import { startManifestWorker } from '@/server/workers/ingest/manifestWorker'
import { startSummaryWorker } from '@/server/workers/ingest/summaryWorker'

let started = false
const workers: Worker[] = []

export function startIngestWorkers(): Worker[] {
  if (started) {
    return workers
  }

  workers.push(
    startManifestWorker(),
    startExtractWorker(),
    startChunkWorker(),
    startEmbedWorker(),
    startSummaryWorker(),
  )

  started = true
  return workers
}
