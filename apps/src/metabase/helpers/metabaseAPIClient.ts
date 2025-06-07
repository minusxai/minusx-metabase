/**
 * Type-Safe Metabase API Client
 * 
 * Provides a unified interface for all Metabase API calls with:
 * - Type-safe API definitions with template substitution
 * - Per-endpoint concurrency control and rate limiting
 * - Intelligent caching with configurable TTLs
 * - Automatic request queuing and delay management
 */

import { RPCs, memoize } from 'web';
import { 
  MetabaseAPI, 
  APIPerformanceConfig, 
  API_PERFORMANCE_CONFIG, 
  DEFAULT_API_CONFIG 
} from './metabaseAPITypes';

// =============================================================================
// ENHANCED CONCURRENCY MANAGER WITH DELAY SUPPORT
// =============================================================================

interface QueuedTask<T> {
  task: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  timestamp: number;
}

class EnhancedConcurrencyManager {
  private queue: QueuedTask<any>[] = [];
  private active = 0;
  private readonly maxConcurrent: number;
  private readonly minDelay: number;
  private lastExecution = 0;

  constructor(maxConcurrent: number, minDelay: number = 0) {
    this.maxConcurrent = maxConcurrent;
    this.minDelay = minDelay;
  }

  async execute<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const queuedTask: QueuedTask<T> = {
        task,
        resolve,
        reject,
        timestamp: Date.now()
      };

      if (this.active < this.maxConcurrent && this.canExecuteNow()) {
        this.executeTask(queuedTask);
      } else {
        this.queue.push(queuedTask);
      }
    });
  }

  private canExecuteNow(): boolean {
    if (this.minDelay === 0) return true;
    return Date.now() - this.lastExecution >= this.minDelay;
  }

  private async executeTask<T>(queuedTask: QueuedTask<T>): Promise<void> {
    const { task, resolve, reject } = queuedTask;
    
    try {
      // Apply delay if needed
      if (this.minDelay > 0) {
        const timeSinceLastExecution = Date.now() - this.lastExecution;
        if (timeSinceLastExecution < this.minDelay) {
          await new Promise(res => setTimeout(res, this.minDelay - timeSinceLastExecution));
        }
      }

      this.active++;
      this.lastExecution = Date.now();
      const result = await task();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.active--;
      this.processQueue();
    }
  }

  private processQueue(): void {
    while (this.queue.length > 0 && this.active < this.maxConcurrent && this.canExecuteNow()) {
      const nextTask = this.queue.shift();
      if (nextTask) {
        this.executeTask(nextTask);
      }
    }

    // If we can't execute now due to delay, schedule next execution
    if (this.queue.length > 0 && this.active < this.maxConcurrent && !this.canExecuteNow()) {
      const delayNeeded = this.minDelay - (Date.now() - this.lastExecution);
      setTimeout(() => this.processQueue(), delayNeeded);
    }
  }

  getStats(): { active: number; queued: number; maxConcurrent: number; minDelay: number } {
    return {
      active: this.active,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      minDelay: this.minDelay
    };
  }
}

// =============================================================================
// GLOBAL CONCURRENCY MANAGER POOL
// =============================================================================

const concurrencyManagers = new Map<string, EnhancedConcurrencyManager>();

function getConcurrencyManager(template: string, config: APIPerformanceConfig): EnhancedConcurrencyManager {
  if (!concurrencyManagers.has(template)) {
    concurrencyManagers.set(
      template, 
      new EnhancedConcurrencyManager(config.max_concurrency, config.concurrency_delay)
    );
  }
  return concurrencyManagers.get(template)!;
}

// =============================================================================
// TEMPLATE SUBSTITUTION
// =============================================================================

function substituteTemplate(template: string, params: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (!(key in params)) {
      throw new Error(`Missing required parameter: ${key} for template: ${template}`);
    }
    return encodeURIComponent(String(params[key]));
  });
}

function validateRequiredParams<T extends MetabaseAPI>(api: T, params: T['params']): void {
  const templateParams = api.template.match(/\{\{(\w+)\}\}/g) || [];
  const requiredKeys = templateParams.map(param => param.slice(2, -2)); // Remove {{ }}
  
  for (const key of requiredKeys) {
    if (!(key in params) || params[key] == null) {
      throw new Error(`Missing required parameter: ${key} for API: ${api.template}`);
    }
  }
}

// =============================================================================
// CORE API CLIENT FUNCTIONS
// =============================================================================

/**
 * Get performance configuration for an API template
 */
function getAPIConfig(template: string): APIPerformanceConfig {
  return API_PERFORMANCE_CONFIG[template] || DEFAULT_API_CONFIG;
}

/**
 * Raw fetch function with concurrency control but no caching
 */
async function fetchMetabaseAPIRaw<T extends MetabaseAPI>(
  api: T, 
  params: T['params']
): Promise<any> {
  // Validate required parameters
  validateRequiredParams(api, params);

  // Get configuration for this endpoint
  const config = getAPIConfig(api.template);
  
  // Get or create concurrency manager for this endpoint
  const manager = getConcurrencyManager(api.template, config);

  // Substitute template and execute with concurrency control
  return manager.execute(async () => {
    const actualUrl = substituteTemplate(api.template, params);
    return await RPCs.fetchData(actualUrl, api.method);
  });
}

/**
 * Cached fetch function - creates a memoized version for an API
 */
function createMemoizedFetch<T extends MetabaseAPI>(api: T) {
  const config = getAPIConfig(api.template);
  
  return memoize(
    async (params: T['params']) => {
      return await fetchMetabaseAPIRaw(api, params);
    },
    config.cache_ttl,
    config.cache_rewarm_ttl
  );
}

/**
 * Main API client function - automatically caches based on configuration
 */
export async function fetchMetabaseAPI<T extends MetabaseAPI>(
  api: T, 
  params: T['params']
): Promise<any> {
  // For session properties and other cacheable endpoints, use memoized version
  const config = getAPIConfig(api.template);
  
  if (config.cache_ttl > 0) {
    // Create memoized version on-demand (function-level caching)
    const memoizedFetch = createMemoizedFetch(api);
    return await memoizedFetch(params);
  } else {
    // For non-cacheable endpoints, use raw fetch
    return await fetchMetabaseAPIRaw(api, params);
  }
}

/**
 * Specialized memoized fetch - for cases where you want explicit control over caching
 */
export function createMetabaseAPIFetch<T extends MetabaseAPI>(
  api: T,
  customConfig?: Partial<APIPerformanceConfig>
) {
  const config = { ...getAPIConfig(api.template), ...customConfig };
  
  return memoize(
    async (params: T['params']) => {
      return await fetchMetabaseAPIRaw(api, params);
    },
    config.cache_ttl,
    config.cache_rewarm_ttl
  );
}

// =============================================================================
// MONITORING AND DEBUGGING
// =============================================================================

/**
 * Get statistics for all concurrency managers
 */
export function getConcurrencyStats(): Record<string, ReturnType<EnhancedConcurrencyManager['getStats']>> {
  const stats: Record<string, any> = {};
  
  for (const [template, manager] of concurrencyManagers.entries()) {
    stats[template] = manager.getStats();
  }
  
  return stats;
}

/**
 * Get configuration for a specific API template
 */
export function getAPIConfiguration(template: string): APIPerformanceConfig {
  return getAPIConfig(template);
}

/**
 * Reset all concurrency managers (useful for testing)
 */
export function resetConcurrencyManagers(): void {
  concurrencyManagers.clear();
}

/**
 * Manually configure an endpoint (for runtime adjustments)
 */
export function configureEndpoint(template: string, config: APIPerformanceConfig): void {
  API_PERFORMANCE_CONFIG[template] = config;
  // Remove existing manager so it gets recreated with new config
  concurrencyManagers.delete(template);
}