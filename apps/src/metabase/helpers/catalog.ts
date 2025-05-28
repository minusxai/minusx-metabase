import { get, isEmpty, keyBy, map } from "lodash";
import { FormattedTable } from "./types";
import { deterministicSample } from "../../common/utils";

// Helper function to safely extract string value from from_ field
function getFromString(from_: any): string {
  if (typeof from_ === 'string') {
    return from_;
  }
  if (typeof from_ === 'object' && from_ !== null) {
    return get(from_, 'alias', '') || '';
  }
  return '';
}

const createCatalogFromTables = (tables: FormattedTable[]) => {
  return {
    entities: tables.map(table => {
      const { name, columns, schema } = table;
      return {
        name,
        description: table.description,
        schema,
        dimensions: map(columns, (column) => {
          const newDim = {
            name: column.name,
            type: column.type,
            description: column.description,
          }
          if (!isEmpty(column.unique_values)) {
            // Limit unique_values to 20 items max with deterministic sampling
            if (column.unique_values.length > 20) {
              //@ts-ignore
              newDim.unique_values = deterministicSample(column.unique_values, 20, `${table.name}.${column.name}`)
              //@ts-ignore
              newDim.has_more_values = true
            } else {
              //@ts-ignore
              newDim.unique_values = column.unique_values
              //@ts-ignore
              newDim.has_more_values = column.has_more_values
            }
          }
          return newDim
        })
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
    const fromString = getFromString(from_)
    const fromSchema = get(entity, 'schema', '')
    const fromRef = fromSchema ? `${fromSchema}.${fromString}` : fromString;
    const tableEntity = get(tableEntityMap, fromRef, {})
    if (!isEmpty(tableEntity)) {
      get(entity, 'dimensions', []).forEach((dimension: any) => {
        if (get(dimension, 'unique')) {
          const tableDimension = get(tableEntity, 'dimensions', []).find((dim: any) => dim.name === dimension.name);
          const unique_values = get(tableDimension, 'unique_values', []);
          if (!isEmpty(unique_values)) {
            // Limit unique_values to 20 items max with deterministic sampling
            if (unique_values.length > 20) {
              dimension.unique_values = deterministicSample(unique_values, 20, `${fromString}.${dimension.name}`)
              dimension.has_more_values = true
            } else {
              dimension.unique_values = unique_values
              dimension.has_more_values = get(tableDimension, 'has_more_values', false);
            }
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