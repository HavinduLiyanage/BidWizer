import IORedis from 'ioredis'
import { Queue } from 'bullmq'

const url = process.env.REDIS_URL

if (!url) {
  throw new Error('REDIS_URL is not configured')
}

const isTLS = url.startsWith('rediss://')

export const connection = new IORedis(url, {
  ...(isTLS ? { tls: {} } : {}),
  maxRetriesPerRequest: null,
})

export const INDEX_QUEUE = process.env.BIDWIZER_INDEX_QUEUE || 'tender-indexing'

export const indexingQueue = new Queue(INDEX_QUEUE, {
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
})
