import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { readEnvVar } from '@/lib/env'

const DEFAULT_UPLOADS_BUCKET = 'tender-uploads'
const DEFAULT_INDEX_BUCKET = 'tender-indexes'
const bucketEnsurePromises = new Map<string, Promise<void>>()
const DESIRED_BUCKET_FILE_SIZE_LIMIT = 524_288_000 // 500 MB

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

function resolveEnv(keys: string[], fallback: string): string {
  for (const key of keys) {
    const value = readEnvVar(key)
    if (value && value.length > 0) {
      return value
    }
  }
  return fallback
}

export function createSupabaseServiceClient(): SupabaseClient {
  assertServerContext()

  const supabaseUrl = readEnvVar('SUPABASE_URL')
  const supabaseServiceRoleKey = readEnvVar('SUPABASE_SERVICE_ROLE_KEY')

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
        desiredLimit > 0
          ? currentLimit !== desiredLimit
          : currentLimit !== null && currentLimit > 0

      if (shouldUpdate) {
        const { error: updateError } = await client.storage.updateBucket(bucket, {
          public: data.public,
          fileSizeLimit: desiredLimit,
          allowedMimeTypes: data.allowed_mime_types ?? undefined,
        })

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

    const desiredOptions =
      DESIRED_BUCKET_FILE_SIZE_LIMIT > 0
        ? {
            public: false,
            fileSizeLimit: DESIRED_BUCKET_FILE_SIZE_LIMIT,
          }
        : { public: false }

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

async function toArrayBuffer(body: UploadBody): Promise<ArrayBuffer> {
  if (body instanceof ArrayBuffer) {
    return body
  }

  if (Buffer.isBuffer(body)) {
    return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength)
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
