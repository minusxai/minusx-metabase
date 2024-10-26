import { Parser } from 'node-sql-parser';

export interface TableAndSchema {
  table: string;
  schema: string;
}

// using regex version so we don't have to deal with metabase filters syntax
// might be a better idea to just use this one instead of the ridiculous regex
/*export*/ function getTablesFromSql(sql: string): TableAndSchema[] {
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
    console.warn('Error parsing SQL (maybe malformed):', sql, error);
    return [];
  }
}

export function getTablesFromSqlRegex(sql: string): TableAndSchema[] {
  // regex match to find all tables
  // tables come after FROM/JOIN/INTO (case insensitive)
  // table can be in the form of schema.table or just table
  // need to capture both schema (if exists) and table
  // have 2 patterns: one is for schema.table and one for "schema with spaces"."table with spaces"
  const regex = /(?:FROM|JOIN|INTO)\s+(?:((?:[\w\p{L}]+)|(?:"(?:[\w\s\-\p{L}]+))")\.)?((?:[\w\p{L}]+)|(?:"(?:[\w\s\-\p{L}]+))")\s*/ugi;
  const matches = sql.matchAll(regex);
  const tables: TableAndSchema[] = [];
  
  for (const match of matches) {
    let [, schema, table] = match;
    // remove surrounding quotes if present
    if (schema && schema.startsWith('"') && schema.endsWith('"')) {
      schema = schema.slice(1, -1);
    }
    if (table && table.startsWith('"') && table.endsWith('"')) {
      table = table.slice(1, -1);
    }
    if (schema) {
      tables.push({
        table: table,
        schema: schema
      });
    } else {
      tables.push({
        table: table,
        schema: ''
      });
    }
  }
  return tables;
}