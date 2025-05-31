import _, { isEmpty } from 'lodash';
import { memoize, RPCs } from 'web'
import { getTablesFromSqlRegex } from './parseSql';
import { handlePromise } from '../../common/utils';
const { getMetabaseState, fetchData } = RPCs;
import { isDashboardPageUrl } from './dashboard/util';

interface UserInfo {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  personal_collection_id: number;
}

export async function getSelectedDbId(): Promise<number | undefined> {
  const url = await RPCs.queryURL();
  const isDashboard = isDashboardPageUrl(url);
  let dbId;
  if (isDashboard) {
    const dashcards = await getMetabaseState('dashboard.dashcards') as any;
    const dbIds = Object.values(dashcards).map((d: any) => d.card.database_id);
    dbId = _.chain(dbIds).countBy().toPairs().maxBy(_.last).head().value();
  }
  else {
    dbId = await getMetabaseState('qb.card.dataset_query.database')
  }
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

export const getUserQueries = async () => {
  const userInfo = await getUserInfo()
  if (userInfo == undefined) {
    return []
  }
  const { id } = userInfo
  const [edits, creations] = await Promise.all([
    handlePromise(memoizedGetUserEdits(id), "[minusx] Error getting user edits", []),
    handlePromise(memoizedGetUserCreations(id), "[minusx] Error getting user creations", []),
  ]);
  return _.uniq([...edits, ...creations])
}

export const getUserTables = async () => {
  const queries = await getUserQueries()
  if (!isEmpty(queries)) {
    return queries.map(getTablesFromSqlRegex).flat()
  }
  const dbId = await getSelectedDbId()
  if (dbId == undefined) {
    return []
  }
  const allQueries = await handlePromise(memoizedGetAllCreations(dbId), "[minusx] Error getting all queries", [])
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
    handlePromise(getMetabaseQueries(`/api/search?table_db_id=${dbId}&q=${query}&edited_by=${id}`), "[minusx] Error searching for user edits", []),
    handlePromise(getMetabaseQueries(`/api/search?table_db_id=${dbId}&q=${query}&created_by=${id}`), "[minusx] Error searching for user creations", []),
  ]);
  const queries = _.uniq([...edits, ...creations])
  if (!isEmpty(queries)) {
    return queries.map(getTablesFromSqlRegex).flat()
  }
  const allQueries = await handlePromise(getMetabaseQueries(`/api/search?models=card&table_db_id=${dbId}&q=${query}`), "[minusx] Error searching for all queries", [])
  return allQueries.map(getTablesFromSqlRegex).flat()
}

const memoizedGetUserEdits = memoize(getUserEdits);
const memoizedGetUserCreations = memoize(getUserCreations);
const memoizedGetAllCreations = memoize(getAllCreations);