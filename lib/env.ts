export function readEnvVar(key: string): string | undefined {
  if (typeof process === 'undefined' || !process?.env) {
    return undefined
  }

  if (Object.prototype.hasOwnProperty.call(process.env, key)) {
    const value = process.env[key]
    return typeof value === 'string' ? value.trim() : undefined
  }

  const matchingKey = Object.keys(process.env).find((candidate) => candidate.trim() === key)
  if (!matchingKey) {
    return undefined
  }

  const value = process.env[matchingKey]
  return typeof value === 'string' ? value.trim() : undefined
}
