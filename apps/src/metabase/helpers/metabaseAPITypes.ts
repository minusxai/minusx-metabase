/**
 * Essential types and configurations for the createAPI system
 */

// API Configuration interface for createAPI function
export interface APIConfig {
  cache_ttl: number;        // Cache TTL in seconds
  cache_rewarm_ttl: number; // Background refresh TTL in seconds
  max_concurrency: number;  // Max concurrent requests for this endpoint
  concurrency_delay: number; // Min delay between requests in milliseconds
}