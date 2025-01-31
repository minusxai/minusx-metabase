import _, { isEmpty } from 'lodash';
import { memoize, RPCs } from 'web'
import { getTablesFromSqlRegex } from './parseSql';
const { getMetabaseState, fetchData } = RPCs;

interface UserInfo {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  personal_collection_id: number;
}

export async function getSelectedDbId(): Promise<number | undefined> {
  const dbId = await getMetabaseState('qb.card.dataset_query.database')
  if (!dbId || !Number(dbId)) {
    console.error('Failed to find database id', JSON.stringify(dbId));
    return undefined;
  }
  return  Number(dbId);
}

export const getUserInfo = async () => {
  const userInfo = await getMetabaseState('currentUser') as UserInfo;
  if (_.isEmpty(userInfo)) {
    console.error('Failed to load user info');
    return undefined
  }
  return userInfo
}

export const getUserTables = async () => {
  const userInfo = await getUserInfo()
  if (userInfo == undefined) {
    return []
  }
  const { id } = userInfo
  const [edits, creations] = await Promise.all([
    memoizedGetUserEdits(id),
    memoizedGetUserCreations(id)
  ]).catch(err => {
    console.warn("[minusx] Error getting relevant tables", err);
    throw err;
  });
  const queries = _.uniq([...edits, ...creations])
  if (!isEmpty(queries)) {
    return queries.map(getTablesFromSqlRegex).flat()
  }
  const dbId = await getSelectedDbId()
  if (dbId == undefined) {
    return []
  }
  const allQueries = await memoizedGetAllCreations(dbId)
  const uniqQueries = _.uniq(allQueries)
  return uniqQueries.map(getTablesFromSqlRegex).flat()
}

// For future reference
export const getUserTableMap = async () => {
  return {}
}

// For future reference
async function getUserBookmarks(id: number) {
  const jsonResponse = await fetchData(`/api/bookmark`, 'GET');
  return []
}

async function getMetabaseQueries(api_endpoint: string) {
  const jsonResponse = await fetchData(api_endpoint, 'GET');
  const queries: string[] = _.get(
    jsonResponse, 'data', []
  ).map((entity: any) => {
    return _.get(entity, "dataset_query.native.query")
  }).filter(query => !_.isEmpty(query))
  return queries
}

async function getUserEdits(id: number) {
  return getMetabaseQueries(`/api/search?edited_by=${id}`)
}

async function getUserCreations(id: number) {
  return getMetabaseQueries(`/api/search?created_by=${id}`)
}

async function getAllCreations(dbId: number) {
  return getMetabaseQueries(`/api/search?table_db_id=${dbId}`)
}

export async function searchUserQueries(id: number, dbId: number, query: string) {
  const [edits, creations] = await Promise.all([
    getMetabaseQueries(`/api/search?table_db_id=${dbId}&q=${query}&edited_by=${id}`),
    getMetabaseQueries(`/api/search?table_db_id=${dbId}&q=${query}&created_by=${id}`),
  ]).catch(err => {
    console.warn("[minusx] Error getting relevant tables", err);
    throw err;
  });
  const queries = _.uniq([...edits, ...creations])
  if (!isEmpty(queries)) {
    return queries.map(getTablesFromSqlRegex).flat()
  }
  const allQueries = await getMetabaseQueries(`/api/search?models=card&table_db_id=${dbId}&q=${query}`)
  return allQueries.map(getTablesFromSqlRegex).flat()
}

const DEFAULT_TTL = 60 * 5;
const memoizedGetUserEdits = memoize(getUserEdits, DEFAULT_TTL);
const memoizedGetUserCreations = memoize(getUserCreations, DEFAULT_TTL);
const memoizedGetAllCreations = memoize(getAllCreations, DEFAULT_TTL);