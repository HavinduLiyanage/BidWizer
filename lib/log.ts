export function log(scope: string, msg: string, meta: Record<string, unknown> = {}): void {
  const line = { t: new Date().toISOString(), scope, msg, ...meta }
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(line))
}
