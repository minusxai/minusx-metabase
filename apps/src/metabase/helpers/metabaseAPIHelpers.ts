/**
 * Metabase API Helper Functions
 * 
 * Higher-level business logic functions that use the pure API functions
 * from metabaseAPI.ts and state functions from metabaseStateAPI.ts.
 */

import { get, isEmpty, memoize } from 'lodash';
import _ from 'lodash';
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

export const extractDbInfo = (db: any, default_schema: string): DatabaseInfo => ({
  name: db.name,
  description: db.description || "",
  id: db.id,
  dialect: get(db, "dbms_version.flavor") || get(db, "engine") || "unknown",
  default_schema,
  dbms_version: {
    flavor: get(db, "dbms_version.flavor") || get(db, "engine") || "unknown",
    version: get(db, "dbms_version.version") || "unknown",
    semantic_version: get(db, "dbms_version.semantic_version") || [0, 0, 0]
  }
});


// =============================================================================
// SEARCH HELPER FUNCTIONS
// =============================================================================

async function searchUserEdits(userId: number): Promise<string[]> {
  const response = await fetchUserEdits({ user_id: userId });
  return extractQueriesFromResponse(response);
}

async function searchUserCreations(userId: number): Promise<string[]> {
  const response = await fetchUserCreations({ user_id: userId });
  return extractQueriesFromResponse(response);
}

async function searchByDatabase(dbId: number): Promise<string[]> {
  const response = await fetchSearchByDatabase({ db_id: dbId });
  return extractQueriesFromResponse(response);
}

async function searchUserEditsByQuery(userId: number, dbId: number, query: string): Promise<string[]> {
  const response = await fetchSearchUserEditsByQuery({ db_id: dbId, query, user_id: userId });
  return extractQueriesFromResponse(response);
}

async function searchUserCreationsByQuery(userId: number, dbId: number, query: string): Promise<string[]> {
  const response = await fetchSearchUserCreationsByQuery({ db_id: dbId, query, user_id: userId });
  return extractQueriesFromResponse(response);
}

async function searchCards(dbId: number, query: string): Promise<string[]> {
  const response = await fetchSearchCards({ db_id: dbId, query });
  return extractQueriesFromResponse(response);
}


// =============================================================================
// DATABASE HELPER FUNCTIONS
// =============================================================================

async function getDatabases() {
  const resp = await fetchDatabases({}) as DatabaseResponse
  return resp;
}

export const memoizedGetDatabases = memoize(getDatabases);

async function getDatabaseTablesWithoutFields(dbId: number): Promise<DatabaseInfoWithTables> {
  const jsonResponse = await fetchDatabaseWithTables({ db_id: dbId });
  const defaultSchema = getDefaultSchema(jsonResponse);
  const tables = await Promise.all(
      _.map(_.get(jsonResponse, 'tables', []), (table: any) => extractTableInfo(table, false))
  );

  return {
      ...extractDbInfo(jsonResponse, defaultSchema),
      tables: tables || []
  };
}

export const memoizedGetDatabaseTablesWithoutFields = memoize(getDatabaseTablesWithoutFields);

async function getDatabaseInfo(dbId: number) {
  const jsonResponse = await fetchDatabaseInfo({ db_id: dbId });
  const defaultSchema = getDefaultSchema(jsonResponse);
  return {
    ...extractDbInfo(jsonResponse, defaultSchema),
  }
}

export const memoizedGetDatabaseInfo = memoize(getDatabaseInfo);

async function getFieldResolvedName(fieldId: number) {
  const fieldInfo = await fetchFieldInfo({ field_id: fieldId }) as any;
  return `${fieldInfo.table.schema}.${fieldInfo.table.name}.${fieldInfo.name}`;
}

export const memoizedGetFieldResolvedName = memoize(getFieldResolvedName, 60 * 60 * 1000); // 1 hour TTL


export const getDatabaseInfoForSelectedDb = async (): Promise<DatabaseInfo | undefined> => {
  const dbId = await getSelectedDbId();
  return dbId ? await memoizedGetDatabaseInfo(dbId) : undefined;
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

  const { id } = userInfo;
  const [edits, creations] = await Promise.all([
    handlePromise(searchUserEdits(id), "[minusx] Error getting user edits", []),
    handlePromise(searchUserCreations(id), "[minusx] Error getting user creations", []),
  ]);
  
  const queries = Array.from(new Set([...edits, ...creations]));
  if (queries.length > 0) {
    return queries.map(getTablesFromSqlRegex).flat();
  }
  
  // Fallback: if user has no queries, get ALL database queries
  const dbId = await getSelectedDbId();
  if (!dbId) return [];
  
  const allQueries = await handlePromise(searchByDatabase(dbId), "[minusx] Error getting all queries", []);
  const uniqQueries = Array.from(new Set(allQueries));
  return uniqQueries.map(getTablesFromSqlRegex).flat();
}

/**
 * Get user table map (currently returns empty - used by getDatabaseSchema)
 */
export async function getUserTableMap(): Promise<Record<string, any>> {
  return {};
}

/**
 * Search user queries with fallback to general search
 */
export async function searchUserQueries(id: number, dbId: number, query: string): Promise<TableAndSchema[]> {
  const [edits, creations] = await Promise.all([
    handlePromise(searchUserEditsByQuery(id, dbId, query), "[minusx] Error searching for user edits", []),
    handlePromise(searchUserCreationsByQuery(id, dbId, query), "[minusx] Error searching for user creations", []),
  ]);
  const queries = Array.from(new Set([...edits, ...creations]));
  if (queries.length > 0) {
    return queries.map(getTablesFromSqlRegex).flat();
  }
  const allQueries = await handlePromise(searchCards(dbId, query), "[minusx] Error searching for all queries", []);
  return allQueries.map(getTablesFromSqlRegex).flat();
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