/**
 * Clean Metabase API - Essential Functions Only
 * 
 * This file provides 5 main user-facing functions for interacting with Metabase.
 * All complexity is hidden in the imported modules.
 */

import { RPCs } from 'web';
import { get, isEmpty } from 'lodash';
import { getTablesFromSqlRegex, TableAndSchema } from './parseSql';
import { handlePromise } from '../../common/utils';
import { getSelectedDbId } from './getUserInfo';
import { 
  type DatabaseInfo, 
  type DatabaseInfoWithTables, 
  type FormattedTable, 
  type UserContext,
} from './metabaseAPITypes';
import { createAPI } from './metabaseAPIConcurrency';

// =============================================================================
// INTERNAL API ENDPOINTS - Not exported, implementation details only
// =============================================================================

// Database Operations
const fetchDatabases = createAPI<{}>(
  '/api/database'
);

const fetchDatabaseInfo = createAPI<{ db_id: number }>(
  '/api/database/{{db_id}}'
);

const fetchDatabaseWithTables = createAPI<{ db_id: number }>(
  '/api/database/{{db_id}}?include=tables'
);

// Table Operations
const fetchTableMetadata = createAPI<{ table_id: number }>(
  '/api/table/{{table_id}}/query_metadata'
);

// Field Operations - EXPENSIVE, very conservative limits
const fetchFieldUniqueValues = createAPI<{ field_id: number }>(
  '/api/field/{{field_id}}/values',
  'GET',
  { 
    cache_rewarm_ttl: 2 * 24 * 60 * 60, // 2 days rewarm as requested
    max_concurrency: 3,                  // Very conservative
    concurrency_delay: 500               // Half-second delay between requests
  }
);

// Search Operations - Can be expensive
const fetchUserEdits = createAPI<{ user_id: number }>(
  '/api/search?edited_by={{user_id}}'
);

const fetchUserCreations = createAPI<{ user_id: number }>(
  '/api/search?created_by={{user_id}}'
);

const fetchSearchByQuery = createAPI<{ db_id: number; query: string }>(
  '/api/search?table_db_id={{db_id}}&q={{query}}'
);

const fetchSearchByDatabase = createAPI<{ db_id: number }>(
  '/api/search?table_db_id={{db_id}}'
);

const fetchSearchUserEditsByQuery = createAPI<{ db_id: number; query: string; user_id: number }>(
  '/api/search?table_db_id={{db_id}}&q={{query}}&edited_by={{user_id}}'
);

const fetchSearchUserCreationsByQuery = createAPI<{ db_id: number; query: string; user_id: number }>(
  '/api/search?table_db_id={{db_id}}&q={{query}}&created_by={{user_id}}'
);

const fetchSearchCards = createAPI<{ db_id: number; query: string }>(
  '/api/search?models=card&table_db_id={{db_id}}&q={{query}}'
);

// System Operations
const fetchSessionProperties = createAPI<{}>(
  '/api/session/properties'
);

// =============================================================================
// INTERNAL HELPER FUNCTIONS - Not exported
// =============================================================================

async function getCurrentUserInfo(): Promise<{ id: number } | undefined> {
  const userInfo = await RPCs.getMetabaseState('currentUser') as any;
  return isEmpty(userInfo) ? undefined : userInfo;
}

function extractQueriesFromResponse(response: any): string[] {
  return get(response, 'data', [])
    .map((entity: any) => get(entity, "dataset_query.native.query"))
    .filter((query: any) => !isEmpty(query));
}

async function searchTablesByText(dbId: number, searchQuery: string, userId?: number): Promise<FormattedTable[]> {
  const userContext = userId ? await getUserContext(userId) : { queries: [], referencedTables: [] };
  const { tables } = await getDatabase(dbId, true) as DatabaseInfoWithTables;
  
  const query = searchQuery.toLowerCase();
  const matchingTables = tables.filter(table => 
    table.name.toLowerCase().includes(query) ||
    table.description?.toLowerCase().includes(query)
  );

  const userTableNames = new Set(userContext.referencedTables.map(t => `${t.schema || 'public'}.${t.name}`.toLowerCase()));
  
  return matchingTables.sort((a, b) => {
    const aInUser = userTableNames.has(`${a.schema}.${a.name}`.toLowerCase()) ? 1 : 0;
    const bInUser = userTableNames.has(`${b.schema}.${b.name}`.toLowerCase()) ? 1 : 0;
    return bInUser - aInUser;
  });
}

async function getAllRelevantTables(dbId: number, sql: string, userId?: number): Promise<FormattedTable[]> {
  const [userContext, { tables: allTables }] = await Promise.all([
    userId ? getUserContext(userId) : getUserContext(),
    getDatabase(dbId, true) as Promise<DatabaseInfoWithTables>
  ]);

  const sqlTables = sql ? getTablesFromSqlRegex(sql) : [];
  const allReferencedTables = [...userContext.referencedTables, ...sqlTables];
  
  const tableScores = new Map<string, number>();
  allReferencedTables.forEach(tableRef => {
    const key = `${tableRef.schema || 'public'}.${tableRef.name}`.toLowerCase();
    tableScores.set(key, (tableScores.get(key) || 0) + (tableRef.count || 1));
  });

  return allTables.sort((a, b) => {
    const aKey = `${a.schema}.${a.name}`.toLowerCase();
    const bKey = `${b.schema}.${b.name}`.toLowerCase();
    const aScore = tableScores.get(aKey) || 0;
    const bScore = tableScores.get(bKey) || 0;
    return bScore - aScore;
  });
}

function getDefaultSchema(jsonResponse: any): string {
  const schemaFromResponse = get(jsonResponse, "settings.schema-filters.default", "");
  return schemaFromResponse || get(jsonResponse, "details.schema", "") || "public";
}

function extractDbInfo(db: any, defaultSchema: string): DatabaseInfo {
  return {
    name: db.name,
    description: db.description || "",
    id: db.id,
    dialect: get(db, "dbms_version.flavor") || get(db, "engine") || "unknown",
    default_schema: defaultSchema,
    dbms_version: {
      flavor: get(db, "dbms_version.flavor") || get(db, "engine") || "unknown",
      version: get(db, "dbms_version.version") || "unknown",
      semantic_version: get(db, "dbms_version.semantic_version") || [0, 0, 0]
    }
  };
}

function extractTableInfo(table: any, includeColumns: boolean): FormattedTable {
  const baseTable: FormattedTable = {
    description: table.description || "",
    name: table.name,
    id: table.id,
    schema: table.schema || "public"
  };

  if (includeColumns && table.fields) {
    baseTable.columns = {};
    table.fields.forEach((field: any) => {
      baseTable.columns![field.id] = {
        description: field.description || "",
        name: field.name,
        id: field.id,
        type: field.semantic_type || field.base_type || "unknown",
        fk_table_id: field.fk_target_field_id ? get(field, "target.table_id") : undefined,
        foreign_key_target: field.fk_target_field_id ? get(field, "target.name") : null
      };
    });
  }

  return baseTable;
}

async function enhanceTableWithUniqueValues(table: FormattedTable): Promise<FormattedTable> {
  if (!table.columns) return table;

  const columnEntries = Object.entries(table.columns);
  const chunkSize = 5;
  
  for (let i = 0; i < columnEntries.length; i += chunkSize) {
    const chunk = columnEntries.slice(i, i + chunkSize);
    
    await Promise.all(chunk.map(async ([fieldId, column]) => {
      try {
        const uniqueValuesResp = await fetchFieldUniqueValues({ field_id: parseInt(fieldId) });
        if (uniqueValuesResp?.values) {
          column.unique_values = uniqueValuesResp.values.slice(0, 100);
          column.has_more_values = uniqueValuesResp.has_more_values || false;
        }
      } catch (error) {
        console.warn(`Failed to get unique values for field ${fieldId}:`, error);
      }
    }));
  }

  return table;
}

// =============================================================================
// PUBLIC API - Only these 5 functions are exported
// =============================================================================

/**
 * Get all available databases
 */
export async function getDatabases(): Promise<DatabaseInfo[]> {
  const resp = await fetchDatabases({});
  return (resp.data || []).map((db: any) => extractDbInfo(db, getDefaultSchema(db)));
}

/**
 * Get specific database, optionally with tables
 */
export async function getDatabase(dbId: number, includeTables = false): Promise<DatabaseInfo | DatabaseInfoWithTables> {
  if (includeTables) {
    const jsonResponse = await fetchDatabaseWithTables({ db_id: dbId });
    const defaultSchema = getDefaultSchema(jsonResponse);
    const dbInfo = extractDbInfo(jsonResponse, defaultSchema);
    
    const tables = await Promise.all(
      (get(jsonResponse, 'tables', []) as any[]).map(table => extractTableInfo(table, false))
    );
    return { ...dbInfo, tables: tables || [] } as DatabaseInfoWithTables;
  } else {
    const jsonResponse = await fetchDatabaseInfo({ db_id: dbId });
    const defaultSchema = getDefaultSchema(jsonResponse);
    return extractDbInfo(jsonResponse, defaultSchema);
  }
}

/**
 * Get table with configurable depth
 */
export async function getTable(tableId: number, options: {
  includeColumns?: boolean;
  includeUniqueValues?: boolean;
} = {}): Promise<FormattedTable> {
  const { includeColumns = false, includeUniqueValues = false } = options;
  
  const resp = await fetchTableMetadata({ table_id: tableId });
  if (!resp) {
    throw new Error(`Failed to get table metadata for ${tableId}`);
  }
  
  let table = extractTableInfo(resp, includeColumns);

  if (includeUniqueValues && includeColumns && table.columns) {
    table = await enhanceTableWithUniqueValues(table);
  }

  return table;
}

/**
 * Get user context (queries + referenced tables)
 */
export async function getUserContext(userId?: number): Promise<UserContext> {
  const user = userId ? { id: userId } : await getCurrentUserInfo();
  if (!user) return { queries: [], referencedTables: [] };

  const [edits, creations] = await Promise.all([
    handlePromise(fetchUserEdits({ user_id: user.id }), "Error getting user edits", { data: [] }),
    handlePromise(fetchUserCreations({ user_id: user.id }), "Error getting user creations", { data: [] }),
  ]);

  const editQueries = extractQueriesFromResponse(edits);
  const creationQueries = extractQueriesFromResponse(creations);
  const allQueries = [...new Set([...editQueries, ...creationQueries])];
  const referencedTables = allQueries.map(getTablesFromSqlRegex).flat();

  return { queries: allQueries, referencedTables };
}

/**
 * Find relevant tables with unified search/relevance
 */
export async function findRelevantTables(dbId: number, options: {
  searchQuery?: string;
  sql?: string;
  userId?: number;
  includeColumns?: boolean;
  includeUniqueValues?: boolean;
  maxTables?: number;
} = {}): Promise<FormattedTable[]> {
  const {
    searchQuery,
    sql,
    userId,
    includeColumns = false,
    includeUniqueValues = false,
    maxTables
  } = options;

  let tables: FormattedTable[];

  if (searchQuery) {
    tables = await searchTablesByText(dbId, searchQuery, userId);
  } else {
    tables = await getAllRelevantTables(dbId, sql || '', userId);
  }

  if (maxTables) {
    tables = tables.slice(0, maxTables);
  }

  if (includeColumns) {
    const enhancedTables = await Promise.all(
      tables.map(table => getTable(table.id, { includeColumns: true, includeUniqueValues }))
    );
    tables = enhancedTables;
  }

  return tables;
}

/**
 * Internal search helper functions - not exported, used by main functions below
 */

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

export async function searchNativeQuery(dbId: number, query: string): Promise<any> {
  return await fetchSearchNativeQuery({ db_id: dbId, query });
}

// =============================================================================
// MAIN EXPORTED FUNCTIONS (previously from getUserInfo.ts)
// =============================================================================

interface UserInfo {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  personal_collection_id: number;
}

/**
 * Get current user information
 */
export async function getUserInfo(): Promise<UserInfo | undefined> {
  const userInfo = await RPCs.getMetabaseState('currentUser') as UserInfo;
  if (isEmpty(userInfo)) {
    console.error('Failed to load user info');
    return undefined;
  }
  return userInfo;
}

/**
 * Get tables referenced in user's queries (with fallback to all database tables)
 */
export async function getUserTables(): Promise<TableAndSchema[]> {
  const userInfo = await getUserInfo();
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
 * Get user table map (placeholder for future functionality)
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