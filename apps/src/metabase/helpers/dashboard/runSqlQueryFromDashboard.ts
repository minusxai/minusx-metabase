import { DashboardInfo, DatasetResponse } from "./types";
import { executeDatasetQuery } from '../metabaseAPI';



export const runSQLQueryFromDashboard = async (sql: string, databaseId: number, templateTags = {}) => {
  const response = await executeDatasetQuery({
      database: databaseId,
      type: "native",
      native: {
        query: sql,
        'template-tags': templateTags
      }
    }) as DatasetResponse;
  return response
}