import OpenAI from 'openai'

import {
  fallbackEmbeddingBatch,
  FALLBACK_EMBEDDING_DIMS,
  FALLBACK_EMBEDDING_MODEL,
  shouldUseFallbackEmbedding,
} from '@/lib/ai/fallback-embedding'
import { env } from '@/lib/env'

const apiKey = env.OPENAI_API_KEY ?? ''

// Maintain existing behaviour for consumers that expect an OpenAI client.
// If the API key is missing the instance will still exist but requests will fail upstream.
export const openai = new OpenAI({ apiKey })

export interface EmbedManyResult {
  vectors: number[][] // row-major array of embeddings
  dims: number
  model: string
  isFallback: boolean
}

function toNumberArray(vector: Float32Array): number[] {
  return Array.from(vector)
}

function buildFallbackResult(texts: string[]): EmbedManyResult {
  const batch = fallbackEmbeddingBatch(texts)
  return {
    vectors: batch.vectors.map(toNumberArray),
    dims: batch.dims,
    model: batch.model,
    isFallback: true,
  }
}

export interface EmbedManyOptions {
  model?: string
  user?: string
}

export async function embedMany(
  texts: string[],
  options: EmbedManyOptions = {},
): Promise<EmbedManyResult> {
  if (texts.length === 0) {
    return {
      vectors: [],
      dims: FALLBACK_EMBEDDING_DIMS,
      model: apiKey ? options.model ?? 'text-embedding-3-small' : FALLBACK_EMBEDDING_MODEL,
      isFallback: !apiKey,
    }
  }

  if (!apiKey) {
    return buildFallbackResult(texts)
  }

  try {
    const response = await openai.embeddings.create({
      model: options.model ?? 'text-embedding-3-small',
      input: texts,
      user: options.user,
    })

    if (!response.data || response.data.length === 0) {
      return buildFallbackResult(texts)
    }

    const vectors = response.data.map((item) => item.embedding)
    const dims = vectors[0]?.length ?? FALLBACK_EMBEDDING_DIMS
    const model = response.model ?? options.model ?? 'text-embedding-3-small'

    return {
      vectors,
      dims,
      model,
      isFallback: false,
    }
  } catch (error) {
    if (shouldUseFallbackEmbedding(error)) {
      const reason = error instanceof Error ? error.message : String(error)
      console.warn('[ai] Embedding request failed, using deterministic fallback:', reason)
      return buildFallbackResult(texts)
    }
    throw error
  }
}
