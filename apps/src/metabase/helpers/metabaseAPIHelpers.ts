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
import { DatabaseResponse, DatabaseInfo, DatabaseInfoWithTables, FormattedTable } from './metabaseAPITypes';

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
  fetchTableMetadata
} from './metabaseAPI';

// =============================================================================
// HELPER FUNCTIONS FOR DATA EXTRACTION
// =============================================================================

function extractQueriesFromResponse(response: any): string[] {
  return get(response, 'data', [])
    .map((entity: any) => get(entity, "dataset_query.native.query"))
    .filter((query: any) => !isEmpty(query));
}

function getDefaultSchema(databaseInfo: any): string {
  const schemaFromResponse = get(databaseInfo, "settings.schema-filters.default", "");
  return schemaFromResponse || get(databaseInfo, "details.schema", "") || "public";
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

/**
 * Generic function to fetch queries from user edits and creations
 * Consolidates the repeated pattern across multiple functions
 */
async function getUserQueries(userId: number, dbId?: number, searchQuery?: string): Promise<string[]> {
  const [edits, creations] = await Promise.all([
    handlePromise(
      searchQuery && dbId 
        ? fetchSearchUserEditsByQuery({ db_id: dbId, query: searchQuery, user_id: userId })
        : fetchUserEdits({ user_id: userId }),
      "[minusx] Error getting user edits", 
      { data: [] }
    ),
    handlePromise(
      searchQuery && dbId
        ? fetchSearchUserCreationsByQuery({ db_id: dbId, query: searchQuery, user_id: userId })
        : fetchUserCreations({ user_id: userId }),
      "[minusx] Error getting user creations", 
      { data: [] }
    ),
  ]);
  
  const editQueries = extractQueriesFromResponse(edits);
  const creationQueries = extractQueriesFromResponse(creations);
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

export async function getDatabaseTablesWithoutFields(dbId: number): Promise<DatabaseInfoWithTables> {
  const jsonResponse = await fetchDatabaseWithTables({ db_id: dbId });
  const defaultSchema = getDefaultSchema(jsonResponse);
  const tables = await Promise.all(
      map(get(jsonResponse, 'tables', []), (table: any) => extractTableInfo(table, false))
  );

  return {
      ...extractDbInfo(jsonResponse, defaultSchema),
      tables: tables || []
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
export async function getUserTables(): Promise<TableAndSchema[]> {
  const userInfo = await getCurrentUserInfo();
  if (!userInfo) return [];

  const queries = await getUserQueries(userInfo.id);
  if (queries.length > 0) {
    return extractTablesFromQueries(queries);
  }
  
  // Fallback: if user has no queries, get ALL database queries
  const dbId = await getSelectedDbId();
  if (!dbId) return [];
  
  return performFallbackSearch(
    () => fetchSearchByDatabase({ db_id: dbId }),
    "[minusx] Error getting all queries"
  );
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
export async function getFieldUniqueValues(fieldId: number) {
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
export async function getTableMetadata(tableId: number) {
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
 * Fetch sample values for table fields
 */
async function getTableSampleValues(tableInfo: FormattedTable) {
  // Only fetch sample values for non-numeric columns with distinct-count < 100
  const nonNumericFields = Object.values(tableInfo.columns || {}).filter((field) => 
    !isNumericType(field.type) && (field.distinct_count || 0) > 0 && (field.distinct_count || 0) < 100
  );
  
  const fieldIds = nonNumericFields.map((field) => field.id);
  const fieldIdSampleValMapping: Record<number, any> = {}
  
  const sampleValsResults = await Promise.all(
    fieldIds.map(async (fieldId) => {
      try {
        const sampleVals = await getFieldUniqueValues(fieldId);
        return { fieldId, sampleVals };
      } catch (error) {
        console.warn(`Failed to fetch sample values for field ${fieldId}:`, error);
        return { fieldId, sampleVals: null };
      }
    })
  );
  
  // Map results back to fieldIdSampleValMapping
  sampleValsResults.forEach(({ fieldId, sampleVals }) => {
    if (sampleVals !== null) {
      fieldIdSampleValMapping[fieldId] = sampleVals;
    }
  });
  
  return fieldIdSampleValMapping;
}


/**
 * Fetch complete table data with optional sample values
 */
const ENABLE_UNIQUE_VALUES = false; // Set to false to disable sample values for now

export async function getTableData(tableId: number): Promise<FormattedTable | "missing"> {
  const metadataResult = await getTableMetadata(tableId);
  if (metadataResult === "missing") {
    return "missing";
  }
  
  const { tableInfo } = metadataResult;
  
  //#HACK to disable sample values for now
  if (!ENABLE_UNIQUE_VALUES) {
    return tableInfo;
  }
  
  const fieldIdSampleValMapping = await getTableSampleValues(tableInfo);
  
  // Apply sample values to table info
  Object.values(tableInfo.columns || {}).forEach((field) => {
    const fieldSample = fieldIdSampleValMapping[field.id]
    if (fieldSample) {
      const rawValues = flatMap(get(fieldSample, 'values', [])).map(truncateUniqueValue)
      
      // Limit to 20 values with deterministic sampling at storage time
      if (rawValues.length > 20) {
        field.sample_values = deterministicSample(rawValues, 20, `${tableInfo.name}.${field.name}`)
      } else {
        field.sample_values = rawValues
      }
    }
  })
  
  return tableInfo;
}