/**
 * Enhanced Concurrency Management for Metabase API
 * 
 * Provides intelligent request queuing, rate limiting, and concurrency control
 * to prevent overwhelming the Metabase instance with too many simultaneous requests.
 */

import { memoize, RPCs } from 'web';
import {
  type APIConfig,
  type MetadataItem,
  DEFAULT_CACHE_TTL,
  DEFAULT_CACHE_REWARM,
  DEFAULT_MAX_CONCURRENCY,
  DEFAULT_CONCURRENCY_DELAY
} from './metabaseAPITypes';

// =============================================================================
// TASK QUEUE TYPES
// =============================================================================

interface QueuedTask<T> {
  task: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  timestamp: number;
}

// =============================================================================
// ENHANCED CONCURRENCY MANAGER
// =============================================================================

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

    if (this.queue.length > 0 && this.active < this.maxConcurrent && !this.canExecuteNow()) {
      const delayNeeded = this.minDelay - (Date.now() - this.lastExecution);
      setTimeout(() => this.processQueue(), delayNeeded);
    }
  }
}

async function processMetadata(metadataItems: MetadataItem[], apiTemplate: string): Promise<void> {
  console.log(`[Placeholder] Would process ${metadataItems.length} metadata items for ${apiTemplate}`);
}

// =============================================================================
// GLOBAL MANAGER POOL
// =============================================================================

const concurrencyManagers = new Map<string, EnhancedConcurrencyManager>();

export function getConcurrencyManager(template: string, config: Required<APIConfig>): EnhancedConcurrencyManager {
  if (!concurrencyManagers.has(template)) {
    concurrencyManagers.set(
      template, 
      new EnhancedConcurrencyManager(config.max_concurrency, config.concurrency_delay)
    );
  }
  return concurrencyManagers.get(template)!;
}

export function createAPI<T extends Record<string, any>>(
  template: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  config: APIConfig = {}
) {
  // Apply defaults
  const finalConfig = {
    cache_ttl: config.cache_ttl ?? DEFAULT_CACHE_TTL,
    cache_rewarm_ttl: config.cache_rewarm_ttl ?? DEFAULT_CACHE_REWARM,
    max_concurrency: config.max_concurrency ?? DEFAULT_MAX_CONCURRENCY,
    concurrency_delay: config.concurrency_delay ?? DEFAULT_CONCURRENCY_DELAY,
    metadataProcessor: config.metadataProcessor
  };
  // Template substitution
  function substituteTemplate(params: T): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (!(key in params)) {
        throw new Error(`Missing required parameter: ${key} for template: ${template}`);
      }
      return encodeURIComponent(String(params[key]));
    });
  }

  // Validate required parameters
  function validateParams(params: T): void {
    const templateParams = template.match(/\{\{(\w+)\}\}/g) || [];
    const requiredKeys = templateParams.map(param => param.slice(2, -2));
    
    for (const key of requiredKeys) {
      if (!(key in params) || params[key] == null) {
        throw new Error(`Missing required parameter: ${key} for API: ${template}`);
      }
    }
  }

  // Create memoized function with concurrency control
  const memoizedFetch = memoize(
    async (params: T): Promise<any> => {
      validateParams(params);
      const manager = getConcurrencyManager(template, finalConfig);
      
      return manager.execute(async () => {
        const actualUrl = substituteTemplate(params);
        return await RPCs.fetchData(actualUrl, method);
      });
    },
    finalConfig.cache_ttl,
    finalConfig.cache_rewarm_ttl,
    template,  // Use template as cache key base to avoid anonymous function collisions
    finalConfig.metadataProcessor ? (response: any) => {
      // Process metadata for fresh (non-cached) responses
      try {
        const metadataItems = finalConfig.metadataProcessor!(response);
        if (metadataItems && metadataItems.length > 0) {
          processMetadata(metadataItems, template).catch(error => {
            console.warn(`Metadata processing failed for ${template}:`, error);
          });
        }
      } catch (error) {
        console.warn(`Metadata processor failed for ${template}:`, error);
      }
    } : undefined
  );

  // Return the callable function
  return memoizedFetch;
}