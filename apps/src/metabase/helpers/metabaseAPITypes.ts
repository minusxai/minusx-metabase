/**
 * Types, Interfaces, and Core API Creation Function
 * 
 * This file contains all type definitions and the magical createAPI function
 * that powers the entire Metabase API system.
 */

import { TableAndSchema } from './parseSql';

// =============================================================================
// CACHE CONFIGURATION CONSTANTS
// =============================================================================

export const DEFAULT_CACHE_TTL = 14 * 24 * 60 * 60; // 14 days in seconds
export const DEFAULT_CACHE_REWARM = 12 * 60 * 60;   // 12 hours in seconds

// =============================================================================
// CORE TYPE DEFINITIONS
// =============================================================================

export interface APIConfig {
  cache_ttl: number;        // Cache TTL in seconds
  cache_rewarm_ttl: number; // Background refresh TTL in seconds
  max_concurrency: number;  // Max concurrent requests for this endpoint
  concurrency_delay: number; // Min delay between requests in milliseconds
}

export interface FormattedColumn {
  description?: string;
  name: string;
  id: number;
  type: string;
  unique_values?: any[]; 
  has_more_values?: boolean;
  fk_table_id?: number;
  foreign_key_target?: string | null;
}

export interface FormattedTable {
  description?: string;
  name: string;
  id: number;
  schema: string;
  columns?: { [key: number]: FormattedColumn };
  related_tables_freq?: number[][];
  count?: number;
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

export interface DatabaseInfoWithTables extends DatabaseInfo {
  tables: FormattedTable[];
}

export interface UserContext {
  queries: string[];
  referencedTables: TableAndSchema[];
}