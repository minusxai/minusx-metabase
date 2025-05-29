import { get } from "lodash";
import { fetchData } from "../app/rpc";
import { ContextCatalog, MxModel } from './utils';
import slugg from "slugg";
import { getParsedIframeInfo } from "./origin";

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

export const getSlugForModelName = (name: string) => slugg(name)

type Collection = {
  name: string
  id: string | number
  location: string
}
type AllCollectionsResponse = Collection[]
type CreateCollectionResponse = Collection


const getOrCreateMxRootCollectionId = async (): Promise<number | null> => {
  const allCollections = await fetchData('/api/collection', 'GET') as AllCollectionsResponse
  let minusxRootCollection = allCollections
    .filter(collection => collection.location == "/")
    .find(collection => collection.name === 'mx_internal')
  if (!minusxRootCollection) {
    // create the collection
    try {
      minusxRootCollection = await fetchData('/api/collection', 'POST', {
        "name": "mx_internal",
      }) as CreateCollectionResponse
      if (!minusxRootCollection || !minusxRootCollection.id) {
        throw new Error('Invalid response from create collection')
      }
    } catch (err) {
      console.error('[minusx] Error creating mx root collection', err)
      return null
    }
  }
  const mxRootCollectionId = typeof minusxRootCollection.id === 'string' ? parseInt(minusxRootCollection.id) : minusxRootCollection.id
  return mxRootCollectionId
}

export const getOrCreateMxCollectionId = async(userEmail: string): Promise<number | null> => {
  const mxRootCollectionId = await getOrCreateMxRootCollectionId()
  if (!mxRootCollectionId) {
    return null
  }
  const allCollections = await fetchData('/api/collection', 'GET') as AllCollectionsResponse
  const mxInternalCollections = allCollections.filter(collection => collection.location === `/${mxRootCollectionId}/`)
  let minusxCollection = mxInternalCollections.find(collection => collection.name === userEmail)
  if (!minusxCollection) {
    try {
      minusxCollection = await fetchData('/api/collection', 'POST', {
        "name": userEmail,
        "parent_id": mxRootCollectionId
      }) as CreateCollectionResponse
      if (!minusxCollection || !minusxCollection.id) {
        throw new Error('Invalid response from create collection')
      }
    } catch (err) {
      console.error('[minusx] Error creating mx user collection', err)
      return null
    }
  }
  const mxCollectionId = typeof minusxCollection.id === 'string' ? parseInt(minusxCollection.id) : minusxCollection.id
  return mxCollectionId
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

export const getTemplateIdentifierForModel = (model: MxModel) => {
  return `#${model.id}-${getSlugForModelName(model.name)}`
}

export const replaceEntityNamesInSqlWithModels = (sql: string, catalog: ContextCatalog, mxModels: MxModel[]) => {
  const entities: Entity[] = get(catalog, 'content.entities', [])
  for (const entity of entities) {
    if (doesEntityRequireModel(entity)) {
      const modelIdentifier = getModelIdentifierForEntity(entity, catalog.name)
      // search models by name to find the right model
      const model = mxModels.find(model => model.name === modelIdentifier)
      if (!model) {
        console.warn(`[minusx] Could not find model ${modelIdentifier} in mxModels`)
        continue
      }
      const fullModelIdentifier = "{{" + getTemplateIdentifierForModel(model) + "}}"
      const pattern = new RegExp(`(?<!\\w)${entity.name}(?!\\w)`, 'g');
      sql = sql.replace(pattern, fullModelIdentifier)
    }
  }
  return sql
}

// replace {{#modelId-slug}} with entity.name for the entity
export function modifySqlForMxModels(sql: string, entities: Entity[], catalogName: string, mxModels: MxModel[]) {
  for (const entity of entities) {
    if (doesEntityRequireModel(entity)) {
      const modelIdentifier = getModelIdentifierForEntity(entity, catalogName)
      const model = mxModels.find(model => model.name === modelIdentifier)
      if (!model) {
        console.warn(`[minusx] Could not find model ${entity.name} in mxModels`)
        continue
      }
      const templateIdentifier = getTemplateIdentifierForModel(model)
      sql = sql.replace(new RegExp(`{{\\s*${templateIdentifier}\\s*}}`, 'g'), entity.name)
    } else {
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
    // check if name matches from_; if it doesn't we still need a model
    if (entity.name != entity.from_) {
      return true
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
    // remove trailing semicolon, and any trailing spaces
    const sqlWithoutTrailingSemicolon = entity.from_.sql.replace(/\s+$/, '').replace(/;$/, '')
    baseSubquery = `WITH base as (${sqlWithoutTrailingSemicolon})\n`
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
  // check if origin matches the context catalog
  const catalogOrigin = contextCatalog.origin
  const origin = getParsedIframeInfo().origin
  if (origin !== catalogOrigin) {
    console.warn(`[minusx] Catalog origin ${catalogOrigin} does not match iframe origin ${origin}`)
    return
  }
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