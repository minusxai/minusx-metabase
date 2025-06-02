import { get, isEmpty, keyBy, map } from "lodash";
import { FormattedTable } from "./types";

const createCatalogFromTables = (tables: FormattedTable[], enableUnique = false) => {
  return {
    entities: tables.map(table => {
      const { name, columns, schema } = table;
      return {
        name,
        sql_table: schema + '.' + name,
        description: table.description,
        dimensions: map(columns, (column) => {
          const newDim = {
            name: column.name,
            type: column.type,
            description: column.description,
          }
          if (enableUnique && !isEmpty(column.unique_values)) {
            //@ts-ignore
            newDim.unique_values = column.unique_values
            //@ts-ignore
            newDim.has_more_values = column.has_more_values
          }
          return newDim
        })
      }
    })
  }
}

function modifyCatalog(catalog: object, tables: FormattedTable[], enableUnique = false) {
  const tableEntities = get(createCatalogFromTables(tables, enableUnique), 'entities', [])
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
        if (enableUnique && get(dimension, 'unique')) {
          const tableDimension = get(tableEntity, 'dimensions', []).find((dim: any) => dim.name === dimension.name);
          const unique_values = get(tableDimension, 'unique_values', []);
          if (!isEmpty(unique_values)) {
            dimension.unique_values = unique_values
            dimension.has_more_values = get(tableDimension, 'has_more_values', false);
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

export function getTableContextYAML(relevantTablesWithFields: FormattedTable[], selectedCatalog?: object, drMode = false, enableUnique = false): Record<string, any> | undefined {
  let tableContextYAML = undefined
  if (drMode) {
      if (selectedCatalog) {
          const modifiedCatalog = modifyCatalog(selectedCatalog, relevantTablesWithFields, enableUnique)
          tableContextYAML = {
              ...modifiedCatalog,
          }
      } else {
          tableContextYAML = {
              ...createCatalogFromTables(relevantTablesWithFields, enableUnique)
          }
      } 
  }
  return tableContextYAML
}