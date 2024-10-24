import { memoize, RPCs } from 'web'
import { FormattedTable } from './types';
import { getTablesFromSql } from './parseSql';
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

export const getRelevantTablesForSelectedDb = async (sql: string): Promise<FormattedTable[]> => {
  const dbId = await getSelectedDbId();
  if (!dbId) {
    return [];
  }
  const tablesFromSql = getTablesFromSql(sql);
  const {tables: top200} = await memoizedGetTop200TablesWithoutFields(dbId);
  const {tables: allTables} = await memoizedGetDatabaseTablesWithoutFields(dbId);
  for (const table of tablesFromSql) {
    // check if its already there in top200. if so don't do anything
    const relevantTable = top200.find(tableInfo => tableInfo.name === table.table && tableInfo.schema === table.schema);
    if (!relevantTable) {
      // check if there in allTables. if so, add it to top200
      const relevantTable = allTables.find(tableInfo => tableInfo.name === table.table && tableInfo.schema === table.schema);
      if (relevantTable) {
        // insert at beginning
        top200.unshift(relevantTable);
      }
    }
  }
  // trim to 200
  return top200.slice(0, 200);
}