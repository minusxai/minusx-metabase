import { get, keyBy, map } from "lodash";
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
          description: column.description
        }))
      }
    })
  }
}

function modifyCatalog(catalog: object, tables: FormattedTable[]) {
  const tableEntities = get(createCatalogFromTables(tables), 'entities', [])
  const tableEntityMap = keyBy(tableEntities, 'name')
  const newEntities: object[] = []
  get(catalog, 'entities', []).forEach((entity: object) => {
    if (get(entity, 'extends')) {
      const from_ = get(entity, 'from_', '')
      const tableEntity = get(tableEntityMap, from_, {})
      newEntities.push({
        ...tableEntity,
        ...entity,
        dimensions: [...get(tableEntity, 'dimensions', []),  ...get(entity, 'dimensions', [])]
      })
    } else {
      newEntities.push(entity)
    }
  })
  const newCatalog = {
    ...catalog,
    entities: newEntities
  }
  return newCatalog
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