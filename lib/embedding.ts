import { embedMany } from '@/lib/ai/openai'
import { FALLBACK_EMBEDDING_DIMS, FALLBACK_EMBEDDING_MODEL } from '@/lib/ai/fallback-embedding'
import {
  DEFAULT_EMBEDDING_DIMENSION,
  DEFAULT_EMBEDDING_MODEL,
} from '@/lib/indexing/constants'

export interface EmbedManyOptions {
  model?: string
  user?: string
  signal?: AbortSignal
}

export interface EmbeddingBatch {
  model: string
  dims: number
  embeddings: Float32Array
}

export interface PackedEmbeddingBatch extends EmbeddingBatch {
  packed: Uint8Array
}

export async function embedTexts(
  texts: string[],
  options: EmbedManyOptions = {},
): Promise<EmbeddingBatch> {
  if (texts.length === 0) {
    return {
      model: options.model ?? DEFAULT_EMBEDDING_MODEL,
      dims: DEFAULT_EMBEDDING_DIMENSION,
      embeddings: new Float32Array(),
    }
  }

  const { vectors, dims: resolvedDims, model, isFallback } = await embedMany(texts, {
    model: options.model ?? DEFAULT_EMBEDDING_MODEL,
    user: options.user,
  })

  if (vectors.length === 0 || resolvedDims <= 0) {
    throw new Error('Embedding API returned no data')
  }

  const dims = resolvedDims || (vectors[0]?.length ?? FALLBACK_EMBEDDING_DIMS)
  const embeddings = new Float32Array(texts.length * dims)

  vectors.forEach((vector, index) => {
    const start = index * dims
    for (let i = 0; i < dims; i += 1) {
      embeddings[start + i] = vector[i] ?? 0
    }
  })

  return {
    model: isFallback ? FALLBACK_EMBEDDING_MODEL : model ?? options.model ?? DEFAULT_EMBEDDING_MODEL,
    dims,
    embeddings,
  }
}

export function packEmbeddingsFloat16(batch: EmbeddingBatch): PackedEmbeddingBatch {
  const packed = encodeFloat32ToFloat16(batch.embeddings)
  return {
    ...batch,
    packed,
  }
}

export function encodeFloat32ToFloat16(values: Float32Array): Uint8Array {
  const buffer = new ArrayBuffer(values.length * 2)
  const view = new DataView(buffer)
  for (let i = 0; i < values.length; i += 1) {
    view.setUint16(i * 2, float32ToFloat16(values[i]), true)
  }
  return new Uint8Array(buffer)
}

function float32ToFloat16(value: number): number {
  const floatView = new DataView(new ArrayBuffer(4))
  floatView.setFloat32(0, value, false)
  const bits = floatView.getUint32(0, false)

  const sign = (bits >> 16) & 0x8000
  const exponent = (bits >> 23) & 0xff
  const fraction = bits & 0x7fffff

  if (exponent === 0xff) {
    // NaN or Inf
    if (fraction !== 0) {
      return sign | 0x7e00
    }
    return sign | 0x7c00
  }

  const halfExponent = exponent - 127 + 15
  if (halfExponent >= 0x1f) {
    return sign | 0x7c00
  }
  if (halfExponent <= 0) {
    if (halfExponent < -10) {
      return sign
    }
    const mantissa = (fraction | 0x800000) >> (1 - halfExponent)
    return sign | (mantissa >> 13)
  }

  return sign | (halfExponent << 10) | (fraction >> 13)
}
