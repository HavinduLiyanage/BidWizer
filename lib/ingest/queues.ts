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

const queues = new Map<QueueName, Queue<BaseIngestJobPayload | ManifestJobPayload>>()

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

function defaultJobOptions(): JobsOptions {
  return {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  }
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
  return getQueue(queueName)
    .add(jobName, payload, {
      jobId,
      ...options,
    })
    .then((job) => job.id ?? jobId)
}

function buildStageJobId(payload: BaseIngestJobPayload, stage: string): string {
  return `${payload.orgId}:${payload.tenderId}:${payload.docHash}:${stage}`
}

export { QUEUE_NAMES }
