import _, { flatMap, get } from 'lodash';
import { memoize, RPCs, configs } from 'web'
import { FormattedTable } from './types';

export const DEFAULT_TTL = configs.IS_DEV ? 60 * 5 : 60 * 60 * 24;

export const extractTableInfo = (table: any, includeFields: boolean = false, schemaKey: string = 'schema'): FormattedTable => ({
  name: _.get(table, 'name', ''),
  ...(_.get(table, 'description', null) != null && { description: _.get(table, 'description', null) }),
  schema: _.get(table, schemaKey, ''),
  id: _.get(table, 'id', 0),
  ...(
    _.get(table, 'count') ? { count: _.get(table, 'count') } : {}
  ),
  ...(
    includeFields
    ? {
      columns: _.map(_.get(table, 'fields', []), (field: any) => ({
        name: _.get(field, 'name', ''),
        id: _.get(field, 'id'),
        type: field?.target?.id ? 'FOREIGN KEY' : _.get(field, 'database_type', null),
        // only keep description if it exists. helps prune down context
        ...(_.get(field, 'description', null) != null && { description: _.get(field, 'description', null) }),
        // get foreign key info
        ...(field?.target?.table_id != null && { fk_table_id: field?.target?.table_id }),
        ...(field?.target?.name != null && { foreign_key_target: field?.target?.name }),
      }))
    }
    : {}
  ),
})

async function getUniqueValsFromField(fieldId: number) {
  const resp: any = await RPCs.fetchData(`/api/field/${fieldId}/values`, 'GET');
  return resp
}

// Utility to limit concurrent promises
async function limitConcurrency<T, R>(
  items: T[],
  asyncFn: (item: T) => Promise<R>,
  concurrencyLimit: number = 5
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += concurrencyLimit) {
    const batch = items.slice(i, i + concurrencyLimit);
    const batchResults = await Promise.all(batch.map(asyncFn));
    results.push(...batchResults);
  }
  
  return results;
}

const fetchTableData = async (tableId: number, uniqueValues = false) => {
  const resp: any = await RPCs.fetchData(
    `/api/table/${tableId}/query_metadata`,
    "GET"
  );
  if (!resp) {
    console.warn("Failed to get table schema", tableId, resp);
    return "missing";
  }
  const tableInfo = extractTableInfo(resp, true);
  if (!uniqueValues) {
    return tableInfo
  }
  const fieldIds = Object.values(tableInfo.columns || {}).map((field) => field.id);
  const fieldIdUniqueValMapping: Record<number, any> = {}
  
  // Use limited concurrency to avoid overwhelming the server
  const uniqueValsResults = await limitConcurrency(
    fieldIds,
    async (fieldId) => {
      try {
        const uniqueVals = await getUniqueValsFromField(fieldId);
        return { fieldId, uniqueVals };
      } catch (error) {
        console.warn(`Failed to fetch unique values for field ${fieldId}:`, error);
        return { fieldId, uniqueVals: null };
      }
    },
    15 // Limit to 15 concurrent requests
  );
  
  // Map results back to fieldIdUniqueValMapping
  uniqueValsResults.forEach(({ fieldId, uniqueVals }) => {
    if (uniqueVals !== null) {
      fieldIdUniqueValMapping[fieldId] = uniqueVals;
    }
  });
  Object.values(tableInfo.columns || {}).forEach((field) => {
    const fieldUnique = fieldIdUniqueValMapping[field.id]
    if (fieldUnique) {
      field.unique_values = flatMap(get(fieldUnique, 'values', []))
      field.has_more_values = get(fieldUnique, 'has_more_values', false)
    }
  })
  return tableInfo
}

export const memoizedFetchTableData = memoize(fetchTableData, DEFAULT_TTL);