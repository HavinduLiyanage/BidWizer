import 'server-only'

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
  fileId?: string
  documentId?: string
  question: string
  k?: number
  scanCap?: number
}) {
  const {
    tenderId: _tenderId,
    fileId,
    documentId,
    question,
    k = DEFAULT_TOP_K,
    scanCap = DEFAULT_SCAN_CAP,
  } = opts

  const embedResult = await embedMany([question])
  const queryVector = embedResult.vectors[0]
  if (!queryVector || queryVector.length === 0) {
    return []
  }

  if (documentId) {
    const document = await db.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        sections: {
          select: {
            id: true,
            text: true,
            embedding: true,
            pageStart: true,
            pageEnd: true,
            heading: true,
          },
          take: Math.max(1, scanCap),
        },
      },
    })

    if (!document || document.sections.length === 0) {
      return []
    }

    const scoredSections = document.sections
      .map((section) => {
        const embedding = toVector(section.embedding)
        if (!embedding) {
          return null
        }
        return {
          id: section.id,
          documentId: document.id,
          pageStart: section.pageStart,
          pageEnd: section.pageEnd,
          content: section.text ?? '',
          heading: section.heading ?? null,
          docName: document.title,
          similarity: cosineSim(queryVector, embedding),
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))

    if (scoredSections.length === 0) {
      return []
    }

    scoredSections.sort((a, b) => b.similarity - a.similarity)

    const limit = Math.max(1, Math.min(MAX_TOP_K, k))
    return scoredSections.slice(0, limit).map((section) => ({
      id: section.id,
      documentId: section.documentId,
      pageStart: section.pageStart ?? null,
      pageEnd: section.pageEnd ?? null,
      content: section.content,
      heading: section.heading,
      docName: section.docName,
      similarity: section.similarity,
    }))
  }

  if (!fileId) {
    return []
  }

  const rows = await db.chunk.findMany({
    where: { extractedFileId: fileId },
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
    documentId: string
    pageStart: number | null
    pageEnd: number | null
    content: string
    heading: string | null
    docName: string
    similarity: number
  }> = []

  for (const chunk of scored) {
    const dedupeKey = `${chunk.fileId}:${chunk.page ?? -1}`
    if (seen.has(dedupeKey)) {
      continue
    }
    seen.add(dedupeKey)
    results.push({
      id: chunk.id,
      documentId: chunk.fileId,
      pageStart: chunk.page ?? null,
      pageEnd: chunk.page ?? null,
      content: chunk.content,
      heading: null,
      docName: chunk.docName,
      similarity: chunk.similarity,
    })
    if (results.length >= limit) {
      break
    }
  }

  return results
}

export function buildContext(
  chunks: Array<{
    docName: string
    pageStart: number | null
    pageEnd: number | null
    content: string
    heading?: string | null
  }>,
) {
  let used = 0
  const lines: string[] = []
  for (const chunk of chunks) {
    const pageLabel =
      chunk.pageStart && chunk.pageEnd && chunk.pageStart !== chunk.pageEnd
        ? `${chunk.pageStart}-${chunk.pageEnd}`
        : chunk.pageStart ?? chunk.pageEnd ?? '?'
    const header = `[${chunk.docName} p.${pageLabel}]`
    const body = chunk.heading
      ? `${chunk.heading.trim()}\n${chunk.content.trim()}`
      : chunk.content.trim()
    const block = `${header}\n${body}\n`
    if (used + block.length > MAX_CONTEXT_CHARS) {
      break
    }
    lines.push(block)
    used += block.length
  }
  return lines.join('\n')
}
