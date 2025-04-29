import { fetchData } from "../../../../../web/src/app/rpc";
import { DashboardInfo, DatasetResponse } from "./types";



export const runSQLQueryFromDashboard = async (sql: string, databaseId: number) => {
  const response = await fetchData('/api/dataset', 'POST', {
      "database": databaseId,
      "type": "native",
      "native": {
        "query": sql,
        "template-tags": {}
      },
      "parameters": []
    }) as DatasetResponse;
  return response
}