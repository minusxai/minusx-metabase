/**
 * Unified Metabase API Client
 * 
 * Minimal interface for all Metabase data operations with built-in:
 * - Type-safe API definitions with template substitution
 * - Per-endpoint concurrency control and intelligent rate limiting
 * - Persistent caching with stale-while-revalidate patterns
 * - Automatic request queuing and performance optimization
 * 
 * Only 5 functions to cover all use cases:
 * 1. getDatabases() - list all databases
 * 2. getDatabase() - get database info, optionally with tables
 * 3. getTable() - get table with configurable depth
 * 4. getUserContext() - get user queries and referenced tables
 * 5. findRelevantTables() - unified search/relevance function
 */

import { RPCs } from 'web';
import { get, flatMap, isEmpty, map } from 'lodash';
import { getTablesFromSqlRegex, TableAndSchema } from './parseSql';
import { handlePromise } from '../../common/utils';
import { 
  fetchMetabaseAPI, 
  createMetabaseAPIFetch, 
  getConcurrencyStats,
  getAPIConfiguration
} from './metabaseAPIClient';
import {
  API_DATABASE_LIST,
  API_DATABASE_INFO,
  API_DATABASE_WITH_TABLES,
  API_TABLE_METADATA,
  API_FIELD_UNIQUE_VALUES,
  API_SEARCH_USER_EDITS,
  API_SEARCH_USER_CREATIONS,
  API_SEARCH_BY_QUERY,
  API_SEARCH_USER_EDITS_WITH_QUERY,
  API_SEARCH_USER_CREATIONS_WITH_QUERY,
  API_SEARCH_ALL_WITH_QUERY
} from './metabaseAPITypes';

// =============================================================================
// ESSENTIAL TYPES ONLY
// =============================================================================

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

// =============================================================================
// PRE-CREATED MEMOIZED FUNCTIONS FOR OPTIMAL PERFORMANCE
// =============================================================================

// Create memoized versions of frequently used APIs for optimal performance
const memoizedGetDatabaseList = createMetabaseAPIFetch(API_DATABASE_LIST);
const memoizedGetDatabaseInfo = createMetabaseAPIFetch(API_DATABASE_INFO);
const memoizedGetDatabaseWithTables = createMetabaseAPIFetch(API_DATABASE_WITH_TABLES);
const memoizedGetTableMetadata = createMetabaseAPIFetch(API_TABLE_METADATA);
const memoizedGetFieldUniqueValues = createMetabaseAPIFetch(API_FIELD_UNIQUE_VALUES);
const memoizedGetUserEdits = createMetabaseAPIFetch(API_SEARCH_USER_EDITS);
const memoizedGetUserCreations = createMetabaseAPIFetch(API_SEARCH_USER_CREATIONS);

// =============================================================================
// PUBLIC API FUNCTIONS (Backward Compatible)
// =============================================================================

/**
 * 1. Get all available databases
 */
export async function getDatabases(): Promise<DatabaseInfo[]> {
  const resp = await memoizedGetDatabaseList({});
  return (resp.data || []).map((db: any) => extractDbInfo(db, getDefaultSchema(db)));
}

/**
 * 2. Get specific database, optionally with tables
 */
export async function getDatabase(dbId: number, includeTables = false): Promise<DatabaseInfo | DatabaseInfoWithTables> {
  if (includeTables) {
    const jsonResponse = await memoizedGetDatabaseWithTables({ db_id: dbId });
    const defaultSchema = getDefaultSchema(jsonResponse);
    const dbInfo = extractDbInfo(jsonResponse, defaultSchema);
    
    const tables = await Promise.all(
      (get(jsonResponse, 'tables', []) as any[]).map(table => extractTableInfo(table, false))
    );
    return { ...dbInfo, tables: tables || [] } as DatabaseInfoWithTables;
  } else {
    const jsonResponse = await memoizedGetDatabaseInfo({ db_id: dbId });
    const defaultSchema = getDefaultSchema(jsonResponse);
    return extractDbInfo(jsonResponse, defaultSchema);
  }
}

/**
 * 3. Get table with configurable depth
 */
export async function getTable(tableId: number, options: {
  includeColumns?: boolean;
  includeUniqueValues?: boolean;
} = {}): Promise<FormattedTable> {
  const { includeColumns = false, includeUniqueValues = false } = options;
  
  const resp = await memoizedGetTableMetadata({ table_id: tableId });
  if (!resp) {
    throw new Error(`Failed to get table metadata for ${tableId}`);
  }
  
  let table = extractTableInfo(resp, includeColumns);

  // Add unique values if requested and we have columns
  if (includeUniqueValues && includeColumns && table.columns) {
    table = await enhanceTableWithUniqueValues(table);
  }

  return table;
}

/**
 * 4. Get user context (queries + referenced tables)
 */
export async function getUserContext(userId?: number): Promise<UserContext> {
  const user = userId ? { id: userId } : await getCurrentUserInfo();
  if (!user) return { queries: [], referencedTables: [] };

  const [edits, creations] = await Promise.all([
    handlePromise(memoizedGetUserEdits({ user_id: user.id }), "Error getting user edits", { data: [] }),
    handlePromise(memoizedGetUserCreations({ user_id: user.id }), "Error getting user creations", { data: [] }),
  ]);

  const editQueries = extractQueriesFromResponse(edits);
  const creationQueries = extractQueriesFromResponse(creations);
  const allQueries = [...new Set([...editQueries, ...creationQueries])];
  const referencedTables = allQueries.map(getTablesFromSqlRegex).flat();

  return { queries: allQueries, referencedTables };
}

/**
 * 5. Find relevant tables with unified search/relevance
 */
export async function findRelevantTables(dbId: number, options: {
  searchQuery?: string;     // Text search in table names/descriptions
  sql?: string;             // SQL-based relevance
  userId?: number;          // User context for relevance
  includeColumns?: boolean; // Include column details
  includeUniqueValues?: boolean; // Include unique values (requires includeColumns)
  maxTables?: number;       // Limit results
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
    // Text-based search
    tables = await searchTablesByText(dbId, searchQuery, userId);
  } else {
    // Get all relevant tables (user context + SQL context)
    tables = await getAllRelevantTables(dbId, sql || '', userId);
  }

  // Apply table limit early to avoid unnecessary work
  if (maxTables) {
    tables = tables.slice(0, maxTables);
  }

  // Enhance with columns if requested
  if (includeColumns) {
    const enhancedTables = await Promise.all(
      tables.map(table => getTable(table.id, { includeColumns: true, includeUniqueValues }))
    );
    tables = enhancedTables;
  }

  return tables;
}

// =============================================================================
// HELPER FUNCTIONS (not memoized, used internally)
// =============================================================================

async function getCurrentUserInfo(): Promise<{ id: number } | undefined> {
  const userInfo = await RPCs.getMetabaseState('currentUser') as any;
  return isEmpty(userInfo) ? undefined : userInfo;
}

function extractQueriesFromResponse(response: any): string[] {
  return get(response, 'data', [])
    .map((entity: any) => get(entity, "dataset_query.native.query"))
    .filter(query => !isEmpty(query));
}

async function searchTablesByText(dbId: number, searchQuery: string, userId?: number): Promise<FormattedTable[]> {
  const userContext = userId ? await getUserContext(userId) : { queries: [], referencedTables: [] };
  const { tables } = await getDatabase(dbId, true) as DatabaseInfoWithTables;
  
  const query = searchQuery.toLowerCase();
  const matchingTables = tables.filter(table => 
    table.name.toLowerCase().includes(query) ||
    table.description?.toLowerCase().includes(query)
  );

  // Combine with user's tables for better relevance
  const userTableNames = new Set(userContext.referencedTables.map(t => `${t.schema || 'public'}.${t.name}`.toLowerCase()));
  
  return matchingTables.sort((a, b) => {
    const aInUser = userTableNames.has(`${a.schema}.${a.name}`.toLowerCase()) ? 1 : 0;
    const bInUser = userTableNames.has(`${b.schema}.${b.name}`.toLowerCase()) ? 1 : 0;
    return bInUser - aInUser; // User tables first
  });
}

async function getAllRelevantTables(dbId: number, sql: string, userId?: number): Promise<FormattedTable[]> {
  const [userContext, { tables: allTables }] = await Promise.all([
    userId ? getUserContext(userId) : getUserContext(),
    getDatabase(dbId, true) as Promise<DatabaseInfoWithTables>
  ]);

  // Tables from SQL
  const sqlTables = sql ? getTablesFromSqlRegex(sql) : [];
  
  // Combine all table references
  const allReferencedTables = [...userContext.referencedTables, ...sqlTables];
  
  // Create relevance scores
  const tableScores = new Map<string, number>();
  allReferencedTables.forEach(tableRef => {
    const key = `${tableRef.schema || 'public'}.${tableRef.name}`.toLowerCase();
    tableScores.set(key, (tableScores.get(key) || 0) + (tableRef.count || 1));
  });

  // Sort tables by relevance, then include all others
  return allTables.sort((a, b) => {
    const aKey = `${a.schema}.${a.name}`.toLowerCase();
    const bKey = `${b.schema}.${b.name}`.toLowerCase();
    const aScore = tableScores.get(aKey) || 0;
    const bScore = tableScores.get(bKey) || 0;
    return bScore - aScore;
  });
}

async function enhanceTableWithUniqueValues(table: FormattedTable): Promise<FormattedTable> {
  if (!table.columns) return table;

  // Get unique values for non-numeric columns
  const fieldIds = Object.values(table.columns)
    .filter(col => !isNumericType(col.type))
    .map(col => col.id);

  if (fieldIds.length === 0) return table;

  const uniqueValuesPromises = fieldIds.map(async fieldId => {
    try {
      const data = await memoizedGetFieldUniqueValues({ field_id: fieldId });
      return { fieldId, data };
    } catch (error) {
      console.warn(`Failed to fetch unique values for field ${fieldId}:`, error);
      return { fieldId, data: null };
    }
  });

  const results = await Promise.all(uniqueValuesPromises);
  
  // Apply unique values to columns
  results.forEach(({ fieldId, data }) => {
    if (!data || !table.columns) return;

    const column = table.columns[fieldId];
    if (!column) return;

    const rawValues = flatMap(get(data, 'values', [])).map(truncateUniqueValue);
    const originalHasMore = get(data, 'has_more_values', false);
    
    if (rawValues.length > 20) {
      column.unique_values = rawValues.slice(0, 20);
      column.has_more_values = true;
    } else {
      column.unique_values = rawValues;
      column.has_more_values = originalHasMore;
    }
  });

  return table;
}

function extractDbInfo(db: any, default_schema: string): DatabaseInfo {
  return {
    name: get(db, 'name', ''),
    description: get(db, 'description', ''),
    id: get(db, 'id', 0),
    dialect: get(db, 'engine', ''),
    default_schema,
    dbms_version: {
      flavor: get(db, 'dbms_version.flavor', ''),
      version: get(db, 'dbms_version.version', ''),
      semantic_version: get(db, 'dbms_version.semantic-version', [])
    },
  };
}

function extractTableInfo(table: any, includeFields: boolean = false, schemaKey: string = 'schema'): FormattedTable {
  return {
    name: get(table, 'name', ''),
    ...(get(table, 'description', null) != null && { description: get(table, 'description', null) }),
    schema: get(table, schemaKey, ''),
    id: get(table, 'id', 0),
    ...(get(table, 'count') ? { count: get(table, 'count') } : {}),
    ...(
      includeFields
      ? {
        columns: map(get(table, 'fields', []), (field: any) => ({
          name: get(field, 'name', ''),
          id: get(field, 'id'),
          type: field?.target?.id ? 'FOREIGN KEY' : get(field, 'database_type', null),
          ...(get(field, 'description', null) != null && { description: get(field, 'description', null) }),
          ...(field?.target?.table_id != null && { fk_table_id: field?.target?.table_id }),
          ...(field?.target?.name != null && { foreign_key_target: field?.target?.name }),
        }))
      }
      : {}
    ),
  };
}

function getDefaultSchema(databaseInfo: any): string {
  const engine = databaseInfo?.engine;
  const details = databaseInfo?.details || {};
  
  if (details.schema) return details.schema;

  const DEFAULT_SCHEMAS: Record<string, string> = {
    postgres: "public",
    redshift: "public", 
    sqlserver: "dbo",
    duckdb: "main",
    sqlite: "main",
    h2: "PUBLIC"
  };

  if (engine in DEFAULT_SCHEMAS) return DEFAULT_SCHEMAS[engine];
  if (["mysql", "mariadb", "clickhouse"].includes(engine)) return details.dbname || 'main';
  if (engine === "bigquery") return details.dataset_id || 'main';

  return 'public';
}

function isNumericType(type: string): boolean {
  if (!type) return false;
  const numericTypes = [
    'INTEGER', 'BIGINT', 'DECIMAL', 'DOUBLE', 'FLOAT', 'NUMERIC', 'REAL',
    'SMALLINT', 'TINYINT', 'NUMBER', 'INT', 'LONG', 'SHORT'
  ];
  return numericTypes.some(numericType => type.toUpperCase().includes(numericType));
}

function truncateUniqueValue(value: any): any {
  if (typeof value === 'string' && value.length > 100) {
    return value.substring(0, 100) + '... (truncated)';
  }
  return value;
}

// =============================================================================
// MONITORING AND DEBUGGING EXPORTS
// =============================================================================

export { 
  getConcurrencyStats,
  getAPIConfiguration,
  fetchMetabaseAPI as fetchMetabaseAPIRaw,
  createMetabaseAPIFetch
} from './metabaseAPIClient';

export {
  API_DATABASE_LIST,
  API_DATABASE_INFO,
  API_DATABASE_WITH_TABLES,
  API_TABLE_METADATA,
  API_FIELD_UNIQUE_VALUES,
  API_SEARCH_USER_EDITS,
  API_SEARCH_USER_CREATIONS
} from './metabaseAPITypes';