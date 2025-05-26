import { get } from "lodash";
import { fetchData } from "../app/rpc";
import { ContextCatalog } from './utils';

export type AllSnippetsResponse = {
  name: string;
  content: string;
  id: number;
}[]

export type CollectionItemsResponse = {
  total: number
  data: {
    name: string
    id: number
  }[]
}

export type MxModel = {
  name: string
  id: number
  database_id: number
  dataset_query: {
    database: number,
    type: "native",
    native: {
      query: string
      "template-tags": {}
    }
  }
}

// {
//   "visualization_settings": {},
//   "display": "table",
//   "collection_id": 17,
//   "name": "model_create_test",
//   "type": "model",
//   "dataset_query": {
//     "database": 2,
//     "type": "native",
//     "native": {
//       "query": "select * from salesorderdetail",
//       "template-tags": {}
//     }
//   }
// }

export type MxModelsCreateParams = {
  visualization_settings: {}
  display: "table"
  collection_id: number
  name: string
  type: "model"
  dataset_query: MxModel['dataset_query']
}

export type MxModelsUpdateParams = {
  dataset_query: MxModel['dataset_query']
}

export const getAllMxInternalModels = async (mxCollectionId: number) => {
  const response = await fetchData(`/api/collection/${mxCollectionId}/items?models=dataset`, 'GET') as CollectionItemsResponse;
  const modelIds = response.data.map(item => item.id)
  // for each, fetch the model
  const models = await Promise.all(modelIds.map(async (modelId) => {
    const response = await fetchData(`/api/card/${modelId}`, 'GET') as MxModel
    return response
  }))
  return models
}

const createModel = async (createParams: MxModelsCreateParams) => {
  const response = await fetchData('/api/card', 'POST', createParams) as MxModel
  return response;
}

const updateModel = async (updateParams: MxModelsUpdateParams, modelId: number) => {
  const response = await fetchData(`/api/card/${modelId}`, 'PUT', updateParams) as MxModel
  return response;
}

export type Entity = {
  name: string;
  from_: string | {
    sql: string;
    // dont care about alias, just catalogName_entityName
  }
  dimensions: {
    name: string;
    type: string;
    description?: string;
    sql?: string;
  }[]
};

export const replaceEntityNamesInSqlWithSnippets = (sql: string, catalog: ContextCatalog) => {
  const entities: Entity[] = get(catalog, 'content.entities', [])
  for (const entity of entities) {
    if (doesEntityRequireModel(entity)) {
      const snippetIdentifier = getModelIdentifierForEntity(entity, catalog.name)
      const fullSnippetIdentifier = "{{snippet: " + snippetIdentifier + "}}"
      const pattern = new RegExp(`(?<!\\w)${entity.name}(?!\\w)`, 'g');
      sql = sql.replace(pattern, fullSnippetIdentifier)
    }
  }
  return sql
}

// replace {{snippet: snippetIdentifier}} with entity.name for the entity
export function modifySqlForSnippets(sql: string, catalog: ContextCatalog) {
  const entities: Entity[] = get(catalog, 'content.entities', [])
  for (const entity of entities) {
    if (doesEntityRequireModel(entity)) {
      const snippetIdentifier = getModelIdentifierForEntity(entity, catalog.name)
      sql = sql.replace(new RegExp(`{{\\s*snippet:\\s*${snippetIdentifier}\\s*}}`, 'g'), entity.name)
    }
  }
  return sql
}


export const doesEntityRequireModel = (entity: Entity) => {
  if (typeof entity.from_ == 'string') {
    // check if there's any sql dimension
    for (const dimension of entity.dimensions) {
      if (dimension.sql) {
        return true
      }
    }
    return false
  } else {
    return true
  }
}

export const getModelIdentifierForEntity = (entity: Entity, catalogName: string) => {
  const cleanedCatalogName = catalogName.replace(/[^a-zA-Z0-9]/g, "_")
  return `${cleanedCatalogName}_${entity.name}`
}

const getModelDefinitionForEntity = (entity: Entity) => {
  if (!doesEntityRequireModel(entity)) {
    console.warn("[minusx] Tried to create model for entity that doesn't require it", entity)
    return ""
  }
  let baseSubquery = ""
  if (typeof entity.from_ == 'string') {
    baseSubquery = `WITH base as (SELECT * from ${entity.from_})\n`
  } else {
    baseSubquery = `WITH base as (${entity.from_.sql})\n`
  }
  let selectQuery = "SELECT\n"
  for (const dimension of entity.dimensions) {
    if (!dimension.sql) {
      selectQuery += `base.${dimension.name} as ${dimension.name},\n`
    } else {
      selectQuery += `${dimension.sql} as ${dimension.name},\n`
    }
  }
  const snippetSubquery = `${baseSubquery}${selectQuery.slice(0, -2)}\nFROM base`
  return snippetSubquery
}


export const createOrUpdateModelsForCatalog = async (mxCollectionId: number, allMxModels: MxModel[], contextCatalog: ContextCatalog) => { 
  const entities: Entity[] = get(contextCatalog, 'content.entities', [])
  for (const entity of entities) {
      if (doesEntityRequireModel(entity)) {
          const sql = getModelDefinitionForEntity(entity)
          const modelIdentifier = getModelIdentifierForEntity(entity, contextCatalog.name)
          if (modelIdentifier) {
              const existingModel = allMxModels.find(model => model.name === modelIdentifier)
              if (existingModel) {
                if (existingModel.dataset_query.native.query !== sql) {
                  await updateModel({
                    dataset_query: {
                      database: contextCatalog.dbId,
                      type: "native",
                      native: {
                        query: sql,
                        "template-tags": {}
                      }
                    }
                  }, existingModel.id)
                }
              } else {
                  await createModel({
                    visualization_settings: {},
                    display: "table",
                    collection_id: mxCollectionId,
                    name: modelIdentifier,
                    type: "model",
                    dataset_query: {
                      database: contextCatalog.dbId,
                      type: "native",
                      native: {
                        query: sql,
                        "template-tags": {}
                      }
                    }
                  })
              }
          }
      }
  }
}

export const createOrUpdateModelsForAllCatalogs = async (mxCollectionId: number, allMxModels: MxModel[], contextCatalogs: ContextCatalog[]) => {
  for (const catalog of contextCatalogs) {
    await createOrUpdateModelsForCatalog(mxCollectionId, allMxModels, catalog)
  }
}