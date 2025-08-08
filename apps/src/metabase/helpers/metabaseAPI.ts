/**
 * Pure Metabase API Functions
 * 
 * This file contains only the low-level API functions created with createAPI.
 * Higher-level business logic is in metabaseAPIHelpers.ts.
 */

import { get } from 'lodash';
import { createAPI } from './metabaseAPIConcurrency';
import { metadata } from 'reflect-metadata/no-conflict';

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

export const fetchDatabaseUsage = createAPI<{ db_id: number }>(
  '/api/database/{{db_id}}/usage_info'
);

export const fetchModels = createAPI<{db_id: number}>(
  '/api/search?models=dataset&filter_items_in_personal_collection=exclude&model_ancestors=false&table_db_id={{db_id}}',
  'GET',
);

export const fetchCard = createAPI<{card_id: number}>(
  '/api/card/{{card_id}}'
);

export const fetchCards = createAPI<{}>(
  '/api/card/'
);

export const fetchModelInfo = createAPI<{model_id: number}>(
  '/api/card/{{model_id}}/query_metadata',
  'GET'
);

export const fetchDatabaseWithTables = createAPI<{ db_id: number }>(
  '/api/database/{{db_id}}?include=tables',
  'GET',
  // {
  //   metadataProcessor: (response) => {
  //     // return response.tables.map((table: any) => ({
  //     //   metadata_type: 'db_table',
  //     //   metadata_value: table
  //     // }))
  //     const dbMetadata = {
  //       metadata_type: 'db',
  //       version: 'v1',
  //       metadata_value: {
  //         id: get(response, 'id'),
  //         engine: get(response, 'engine'),
  //         name: get(response, 'name'),
  //         description: get(response, 'description'),
  //         dbms_version: get(response, 'dbms_version'),
  //         caveats: get(response, 'caveats'),
  //         points_of_interest: get(response, 'points_of_interest'),
  //         details: get(response, 'details'),
  //         features: get(response, 'features'),
  //       }
  //     }
  //     const metadata = response.tables.map((table: any) => {
  //       return {
  //         metadata_type: 'db_table',
  //         version: 'v1',
  //         metadata_value: {
  //           id: get(table, 'id'),
  //           name: get(table, 'name'),
  //           display_name: get(table, 'display_name'),
  //           description: get(table, 'description'),
  //           db_id: get(table, 'db_id'),
  //           schema: get(table, 'schema'),
  //           estimated_row_count: get(table, 'estimated_row_count'),
  //           entity_type: get(table, 'entity_type'),
  //           caveats: get(table, 'caveats'),
  //           points_of_interest: get(table, 'points_of_interest'),
  //         }
  //       }
  //     })
  //     return [dbMetadata, ...metadata];
  //   }
  // }
);

// Table Operations
export const fetchTableMetadata = createAPI<{ table_id: number | string }>(
  '/api/table/{{table_id}}/query_metadata',
  'GET',
  // {
  //   metadataProcessor: (response) => {
  //     const metadata = {
  //       metadata_type: 'table',
  //       version: 'v1',
  //       metadata_value: {
  //         id: get(response, 'id'),
  //         name: get(response, 'name'),
  //         display_name: get(response, 'display_name'),
  //         description: get(response, 'description'),
  //         schema: get(response, 'schema'),
  //       }
  //     }
  //     const fieldMetadata = response.fields.map((field: any) => {
  //       return {
  //         metadata_type: 'table_field',
  //         version: 'v1',
  //         metadata_value: {
  //           id: get(field, 'id'),
  //           name: get(field, 'name'),
  //           database_type: get(field, 'database_type'),
  //           semantic_type: get(field, 'semantic_type'),
  //           effective_type: get(field, 'effective_type'),
  //           base_type: get(field, 'base_type'),
  //           display_name: get(field, 'display_name'),
  //           description: get(field, 'description'),
  //           table_id: get(field, 'table_id'),
  //           caveats: get(field, 'caveats'),
  //           points_of_interest: get(field, 'points_of_interest'),
  //           fingerprint: get(field, 'fingerprint'),
  //         }
  //       }
  //     })
  //     return [metadata, ...fieldMetadata];
  //   }
  // }
);

// Field Operations - EXPENSIVE, very conservative limits
export const fetchFieldUniqueValues = createAPI<{ field_id: number | string }>(
  '/api/field/{{field_id}}/values',
  'GET',
  {
    cache_rewarm_ttl: 2 * 24 * 60 * 60, // 2 days rewarm as requested
    max_concurrency: 1,                  // Very conservative
    concurrency_delay: 30000               // 30 second delay between requests
  }
);

// Search Operations - Can be expensive
export const fetchUserEdits = createAPI<{ user_id: number, db_id: number }>(
  '/api/search?edited_by={{user_id}}&table_db_id={{db_id}}'
);

export const fetchUserCreations = createAPI<{ user_id: number, db_id: number }>(
  '/api/search?created_by={{user_id}}&table_db_id={{db_id}}'
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

export const fetchDatabaseFields = createAPI<{ db_id: number }>(
  '/api/database/{{db_id}}/fields'
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

// Dataset Operations - For running SQL queries
export const executeMBQLDatasetQuery = createAPI<{
  database: number;
  type: string;
  query: object;
}>(
  '/api/dataset',
  'POST'
);


export const getSQLFromMBQL = createAPI<{
  database: number;
  type: string;
  query?: Record<string, any>;
  native?: Record<string, any>;
}>(
  '/api/dataset/native',
  'POST'
);
