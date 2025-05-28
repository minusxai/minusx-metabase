import { get, isEmpty, keyBy, map } from "lodash";
import { FormattedTable } from "./types";

const createCatalogFromTables = (tables: FormattedTable[]) => {
  return {
    entities: tables.map(table => {
      const { name, columns, schema } = table;
      return {
        name,
        description: table.description,
        schema,
        dimensions: map(columns, (column) => ({
          name: column.name,
          type: column.type,
          description: column.description,
          unique_values: column.unique_values,
          has_more_values: column.has_more_values
        }))
      }
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
    const from_ = get(entity, 'from_', '')
    const fromSchema = get(entity, 'schema', '')
    const fromRef = fromSchema ? `${fromSchema}.${from_}` : from_;
    const tableEntity = get(tableEntityMap, fromRef, {})
    if (!isEmpty(tableEntity)) {
      get(entity, 'dimensions', []).forEach((dimension: any) => {
        if (get(dimension, 'unique')) {
          const tableDimension = get(tableEntity, 'dimensions', []).find((dim: any) => dim.name === dimension.name);
          dimension.unique_values = get(tableDimension, 'unique_values', []);
          if (!isEmpty(dimension.unique_values)) {
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
  const catalogTableNames = new Set(catalogEntities.map((entity: any) => entity.from_));
  return tables.filter(table => catalogTableNames.has(table.name));
}

export function getTableContextYAML(relevantTablesWithFields: FormattedTable[], selectedCatalog?: object, drMode = false): Record<string, any> | undefined {
  let tableContextYAML = undefined
  if (drMode) {
      if (selectedCatalog) {
          const modifiedCatalog = modifyCatalog(selectedCatalog, relevantTablesWithFields)
          tableContextYAML = {
              ...modifiedCatalog,
          }
      } else {
          tableContextYAML = {
              ...createCatalogFromTables(relevantTablesWithFields)
          }
      } 
  }
  return tableContextYAML
}