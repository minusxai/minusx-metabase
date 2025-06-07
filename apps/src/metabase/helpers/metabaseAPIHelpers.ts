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
 * Get unique values for a field
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
 * Helper function to truncate long unique values
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
  
  // Get distinct counts from the network response fingerprint data
  const fieldsWithDistinctCount = (resp.fields || []).map((field: any) => ({
    id: field.id,
    distinctCount: field.fingerprint?.global?.['distinct-count'] || 0
  }));
  
  return { tableInfo, fieldsWithDistinctCount };
}

/**
 * Fetch unique values for table fields
 */
async function getTableUniqueValues(tableInfo: FormattedTable, fieldsWithDistinctCount: any[]) {
  // Only fetch unique values for non-numeric columns with distinct-count < 100
  const nonNumericFields = Object.values(tableInfo.columns || {}).filter((field) => 
    !isNumericType(field.type)
  );
  
  // Create a map for quick lookup
  const distinctCountMap = Object.fromEntries(
    fieldsWithDistinctCount.map((field: {id: number, distinctCount: number}) => [field.id, field.distinctCount])
  );
  
  // Filter fields that have distinct-count < 100
  const fieldsToFetchUniqueValues = nonNumericFields.filter((field) => {
    const distinctCount = distinctCountMap[field.id] || 0;
    return distinctCount > 0 && distinctCount < 100;
  });
  
  const fieldIds = fieldsToFetchUniqueValues.map((field) => field.id);
  const fieldIdUniqueValMapping: Record<number, any> = {}
  
  const uniqueValsResults = await Promise.all(
    fieldIds.map(async (fieldId) => {
      try {
        const uniqueVals = await getFieldUniqueValues(fieldId);
        return { fieldId, uniqueVals };
      } catch (error) {
        console.warn(`Failed to fetch unique values for field ${fieldId}:`, error);
        return { fieldId, uniqueVals: null };
      }
    })
  );
  
  // Map results back to fieldIdUniqueValMapping
  uniqueValsResults.forEach(({ fieldId, uniqueVals }) => {
    if (uniqueVals !== null) {
      fieldIdUniqueValMapping[fieldId] = uniqueVals;
    }
  });
  
  return fieldIdUniqueValMapping;
}


/**
 * Fetch complete table data with optional unique values
 */
export async function getTableData(tableId: number, uniqueValues = false): Promise<FormattedTable | "missing"> {
  const metadataResult = await getTableMetadata(tableId);
  if (metadataResult === "missing") {
    return "missing";
  }
  
  const { tableInfo, fieldsWithDistinctCount } = metadataResult;
  
  //#HACK to disable unique values for now
  return tableInfo
  if (!uniqueValues) {
    return tableInfo;
  }
  
  const fieldIdUniqueValMapping = await getTableUniqueValues(tableInfo, fieldsWithDistinctCount);
  
  // Apply unique values to table info
  Object.values(tableInfo.columns || {}).forEach((field) => {
    const fieldUnique = fieldIdUniqueValMapping[field.id]
    if (fieldUnique) {
      const rawValues = flatMap(get(fieldUnique, 'values', [])).map(truncateUniqueValue)
      const originalHasMore = get(fieldUnique, 'has_more_values', false)
      
      // Limit to 20 values with deterministic sampling at storage time
      if (rawValues.length > 20) {
        field.unique_values = deterministicSample(rawValues, 20, `${tableInfo.name}.${field.name}`)
        field.has_more_values = true
      } else {
        field.unique_values = rawValues
        field.has_more_values = originalHasMore
      }
    }
  })
  
  return tableInfo;
}