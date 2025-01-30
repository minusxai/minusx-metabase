import _ from 'lodash';
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

const getUserInfo = async () => {
  const userInfo = await getMetabaseState('currentUser') as UserInfo;
  if (_.isEmpty(userInfo)) {
    console.error('Failed to load user info');
  }
  return  userInfo
}

export const getUserTables = async () => {
  const userInfo = await getUserInfo()
  if (_.isEmpty(userInfo)) {
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
  const tables = queries.map(getTablesFromSqlRegex).flat()
  return tables
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

async function getUserQueries(api_endpoint: string) {
  const jsonResponse = await fetchData(api_endpoint, 'GET');
  const queries: string[] = _.get(
    jsonResponse, 'data', []
  ).map((entity: any) => {
    return _.get(entity, "dataset_query.native.query")
  }).filter(query => !_.isEmpty(query))
  return queries
}

async function getUserEdits(id: number) {
  return getUserQueries(`/api/search?edited_by=${id}`)
}

async function getUserCreations(id: number) {
  return getUserQueries(`/api/search?created_by=${id}`)
}

const DEFAULT_TTL = 60 * 5;
const memoizedGetUserEdits = memoize(getUserEdits, DEFAULT_TTL);
const memoizedGetUserCreations = memoize(getUserCreations, DEFAULT_TTL);