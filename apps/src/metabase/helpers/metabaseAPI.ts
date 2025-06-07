/**
 * Elegant Metabase API Client
 * 
 * Ultra-simple, type-safe API functions with built-in:
 * - Template substitution and parameter validation
 * - Per-endpoint concurrency control and intelligent rate limiting
 * - Persistent caching with stale-while-revalidate patterns
 * - Automatic request queuing and performance optimization
 * 
 * Each API function is created with createAPI() containing everything needed.
 */

import { RPCs, memoize } from 'web';
import { get, flatMap, isEmpty, map } from 'lodash';
import { getTablesFromSqlRegex, TableAndSchema } from './parseSql';
import { handlePromise } from '../../common/utils';

// =============================================================================
// TYPES
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

interface APIConfig {
  cache_ttl: number;        // Cache TTL in seconds
  cache_rewarm_ttl: number; // Background refresh TTL in seconds
  max_concurrency: number;  // Max concurrent requests for this endpoint
  concurrency_delay: number; // Min delay between requests in milliseconds
}

// =============================================================================
// CONCURRENCY MANAGER
// =============================================================================

interface QueuedTask<T> {
  task: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  timestamp: number;
}

class EnhancedConcurrencyManager {
  private queue: QueuedTask<any>[] = [];
  private active = 0;
  private readonly maxConcurrent: number;
  private readonly minDelay: number;
  private lastExecution = 0;

  constructor(maxConcurrent: number, minDelay: number = 0) {
    this.maxConcurrent = maxConcurrent;
    this.minDelay = minDelay;
  }

  async execute<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const queuedTask: QueuedTask<T> = {
        task,
        resolve,
        reject,
        timestamp: Date.now()
      };

      if (this.active < this.maxConcurrent && this.canExecuteNow()) {
        this.executeTask(queuedTask);
      } else {
        this.queue.push(queuedTask);
      }
    });
  }

  private canExecuteNow(): boolean {
    if (this.minDelay === 0) return true;
    return Date.now() - this.lastExecution >= this.minDelay;
  }

  private async executeTask<T>(queuedTask: QueuedTask<T>): Promise<void> {
    const { task, resolve, reject } = queuedTask;
    
    try {
      if (this.minDelay > 0) {
        const timeSinceLastExecution = Date.now() - this.lastExecution;
        if (timeSinceLastExecution < this.minDelay) {
          await new Promise(res => setTimeout(res, this.minDelay - timeSinceLastExecution));
        }
      }

      this.active++;
      this.lastExecution = Date.now();
      const result = await task();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.active--;
      this.processQueue();
    }
  }

  private processQueue(): void {
    while (this.queue.length > 0 && this.active < this.maxConcurrent && this.canExecuteNow()) {
      const nextTask = this.queue.shift();
      if (nextTask) {
        this.executeTask(nextTask);
      }
    }

    if (this.queue.length > 0 && this.active < this.maxConcurrent && !this.canExecuteNow()) {
      const delayNeeded = this.minDelay - (Date.now() - this.lastExecution);
      setTimeout(() => this.processQueue(), delayNeeded);
    }
  }

  getStats() {
    return {
      active: this.active,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      minDelay: this.minDelay
    };
  }
}

// Global concurrency managers - one per endpoint type
const concurrencyManagers = new Map<string, EnhancedConcurrencyManager>();

function getConcurrencyManager(template: string, config: APIConfig): EnhancedConcurrencyManager {
  if (!concurrencyManagers.has(template)) {
    concurrencyManagers.set(
      template, 
      new EnhancedConcurrencyManager(config.max_concurrency, config.concurrency_delay)
    );
  }
  return concurrencyManagers.get(template)!;
}

// =============================================================================
// MAGIC createAPI FUNCTION
// =============================================================================

function createAPI<T extends Record<string, any>>(
  template: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  config: APIConfig
) {
  // Template substitution
  function substituteTemplate(params: T): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (!(key in params)) {
        throw new Error(`Missing required parameter: ${key} for template: ${template}`);
      }
      return encodeURIComponent(String(params[key]));
    });
  }

  // Validate required parameters
  function validateParams(params: T): void {
    const templateParams = template.match(/\{\{(\w+)\}\}/g) || [];
    const requiredKeys = templateParams.map(param => param.slice(2, -2));
    
    for (const key of requiredKeys) {
      if (!(key in params) || params[key] == null) {
        throw new Error(`Missing required parameter: ${key} for API: ${template}`);
      }
    }
  }

  // Create memoized function with concurrency control
  const memoizedFetch = memoize(
    async (params: T): Promise<any> => {
      validateParams(params);
      const manager = getConcurrencyManager(template, config);
      
      return manager.execute(async () => {
        const actualUrl = substituteTemplate(params);
        return await RPCs.fetchData(actualUrl, method);
      });
    },
    config.cache_ttl,
    config.cache_rewarm_ttl
  );

  // Return the callable function
  return memoizedFetch;
}

// =============================================================================
// ALL METABASE API FUNCTIONS - Ultra Clean!
// =============================================================================

// Database Operations
export const fetchDatabases = createAPI<{}>(
  '/api/database',
  'GET',
  { cache_ttl: 1000, cache_rewarm_ttl: 600, max_concurrency: 10, concurrency_delay: 50 }
);

export const fetchDatabaseInfo = createAPI<{ db_id: number }>(
  '/api/database/{{db_id}}',
  'GET',
  { cache_ttl: 1200, cache_rewarm_ttl: 600, max_concurrency: 10, concurrency_delay: 50 }
);

export const fetchDatabaseWithTables = createAPI<{ db_id: number }>(
  '/api/database/{{db_id}}?include=tables',
  'GET',
  { cache_ttl: 800, cache_rewarm_ttl: 400, max_concurrency: 5, concurrency_delay: 100 }
);

// Table Operations
export const fetchTableMetadata = createAPI<{ table_id: number }>(
  '/api/table/{{table_id}}/query_metadata',
  'GET',
  { cache_ttl: 1800, cache_rewarm_ttl: 900, max_concurrency: 8, concurrency_delay: 100 }
);

// Field Operations - EXPENSIVE, very conservative limits
export const fetchFieldUniqueValues = createAPI<{ field_id: number }>(
  '/api/field/{{field_id}}/values',
  'GET',
  { cache_ttl: 3600, cache_rewarm_ttl: 1800, max_concurrency: 3, concurrency_delay: 500 }
);

// Search Operations - Can be expensive
export const fetchUserEdits = createAPI<{ user_id: number }>(
  '/api/search?edited_by={{user_id}}',
  'GET',
  { cache_ttl: 600, cache_rewarm_ttl: 300, max_concurrency: 4, concurrency_delay: 200 }
);

export const fetchUserCreations = createAPI<{ user_id: number }>(
  '/api/search?created_by={{user_id}}',
  'GET',
  { cache_ttl: 600, cache_rewarm_ttl: 300, max_concurrency: 4, concurrency_delay: 200 }
);

export const fetchSearchByQuery = createAPI<{ db_id: number; query: string }>(
  '/api/search?table_db_id={{db_id}}&q={{query}}',
  'GET',
  { cache_ttl: 300, cache_rewarm_ttl: 150, max_concurrency: 2, concurrency_delay: 300 }
);

// System Operations
export const fetchSessionProperties = createAPI<{}>(
  '/api/session/properties',
  'GET',
  { cache_ttl: 86400, cache_rewarm_ttl: 43200, max_concurrency: 5, concurrency_delay: 0 }
);

// =============================================================================
// HIGH-LEVEL BUSINESS LOGIC FUNCTIONS (Backward Compatible)
// =============================================================================

/**
 * 1. Get all available databases
 */
export async function getDatabases(): Promise<DatabaseInfo[]> {
  const resp = await fetchDatabases({});
  return (resp.data || []).map((db: any) => extractDbInfo(db, getDefaultSchema(db)));
}

/**
 * 2. Get specific database, optionally with tables
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
 * 3. Get table with configurable depth
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
 * 4. Get user context (queries + referenced tables)
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
 * 5. Find relevant tables with unified search/relevance
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

// =============================================================================
// HELPER FUNCTIONS
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

async function enhanceTableWithUniqueValues(table: FormattedTable): Promise<FormattedTable> {
  if (!table.columns) return table;

  const fieldIds = Object.values(table.columns)
    .filter(col => !isNumericType(col.type))
    .map(col => col.id);

  if (fieldIds.length === 0) return table;

  const uniqueValuesPromises = fieldIds.map(async fieldId => {
    try {
      const data = await fetchFieldUniqueValues({ field_id: fieldId });
      return { fieldId, data };
    } catch (error) {
      console.warn(`Failed to fetch unique values for field ${fieldId}:`, error);
      return { fieldId, data: null };
    }
  });

  const results = await Promise.all(uniqueValuesPromises);
  
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
// MONITORING AND DEBUGGING
// =============================================================================

export function getConcurrencyStats(): Record<string, ReturnType<EnhancedConcurrencyManager['getStats']>> {
  const stats: Record<string, any> = {};
  
  for (const [template, manager] of concurrencyManagers.entries()) {
    stats[template] = manager.getStats();
  }
  
  return stats;
}