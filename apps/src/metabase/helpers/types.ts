interface FormattedColumn {
  description?: string;
  name: string;
  type: string;
  // only populated for foreign keys
  fk_table_id?: number;
  foreign_key_target?: string | null;
}
export interface FormattedTable {
  description?: string;
  name: string;
  id: number;
  schema: string;
  columns?: { [key: number]: FormattedColumn };
}
