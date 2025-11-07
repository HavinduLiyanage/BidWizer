import { Queue, type JobsOptions } from 'bullmq'

import { createRedisConnection } from '@/lib/redis'
import type {
  BaseIngestJobPayload,
  ChunkJobPayload,
  EmbedJobPayload,
  ExtractJobPayload,
  ManifestJobPayload,
  SummaryJobPayload,
} from '@/lib/ingest/types'

type QueueName = 'manifest' | 'extract' | 'chunk' | 'embed' | 'summary'

const QUEUE_NAMES: Record<QueueName, string> = {
  manifest: 'ingest:manifest',
  extract: 'ingest:extract',
  chunk: 'ingest:chunk',
  embed: 'ingest:embed',
  summary: 'ingest:summary',
}

type IngestQueue = Queue<BaseIngestJobPayload | ManifestJobPayload>

declare global {
  // eslint-disable-next-line no-var
  var __BIDWIZER_INGEST_QUEUES__:
    | Map<QueueName, IngestQueue>
    | undefined
}

const globalQueues =
  (globalThis.__BIDWIZER_INGEST_QUEUES__ ??= new Map<QueueName, IngestQueue>())

const queues = globalQueues

function getQueue(name: QueueName): Queue<BaseIngestJobPayload | ManifestJobPayload> {
  if (!queues.has(name)) {
    queues.set(
      name,
      new Queue<BaseIngestJobPayload | ManifestJobPayload>(QUEUE_NAMES[name], {
        connection: createRedisConnection(),
        defaultJobOptions: defaultJobOptions(),
      }),
    )
  }
  return queues.get(name)!
}

const STAGE_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: 1000,
  removeOnFail: 1000,
}

function defaultJobOptions(): JobsOptions {
  return { ...STAGE_JOB_OPTIONS }
}

export function enqueueManifestJob(payload: ManifestJobPayload, options: JobsOptions = {}): Promise<string> {
  const jobId = `${payload.orgId}:${payload.tenderId}:${payload.uploadId}:manifest`
  return enqueue('manifest', 'manifest', payload as unknown as BaseIngestJobPayload, jobId, options)
}

export function enqueueExtractJob(
  payload: ExtractJobPayload,
  options: JobsOptions = {},
): Promise<string> {
  const jobId = buildStageJobId(payload, 'extract')
  return enqueue('extract', 'extract', payload, jobId, options)
}

export function enqueueChunkJob(payload: ChunkJobPayload, options: JobsOptions = {}): Promise<string> {
  const jobId = buildStageJobId(payload, 'chunk')
  return enqueue('chunk', 'chunk', payload, jobId, options)
}

export function enqueueEmbedJob(payload: EmbedJobPayload, options: JobsOptions = {}): Promise<string> {
  const jobId = buildStageJobId(payload, 'embed')
  return enqueue('embed', 'embed', payload, jobId, options)
}

export function enqueueSummaryJob(
  payload: SummaryJobPayload,
  options: JobsOptions = {},
): Promise<string> {
  const jobId = buildStageJobId(payload, 'summary')
  return enqueue('summary', 'summary', payload, jobId, options)
}

function enqueue(
  queueName: QueueName,
  jobName: string,
  payload: BaseIngestJobPayload,
  jobId: string,
  options: JobsOptions,
): Promise<string> {
  const queue = getQueue(queueName)
  const baseOptions = { ...STAGE_JOB_OPTIONS, ...options }
  return queue
    .add(jobName, payload, {
      ...baseOptions,
      jobId,
    })
    .then((job) => job.id ?? jobId)
    .catch((error: unknown) => {
      if (error instanceof Error) {
        const message = error.message.toLowerCase()
        if (message.includes('already exists') || message.includes('jobid')) {
          return jobId
        }
      }
      throw error
    })
}

function buildStageJobId(payload: BaseIngestJobPayload, stage: string): string {
  return `${payload.orgId}:${payload.tenderId}:${payload.docHash}:${stage}`
}

export { QUEUE_NAMES }
