import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { readEnvVar } from '@/lib/env'

const DEFAULT_UPLOADS_BUCKET = 'tender-uploads'
const DEFAULT_INDEX_BUCKET = 'tender-indexes'

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
  const supabaseServiceRoleKey = readEnvVar('SUPABASE_SERVICE_ROLE')

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

export async function uploadSupabaseObject(
  bucket: string,
  storageKey: string,
  body: UploadBody,
  options: { contentType?: string; cacheControl?: string } = {},
): Promise<void> {
  const client = createSupabaseServiceClient()
  const payload =
    body instanceof ArrayBuffer || Buffer.isBuffer(body) ? body : await toArrayBuffer(body)

  const { error } = await client.storage.from(bucket).upload(storageKey, payload, {
    upsert: true,
    cacheControl: options.cacheControl ?? '3600',
    contentType: options.contentType ?? 'application/octet-stream',
  })

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
