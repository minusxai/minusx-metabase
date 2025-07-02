import { getCache, setCache, deleteCache } from "./indexedDb"

// Default TTL set to 7 days (7 days * 24 hours * 60 minutes * 60 seconds)
export const DEFAULT_TTL = 7 * 24 * 60 * 60;
// Default rewarm TTL set to 12 hours
export const DEFAULT_REWARM_TTL = 12 * 60 * 60;

type AsyncFunction = (...args: any[]) => Promise<any>;
/* NEW ─ helper type that augments the returned function */
type MemoizedFn<T extends AsyncFunction> = ((
  ...args: Parameters<T>
) => Promise<Awaited<ReturnType<T>>>) & {
  /** Always re-fetch, update the cache, return fresh result */
  refresh: (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;
  /** (Nice to have) drop the cached value for these args */
  invalidate: (...args: Parameters<T>) => Promise<void>;
};
/**
 * Memoizes a function with a TTL (time to live) and adds coalescing functionality
 * Supports stale-while-revalidate pattern with rewarm TTL
 * 
 * @param fn - The function to memoize
 * @param ttl - The time to live in seconds. Negative values will never expire
 * @param rewarmTtl - The rewarm time in seconds. If set, returns stale data while refreshing in background
 * @param cacheKeyBase - Optional base for cache key. If not provided, uses fn.name
 * @param onFreshData - Optional callback called whenever fresh data is fetched (not from cache)
 * @returns The memoized function with coalescing and optional background refresh
 */

export function memoize<T extends AsyncFunction>(
  fn: T,
  ttl: number = DEFAULT_TTL,
  rewarmTtl: number = DEFAULT_REWARM_TTL,
  cacheKeyBase?: string,
  onFreshData?: (r: Awaited<ReturnType<T>>) => void
): MemoizedFn<T> {            // ← change the return type
  const inProgressPromises: Record<
    string,
    Promise<Awaited<ReturnType<T>>> | null
  > = {};

  /* factored out so both normal path and refresh() reuse it */
  const fetchAndCache = async (
    args: Parameters<T>,
    cacheKey: string
  ): Promise<Awaited<ReturnType<T>>> => {
    const promise = fn(...args)
      .then(async (res) => {
        await setCache(cacheKey, res);
        onFreshData?.(res);
        return res;
      })
      .finally(() => (inProgressPromises[cacheKey] = null));

    inProgressPromises[cacheKey] = promise;
    return promise;
  };

  const memoized = async (
    ...args: Parameters<T>
  ): Promise<Awaited<ReturnType<T>>> => {
    const cacheKey = `${cacheKeyBase || fn.name}-${JSON.stringify(args)}`;
    const now = Date.now();
    const cached = await getCache(cacheKey);

    if (cached?.data) {
      const age = now - cached.createdAt;
      const expired = age > ttl * 1000 && ttl >= 0;
      const needsRewarm = age > rewarmTtl * 1000;

      if (!expired) {
        if (needsRewarm && !inProgressPromises[cacheKey])
          fetchAndCache(args, cacheKey); // fire-and-forget
        return cached.data;              // ← serve (possibly stale) data
      }
    }

    // coalesce concurrent misses
    return (
      inProgressPromises[cacheKey] ?? fetchAndCache(args, cacheKey)
    );
  };

  /* -------- extra helpers -------- */
  memoized.refresh = (...args: Parameters<T>) => {
    const cacheKey = `${cacheKeyBase || fn.name}-${JSON.stringify(args)}`;
    return inProgressPromises[cacheKey] ?? fetchAndCache(args, cacheKey);
  };

  memoized.invalidate = async (...args: Parameters<T>) => {
    const cacheKey = `${cacheKeyBase || fn.name}-${JSON.stringify(args)}`;
    await deleteCache(cacheKey);
    inProgressPromises[cacheKey] = null;
  };

  return memoized as MemoizedFn<T>;
}