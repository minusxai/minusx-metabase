import { Parser } from 'node-sql-parser';

interface TableAndSchema {
  table: string;
  schema: string;
}

export function getTablesFromSql(sql: string): TableAndSchema[] {
  const parser = new Parser();
  try {
    const tableList = parser.tableList(sql);
    // returned is {type}::{schemaName}::{tableName} eg. select::public::users
    return tableList.map((table: string) => {
      const [type, schema, tableName] = table.split('::');
      return {
        table: tableName,
        schema: schema
      };
    });
  } catch (error) {
    console.warn('Error parsing SQL (maybe malformed):', error);
    return [];
  }
}