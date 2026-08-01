// Tiny in-memory TTL cache with request de-duplication.
// Speeds up repeated feed/search loads and prevents duplicate yt-dlp spawns.

type Entry<T> = { value: T; expires: number }

const store = new Map<string, Entry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()

export async function cached<T>(
  key: string,
  ttlMs: number,
  producer: () => Promise<T>,
): Promise<T> {
  const now = Date.now()
  const hit = store.get(key) as Entry<T> | undefined
  if (hit && hit.expires > now) return hit.value

  // De-dupe concurrent requests for the same key.
  const pending = inflight.get(key) as Promise<T> | undefined
  if (pending) return pending

  const promise = (async () => {
    try {
      const value = await producer()
      store.set(key, { value, expires: Date.now() + ttlMs })
      return value
    } finally {
      inflight.delete(key)
    }
  })()

  inflight.set(key, promise)
  return promise
}
