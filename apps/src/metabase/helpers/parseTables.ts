import _, { flatMap, get } from 'lodash';
import { memoize, RPCs } from 'web'
import { FormattedTable } from './types';

export const DEFAULT_TTL = 60 * 5;

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
  await Promise.all(
    fieldIds.map(async (fieldId) => {
      const uniqueVals = await getUniqueValsFromField(fieldId);
      fieldIdUniqueValMapping[fieldId] = uniqueVals 
    })
  )
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