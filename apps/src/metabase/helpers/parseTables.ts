import _ from 'lodash';
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

const fetchTableData = async (tableId: number) => {
  const resp: any = await RPCs.fetchData(
    `/api/table/${tableId}/query_metadata`,
    "GET"
  );
  if (!resp) {
    console.warn("Failed to get table schema", tableId, resp);
    return "missing";
  }
  return extractTableInfo(resp, true);
}

export const memoizedFetchTableData = memoize(fetchTableData, DEFAULT_TTL);