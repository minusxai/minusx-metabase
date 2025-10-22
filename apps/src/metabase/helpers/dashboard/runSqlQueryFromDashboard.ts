import { DashboardInfo, DatasetResponse } from "./types";
import { executeQuery, executeMBQLQuery } from '../metabaseAPIHelpers';

export const runSQLQueryFromDashboard = async (sql: string, databaseId: number, templateTags = {}) => {
  try {
    return await executeQuery(sql, databaseId, templateTags) as DatasetResponse;
  } catch (error) {
    let errMessage = error?.response?.message || error.message
    if (errMessage.includes('403')) {
      errMessage += " - You do not have permission to run this query.";
    }
    return {
      error: errMessage
    }
  }
}

export const runMBQLQueryFromDashboard = async (mbql: any, databaseId: number) => {
    const response = await executeMBQLQuery(mbql, databaseId) as DatasetResponse;
    return response;
}
