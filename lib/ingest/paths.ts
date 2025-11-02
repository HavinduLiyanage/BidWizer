const BASE_PREFIX = 'org'

export interface DocumentStoragePaths {
  basePath: string
  rawKey: string
  extractedKey: string
  chunksKey: string
  summaryKey: string
}

export function buildDocumentStoragePaths(params: {
  orgId: string
  tenderId: string
  docHash: string
}): DocumentStoragePaths {
  const { orgId, tenderId, docHash } = params
  const basePath = [
    BASE_PREFIX,
    orgId,
    'tender',
    tenderId,
    'docs',
    docHash,
  ].join('/')

  return {
    basePath,
    rawKey: `${basePath}/raw.pdf`,
    extractedKey: `${basePath}/extracted.jsonl.gz`,
    chunksKey: `${basePath}/chunks.jsonl.gz`,
    summaryKey: `${basePath}/summaries.json`,
  }
}

export function manifestKey(orgId: string, tenderId: string): string {
  return [BASE_PREFIX, orgId, 'tender', tenderId, 'manifest.json'].join('/')
}
