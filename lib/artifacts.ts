export function docPaths(orgId: string, tenderId: string, docHash: string) {
  const base = `org/${orgId}/tender/${tenderId}/docs/${docHash}`
  return {
    raw: `${base}/raw.pdf`,
    extracted: `${base}/extracted.jsonl.gz`,
    chunks: `${base}/chunks.jsonl.gz`,
    summaries: `${base}/summaries.json`,
  }
}
