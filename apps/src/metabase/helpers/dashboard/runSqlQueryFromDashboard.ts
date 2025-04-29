import { fetchData } from "../../../../../web/src/app/rpc";
import { DashboardInfo, DatasetResponse } from "./types";

export const substituteParameters = (sql: string, parameters: DashboardInfo['parameters']) => {
  // parameters is an array
  for (let i = 0; i < parameters.length; i++) {
    const parameter = parameters[i];
    // only some parameter types are supported
    if (parameter.type == 'date/single') {
      sql = sql.replace(new RegExp(`{{\\s*${parameter.name}\\s*}}`, 'g'), `Date('${parameter.value}')`);
    } else if (parameter.type == 'string/=') {
      if (parameter.isFieldFilter) {
        sql = sql.replace(new RegExp(`{{\\s*${parameter.name}\\s*}}`, 'g'), `${parameter.name}='${parameter.value}'`);
      } else {
        sql = sql.replace(new RegExp(`{{\\s*${parameter.name}\\s*}}`, 'g'), `'${parameter.value}'`);
      }
    } else {
      throw new Error(`Parameter type ${parameter.type} is not supported`);
    }
    // use regex replace to replace {{\s*parameter_name\s*}} with "Date('parameter.value')"
  }
  return sql;
};

export const runSQLQueryFromDashboard = async (sql: string, databaseId: number, parameters: DashboardInfo['parameters']) => {
  sql = substituteParameters(sql, parameters)
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