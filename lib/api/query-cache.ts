type CacheEntry<T> = {
  data?: T
  expiresAt: number
  pending?: Promise<T>
}

const cache = new Map<string, CacheEntry<unknown>>()

export function queryCache<T>(key: string, query: () => Promise<T>, staleTimeMs = 30_000) {
  const now = Date.now()
  const cached = cache.get(key) as CacheEntry<T> | undefined

  if (cached?.data !== undefined && cached.expiresAt > now) {
    return Promise.resolve(cached.data)
  }
  if (cached?.pending) return cached.pending

  const pending = query().then(
    (data) => {
      cache.set(key, { data, expiresAt: Date.now() + staleTimeMs })
      return data
    },
    (error: unknown) => {
      cache.delete(key)
      throw error
    },
  )

  cache.set(key, { data: cached?.data, expiresAt: 0, pending })
  return pending
}

export function invalidateQuery(keyPrefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(keyPrefix)) cache.delete(key)
  }
}
