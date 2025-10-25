import { Queue, type JobsOptions } from 'bullmq'

import { getBullQueueConnection } from '@/lib/redis'
import { INDEX_QUEUE_NAME } from '@/lib/indexing/constants'

export interface BuildManifestJobPayload {
  docHash: string
  orgId: string
  tenderId: string
  uploadStorageKey: string
  uploadBucket?: string
  artifactVersion?: number
}

let queue: Queue<BuildManifestJobPayload> | null = null

export function getIndexingQueue(): Queue<BuildManifestJobPayload> {
  if (!queue) {
    queue = new Queue<BuildManifestJobPayload>(INDEX_QUEUE_NAME, {
      connection: getBullQueueConnection(),
      defaultJobOptions: defaultJobOptions(),
    })
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
