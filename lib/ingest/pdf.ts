import { createHash } from 'crypto'

export interface PdfProbeResult {
  pages: number | null
  hasText: boolean | null
}

export function hashBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

export function probePdf(buffer: Buffer): PdfProbeResult {
  const sample = buffer.toString('latin1')
  const pageMatches = sample.match(/\/Type\s*\/Page\b/g)
  const textMatches = sample.match(/\bBT\b/g)
  return {
    pages: pageMatches?.length ?? null,
    hasText: Boolean(textMatches && textMatches.length > 0),
  }
}

export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim()
}

export function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(text.length, start + chunkSize)
    const chunk = text.slice(start, end).trim()
    if (chunk.length > 0) {
      chunks.push(chunk)
    }
    if (end === text.length) break
    const nextStart = Math.max(0, end - overlap)
    start = nextStart <= start ? end : nextStart
  }
  return chunks
}
