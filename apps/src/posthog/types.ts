interface TableWithoutColumns {
  id: string;
  name: string;
  schema?: string;
}

export type PosthogAppState = {
  relevantTables: TableWithoutColumns[];
  sqlQuery: string;
  sqlErrorMessage?: string;
  outputTableMarkdown: string
}


// some posthog api fields, copied 
interface DatabaseSchemaSchema {
  id: string
  name: string
  should_sync: boolean
  incremental: boolean
  status: string
  last_synced_at?: string
}

interface DatabaseSchemaSource {
  id: string
  status: string
  source_type: string
  prefix: string
  last_synced_at?: string
}

interface DatabaseSchemaField {
  name: string
  hogql_value: string
  type: string // simplifying
  schema_valid: boolean
  table?: string
  fields?: string[]
  chain?: (string | number)[]
}

interface DatabaseSchemaTableCommon {
  type: 'posthog' | 'data_warehouse' | 'view'
  id: string
  name: string
  fields: Record<string, DatabaseSchemaField>
}

interface DatabaseSchemaViewTable extends DatabaseSchemaTableCommon {
  type: 'view'
  query: string // HogQLQuery
}

interface DatabaseSchemaPostHogTable extends DatabaseSchemaTableCommon {
  type: 'posthog'
}

interface DatabaseSchemaDataWarehouseTable extends DatabaseSchemaTableCommon {
  type: 'data_warehouse'
  format: string
  url_pattern: string
  schema?: DatabaseSchemaSchema
  source?: DatabaseSchemaSource
}

type DatabaseSchemaTable =
  | DatabaseSchemaPostHogTable
  | DatabaseSchemaDataWarehouseTable
  | DatabaseSchemaViewTable

export interface DatabaseSchemaQueryResponse {
    tables: Record<string, DatabaseSchemaTable>
}