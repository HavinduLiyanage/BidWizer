import { Queue, type JobsOptions } from 'bullmq'
import type { Redis } from 'ioredis'

import { createRedisConnection } from '@/lib/redis'
import { INDEX_QUEUE_NAME } from '@/lib/indexing/constants'

export interface BuildManifestJobPayload {
  docHash: string
  orgId: string
  tenderId: string
  uploadStorageKey: string
  uploadBucket?: string
  artifactVersion?: number
}

type GlobalIndexQueueState = {
  queue: Queue<BuildManifestJobPayload> | null
  connection: Redis | null
}

declare global {
  // eslint-disable-next-line no-var
  var __BIDWIZER_INDEX_QUEUE__:
    | GlobalIndexQueueState
    | undefined
}

const globalState =
  (globalThis.__BIDWIZER_INDEX_QUEUE__ ??= {
    queue: null,
    connection: null,
  })

let queue: Queue<BuildManifestJobPayload> | null = globalState.queue
let queueConnection: Redis | null = globalState.connection

function getQueueConnection(): Redis {
  if (!queueConnection) {
    queueConnection = createRedisConnection()
    globalState.connection = queueConnection
  }
  return queueConnection
}

export function getIndexingQueue(): Queue<BuildManifestJobPayload> {
  if (!queue) {
    queue = new Queue<BuildManifestJobPayload>(INDEX_QUEUE_NAME, {
      connection: getQueueConnection(),
      defaultJobOptions: defaultJobOptions(),
    })
    globalState.queue = queue
  }
  return queue
}

export async function enqueueIndexBuild(
  payload: BuildManifestJobPayload,
  jobOptions: JobsOptions = {},
): Promise<string> {
  const job = await getIndexingQueue().add('build-manifest', payload, {
    removeOnComplete: true,
    removeOnFail: false,
    ...jobOptions,
  })
  return job.id ?? `${payload.docHash}:${Date.now()}`
}

function defaultJobOptions(): JobsOptions {
  return {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  }
}
