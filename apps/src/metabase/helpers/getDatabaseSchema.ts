import { memoize, RPCs } from 'web'
import { FormattedTable, SearchApiResponse } from './types';
import { getTablesFromSqlRegex, TableAndSchema } from './parseSql';
import _ from 'lodash';

const { getMetabaseState, fetchData } = RPCs;

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

export async function getSelectedDbId(): Promise<number | undefined> {
  const dbId = await getMetabaseState('qb.card.dataset_query.database')
  if (!dbId || !Number(dbId)) {
    console.error('Failed to find database id', JSON.stringify(dbId));
    return undefined;
  }
  return  Number(dbId);
}

const extractDbInfo = (db: any) => ({
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
async function getFullDatabaseSchema(dbId: number) {
  // the other endpoint (/api/database/${dbId}?include=tables.fields) is pretty much the same
  // with slightly less data (21.3M vs 21.2M for somu's bigquery) so letting it be for now
  const jsonResponse = await fetchData(`/api/database/${dbId}/metadata`, 'GET');
  return {
    ...extractDbInfo(jsonResponse),
    tables: _.map(_.get(jsonResponse, 'tables', []), (table: any) => (extractTableInfo(table, true)))
  };
}
// Not using this function, too big
/*export*/ const memoizedGetFullDatabaseSchema = memoize(getFullDatabaseSchema, -1);
/**
 * Get the database tables without their fields
 * @param dbId id of the database
 * @returns tables without their fields
 */
async function getDatabaseTablesWithoutFields(dbId: number) {
  const jsonResponse = await fetchData(`/api/database/${dbId}?include=tables`, 'GET');
  return {
    ...extractDbInfo(jsonResponse),
    tables: _.map(_.get(jsonResponse, 'tables', []), (table: any) => (extractTableInfo(table, false)))
  }
}
// only memoize for DEFAULT_TTL seconds
/*export*/ const memoizedGetDatabaseTablesWithoutFields = memoize(getDatabaseTablesWithoutFields, DEFAULT_TTL);

/*export*/ const getSelectedFullDatabaseSchema = async () => {
  const dbId = await getSelectedDbId();
  return dbId? await memoizedGetFullDatabaseSchema(dbId) : undefined;
}

// not using this either, too big
/*export*/ const getSelectedDatabaseTablesWithoutFields = async () => {
  const dbId = await getSelectedDbId();
  return dbId? await memoizedGetDatabaseTablesWithoutFields(dbId) : undefined;
}

const getTop200TablesWithoutFields = async (dbId: number) => {
  const jsonResponse = await fetchData(`/api/search?models=table&table_db_id=${dbId}&filters_items_in_personal_collection=only&limit=200`, 'GET');
  return {
    tables: _.map(_.get(jsonResponse, 'data', []), (table: any) => (extractTableInfo(table, false, 'table_schema'))).slice(0, 200)
  }
};

/*export*/ const memoizedGetTop200TablesWithoutFields = memoize(getTop200TablesWithoutFields, DEFAULT_TTL);

/*export*/ const getTop200TablesWithoutFieldsForSelectedDb = async () => {
  const dbId = await getSelectedDbId();
  return dbId? await memoizedGetTop200TablesWithoutFields(dbId) : undefined;
}

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

const getQueriesFromTop1000Cards = async (dbId: number) => {
  const jsonResponse  = await fetchData(`/api/search?models=card&table_db_id=${dbId}&limit=${1000}`, 'GET') as SearchApiResponse;
  let queries: string[] = [];
  for (const card of _.get(jsonResponse, 'data', [])) {
    const query = _.get(card, 'dataset_query.native.query');
    if (query) {
      queries.push(query);
    }
  }
  return queries;
}

export const memoizeGetQueriesFromTop1000Cards = memoize(getQueriesFromTop1000Cards, DEFAULT_TTL);

const CHAR_BUDGET = 200000

const getCleanedTopQueries = async (dbId: number) => {
  const queries = await memoizeGetQueriesFromTop1000Cards(dbId);
  queries.sort((a,b) => a.length - b.length);
  let totalChars = queries.reduce((acc, query) => acc + query.length, 0);
  while (totalChars > CHAR_BUDGET && queries.length > 0) {
    totalChars -= queries.pop()?.length || 0;
  }
  return queries
}

export const memoizeGetCleanedTopQueries = _.memoize(getCleanedTopQueries);

const getTablesAndSchemasFromTop1000Cards = async (dbId: number) => {
  const queries = await memoizeGetQueriesFromTop1000Cards(dbId);
  let tableAndSchemas: TableAndSchema[] = [];
  for (const query of queries) {
    if (query) {
      const tablesInfo = getTablesFromSqlRegex(query);
      tableAndSchemas.push(...tablesInfo);
    }
  }
  return lowerAndDefaultSchemaAndDedupe(tableAndSchemas);
}

const getTableMapFromTop1000Cards = async (dbId: number) => {
  const queries = await memoizeGetQueriesFromTop1000Cards(dbId);
  let relatedTableAndSchemas: TableAndSchema[][] = [];
  for (const query of queries) {
    if (query) {
      relatedTableAndSchemas.push(getTablesFromSqlRegex(query));
    }
  }
  const { tables: allTables } = await memoizedGetDatabaseTablesWithoutFields(dbId)
  const tableIDMap = _.fromPairs(allTables.map(tableInfo => [getTableKey(tableInfo), tableInfo.id]));
  const relatedTableIDMap: Record<number, Record<number, number>> = {};
  for (const tablesInfo of relatedTableAndSchemas) {
    const tablesInfoIDs = tablesInfo.map(tableInfo => tableIDMap[getTableKey(tableInfo)]).filter(_.isNumber);
    for (const tableID of tablesInfoIDs) {
      if (!(tableID in relatedTableIDMap)) {
        relatedTableIDMap[tableID] = {}
      }
      tablesInfoIDs.forEach(relatedTableID => {
        if (relatedTableID == tableID) {
          return
        }
        if (relatedTableID in relatedTableIDMap[tableID]) {
          relatedTableIDMap[tableID][relatedTableID] += 1;
        } else {
          relatedTableIDMap[tableID][relatedTableID] = 1;
        }
      });
    }
  }
  // Optimisation to remove long tail of table assocs
  for (const tableID in relatedTableIDMap) {
    const relatedTableCounts = relatedTableIDMap[tableID]; 
    if (Object.keys(relatedTableCounts).length > 10) {
      for (const relatedTableID in relatedTableCounts) {
        if (relatedTableCounts[relatedTableID] < 2) {
          delete relatedTableCounts[relatedTableID]
        }
      }
    }
    relatedTableIDMap[tableID] = relatedTableCounts;
  }
  const sortedRelatedTableIDMap: Record<number, number[][]> = {}
  for (const tableID in relatedTableIDMap) {
    const relatedTableCounts = _.chain(relatedTableIDMap[tableID])
        .toPairs()
        .orderBy(1, 'desc')
        .map(([relatedTableID, count]) => [parseInt(relatedTableID), count])
        .value();
    sortedRelatedTableIDMap[tableID] = relatedTableCounts;
  }
  return sortedRelatedTableIDMap
}

export const memoizedGetTableMapFromTop1000Cards = _.memoize(getTableMapFromTop1000Cards);

const getAllRelevantTablesForSelectedDb = async (dbId: number, sql: string): Promise<FormattedTable[]> => {
  // do all fetching at once?
  const [tablesFromCards, {tables: top200}, {tables: allTables}] = await Promise.all([
    getTablesAndSchemasFromTop1000Cards(dbId),
    memoizedGetTop200TablesWithoutFields(dbId),
    memoizedGetDatabaseTablesWithoutFields(dbId)
  ]).catch(err => {
    console.warn("[minusx] Error getting relevant tables", err);
    throw err;
  });
  const tablesFromSql = lowerAndDefaultSchemaAndDedupe(getTablesFromSqlRegex(sql));
  const tablesToTest = dedupeAndCountTables([...tablesFromSql, ...tablesFromCards]);
  const allTablesAsMap = _.fromPairs(allTables.map(tableInfo => [getTableKey(tableInfo), tableInfo]));
  const validTables = tablesToTest.filter(
    tableInfo => getTableKey(tableInfo) in allTablesAsMap
  ).map(tableInfo => ({
    ...tableInfo,
    ...allTablesAsMap[getTableKey(tableInfo)]
  }))
  // merge top200 and validTables, prioritizing validTables
  const relevantTables = dedupeAndCountTables([...validTables, ...top200]);
  // Add related table IDs if available
  const tableMap = await memoizedGetTableMapFromTop1000Cards(dbId)
  const relevantTablesWithRelated = relevantTables.map(tableInfo => {
    return ({
      ...tableInfo,
      ...(tableInfo.id in tableMap ? {
        related_tables_freq: tableMap[tableInfo.id]
      } : {}),
    })
  })
  return relevantTablesWithRelated
}

const getMemoizedRelevantTablesForSelectedDb = _.memoize(getAllRelevantTablesForSelectedDb, (dbId: number, sql: string) => `${dbId}:${sql}`);

export const getTopSchemasForSelectedDb = async (sql = ''): Promise<string[]> => {
  const dbId = await getSelectedDbId();
  if (!dbId) {
    console.warn("[minusx] No database selected when getting relevant tables");
    return [];
  }
  const relevantTables = await getMemoizedRelevantTablesForSelectedDb(dbId, sql);
  return _.chain(relevantTables).map('schema').uniq().value();
}

export const getRelevantTablesForSelectedDb = async (sql: string): Promise<FormattedTable[]> => {
  const dbId = await getSelectedDbId();
  if (!dbId) {
    console.warn("[minusx] No database selected when getting relevant tables");
    return [];
  }
  const relevantTables = await getMemoizedRelevantTablesForSelectedDb(dbId, sql);
  const relevantTablesTop200 = relevantTables.slice(0, 200);
  return relevantTablesTop200;
}