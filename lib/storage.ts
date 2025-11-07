import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { env } from '@/lib/env'

const DEFAULT_UPLOADS_BUCKET = 'tender-uploads'
const DEFAULT_INDEX_BUCKET = 'tender-indexes'
const bucketEnsurePromises = new Map<string, Promise<void>>()
const DEFAULT_BUCKET_FILE_SIZE_LIMIT = 524_288_000 // 500 MB

function resolveDesiredBucketFileSizeLimit(): number | null {
  const rawBytes = env.SUPABASE_OBJECT_MAX_BYTES
  if (rawBytes && rawBytes.length > 0) {
    const numeric = Number(rawBytes)
    if (Number.isFinite(numeric) && numeric >= 0) {
      return numeric === 0 ? null : numeric
    }
    console.warn(
      `[storage] Ignoring invalid SUPABASE_OBJECT_MAX_BYTES value "${rawBytes}", falling back to default`,
    )
  }

  const rawMb = env.SUPABASE_OBJECT_MAX_MB
  if (rawMb && rawMb.length > 0) {
    const numeric = Number(rawMb)
    if (Number.isFinite(numeric) && numeric >= 0) {
      return numeric === 0 ? null : numeric * 1024 * 1024
    }
    console.warn(
      `[storage] Ignoring invalid SUPABASE_OBJECT_MAX_MB value "${rawMb}", falling back to default`,
    )
  }

  return DEFAULT_BUCKET_FILE_SIZE_LIMIT
}

const DESIRED_BUCKET_FILE_SIZE_LIMIT = resolveDesiredBucketFileSizeLimit()

type UploadBody =
  | File
  | Blob
  | ArrayBuffer
  | Buffer
  | ReadableStream<Uint8Array>
  | NodeJS.ReadableStream

function assertServerContext() {
  if (typeof window !== 'undefined') {
    throw new Error('Supabase service clients must only be created on the server')
  }
}

type StringEnvKey = {
  [K in keyof typeof env]: typeof env[K] extends string | undefined ? K : never
}[keyof typeof env]

function resolveEnv(keys: readonly StringEnvKey[], fallback: string): string {
  for (const key of keys) {
    const value = env[key as keyof typeof env]
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
  }
  return fallback
}

export function createSupabaseServiceClient(): SupabaseClient {
  assertServerContext()

  const supabaseUrl = env.SUPABASE_URL
  const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase environment variables are not configured')
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  })
}

export function getSupabaseUploadsBucketName(): string {
  return resolveEnv(
    ['SUPABASE_TENDER_UPLOADS_BUCKET', 'SUPABASE_STORAGE_UPLOADS_BUCKET'],
    DEFAULT_UPLOADS_BUCKET,
  )
}

export function getSupabaseIndexBucketName(): string {
  return resolveEnv(
    ['SUPABASE_TENDER_INDEX_BUCKET', 'SUPABASE_STORAGE_INDEX_BUCKET'],
    DEFAULT_INDEX_BUCKET,
  )
}

function isBucketMissing(message: string | undefined): boolean {
  if (!message) return false
  const normalized = message.toLowerCase()
  return normalized.includes('not found') || normalized.includes('does not exist')
}

function isFileSizeLimitConstraint(message: string | undefined): boolean {
  if (!message) return false
  return message.toLowerCase().includes('maximum allowed size')
}

async function ensureBucketExists(client: SupabaseClient, bucket: string): Promise<void> {
  const existing = bucketEnsurePromises.get(bucket)
  if (existing) {
    await existing
    return
  }

  const ensurePromise = (async () => {
    const { data, error } = await client.storage.getBucket(bucket)

    if (data) {
      const sizeLimit = data.file_size_limit
      const currentLimit =
        typeof sizeLimit === 'number' && Number.isFinite(sizeLimit) ? sizeLimit : null
      const desiredLimit = DESIRED_BUCKET_FILE_SIZE_LIMIT
      const shouldUpdate =
        desiredLimit !== null
          ? currentLimit !== desiredLimit
          : currentLimit !== null && currentLimit > 0

      if (shouldUpdate) {
        const updateOptions: {
          public: boolean
          fileSizeLimit?: number
          allowedMimeTypes?: string[]
        } = {
          public: data.public,
          allowedMimeTypes: data.allowed_mime_types ?? undefined,
        }

        if (desiredLimit !== null) {
          updateOptions.fileSizeLimit = desiredLimit
        }

        const { error: updateError } = await client.storage.updateBucket(bucket, updateOptions)

        if (updateError) {
          if (isFileSizeLimitConstraint(updateError.message)) {
            console.warn(
              `[storage] Unable to increase file size limit for bucket ${bucket}: ${updateError.message}`,
            )
          } else {
            throw new Error(
              `Failed to update Supabase bucket ${bucket} limits: ${updateError.message}`,
            )
          }
        }
      }

      return
    }

    if (error && !isBucketMissing(error.message)) {
      throw new Error(`Failed to verify Supabase bucket ${bucket}: ${error.message}`)
    }

    const desiredOptions: { public: boolean; fileSizeLimit?: number } = {
      public: false,
    }

    if (DESIRED_BUCKET_FILE_SIZE_LIMIT !== null) {
      desiredOptions.fileSizeLimit = DESIRED_BUCKET_FILE_SIZE_LIMIT
    }

    let { error: createError } = await client.storage.createBucket(bucket, desiredOptions)

    if (createError && isFileSizeLimitConstraint(createError.message)) {
      console.warn(
        `[storage] Unable to enforce file size limit for new bucket ${bucket}: ${createError.message}. Retrying without explicit limit.`,
      )
      ;({ error: createError } = await client.storage.createBucket(bucket, { public: false }))
    }

    if (createError && !createError.message?.toLowerCase().includes('already exists')) {
      throw new Error(`Failed to create Supabase bucket ${bucket}: ${createError.message}`)
    }
  })()

  bucketEnsurePromises.set(bucket, ensurePromise)

  try {
    await ensurePromise
  } catch (error) {
    bucketEnsurePromises.delete(bucket)
    throw error
  }
}

export async function uploadSupabaseObject(
  bucket: string,
  storageKey: string,
  body: UploadBody,
  options: { contentType?: string; cacheControl?: string } = {},
): Promise<void> {
  const client = createSupabaseServiceClient()
  await ensureBucketExists(client, bucket)
  const payload =
    body instanceof ArrayBuffer || Buffer.isBuffer(body) ? body : await toArrayBuffer(body)

  const upload = async () =>
    client.storage.from(bucket).upload(storageKey, payload, {
      upsert: true,
      cacheControl: options.cacheControl ?? '3600',
      contentType: options.contentType ?? 'application/octet-stream',
    })

  let { error } = await upload()

  if (error && isBucketMissing(error.message)) {
    bucketEnsurePromises.delete(bucket)
    await ensureBucketExists(client, bucket)
    ;({ error } = await upload())
  }

  if (error) {
    throw new Error(
      `Failed to upload ${storageKey} to Supabase bucket ${bucket}: ${error.message}`,
    )
  }
}

export async function downloadSupabaseObject(
  bucket: string,
  storageKey: string,
): Promise<Buffer> {
  const client = createSupabaseServiceClient()
  const { data, error } = await client.storage.from(bucket).download(storageKey)

  if (error || !data) {
    throw new Error(
      `Failed to download ${storageKey} from Supabase bucket ${bucket}: ${
        error?.message ?? 'unknown error'
      }`,
    )
  }

  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function deleteSupabaseObject(bucket: string, storageKey: string): Promise<void> {
  const client = createSupabaseServiceClient()
  const { error } = await client.storage.from(bucket).remove([storageKey])

  if (error) {
    throw new Error(
      `Failed to delete ${storageKey} from Supabase bucket ${bucket}: ${error.message}`,
    )
  }
}

function normalizeStoragePath(path: string): { directory: string; name: string; fullPath: string } {
  const trimmed = path.replace(/^\/+/, '').replace(/\/\/+/g, '/')
  const idx = trimmed.lastIndexOf('/')
  if (idx === -1) {
    return { directory: '', name: trimmed, fullPath: trimmed }
  }
  return {
    directory: trimmed.slice(0, idx),
    name: trimmed.slice(idx + 1),
    fullPath: trimmed,
  }
}

export async function exists(path: string): Promise<boolean> {
  const { directory, name, fullPath } = normalizeStoragePath(path)
  if (!name) {
    return false
  }

  const bucket = getSupabaseIndexBucketName()
  const client = createSupabaseServiceClient()
  try {
    const { data, error } = await client.storage
      .from(bucket)
      .list(directory || undefined, { limit: 1, search: name })

    if (error) {
      if (isBucketMissing(error.message)) {
        return false
      }
      throw new Error(
        `Failed to check existence of ${fullPath} in Supabase bucket ${bucket}: ${error.message}`,
      )
    }

    return Array.isArray(data) && data.some((entry) => entry.name === name)
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
    if (
      message.includes('unexpected token') ||
      message.includes('<html') ||
      message.includes('bad request')
    ) {
      return false
    }
    throw new Error(
      `Failed to check existence of ${fullPath} in Supabase bucket ${bucket}: ${message}`,
    )
  }
}

export async function putJson(path: string, obj: unknown): Promise<void> {
  const { fullPath } = normalizeStoragePath(path)
  const payload = Buffer.from(JSON.stringify(obj ?? {}, null, 2), 'utf8')
  await uploadSupabaseObject(getSupabaseIndexBucketName(), fullPath, payload, {
    contentType: 'application/json',
    cacheControl: '60',
  })
}

export async function getJson<T = unknown>(path: string): Promise<T | null> {
  const { fullPath } = normalizeStoragePath(path)
  try {
    const buffer = await downloadSupabaseObject(getSupabaseIndexBucketName(), fullPath)
    if (buffer.length === 0) {
      return null
    }
    return JSON.parse(buffer.toString('utf8')) as T
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
    if (message.includes('not found') || message.includes('no such file or directory')) {
      return null
    }
    throw error
  }
}

async function toArrayBuffer(body: UploadBody): Promise<ArrayBuffer> {
  if (body instanceof ArrayBuffer) {
    return body
  }

  if (Buffer.isBuffer(body)) {
    return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer
  }

  if (body instanceof Blob || body instanceof File) {
    return body.arrayBuffer()
  }

  if (isReadableStream(body)) {
    const chunks: Uint8Array[] = []
    for await (const chunk of body) {
      chunks.push(chunk)
    }
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
    const buffer = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      buffer.set(chunk, offset)
      offset += chunk.byteLength
    }
    return buffer.buffer
  }

  throw new Error('Unsupported upload body type')
}

function isReadableStream(
  value: unknown,
): value is (ReadableStream<Uint8Array> | NodeJS.ReadableStream) & AsyncIterable<Uint8Array> {
  return typeof value === 'object' && value !== null && Symbol.asyncIterator in value
}
