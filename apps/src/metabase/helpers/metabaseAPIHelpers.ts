/**
 * Metabase API Helper Functions
 * 
 * Higher-level business logic functions that use the pure API functions
 * from metabaseAPI.ts and state functions from metabaseStateAPI.ts.
 */

import { map, get, isEmpty } from 'lodash';
import { getTablesFromSqlRegex, TableAndSchema } from './parseSql';
import { handlePromise } from '../../common/utils';
import { getCurrentUserInfo, getSelectedDbId } from './metabaseStateAPI';
import { extractTableInfo } from './parseTables';

// Types
interface MetabaseCard {
  query_type: "query" | "native" | string;
}

interface DatabaseResponse {
  total: number;
  data: {
    name: string;
    id: number;
  }[]
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
  tables: any[];
}

import {
  fetchUserEdits,
  fetchUserCreations,
  fetchSearchByDatabase,
  fetchSearchUserEditsByQuery,
  fetchSearchUserCreationsByQuery,
  fetchSearchCards,
  fetchUserCards,
  fetchDatabases,
  fetchDatabaseInfo,
  fetchDatabaseWithTables,
  fetchFieldInfo
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

// Note: No memoization needed - fetchDatabases already has caching in metabaseAPI.ts
export async function getDatabases() {
  return await fetchDatabases({}) as DatabaseResponse;
}

// Note: No memoization needed - fetchDatabaseWithTables already has caching in metabaseAPI.ts
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

// Note: No memoization needed - fetchDatabaseInfo already has caching in metabaseAPI.ts
export async function getDatabaseInfo(dbId: number) {
  const jsonResponse = await fetchDatabaseInfo({ db_id: dbId });
  const defaultSchema = getDefaultSchema(jsonResponse);
  return {
    ...extractDbInfo(jsonResponse, defaultSchema),
  }
}

// Note: No memoization needed - fetchFieldInfo already has caching in metabaseAPI.ts
export async function getFieldResolvedName(fieldId: number) {
  const fieldInfo = await fetchFieldInfo({ field_id: fieldId }) as any;
  return `${fieldInfo.table.schema}.${fieldInfo.table.name}.${fieldInfo.name}`;
}


export const getDatabaseInfoForSelectedDb = async (): Promise<DatabaseInfo | undefined> => {
  const dbId = await getSelectedDbId();
  return dbId ? await getDatabaseInfo(dbId) : undefined;
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
 * Get count of user's cards split by query type
 */
export async function getCardsCountSplitByType(): Promise<{
  query: number;
  native: number;
}> {
  const allCards = await fetchUserCards({}) as MetabaseCard[];
  const queryCards = allCards.filter(card => card.query_type === "query");
  const nativeCards = allCards.filter(card => card.query_type === "native");
  return {
    query: queryCards.length,
    native: nativeCards.length
  };
}