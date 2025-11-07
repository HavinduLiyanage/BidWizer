import 'server-only'

import IORedis, { type Redis, type RedisOptions } from 'ioredis'

import { env } from '@/lib/env'
import { log } from '@/lib/log'
import { PROGRESS_TTL_SECONDS } from '@/lib/indexing/constants'
import type { IndexPhase, IndexProgressSnapshot, IndexResumeState } from '@/lib/indexing/types'

const DEFAULT_LOCK_TTL_SECONDS = 30 * 60

type RedisGlobalState = {
  client?: Redis | null
  evictionPolicyChecked?: boolean
}

declare global {
  // eslint-disable-next-line no-var
  var __BIDWIZER_REDIS__: RedisGlobalState | undefined
}

const globalState = (globalThis.__BIDWIZER_REDIS__ ??= {})

let sharedClient: Redis | null = globalState.client ?? null
let evictionPolicyChecked = globalState.evictionPolicyChecked ?? false

async function ensureRedisNoEviction(client: Redis): Promise<void> {
  if (evictionPolicyChecked) return
  evictionPolicyChecked = true
  globalState.evictionPolicyChecked = true
  try {
    // Ensure connection is established before CONFIG
    // ioredis with lazyConnect requires an explicit connect
    // If already connected, this is a no-op
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await (client as any).connect?.()

    const response = (await (client as any).config('GET', 'maxmemory-policy')) as
      | string[]
      | null
      | undefined
    const arr = Array.isArray(response) ? response : []
    const currentPolicy = arr.length >= 2 ? String(arr[1]) : ''

    if (currentPolicy && currentPolicy.toLowerCase() !== 'noeviction') {
      try {
        await (client as any).config('SET', 'maxmemory-policy', 'noeviction')
        // Re-read to confirm
        const verify = (await (client as any).config('GET', 'maxmemory-policy')) as string[]
        const verified = Array.isArray(verify) && verify[1] ? String(verify[1]) : ''
        if (verified.toLowerCase() !== 'noeviction') {
          console.warn(
            `IMPORTANT! Eviction policy is ${currentPolicy}. It should be "noeviction". Could not change automatically. Update your Redis config (maxmemory-policy noeviction).`,
          )
        }
      } catch (error) {
        console.warn(
          `IMPORTANT! Eviction policy is ${currentPolicy}. It should be "noeviction". Lacking permission to change it automatically. Please run: CONFIG SET maxmemory-policy noeviction (and persist in redis.conf)`,
        )
      }
    }
  } catch {
    // Ignore CONFIG errors entirely for providers that disallow CONFIG commands
  }
}

function buildRedisOptions(url: string): RedisOptions {
  const baseOptions: RedisOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  }

  if (!url.startsWith('redis://') && !url.startsWith('rediss://')) {
    return {
      ...baseOptions,
      path: url,
    }
  }

  const parsed = new URL(url)
  const options: RedisOptions = {
    ...baseOptions,
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
  }

  if (parsed.username) {
    options.username = decodeURIComponent(parsed.username)
  }

  if (parsed.password) {
    options.password = decodeURIComponent(parsed.password)
  }

  const db = parsed.pathname.replace('/', '').trim()
  if (db) {
    const dbIndex = Number(db)
    if (!Number.isNaN(dbIndex)) {
      options.db = dbIndex
    }
  }

  if (parsed.protocol === 'rediss:') {
    options.tls = {}
  }

  return options
}

function resolveRedisUrl(): string {
  const primary = env.REDIS_URL ?? env.UPSTASH_REDIS_URL
  if (!primary) {
    throw new Error('Redis is not configured. Expected REDIS_URL or UPSTASH_REDIS_URL.')
  }
  return primary
}

function createBaseRedisClient(): Redis {
  const url = resolveRedisUrl()
  const options = buildRedisOptions(url)
  return new IORedis(options)
}

export function getRedisClient(): Redis {
  if (!sharedClient) {
    sharedClient = createBaseRedisClient()
    globalState.client = sharedClient
    // Fire-and-forget best-effort policy check
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ensureRedisNoEviction(sharedClient)
  }
  return sharedClient
}

export function createRedisConnection(): Redis {
  return getRedisClient().duplicate()
}

export function getBullQueueConnection(): RedisOptions {
  const url = resolveRedisUrl()
  return buildRedisOptions(url)
}

export function indexLockKey(docHash: string): string {
  return `lock:index:${docHash}`
}

export function indexProgressKey(docHash: string): string {
  return `progress:index:${docHash}`
}

export function indexResumeKey(docHash: string): string {
  return `resume:index:${docHash}`
}

export async function acquireIndexLock(
  redis: Redis,
  docHash: string,
  ttlSeconds: number = DEFAULT_LOCK_TTL_SECONDS,
): Promise<boolean> {
  const result = await redis.set(indexLockKey(docHash), '1', 'EX', ttlSeconds, 'NX')
  return result === 'OK'
}

export async function renewIndexLock(
  redis: Redis,
  docHash: string,
  ttlSeconds: number = DEFAULT_LOCK_TTL_SECONDS,
): Promise<void> {
  await redis.expire(indexLockKey(docHash), ttlSeconds)
}

export async function releaseIndexLock(redis: Redis, docHash: string): Promise<void> {
  await redis.del(indexLockKey(docHash))
}

export async function readIndexProgress(redis: Redis, docHash: string): Promise<IndexProgressSnapshot | null> {
  const raw = await redis.get(indexProgressKey(docHash))
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as IndexProgressSnapshot
    return parsed
  } catch (error) {
    console.warn(`[redis] Failed to parse progress payload for ${docHash}:`, error)
    return null
  }
}

export async function writeIndexProgress(
  redis: Redis,
  docHash: string,
  progress: IndexProgressSnapshot,
): Promise<void> {
  await redis.set(indexProgressKey(docHash), JSON.stringify(progress), 'EX', PROGRESS_TTL_SECONDS)
}

export async function writeIndexResumeState(
  redis: Redis,
  docHash: string,
  state: IndexResumeState,
): Promise<void> {
  await redis.set(indexResumeKey(docHash), JSON.stringify(state), 'EX', PROGRESS_TTL_SECONDS)
}

export async function readIndexResumeState(redis: Redis, docHash: string): Promise<IndexResumeState | null> {
  const raw = await redis.get(indexResumeKey(docHash))
  if (!raw) return null
  try {
    return JSON.parse(raw) as IndexResumeState
  } catch (error) {
    console.warn(`[redis] Failed to parse resume payload for ${docHash}:`, error)
    return null
  }
}

export async function clearIndexState(redis: Redis, docHash: string): Promise<void> {
  await redis.del(indexProgressKey(docHash), indexResumeKey(docHash), indexLockKey(docHash))
}

export function buildProgressSnapshot(params: {
  docHash: string
  phase: IndexPhase
  percent: number
  batchesDone: number
  totalBatches: number
  etaSeconds?: number | null
  message?: string | null
}): IndexProgressSnapshot {
  return {
    docHash: params.docHash,
    phase: params.phase,
    percent: Math.min(100, Math.max(0, params.percent)),
    batchesDone: params.batchesDone,
    totalBatches: params.totalBatches,
    etaSeconds: typeof params.etaSeconds === 'number' ? Math.max(0, params.etaSeconds) : null,
    message: params.message ?? null,
    updatedAt: Date.now(),
  }
}

export type { Redis }

export async function withLock<T>(
  key: string,
  ttlMs: number,
  work: () => Promise<T>,
): Promise<T | null> {
  const redis = getRedisClient()
  const acquired = await redis.set(key, '1', 'PX', ttlMs, 'NX')

  if (acquired !== 'OK') {
    log('lock', 'acquire-skipped', { key })
    return null
  }

  const heartbeatInterval = Math.max(1000, Math.floor(ttlMs / 2))
  const heartbeat = setInterval(() => {
    void redis
      .pexpire(key, ttlMs)
      .then((extended) => {
        if (extended) {
          log('lock', 'heartbeat', { key, ttlMs })
        } else {
          log('lock', 'heartbeat-missed', { key })
        }
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        log('lock', 'heartbeat-error', { key, error: message })
      })
  }, heartbeatInterval)

  try {
    const result = await work()
    return result
  } finally {
    clearInterval(heartbeat)
    try {
      await redis.del(key)
      log('lock', 'released', { key })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log('lock', 'release-error', { key, error: message })
    }
  }
}
