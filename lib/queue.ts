import IORedis from 'ioredis'
import { Queue } from 'bullmq'

import { env } from '@/lib/env'

const url = env.REDIS_URL ?? env.UPSTASH_REDIS_URL

if (!url) {
  throw new Error('REDIS_URL is not configured')
}

const isTLS = url.startsWith('rediss://')

type QueueGlobalState = {
  connection?: IORedis
  queue?: Queue
}

declare global {
  // eslint-disable-next-line no-var
  var __BIDWIZER_QUEUE_STATE__:
    | QueueGlobalState
    | undefined
}

const globalState =
  (globalThis.__BIDWIZER_QUEUE_STATE__ ??= {})

export const connection =
  globalState.connection ??
  (globalState.connection = new IORedis(url, {
    ...(isTLS ? { tls: {} } : {}),
    maxRetriesPerRequest: null,
  }))

export const INDEX_QUEUE =
  env.BIDWIZER_INDEX_QUEUE && env.BIDWIZER_INDEX_QUEUE.length > 0
    ? env.BIDWIZER_INDEX_QUEUE
    : 'tender-indexing'

export const indexingQueue =
  globalState.queue ??
  (globalState.queue = new Queue(INDEX_QUEUE, {
    connection,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    },
  }))
