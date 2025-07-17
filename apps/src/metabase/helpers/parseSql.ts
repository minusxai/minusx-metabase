export interface TableAndSchema {
  name: string;
  schema: string;
  count?: number;
}

export const removeSurroundingBackticksAndQuotes = (str: string) => {
  // trim away surrounding backticks and quotes
  return str.replace(/^[`"]|[`"]$/g, '');
}
// TODO(@arpit): currently don't support some bigquery syntax like "select * from `schema.table`" or "select * from `db.schema.table`" 
export function getTablesFromSqlRegex(sql: string | undefined): TableAndSchema[] {
  // regex match to find all tables
  // tables come after FROM/JOIN/INTO (case insensitive)
  // table can be in the form of schema.table or just table
  // need to capture both schema (if exists) and table
  // have 2 patterns: one is for schema.table and one for "schema with spaces"."table with spaces"
  // add 2nd pattern for `schema.table`
  sql = sql || ''
  const regexes = [
    /(?:FROM|JOIN|INTO)\s+(?:((?:[\w\p{L}]+)|(?:["`](?:[\w\s\-\p{L}]+))["`])\.)?((?:[\w\p{L}]+)|(?:["`](?:[\w\s\-\p{L}]+))["`])\s*/ugi,
    /(?:FROM|JOIN|INTO)\s+`([\w\s\-\p{L}]+)\.([\w\s\-\p{L}]+)`\s*/ugi
  ];
  const matches = regexes.flatMap(regex => Array.from(sql.matchAll(regex)));
  const tables: TableAndSchema[] = [];
  // log if 0 matches when sql is not empty
  if (matches.length === 0 && sql !== '') { 
    console.warn('[minusx] No matches found in sql:', sql);
  }
  for (const match of matches) {
    let [, schema, table] = match;
    // remove surrounding quotes or backticks if present
    if (schema) {
      schema = removeSurroundingBackticksAndQuotes(schema);
    }
    if (table) {
      table = removeSurroundingBackticksAndQuotes(table);
    }
    if (schema) {
      tables.push({
        name: table,
        schema: schema
      });
    } else {
      tables.push({
        name: table,
        schema: ''
      });
    }
  }
  // remove duplicates
  return Array.from(new Set(tables));
}