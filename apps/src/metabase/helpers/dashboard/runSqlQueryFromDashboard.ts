import { DashboardInfo, DatasetResponse } from "./types";
import { executeQuery } from '../metabaseAPIHelpers';

export const runSQLQueryFromDashboard = async (sql: string, databaseId: number, templateTags = {}) => {
  const response = await executeQuery(sql, databaseId, templateTags) as DatasetResponse;
  return response
}