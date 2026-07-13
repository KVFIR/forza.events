type CacheEntry<T> = {at: number; value: T};

/** FNV-1a-ish digest so dedupe keys never store the raw Discord token. */
export function dedupCacheKey(prefix: string, secret: string, ...parts: string[]): string {
  let h = 2166136261;
  for (let i = 0; i < secret.length; i++) {
    h ^= secret.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${prefix}:${(h >>> 0).toString(36)}${parts.length ? `:${parts.join(':')}` : ''}`;
}

const inflight = new Map<string, Promise<unknown>>();
const cached = new Map<string, CacheEntry<unknown>>();

/** Coalesce parallel calls and optionally reuse a fresh result for a short TTL. */
export function coalesceInflight<T>(
  key: string,
  run: () => Promise<T>,
  options?: {cacheMs?: number; fresh?: boolean},
): Promise<T> {
  const cacheMs = options?.cacheMs ?? 0;
  if (cacheMs > 0 && !options?.fresh) {
    const hit = cached.get(key) as CacheEntry<T> | undefined;
    if (hit && Date.now() - hit.at < cacheMs) return Promise.resolve(hit.value);
  }

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const promise = run()
    .then((value) => {
      if (cacheMs > 0) cached.set(key, {at: Date.now(), value});
      return value;
    })
    .finally(() => {
      if (inflight.get(key) === promise) inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}
