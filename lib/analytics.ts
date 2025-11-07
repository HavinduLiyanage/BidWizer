export function track(event: string, props?: Record<string, unknown>): void {
  try {
    const payload = { event, ...props }
    // eslint-disable-next-line no-console
    console.info(JSON.stringify(payload))
  } catch {
    // swallow any logging/serialization errors
  }
}
