/**
 * Concurrency Control Utility
 * 
 * Provides controlled access to API calls to prevent overwhelming the server.
 * Exposes a fetchData wrapper that automatically handles concurrency limits.
 */

import { RPCs } from 'web';

interface QueuedTask<T> {
  task: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
}

class ConcurrencyManager {
  private queue: QueuedTask<any>[] = [];
  private active = 0;
  private readonly maxConcurrent: number;

  constructor(maxConcurrent: number = 20) {
    this.maxConcurrent = maxConcurrent;
  }

  async execute<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const queuedTask: QueuedTask<T> = {
        task,
        resolve,
        reject
      };

      if (this.active < this.maxConcurrent) {
        this.executeTask(queuedTask);
      } else {
        this.queue.push(queuedTask);
      }
    });
  }

  private async executeTask<T>(queuedTask: QueuedTask<T>): Promise<void> {
    const { task, resolve, reject } = queuedTask;
    
    try {
      this.active++;
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
    while (this.queue.length > 0 && this.active < this.maxConcurrent) {
      const nextTask = this.queue.shift();
      if (nextTask) {
        this.executeTask(nextTask);
      }
    }
  }

  getStats(): { active: number; queued: number; maxConcurrent: number } {
    return {
      active: this.active,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent
    };
  }

  /**
   * Update the maximum concurrent limit
   */
  setMaxConcurrent(limit: number): void {
    if (limit > 0) {
      // @ts-ignore - accessing private property for configuration
      this.maxConcurrent = limit;
      this.processQueue(); // Process any queued tasks with new limit
    }
  }
}

// Global concurrency manager
const concurrencyManager = new ConcurrencyManager(20);

/**
 * Fetch data with automatic concurrency control
 * 
 * This is a drop-in replacement for RPCs.fetchData that automatically
 * handles concurrency limits to prevent API overload.
 * 
 * @param url API endpoint
 * @param method HTTP method
 * @returns Promise resolving to the API response
 */
export async function fetchData(url: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET'): Promise<any> {
  return concurrencyManager.execute(async () => {
    return await RPCs.fetchData(url, method);
  });
}

/**
 * Execute any async task with concurrency control
 * 
 * @param task Async function to execute
 * @returns Promise resolving to the task result
 */
export async function executeWithConcurrency<T>(task: () => Promise<T>): Promise<T> {
  return concurrencyManager.execute(task);
}

/**
 * Batch execute multiple tasks with concurrency control
 * 
 * @param tasks Array of async functions to execute
 * @returns Promise resolving to array of results
 */
export async function executeBatch<T>(tasks: (() => Promise<T>)[]): Promise<T[]> {
  const promises = tasks.map(task => concurrencyManager.execute(task));
  return Promise.all(promises);
}

/**
 * Concurrency management functions
 */
export const concurrencyControl: ConcurrencyControl = {
  /**
   * Get current concurrency statistics
   */
  getStats: () => concurrencyManager.getStats(),

  /**
   * Configure the maximum concurrent requests
   */
  setMaxConcurrent: (limit: number) => {
    if (limit > 0 && limit <= 100) { // Reasonable limits
      concurrencyManager.setMaxConcurrent(limit);
    } else {
      console.warn(`Invalid concurrency limit: ${limit}. Must be between 1-100.`);
    }
  },

  /**
   * Execute a custom task with concurrency control
   */
  execute: <T>(task: () => Promise<T>) => concurrencyManager.execute(task)
};

// Export the interface type for better typing
export interface ConcurrencyControl {
  getStats(): { active: number; queued: number; maxConcurrent: number };
  setMaxConcurrent(limit: number): void;
  execute<T>(task: () => Promise<T>): Promise<T>;
}