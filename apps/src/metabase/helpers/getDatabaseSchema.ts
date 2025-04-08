import { memoize, RPCs } from 'web'
import { FormattedTable, SearchApiResponse } from './types';
import { getTablesFromSqlRegex, TableAndSchema } from './parseSql';
import _ from 'lodash';
import { getSelectedDbId, getUserQueries, getUserTableMap, getUserTables, searchUserQueries } from './getUserInfo';
import { applyTableDiffs, handlePromise } from '../../common/utils';
import { TableDiff } from 'web/types';

const { fetchData } = RPCs;

// 5 minutes
const DEFAULT_TTL = 60 * 5;

// this is a subset
interface DatabaseResponse {
  total: number;
  data: {
    name: string;
    id: number;
  }[]
}
async function getDatabases() {
  const resp = await fetchData('/api/database', 'GET') as DatabaseResponse
  return resp;
}
// only memoize for DEFAULT_TTL seconds
export const memoizedGetDatabases = memoize(getDatabases, DEFAULT_TTL);

export async function getDatabaseIds(): Promise<number[]> {
  const resp = await memoizedGetDatabases();
  if (!resp || !resp.data) {
    console.error('Failed to get database ids', resp);
    return [];
  }
  return _.map(resp.data, (db: any) => db.id);
}

interface DatabaseInfo {
  name: string;
  description: string;
  id: number;
  dialect: string;
  dbms_version: {
    flavor: string;
    version: string;
    semantic_version: number[];
  }
}

export interface DatabaseInfoWithTables extends DatabaseInfo {
  tables: FormattedTable[];
}

export const extractDbInfo = (db: any): DatabaseInfo => ({
  name: _.get(db, 'name', ''),
  description: _.get(db, 'description', ''),
  id: _.get(db, 'id', 0),
  dialect: _.get(db, 'engine', ''),
  dbms_version: {
    flavor: _.get(db, 'dbms_version.flavor', ''),
    version: _.get(db, 'dbms_version.version', ''),
    semantic_version: _.get(db, 'dbms_version.semantic-version', [])
  },
});

export const extractTableInfo = (table: any, includeFields: boolean = false, schemaKey: string = 'schema'): FormattedTable => ({
  name: _.get(table, 'name', ''),
  ...(_.get(table, 'description', null) != null && { description: _.get(table, 'description', null) }),
  schema: _.get(table, schemaKey, ''),
  id: _.get(table, 'id', 0),
  ...(
    _.get(table, 'count') ? { count: _.get(table, 'count') } : {}
  ),
  ...(
    includeFields
    ? {
      columns: _.map(_.get(table, 'fields', []), (field: any) => ({
        name: _.get(field, 'name', ''),
        type: field?.target?.id ? 'FOREIGN KEY' : _.get(field, 'database_type', null),
        // only keep description if it exists. helps prune down context
        ...(_.get(field, 'description', null) != null && { description: _.get(field, 'description', null) }),
        // get foreign key info
        ...(field?.target?.table_id != null && { fk_table_id: field?.target?.table_id }),
        ...(field?.target?.name != null && { foreign_key_target: field?.target?.name }),
      }))
    }
    : {}
  ),
})

/**
 * Get the database tables without their fields
 * @param dbId id of the database
 * @returns tables without their fields
 */
async function getDatabaseTablesWithoutFields(dbId: number): Promise<DatabaseInfoWithTables> {
  const jsonResponse = await fetchData(`/api/database/${dbId}?include=tables`, 'GET');
  return {
    ...extractDbInfo(jsonResponse),
    tables: _.map(_.get(jsonResponse, 'tables', []), (table: any) => (extractTableInfo(table, false)))
  }
}
// only memoize for DEFAULT_TTL seconds
export const memoizedGetDatabaseTablesWithoutFields = memoize(getDatabaseTablesWithoutFields, DEFAULT_TTL);

const fetchTableData = async (tableId: number) => {
  const resp: any = await RPCs.fetchData(
    `/api/table/${tableId}/query_metadata`,
    "GET"
  );
  if (!resp) {
    console.warn("Failed to get table schema", tableId, resp);
    return "missing";
  }
  return extractTableInfo(resp, true);
}

export const memoizedFetchTableData = memoize(fetchTableData, DEFAULT_TTL);

// only database info, no table info at all
const getDatabaseInfo = async (dbId: number) => {
  const jsonResponse = await fetchData(`/api/database/${dbId}`, 'GET');
  return {
    ...extractDbInfo(jsonResponse),
  }
};

export const memoizedGetDatabaseInfo = memoize(getDatabaseInfo, DEFAULT_TTL);

export const getDatabaseInfoForSelectedDb = async () => {
  const dbId = await getSelectedDbId();
  return dbId? await memoizedGetDatabaseInfo(dbId) : undefined;
}

export async function logMetabaseVersion() {
  const response: any = await fetchData("/api/session/properties", "GET"); 
  const apiVersion = response?.version;
  if (!apiVersion) {
    console.error("Failed to parse metabase version", response);
    return;
  }
  console.log("Metabase version", apiVersion);
}

function getTableKey<T extends TableAndSchema>(tableInfo: T): string {
  return `${tableInfo.schema?.toLowerCase()}.${tableInfo.name.toLowerCase()}`;
}

function dedupeAndCountTables<T extends TableAndSchema>(tables: T[]): T[] {
  const counts: Record<string, T> = {}
  tables.forEach(tableInfo => {
    const key = getTableKey(tableInfo);
    const existingCount = tableInfo.count || 1;
    const totalCounts = counts[key]?.count || 0;
    counts[key] = {
      ...tableInfo,
      count: totalCounts + existingCount
    }
  })
  return _.chain(counts).toArray().orderBy(['count'], ['desc']).value();
}

function lowerAndDefaultSchemaAndDedupe(tables: TableAndSchema[]): TableAndSchema[] {
  let lowered = tables.map(tableInfo => ({
    name: tableInfo.name.toLowerCase(),
    schema: tableInfo.schema?.toLowerCase() || 'public',
    count: tableInfo.count
  }));
  return dedupeAndCountTables(lowered);
}

const CHAR_BUDGET = 200000

const removeLowValueQueries = (queries: string[]) => {
  return _.chain(queries).
  filter(query => query.length >= 200).
  uniqBy(i => i.replace(/\s+/g, '').slice(0, 200)).
  value();
}

const replaceLongLiterals = (query: string) => {
  const pattern = /\bIN\s*\(\s*('(?:[^']+)'(?:\s*,\s*'[^']+')+)\s*\)/gi;
  let match;
  while ((match = pattern.exec(query)) !== null) {
    if (match[1].length > 100) {
      const replacement = `(${match[1].slice(0, 40)}...truncated...${match[1].slice(-40)})`
      query = query.replace(match[1], replacement)
    }
  }
  return query
}

export const getCleanedTopQueries = async (dbId: number) => {
  let queries = await getUserQueries()
  queries = queries.map(replaceLongLiterals);
  queries.sort((a,b) => a.length - b.length);
  queries = removeLowValueQueries(queries);
  let totalChars = queries.reduce((acc, query) => acc + query.length, 0);
  while (totalChars > CHAR_BUDGET && queries.length > 0) {
    totalChars -= queries.pop()?.length || 0;
  }
  return queries
}

const validateTablesInDB = (tables: TableAndSchema[], allDBTables: FormattedTable[]) => {
  const allTablesAsMap = _.fromPairs(allDBTables.map(tableInfo => [getTableKey(tableInfo), tableInfo]));
  return tables.filter(
    tableInfo => getTableKey(tableInfo) in allTablesAsMap
  ).map(tableInfo => ({
    ...tableInfo,
    ...allTablesAsMap[getTableKey(tableInfo)]
  }))
}

const addTableJoins = (tables: FormattedTable[], tableMap: Record<number, number[][]>) => {
  return tables.map(tableInfo => {
    return ({
      ...tableInfo,
      ...(tableInfo.id in tableMap ? {
        related_tables_freq: tableMap[tableInfo.id]
      } : {}),
    })
  })
}

const getAllRelevantTablesForSelectedDb = async (dbId: number, sql: string): Promise<FormattedTable[]> => {
  const tablesFromSql = lowerAndDefaultSchemaAndDedupe(getTablesFromSqlRegex(sql));
  const [userTables, {tables: allDBTables}, tableMap] = await Promise.all([
    getUserTables(),
    handlePromise(memoizedGetDatabaseTablesWithoutFields(dbId), "Failed to get database tables", {
      ...extractDbInfo({}),
      tables: []
    }),
    getUserTableMap()
  ]);
  const allUserTables = dedupeAndCountTables([...tablesFromSql, ...userTables]);
  const validTables = validateTablesInDB(allUserTables, allDBTables);
  const dedupedTables = dedupeAndCountTables([...validTables, ...allDBTables]);
  dedupedTables.forEach(tableInfo => {
    tableInfo.count = tableInfo.count || 1;
    tableInfo.count = tableInfo.count - 1
  })
  const fullTableInfo = addTableJoins(dedupedTables, tableMap);
  return fullTableInfo
}

export const searchTables = async (userId: number, dbId: number, query: string): Promise<FormattedTable[]> => {
  const [userTables, {tables: allDBTables}] = await Promise.all([
    searchUserQueries(userId, dbId, query),
    memoizedGetDatabaseTablesWithoutFields(dbId),
  ]).catch(err => {
    console.warn("[minusx] Error getting search tables", err);
    throw err;
  });
  const allUserTables = dedupeAndCountTables(userTables);
  const validTables = validateTablesInDB(allUserTables, allDBTables);
  const dedupedTables = dedupeAndCountTables(validTables)
  return dedupedTables
}

interface FieldInfo {
  name: string;
  description: string;
  table_name: string;
  schema: string;
}

const getDatabaseFields = async (): Promise<FieldInfo[]> => {
  const dbId = await getSelectedDbId();
  if (!dbId) {
    console.warn("[minusx] No database selected when getting field info");
    return [];
  }
  return await fetchData(`/api/database/${dbId}/fields`, 'GET') as FieldInfo[];
}

export const memoizedGetDatabaseFields = memoize(getDatabaseFields, DEFAULT_TTL);

export const getTablesWithFields = async (tableDiff?: TableDiff, drMode = false) => {
  const dbId = await getSelectedDbId();
  if (!dbId) {
    console.warn("[minusx] No database selected when getting tables with fields");
    return [];
  }
  let tables = await getAllRelevantTablesForSelectedDb(dbId, '');
  if (tableDiff) {
    tables = applyTableDiffs(tables, tables, tableDiff, dbId);
  }
  if (!drMode) {
    return tables;
  }
  const tableIds = tables.map((table) => table.id);
  let tableInfos = await Promise.all(tableIds.map(memoizedFetchTableData));
  const fields = await memoizedGetDatabaseFields()
  const fieldsMap: { [key: string]: FieldInfo[] } = {}
  for (let field of fields) {
    const key = `${field.schema} <> ${field.table_name}`;
    if (key in fieldsMap) {
      fieldsMap[key].push(field);
    } else {
      fieldsMap[key] = [field];
    }
  }
  return tableInfos.filter(tableInfo => tableInfo != "missing").map(tableInfo => {
    const tableKey = `${tableInfo.schema} <> ${tableInfo.name}`;
    const fields = fieldsMap[tableKey] || [];
    const columnMap = _.fromPairs(_.map(tableInfo.columns, (column) => [column.name, column]))
    const fieldOrColumns = fields.map(field => {
      const column = columnMap[field.name];
      return {
        ..._.omit(field, ['table_name', 'schema', 'display_name', 'id', 'table_id']),
        ...column,
      }
    })
    if (_.isEmpty(fieldOrColumns)) {
      return tableInfo
    }
    return {
      ...tableInfo,
      columns: fieldOrColumns
    }
  })
}

export const getRelevantTablesForSelectedDb = async (sql: string): Promise<FormattedTable[]> => {
  const dbId = await getSelectedDbId();
  if (!dbId) {
    console.warn("[minusx] No database selected when getting relevant tables");
    return [];
  }
  const relevantTables = await getAllRelevantTablesForSelectedDb(dbId, sql);
  const relevantTablesTop50 = relevantTables.slice(0, 20);
  return relevantTablesTop50;
}

// Empty Placeholder
export const getTopSchemasForSelectedDb = async () => {
  return []
}
// this is a subset
interface MetabaseCard {
  query_type: "query" | "native" | string;
}
export const getCardsCountSplitByType = async () => {
  const allCards = await fetchData(`/api/card?f=mine`, 'GET') as MetabaseCard[];
  const queryCards = allCards.filter(card => card.query_type === "query");
  const nativeCards = allCards.filter(card => card.query_type === "native");
  return {
    query: queryCards.length,
    native: nativeCards.length
  }
}
