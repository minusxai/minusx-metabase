import { fetchData } from "../../../../../web/src/app/rpc";
import { DashboardInfo, DatasetResponse } from "./types";



export const runSQLQueryFromDashboard = async (sql: string, databaseId: number, templateTags = {}) => {
  const response = await fetchData('/api/dataset', 'POST', {
      "database": databaseId,
      "type": "native",
      "native": {
        "query": sql,
        "template-tags": templateTags
      },
      "parameters": []
    }) as DatasetResponse;
  return response
}