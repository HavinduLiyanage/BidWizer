const KEYWORD_BOOST = 200
const BASE_PRIORITY = 1_000

const KEYWORD_REGEX = /\b(instruction|form|spec|boq|tor)\b/i

export function computeDocumentPriority(filename: string, bytes: number | null | undefined): number {
  const size = typeof bytes === 'number' && Number.isFinite(bytes) ? Math.max(0, bytes) : 0
  const sizePenalty = Math.min(800, Math.floor(size / (1024 * 128)))
  const keywordBonus = KEYWORD_REGEX.test(filename) ? KEYWORD_BOOST : 0
  return BASE_PRIORITY - sizePenalty + keywordBonus
}
