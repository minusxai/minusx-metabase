// Simple SQL processor for CTEs
export type CTE = [string, string];

export function addCtesToQuery(sql: string, ctes: CTE[]): string {
  if (!ctes || ctes.length === 0) {
    return sql;
  }
  
  const cteStatements = ctes.map(([name, query]) => `${name} AS (${query})`).join(',\n');
  return `WITH ${cteStatements}\n${sql}`;
}

export function processSQLWithCtesOrModels(sql: string, ctes: CTE[]): string {
  return addCtesToQuery(sql, ctes);
}