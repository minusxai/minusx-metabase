import { getCache, setCache } from "./indexedDb"

type AsyncFunction = (...args: any[]) => Promise<any>;
/**
 * Memoizes a function with a TTL (time to live) and adds coalescing functionality
 * 
 * @param fn - The function to memoize
 * @param ttl - The time to live in seconds. Negative values will never expire
 * @returns The memoized function with coalescing
 */
export function memoize<T extends AsyncFunction>(fn: T, ttl: number) {
  const inProgressPromises: Record<string, Promise<Awaited<ReturnType<T>>> | null> = {};

  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const cacheKey = `${fn.name}-${JSON.stringify(args)}`;

    // Check if we have a valid cache
    const cachedResult = await getCache(cacheKey);
    if (cachedResult && cachedResult.data && (cachedResult.createdAt + ttl * 1000 > Date.now() || ttl < 0)) {
      return cachedResult.data;
    }

    // Check if there's an ongoing promise
    if (inProgressPromises[cacheKey]) {
      return inProgressPromises[cacheKey]!;
    }

    // If not cached or expired, call the original function and coalesce the call
    const promise = fn(...args)
      .then(async (result) => {
        // Cache the result
        await setCache(cacheKey, result);
        return result;
      })
      .finally(() => {
        // Clear the ongoing promise after completion
        inProgressPromises[cacheKey] = null;
      });

    inProgressPromises[cacheKey] = promise;

    return promise;
  };
}
