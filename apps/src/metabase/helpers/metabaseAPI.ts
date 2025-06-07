/**
 * Pure Metabase API Functions
 * 
 * This file contains only the low-level API functions created with createAPI.
 * Higher-level business logic is in metabaseAPIHelpers.ts.
 */

import { createAPI } from './metabaseAPIConcurrency';

// =============================================================================
// EXPORTED API FUNCTIONS - Available for use by helper modules
// =============================================================================

// Database Operations
export const fetchDatabases = createAPI<{}>(
  '/api/database'
);

export const fetchDatabaseInfo = createAPI<{ db_id: number }>(
  '/api/database/{{db_id}}'
);

export const fetchDatabaseWithTables = createAPI<{ db_id: number }>(
  '/api/database/{{db_id}}?include=tables'
);

// Table Operations
export const fetchTableMetadata = createAPI<{ table_id: number }>(
  '/api/table/{{table_id}}/query_metadata'
);

// Field Operations - EXPENSIVE, very conservative limits
export const fetchFieldUniqueValues = createAPI<{ field_id: number }>(
  '/api/field/{{field_id}}/values',
  'GET',
  {
    cache_rewarm_ttl: 2 * 24 * 60 * 60, // 2 days rewarm as requested
    max_concurrency: 1,                  // Very conservative
    concurrency_delay: 1000               // 1 second delay between requests
  }
);

// Search Operations - Can be expensive
export const fetchUserEdits = createAPI<{ user_id: number }>(
  '/api/search?edited_by={{user_id}}'
);

export const fetchUserCreations = createAPI<{ user_id: number }>(
  '/api/search?created_by={{user_id}}'
);

export const fetchSearchByQuery = createAPI<{ db_id: number; query: string }>(
  '/api/search?table_db_id={{db_id}}&q={{query}}'
);

export const fetchSearchByDatabase = createAPI<{ db_id: number }>(
  '/api/search?table_db_id={{db_id}}'
);

export const fetchSearchUserEditsByQuery = createAPI<{ db_id: number; query: string; user_id: number }>(
  '/api/search?table_db_id={{db_id}}&q={{query}}&edited_by={{user_id}}'
);

export const fetchSearchUserCreationsByQuery = createAPI<{ db_id: number; query: string; user_id: number }>(
  '/api/search?table_db_id={{db_id}}&q={{query}}&created_by={{user_id}}'
);

export const fetchSearchCards = createAPI<{ db_id: number; query: string }>(
  '/api/search?models=card&table_db_id={{db_id}}&q={{query}}'
);

// Field Info Operations
export const fetchFieldInfo = createAPI<{ field_id: number }>(
  '/api/field/{{field_id}}'
);

// Dataset Operations - For running SQL queries
export const executeDatasetQuery = createAPI<{
  database: number;
  type: string;
  native: {
    query: string;
    'template-tags': Record<string, any>;
  };
}>(
  '/api/dataset',
  'POST'
);