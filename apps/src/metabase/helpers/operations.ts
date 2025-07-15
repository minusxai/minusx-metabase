import { RPCs, utils } from "web";
import { getQueryError, isQueryRunning, getQueryResults } from './metabaseStateAPI';

export const getSqlErrorMessage = async () => {
  let errorMessage: any = await getQueryError();
  // check if errorMessage is a string, if so, return it
  if (typeof errorMessage === 'string') {
    return errorMessage;
  }
  // if undefined, return undefined
  if (errorMessage === undefined) {
    return undefined;
  }
  // if errorMessage is an object, if so, check if it has status property and if its 0 return "query timed out"
  if (errorMessage && typeof errorMessage === 'object') {
    if (errorMessage.status === 0) {
      return 'query timed out';
    }
    if (errorMessage.data && typeof errorMessage.data === 'string') {
      return errorMessage.data;
    }
  }
  // log error
  console.warn("Error getting SQL error message", JSON.stringify(errorMessage));
  return 'unknown error';
}

export type MetabaseStateTable = {
  rows: (string | number | null | boolean)[][],
  cols: {
    display_name: string;
    effective_type: string;
  }[]
}

export function metabaseToMarkdownTable(table: MetabaseStateTable, truncateLength: number = 2000): string {
  const { rows, cols } = table;
  const headerRow = `| ${cols.map(col => col.display_name).join(' | ')} |`;
  const separatorRow = `| ${cols.map(() => '---').join(' | ')} |`;
  const dataRows = rows.map(row => 
      `| ${row.map(cell => cell !== null ? cell : '').join(' | ')} |`
  );
  let md =[headerRow, separatorRow, ...dataRows].join('\n');
  // truncate if more than 2k characters. add an ...[truncated]
  if (md.length > truncateLength) {
    md = `${md.slice(0, truncateLength)}...[truncated]`;
  }
  if (dataRows.length === 0) {
    md = md + '\n' + '| <Empty results, no data returned> |';
  }
  return md;
}

export function metabaseToCSV(table: MetabaseStateTable, truncateLength: number = 2000): string {
  const { rows, cols } = table;
  const headerRow = cols.map(col => `"${col.display_name}"`).join(',');
  const dataRows = rows.map(row =>
    row.map(cell => 
      cell === null ? '' : `"${String(cell).replace(/"/g, '""')}"`
    ).join(',')
  );
  const allRows = [headerRow, ...dataRows]
  let csv = allRows.slice(0, truncateLength).join('\n');
  if (dataRows.length === 0) {
    csv = csv + '\n' + '<Empty results, no data returned>';
  }
  return csv;
}


export async function getAndFormatOutputTable(_type: string = ''): Promise<string> {
  const outputTable: MetabaseStateTable | null = await getQueryResults();
  if (!outputTable) {
    return '';
  }
  let outputTableMarkdown = ""
  if (_type === 'csv') {
    outputTableMarkdown = metabaseToCSV(outputTable);
  } else {
    outputTableMarkdown = metabaseToMarkdownTable(outputTable);
  }
  // truncate if more than 2k characters. add an ...[truncated]
  if (outputTableMarkdown.length > 2000) {
    outputTableMarkdown = outputTableMarkdown.slice(0, 2000) + '...[truncated]';
  }
  return outputTableMarkdown;
}

export const waitForQueryExecution = async () => {
  while (true) {
    const running = await isQueryRunning();
    if (!running) {
      return;
    }
    await utils.sleep(100);
  }
}