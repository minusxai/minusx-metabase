import { getCache, setCache, deleteCache } from "./indexedDb"

// Default TTL set to 7 days (7 days * 24 hours * 60 minutes * 60 seconds)
export const DEFAULT_TTL = 7 * 24 * 60 * 60;
// Default rewarm TTL set to 12 hours
export const DEFAULT_REWARM_TTL = 12 * 60 * 60;

type AsyncFunction = (...args: any[]) => Promise<any>;
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
  onFreshData?: (response: Awaited<ReturnType<T>>) => void
) {
  const inProgressPromises: Record<string, Promise<Awaited<ReturnType<T>>> | null> = {};

  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const cacheKey = `${cacheKeyBase || fn.name}-${JSON.stringify(args)}`;
    const now = Date.now();

    // Check if we have cached data
    const cachedResult = await getCache(cacheKey);
    
    if (cachedResult && cachedResult.data) {
      const age = now - cachedResult.createdAt;
      const isExpired = age > ttl * 1000;
      const needsRewarming = age > rewarmTtl * 1000;
      
      // If not expired, return cached data
      if (!isExpired || ttl < 0) {
        // If needs rewarming and no refresh in progress, trigger background refresh
        if (needsRewarming && !inProgressPromises[cacheKey]) {
          // Background refresh (don't await)
          const backgroundPromise = fn(...args)
            .then(async (result) => {
              await setCache(cacheKey, result);
              // Call callback for fresh data from background refresh
              if (onFreshData) {
                try {
                  onFreshData(result);
                } catch (error) {
                  console.warn('onFreshData callback failed during background refresh:', error);
                }
              }
              return result;
            })
            .finally(() => {
              inProgressPromises[cacheKey] = null;
            });
          
          inProgressPromises[cacheKey] = backgroundPromise;
        }
        
        return cachedResult.data;
      }
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
        // Call callback for fresh data from main fetch
        if (onFreshData) {
          try {
            onFreshData(result);
          } catch (error) {
            console.warn('onFreshData callback failed during main fetch:', error);
          }
        }
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

export { deleteCache };
