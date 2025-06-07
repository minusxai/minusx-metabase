import { get, map } from 'lodash';
import { FormattedTable } from './types';

export const extractTableInfo = (table: any, includeFields: boolean = false, schemaKey: string = 'schema'): FormattedTable => ({
  name: get(table, 'name', ''),
  ...(get(table, 'description', null) != null && { description: get(table, 'description', null) }),
  schema: get(table, schemaKey, ''),
  id: get(table, 'id', 0),
  ...(
    get(table, 'count') ? { count: get(table, 'count') } : {}
  ),
  ...(
    includeFields
    ? {
      columns: map(get(table, 'fields', []), (field: any) => ({
        name: get(field, 'name', ''),
        id: get(field, 'id'),
        type: field?.target?.id ? 'FOREIGN KEY' : get(field, 'database_type', null),
        // only keep description if it exists. helps prune down context
        ...(get(field, 'description', null) != null && { description: get(field, 'description', null) }),
        // get foreign key info
        ...(field?.target?.table_id != null && { fk_table_id: field?.target?.table_id }),
        ...(field?.target?.name != null && { foreign_key_target: field?.target?.name }),
      }))
    }
    : {}
  ),
})