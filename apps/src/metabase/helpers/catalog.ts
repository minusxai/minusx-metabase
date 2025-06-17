import { get, isEmpty, keyBy, map } from "lodash";
import { FormattedTable } from "./types";

const createCatalogFromTables = (tables: FormattedTable[], includeIDs: boolean = false) => {
  return {
    entities: tables.map(table => {
      const { name, columns, schema } = table;
      const entity: any = {
        name,
        sql_table: `"${schema}"."${name}"`,
        description: table.description,
        dimensions: map(columns, (column) => {
          const newDim: any = {
            name: column.name,
            type: column.type,
            description: column.description,
          }
          if (includeIDs && column.id !== undefined) {
            newDim.id = column.id
          }
          if (!isEmpty(column.sample_values)) {
            newDim.sample_values = column.sample_values
          }
          if (column.distinct_count !== undefined) {
            newDim.distinct_count = column.distinct_count
          }
          return newDim
        })
      }
      if (includeIDs && table.id !== undefined) {
        entity.id = table.id
      }
      return entity
    })
  }
}

function modifyCatalog(catalog: object, tables: FormattedTable[]) {
  const tableEntities = get(createCatalogFromTables(tables), 'entities', [])
  const tableEntityMap = keyBy(tableEntities, entity => {
    const schema = get(entity, 'schema', '');
    const name = get(entity, 'name', '');
    if (schema) {
      return `${schema}.${name}`;
    }
    return name;
  })
  const newEntities: object[] = []
  get(catalog, 'entities', []).forEach((entity: object) => {
    const fromRef = get(entity, 'sql_table', '') || get(entity, 'name', '')
    const tableEntity = get(tableEntityMap, fromRef, {})
    if (!isEmpty(tableEntity)) {
      get(entity, 'dimensions', []).forEach((dimension: any) => {
        if (get(dimension, 'unique')) {
          const tableDimension = get(tableEntity, 'dimensions', []).find((dim: any) => dim.name === dimension.name);
          const sample_values = get(tableDimension, 'sample_values', []);
          if (!isEmpty(sample_values)) {
            dimension.sample_values = sample_values
          }
          const distinct_count = get(tableDimension, 'distinct_count');
          if (distinct_count !== undefined) {
            dimension.distinct_count = distinct_count;
          }
        }
      })
    }
    let newEntity 
    if (get(entity, 'extends')) {
      newEntity = {
        ...tableEntity,
        ...entity,
        dimensions: [...get(tableEntity, 'dimensions', []),  ...get(entity, 'dimensions', [])]
      }
    } else {
      newEntity = entity
    }
    newEntities.push(newEntity) 
  })
  const newCatalog = {
    ...catalog,
    entities: newEntities
  }
  return newCatalog
}

export function filterTablesByCatalog(tables: FormattedTable[], catalog: object): FormattedTable[] {
  if (isEmpty(catalog)) {
    return tables;
  }
  const catalogEntities = get(catalog, 'entities', []);
  const catalogTableNames = new Set(catalogEntities.map((entity: any) => entity.sql_table));
  return tables.filter(table => catalogTableNames.has(table.name));
}

export function getTableContextYAML(relevantTablesWithFields: FormattedTable[], selectedCatalog?: object, drMode: boolean = false, includeIDs: boolean = false): Record<string, any> | undefined {
  let tableContextYAML = undefined
  if (drMode) {
      if (selectedCatalog) {
          const modifiedCatalog = modifyCatalog(selectedCatalog, relevantTablesWithFields)
          tableContextYAML = {
              ...modifiedCatalog,
          }
      } else {
          tableContextYAML = {
              ...createCatalogFromTables(relevantTablesWithFields, includeIDs)
          }
      } 
  }
  return tableContextYAML
}