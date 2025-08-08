import { DashboardInfo, DatasetResponse } from "./types";
import { executeQuery, executeMBQLQuery } from '../metabaseAPIHelpers';

export const runSQLQueryFromDashboard = async (sql: string, databaseId: number, templateTags = {}) => {
  const response = await executeQuery(sql, databaseId, templateTags) as DatasetResponse;
  return response
}

export const runMBQLQueryFromDashboard = async (mbql: any, databaseId: number) => {
    const response = await executeMBQLQuery(mbql, databaseId) as DatasetResponse;
    return response;
}
