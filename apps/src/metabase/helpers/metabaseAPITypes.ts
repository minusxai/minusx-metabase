/**
 * Types, Interfaces, and Core API Creation Function
 * 
 * This file contains all type definitions and the magical createAPI function
 * that powers the entire Metabase API system.
 */

import { TableAndSchema } from './parseSql';
import type { MetadataItem } from 'web/types';

// =============================================================================
// CACHE CONFIGURATION CONSTANTS
// =============================================================================

export const DEFAULT_CACHE_TTL = 14 * 24 * 60 * 60; // 14 days in seconds
export const DEFAULT_CACHE_REWARM = 12 * 60 * 60;   // 12 hours in seconds
export const DEFAULT_MAX_CONCURRENCY = 15;          // Default max concurrent requests
export const DEFAULT_CONCURRENCY_DELAY = 0;         // Default delay in milliseconds

// =============================================================================
// CORE TYPE DEFINITIONS
// =============================================================================

export interface APIConfig {
  cache_ttl?: number;        // Cache TTL in seconds (defaults to DEFAULT_CACHE_TTL)
  cache_rewarm_ttl?: number; // Background refresh TTL in seconds (defaults to DEFAULT_CACHE_REWARM)
  max_concurrency?: number;  // Max concurrent requests for this endpoint (defaults to DEFAULT_MAX_CONCURRENCY)
  concurrency_delay?: number; // Min delay between requests in milliseconds (defaults to DEFAULT_CONCURRENCY_DELAY)
  metadataProcessor?: (response: any) => MetadataItem[]; // Function to extract metadata from fresh API responses
}

export interface FormattedColumn {
  description?: string;
  name: string;
  id: number | string;
  type: string;
  sample_values?: any[]; 
  distinct_count?: number;
  fk_table_id?: number;
  foreign_key_target?: string | null;
}

export interface FormattedTable {
  description?: string;
  name: string;
  id: number;
  schema: string;
  columns?: { [key: number | string]: FormattedColumn };
  related_tables_freq?: number[][];
  count?: number;
  sample_values_completion_percentage?: number;
}

export interface MetabaseModel {
  name: string;
  collectionName: string | null;
  modelId: number;
  collectionId: number | null;
  description?: string;
}

export interface DatabaseInfo {
  name: string;
  description: string;
  id: number;
  dialect: string;
  default_schema?: string;
  dbms_version: {
    flavor: string;
    version: string;
    semantic_version: number[];
  }
}

export interface DatabaseInfoWithTablesAndModels extends DatabaseInfo {
  tables: FormattedTable[];
  models: MetabaseModel[];
}

export interface DatabaseResponse {
  total: number;
  data: {
    name: string;
    id: number;
  }[]
}

export interface UserContext {
  queries: string[];
  referencedTables: TableAndSchema[];
}