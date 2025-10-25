type DisposalCallback<V> = (value: V, key: string) => void | Promise<void>

export interface LruCacheOptions<V> {
  /**
   * Maximum number of entries allowed in the cache.
   */
  maxEntries?: number
  /**
   * Maximum total size (in bytes) allowed in the cache.
   */
  maxSizeBytes?: number
  /**
   * Optional callback invoked when an entry is evicted.
   */
  onDispose?: DisposalCallback<V>
}

interface CacheEntry<V> {
  value: V
  size: number
}

/**
 * Simple in-memory LRU cache with optional size constraints.
 * Sized-based eviction uses the provided size per entry (defaulting to 0).
 */
export class LruCache<V> {
  private readonly maxEntries: number
  private readonly maxSizeBytes: number
  private readonly onDispose?: DisposalCallback<V>
  private readonly map = new Map<string, CacheEntry<V>>()
  private totalSize = 0

  constructor(options: LruCacheOptions<V> = {}) {
    this.maxEntries = Math.max(1, options.maxEntries ?? 64)
    this.maxSizeBytes = Math.max(0, options.maxSizeBytes ?? 0)
    this.onDispose = options.onDispose
  }

  get size(): number {
    return this.map.size
  }

  get(key: string): V | undefined {
    const entry = this.map.get(key)
    if (!entry) return undefined

    // Update recency by re-inserting entry.
    this.map.delete(key)
    this.map.set(key, entry)
    return entry.value
  }

  set(key: string, value: V, size: number = 0): void {
    if (size < 0) {
      throw new Error('Cache entry size cannot be negative')
    }

    const existing = this.map.get(key)
    if (existing) {
      this.totalSize -= existing.size
      this.map.delete(key)
    }

    this.map.set(key, { value, size })
    this.totalSize += size

    this.evictIfNeeded()
  }

  has(key: string): boolean {
    return this.map.has(key)
  }

  delete(key: string): boolean {
    const entry = this.map.get(key)
    if (!entry) return false

    this.map.delete(key)
    this.totalSize -= entry.size
    this.invokeDispose(key, entry)
    return true
  }

  clear(): void {
    for (const [key, entry] of this.map.entries()) {
      this.invokeDispose(key, entry)
    }
    this.map.clear()
    this.totalSize = 0
  }

  private evictIfNeeded(): void {
    while (
      (this.maxEntries > 0 && this.map.size > this.maxEntries) ||
      (this.maxSizeBytes > 0 && this.totalSize > this.maxSizeBytes)
    ) {
      const oldestKey = this.map.keys().next().value
      if (oldestKey === undefined) {
        break
      }
      const entry = this.map.get(oldestKey)
      if (entry) {
        this.map.delete(oldestKey)
        this.totalSize -= entry.size
        this.invokeDispose(oldestKey, entry)
      }
    }
  }

  private invokeDispose(key: string, entry: CacheEntry<V>): void {
    if (!this.onDispose) return
    try {
      const maybePromise = this.onDispose(entry.value, key)
      if (maybePromise && typeof (maybePromise as Promise<void>).then === 'function') {
        ;(maybePromise as Promise<void>).catch((error) => {
          console.warn(`[cache] dispose callback failed for ${key}:`, error)
        })
      }
    } catch (error) {
      console.warn(`[cache] dispose callback threw for ${key}:`, error)
    }
  }
}
