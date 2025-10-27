import { db } from '@/lib/db'
import { embedMany } from '@/lib/ai/openai'

type Vec = number[]

const MAX_CONTEXT_CHARS = 8000
const DEFAULT_TOP_K = 14
const MAX_TOP_K = 24
const DEFAULT_SCAN_CAP = 3000

function toVector(input: unknown): Vec | null {
  if (!Array.isArray(input)) {
    return null
  }
  const vec: number[] = []
  for (let i = 0; i < input.length; i += 1) {
    const value = input[i]
    const asNumber =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
        ? Number(value)
        : 0
    vec.push(Number.isFinite(asNumber) ? asNumber : 0)
  }
  return vec.length > 0 ? vec : null
}

function cosineSim(a: Vec, b: Vec): number {
  let dot = 0
  let normA = 0
  let normB = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i += 1) {
    const ax = a[i] ?? 0
    const bx = b[i] ?? 0
    dot += ax * bx
    normA += ax * ax
    normB += bx * bx
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  if (!Number.isFinite(denom) || denom === 0) {
    return 0
  }
  return dot / denom
}

export async function retrieveChunksFromFile(opts: {
  tenderId: string
  fileId: string
  question: string
  k?: number
  scanCap?: number
}) {
  const {
    tenderId,
    fileId,
    question,
    k = DEFAULT_TOP_K,
    scanCap = DEFAULT_SCAN_CAP,
  } = opts

  const embedResult = await embedMany([question])
  const queryVector = embedResult.vectors[0]
  if (!queryVector || queryVector.length === 0) {
    return []
  }

  const rows = await db.chunk.findMany({
    where: { tenderId, extractedFileId: fileId },
    select: {
      id: true,
      content: true,
      page: true,
      embedding: true,
      extractedFileId: true,
      extractedFile: { select: { filename: true } },
    },
    take: Math.max(1, scanCap),
  })

  if (rows.length === 0) {
    return []
  }

  const scored = rows
    .map((row) => {
      const embedding = toVector(row.embedding)
      if (!embedding) {
        return null
      }
      return {
        id: row.id,
        fileId: row.extractedFileId,
        page: row.page ?? null,
        content: row.content ?? '',
        docName: row.extractedFile?.filename ?? 'Document',
        similarity: cosineSim(queryVector, embedding),
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))

  if (scored.length === 0) {
    return []
  }

  scored.sort((a, b) => b.similarity - a.similarity)

  const seen = new Set<string>()
  const limit = Math.max(1, Math.min(MAX_TOP_K, k))
  const results: Array<{
    id: string
    fileId: string
    page: number | null
    content: string
    docName: string
    similarity: number
  }> = []

  for (const chunk of scored) {
    const dedupeKey = `${chunk.fileId}:${chunk.page ?? -1}`
    if (seen.has(dedupeKey)) {
      continue
    }
    seen.add(dedupeKey)
    results.push(chunk)
    if (results.length >= limit) {
      break
    }
  }

  return results
}

export function buildContext(
  chunks: Array<{ docName: string; page: number | null; content: string }>,
) {
  let used = 0
  const lines: string[] = []
  for (const chunk of chunks) {
    const header = `[${chunk.docName} p.${chunk.page ?? '?'}]`
    const block = `${header}\n${chunk.content.trim()}\n`
    if (used + block.length > MAX_CONTEXT_CHARS) {
      break
    }
    lines.push(block)
    used += block.length
  }
  return lines.join('\n')
}
