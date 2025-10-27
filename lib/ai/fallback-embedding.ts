import crypto from 'crypto'

export const FALLBACK_EMBEDDING_MODEL = 'fallback/text-embedding-v1'
export const FALLBACK_EMBEDDING_DIMS = 256

const TOKEN_REGEX = /[a-z0-9]+/gi

function tokenize(text: string): string[] {
  const matches = text.toLowerCase().match(TOKEN_REGEX)
  return matches ? matches.filter((token) => token.length > 0) : []
}

function buildDigest(token: string, salt: number = 0): Buffer {
  const hash = crypto.createHash('sha256')
  hash.update(token)
  if (salt !== 0) {
    hash.update(Buffer.from([salt]))
  }
  const digest = hash.digest()
  return digest
}

function hashToIndex(digest: Buffer): number {
  return digest.readUInt32BE(0) % FALLBACK_EMBEDDING_DIMS
}

function hashToSign(digest: Buffer): number {
  return (digest[4] & 1) === 0 ? 1 : -1
}

export function fallbackEmbeddingVector(text: string): Float32Array {
  const vector = new Float32Array(FALLBACK_EMBEDDING_DIMS)
  const tokens = tokenize(text)

  if (tokens.length === 0) {
    return vector
  }

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]
    const digest = buildDigest(token)
    const index = hashToIndex(digest)
    const sign = hashToSign(digest)
    vector[index] += sign

    if (i < tokens.length - 1) {
      const bigram = `${token}_${tokens[i + 1]}`
      const bigramDigest = buildDigest(bigram, 1)
      const bigramIndex = hashToIndex(bigramDigest)
      const bigramSign = hashToSign(bigramDigest)
      vector[bigramIndex] += bigramSign * 0.5
    }
  }

  let norm = 0
  for (let i = 0; i < vector.length; i += 1) {
    norm += vector[i] * vector[i]
  }
  norm = Math.sqrt(norm)
  if (norm > 0) {
    for (let i = 0; i < vector.length; i += 1) {
      vector[i] /= norm
    }
  }

  return vector
}

export function fallbackEmbeddingBatch(
  texts: string[],
): { vectors: Float32Array[]; dims: number; model: string } {
  return {
    vectors: texts.map((text) => fallbackEmbeddingVector(text)),
    dims: FALLBACK_EMBEDDING_DIMS,
    model: FALLBACK_EMBEDDING_MODEL,
  }
}

export function shouldUseFallbackEmbedding(error: unknown): boolean {
  if (!error) {
    return false
  }
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  if (typeof message === 'string') {
    const lowered = message.toLowerCase()
    if (
      lowered.includes('terminated') ||
      lowered.includes('socket hang up') ||
      lowered.includes('enotfound') ||
      lowered.includes('timed out') ||
      lowered.includes('fetch failed')
    ) {
      return true
    }
  }

  if (typeof error === 'object' && error !== null) {
    const code = (error as { code?: unknown }).code
    if (typeof code === 'string') {
      const normalized = code.toUpperCase()
      if (
        normalized === 'UND_ERR_SOCKET' ||
        normalized === 'ECONNRESET' ||
        normalized === 'ETIMEDOUT' ||
        normalized === 'ENOTFOUND'
      ) {
        return true
      }
    }
  }
  return false
}
