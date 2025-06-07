/**
 * Metabase API Helper Functions
 * 
 * Higher-level business logic functions that use the pure API functions
 * from metabaseAPI.ts and state functions from metabaseStateAPI.ts.
 */

import { get, isEmpty } from 'lodash';
import { getTablesFromSqlRegex, TableAndSchema } from './parseSql';
import { handlePromise } from '../../common/utils';
import { getCurrentUserInfo, getSelectedDbId } from './metabaseStateAPI';
// Simple type for Metabase cards
interface MetabaseCard {
  query_type: "query" | "native" | string;
}
import {
  fetchUserEdits,
  fetchUserCreations,
  fetchSearchByDatabase,
  fetchSearchUserEditsByQuery,
  fetchSearchUserCreationsByQuery,
  fetchSearchCards,
  fetchUserCards
} from './metabaseAPI';

// =============================================================================
// HELPER FUNCTIONS FOR DATA EXTRACTION
// =============================================================================

function extractQueriesFromResponse(response: any): string[] {
  return get(response, 'data', [])
    .map((entity: any) => get(entity, "dataset_query.native.query"))
    .filter((query: any) => !isEmpty(query));
}


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