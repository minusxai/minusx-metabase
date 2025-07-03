/**
 * Metabase API Helper Functions
 * 
 * Higher-level business logic functions that use the pure API functions
 * from metabaseAPI.ts and state functions from metabaseStateAPI.ts.
 */

import { map, get, isEmpty, flatMap } from 'lodash';
import { getTablesFromSqlRegex, TableAndSchema } from './parseSql';
import { handlePromise, deterministicSample } from '../../common/utils';
import { getCurrentUserInfo, getSelectedDbId } from './metabaseStateAPI';
import { extractTableInfo } from './parseTables';
import { DatabaseResponse, DatabaseInfo, FormattedTable, MetabaseModel, DatabaseInfoWithTablesAndModels } from './metabaseAPITypes';

import {
  fetchUserEdits,
  fetchUserCreations,
  fetchSearchByDatabase,
  fetchSearchUserEditsByQuery,
  fetchSearchUserCreationsByQuery,
  fetchSearchCards,
  fetchDatabases,
  fetchDatabaseInfo,
  fetchDatabaseWithTables,
  fetchFieldInfo,
  executeDatasetQuery,
  fetchSearchByQuery,
  fetchFieldUniqueValues,
  fetchTableMetadata,
  fetchModels,
  fetchCard
} from './metabaseAPI';
import { Card, SearchApiResponse } from './types';

// =============================================================================
// HELPER FUNCTIONS FOR DATA EXTRACTION
// =============================================================================

function extractQueriesFromResponse(response: any): string[] {
  return get(response, 'data', [])
    .map((entity: any) => get(entity, "dataset_query.native.query"))
    .filter((query: any) => !isEmpty(query));
}

async function getOrFetchSqlQueryFromCards(searchResponse: SearchApiResponse): Promise<string[]> {
  const cards = get(searchResponse, 'data', []).filter((entity: any) => entity.model === 'card' || entity.model === 'dataset');
  // check if dataset_query is missing. happens in metabase version >= 54
  const cardsWithMissingDatasetQuery = cards.filter((card: any) => !card.dataset_query);
  if (cardsWithMissingDatasetQuery.length === 0) {
    return cards
      .map((entity: any) => get(entity, "dataset_query.native.query"))
      .filter((query: any) => !isEmpty(query));
  }
  // only fetch the first 50 cards to avoid overwhelming the API
  const cardIds = cardsWithMissingDatasetQuery.map((card: any) => card.id).slice(0, 50);
  const cardQueries = await Promise.all(cardIds.map(async (cardId: number) => {
    const card = await fetchCard({card_id: cardId}) as Card
    return get(card, "dataset_query.native.query", "");
  }));
  return cardQueries.filter((query: any) => !isEmpty(query));
}

function getDefaultSchema(databaseInfo: any) {
  const engine = databaseInfo?.engine;
  const details = databaseInfo?.details || {};
  
  // If schema is explicitly set, always respect it
  if (details.schema) {
    return details.schema;
  }

  // Mapping of default schemas
  const DEFAULT_SCHEMAS = {
    postgres: "public",
    redshift: "public",
    sqlserver: "dbo",
    duckdb: "main",
    sqlite: "main",
    h2: "PUBLIC"
  };

  if (engine in DEFAULT_SCHEMAS) {
    // @ts-ignore
    return DEFAULT_SCHEMAS[engine];
  }

  // Engines where schema = database name
  if (["mysql", "mariadb", "clickhouse"].includes(engine)) {
    return details.dbname || null;
  }

  // BigQuery case: dataset_id behaves like schema
  if (engine === "bigquery") {
    return details.dataset_id || null;
  }

  // Snowflake: no reliable way unless explicitly set
  if (engine === "snowflake") {
    return null;
  }

  // MongoDB: no schema concept
  if (engine === "mongo") {
    return null;
  }

  // Presto/Trino: no real default schema, needs explicit context
  if (["presto", "trino", "starburst"].includes(engine)) {
    return null;
  }

  // Default fallback
  return null;
}

function extractDbInfo(db: any, default_schema: string): DatabaseInfo {
  const dialect = get(db, "dbms_version.flavor") || get(db, "engine") || "unknown";
  return {
    name: db.name,
    description: db.description || "",
    id: db.id,
    dialect,
    default_schema,
    dbms_version: {
      flavor: dialect,
      version: get(db, "dbms_version.version") || "unknown",
      semantic_version: get(db, "dbms_version.semantic_version") || [0, 0, 0]
    }
  };
}


// =============================================================================
// UNIFIED SEARCH AND USER QUERY FUNCTIONS
// =============================================================================

// async function getDatasetQueriesFor

/**
 * Generic function to fetch queries from user edits and creations
 * Consolidates the repeated pattern across multiple functions
 */
async function getUserQueries(userId: number, dbId: number, searchQuery?: string): Promise<string[]> {
  const [edits, creations] = await Promise.all([
    handlePromise(
      searchQuery
        ? fetchSearchUserEditsByQuery({ db_id: dbId, query: searchQuery, user_id: userId })
        : fetchUserEdits({ user_id: userId, db_id: dbId}),
      "[minusx] Error getting user edits", 
      { data: [] }
    ),
    handlePromise(
      searchQuery
        ? fetchSearchUserCreationsByQuery({ db_id: dbId, query: searchQuery, user_id: userId })
        : fetchUserCreations({ user_id: userId, db_id: dbId }),
      "[minusx] Error getting user creations", 
      { data: [] }
    ),
  ]);
  const editQueries = await getOrFetchSqlQueryFromCards(edits);
  const creationQueries = await getOrFetchSqlQueryFromCards(creations);
  return Array.from(new Set([...editQueries, ...creationQueries]));
}

/**
 * Get tables from queries - unified logic for table extraction
 */
function extractTablesFromQueries(queries: string[]): TableAndSchema[] {
  return queries.map(getTablesFromSqlRegex).flat();
}

/**
 * Generic fallback search function - consolidates duplicate logic
 */
async function performFallbackSearch(apiFn: () => Promise<any>, errorMsg: string): Promise<TableAndSchema[]> {
  const response = await handlePromise(apiFn(), errorMsg, { data: [] });
  const queries = extractQueriesFromResponse(response);
  return extractTablesFromQueries(queries);
}


// =============================================================================
// DATABASE HELPER FUNCTIONS
// =============================================================================

export async function getDatabases() {
  return await fetchDatabases({}) as DatabaseResponse;
}

export const getAllRelevantModelsForSelectedDb = async (dbId: number, forceRefreshModels: boolean = false): Promise<MetabaseModel[]> => {
  const models = forceRefreshModels ? await fetchModels.refresh({db_id: dbId}) as SearchApiResponse : await fetchModels({db_id: dbId}) as SearchApiResponse;
  const data = get(models, 'data', []);
  const modelsAsTables = data.map(model => {
    return {
      name: model.name,
      collectionName: model.collection?.name,
      modelId: model.id,
      collectionId: model.collection?.id,
      description: model.description || undefined,
      dbId: dbId
    }
  })
  // remove internal collection models from selection menu since right now we're handling them separately
  // eventually should just be one way to handle all kinds of metabase models
  return modelsAsTables.filter((model: MetabaseModel) => model.collectionName !== 'mx_internal');
}


export async function getDatabaseTablesAndModelsWithoutFields(dbId: number, forceRefreshModels: boolean = false): Promise<DatabaseInfoWithTablesAndModels> {
  const jsonResponse = await fetchDatabaseWithTables({ db_id: dbId });
  const models = await getAllRelevantModelsForSelectedDb(dbId, forceRefreshModels) ;
  const defaultSchema = getDefaultSchema(jsonResponse);
  const tables = await Promise.all(
      map(get(jsonResponse, 'tables', []), (table: any) => extractTableInfo(table, false))
  );

  return {
      ...extractDbInfo(jsonResponse, defaultSchema),
      tables: tables || [],
      models: models || []
  };
}

export async function getDatabaseInfo(dbId: number) {
  const jsonResponse = await fetchDatabaseInfo({ db_id: dbId });
  const defaultSchema = getDefaultSchema(jsonResponse);
  return {
    ...extractDbInfo(jsonResponse, defaultSchema),
  }
}

export async function getFieldResolvedName(fieldId: number) {
  const fieldInfo = await fetchFieldInfo({ field_id: fieldId }) as any;
  return `${fieldInfo.table.schema}.${fieldInfo.table.name}.${fieldInfo.name}`;
}


// =============================================================================
// MAIN EXPORTED FUNCTIONS
// =============================================================================


/**
 * Get tables referenced in user's queries (with fallback to all database tables)
 */
export async function getUserTables(dbId: number): Promise<TableAndSchema[]> {
  const userInfo = await getCurrentUserInfo();
  if (!userInfo) return [];

  const queries = await getUserQueries(userInfo.id, dbId);
  const queriesTablesFromQueries = extractTablesFromQueries(queries).map(table => {
    table.count = (table.count || 0) + 10
    return table
  });
  
  // Fallback: if user has no queries, get ALL database queries
  if (!dbId) return queriesTablesFromQueries;
  
  const remainingTables = await performFallbackSearch(
    () => fetchSearchByDatabase({ db_id: dbId }),
    "[minusx] Error getting all queries"
  );
  return [...queriesTablesFromQueries, ...remainingTables];
}


/**
 * Search user queries with fallback to general search
 */
export async function searchUserQueries(id: number, dbId: number, query: string): Promise<TableAndSchema[]> {
  const queries = await getUserQueries(id, dbId, query);
  if (queries.length > 0) {
    return extractTablesFromQueries(queries);
  }
  
  // Fallback: search all cards
  return performFallbackSearch(
    () => fetchSearchCards({ db_id: dbId, query }),
    "[minusx] Error searching for all queries"
  );
}

/**
 * Execute SQL query with standardized error handling
 */
export async function executeQuery(sql: string, databaseId: number, templateTags = {}) {
  return await executeDatasetQuery({
    database: databaseId,
    type: "native",
    native: {
      query: sql,
      'template-tags': templateTags
    }
  });
}

/**
 * Search all queries across the database
 */
export async function searchAllQueries(dbId: number, query: string): Promise<TableAndSchema[]> {
  return performFallbackSearch(
    () => fetchSearchByQuery({ db_id: dbId, query }),
    "[minusx] Error searching all queries"
  );
}

// =============================================================================
// TABLE AND FIELD HELPER FUNCTIONS
// =============================================================================

/**
 * Get sample values for a field
 */
export async function getFieldUniqueValues(fieldId: number | string) {
  return await fetchFieldUniqueValues({ field_id: fieldId });
}

/**
 * Helper function to determine if a field type is numeric
 */
function isNumericType(type: string): boolean {
  if (!type) return false;
  const numericTypes = [
    'INTEGER', 'BIGINT', 'DECIMAL', 'DOUBLE', 'FLOAT', 'NUMERIC', 'REAL',
    'SMALLINT', 'TINYINT', 'NUMBER', 'INT', 'LONG', 'SHORT'
  ];
  return numericTypes.some(numericType => type.toUpperCase().includes(numericType));
}

/**
 * Helper function to truncate long sample values
 */
function truncateUniqueValue(value: any): any {
  if (typeof value === 'string' && value.length > 100) {
    return value.substring(0, 100) + '... (truncated)';
  }
  return value;
}

/**
 * Fetch table metadata with enhanced table info
 */
export async function getTableMetadata(tableId: number | string) {
  const resp = await fetchTableMetadata({ table_id: tableId }) as any;
  if (!resp) {
    console.warn("Failed to get table schema", tableId, resp);
    return "missing";
  }
  const tableInfo = extractTableInfo(resp, true);
  
  // Create a map of field ID to distinct count for quick lookup
  const distinctCountMap = new Map();
  (resp.fields || []).forEach((field: any) => {
    const distinctCount = field.fingerprint?.global?.['distinct-count'] || 0;
    distinctCountMap.set(field.id, distinctCount);
  });
  
  // Add distinct_count to each column
  if (tableInfo.columns) {
    Object.values(tableInfo.columns).forEach((column) => {
      const distinctCount = distinctCountMap.get(column.id) || 0;
      column.distinct_count = distinctCount;
    });
  }
  
  // Get distinct counts from the network response fingerprint data for backward compatibility
  const fieldsWithDistinctCount = (resp.fields || []).map((field: any) => ({
    id: field.id,
    distinctCount: field.fingerprint?.global?.['distinct-count'] || 0
  }));
  
  return { tableInfo, fieldsWithDistinctCount };
}

/**
 * Fetch sample values with timeout and background caching
 */
async function getSampleValuesWithTimeout(tableInfo: FormattedTable, timeout: number = 5000) {
  const eligibleFields = Object.values(tableInfo.columns || {}).filter((field) => 
    !isNumericType(field.type) && (field.distinct_count || 0) > 0 && (field.distinct_count || 0) < 100
  );
  
  const totalEligibleFields = eligibleFields.length;
  
  const fieldPromises = eligibleFields.map(async (field) => {
    try {
      const sampleVals = await getFieldUniqueValues(field.id);
      return { fieldId: field.id, sampleVals, success: true };
    } catch (error) {
      console.warn(`Background fetch failed for field ${field.id}:`, error);
      return { fieldId: field.id, sampleVals: null, success: false };
    }
  });
  
  // Race between completion and timeout
  const timeoutPromise = new Promise<any[]>((resolve) => 
    setTimeout(() => resolve([]), timeout)
  );
  
  const completedResults = await Promise.race([
    Promise.allSettled(fieldPromises),
    timeoutPromise
  ]);
  
  // Continue background fetching - don't await this!
  // The API caching will ensure subsequent calls benefit from completed fetches
  Promise.allSettled(fieldPromises).catch(() => {
    // Silently handle background errors - we already returned
  });
  
  // Process whatever results we got (could be partial)
  const fieldIdSampleValMapping: Record<number, any> = {};
  let successfullyFetched = 0;
  
  if (Array.isArray(completedResults)) {
    completedResults.forEach((result: any) => {
      if (result.status === 'fulfilled' && result.value.success && result.value.sampleVals) {
        fieldIdSampleValMapping[result.value.fieldId] = result.value.sampleVals;
        successfullyFetched++;
      }
    });
  }
  
  // Calculate completion percentage
  const completionPercentage = totalEligibleFields > 0 
    ? Math.round((successfullyFetched / totalEligibleFields) * 100)
    : 100; // 100% if no eligible fields (nothing to fetch)
  
  return {
    fieldIdSampleValMapping,
    completionPercentage
  };
}

/**
 * Fetch complete table data with progressive sample value loading
 */
const ENABLE_UNIQUE_VALUES = true; // Set to false to disable sample values for now
const DEFAULT_SAMPLE_VALUES_TIMEOUT = 100; // 100ms timeout for sample values

export async function getTableData(tableId: number | string, sampleValuesTimeout?: number): Promise<FormattedTable | "missing"> {
  const metadataResult = await getTableMetadata(tableId);
  if (metadataResult === "missing") {
    return "missing";
  }
  
  const { tableInfo } = metadataResult;
  
  if (!ENABLE_UNIQUE_VALUES) {
    tableInfo.sample_values_completion_percentage = 100;
    return tableInfo;
  }
  
  try {
    // Get sample values with timeout - this will return immediately after timeout
    // but continue fetching in background to warm the cache for next time
    const { fieldIdSampleValMapping, completionPercentage } = await getSampleValuesWithTimeout(
      tableInfo, 
      sampleValuesTimeout ?? DEFAULT_SAMPLE_VALUES_TIMEOUT
    );
    
    // Set completion percentage on the table
    tableInfo.sample_values_completion_percentage = completionPercentage;
    
    // Apply whatever sample values we managed to get
    Object.values(tableInfo.columns || {}).forEach((field) => {
      // @ts-ignore
      const fieldSample = fieldIdSampleValMapping[field.id];
      if (fieldSample) {
        const rawValues = flatMap(get(fieldSample, 'values', [])).map(truncateUniqueValue);
        
        // Limit to 20 values with deterministic sampling at storage time
        if (rawValues.length > 20) {
          field.sample_values = deterministicSample(rawValues, 20, `${tableInfo.name}.${field.name}`);
        } else {
          field.sample_values = rawValues;
        }
      }
    });
  } catch (error) {
    // If sample value fetching fails entirely, just return table without sample values
    console.warn("Sample value fetching failed:", error);
    // Set completion percentage to 0 on error
    tableInfo.sample_values_completion_percentage = 0;
  }
  
  return tableInfo;
}