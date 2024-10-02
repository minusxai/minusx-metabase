import { RPCs, utils } from "web";

const { getMetabaseState } = RPCs;
export const getSqlErrorMessage = async () => {
  let errorMessage = await getMetabaseState('qb.queryResults[0].error')
  // check if errorMessage is a string, if so, return it
  if (typeof errorMessage === 'string') {
    return errorMessage;
  }
  // if undefined, return undefined
  if (errorMessage === undefined) {
    return undefined;
  }
  // if errorMessage is an object, if so, check if it has status property and if its 0 return "query timed out"
  if (errorMessage && typeof errorMessage === 'object' && errorMessage.status === 0) {
    return 'query timed out';
  }
  // log error
  console.warn("Error getting SQL error message", errorMessage);
  return 'unknown error';
}

type MetabaseStateTable = {
  rows: (string | number | null)[][];
  cols: {
    display_name: string;
  }[]
}

function metabaseToMarkdownTable(table: MetabaseStateTable): string {
  const { rows, cols } = table;
  const headerRow = `| ${cols.map(col => col.display_name).join(' | ')} |`;
  const separatorRow = `| ${cols.map(() => '---').join(' | ')} |`;
  const dataRows = rows.map(row => 
      `| ${row.map(cell => cell !== null ? cell : '').join(' | ')} |`
  );
  return [headerRow, separatorRow, ...dataRows].join('\n');
}

export async function getAndFormatOutputTable(): Promise<string> {
  const outputTable: MetabaseStateTable | null = await getMetabaseState('qb.queryResults[0].data');
  if (!outputTable) {
    return '';
  }
  let outputTableMarkdown = metabaseToMarkdownTable(outputTable);
  // truncate if more than 2k characters. add an ...[truncated]
  if (outputTableMarkdown.length > 2000) {
    outputTableMarkdown = outputTableMarkdown.slice(0, 2000) + '...[truncated]';
  }
  return outputTableMarkdown;
}

export const waitForQueryExecution = async () => {
  while (true) {
    const isRunning = (await getMetabaseState('qb.uiControls.isRunning')) as boolean;
    if (!isRunning) {
      return;
    }
    await utils.sleep(100);
  }
}