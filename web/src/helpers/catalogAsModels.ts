import { get, find } from "lodash";
import { fetchData } from "../app/rpc";
import { ContextCatalog, MxModel } from './utils';
import slugg from "slugg";
import { getParsedIframeInfo } from "./origin";
import { getState } from "../state/store";

export type AllSnippetsResponse = {
  name: string;
  content: string;
  id: number;
}[]

type CollectionItemsCollectionsOnlyResponse = {
  total: number
  data: {
    name: string
    id: number | string
    can_write: boolean
  }[]
}
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
const collectionIdToNumber = (id: string | number) => typeof id === 'string' ? parseInt(id) : id

type Collection = {
  name: string
  id: string | number
  location: string
  can_write: boolean
}
type AllCollectionsResponse = Collection[]
type CreateCollectionResponse = Collection

const getPersonalRootCollectionId = async (): Promise<number | null> => {
  const personalCollections = (await 
    fetchData('/api/collection/?exclude-other-user-collections=true&personal-only=true', 'GET') as AllCollectionsResponse)
    .filter(collection => collection.can_write)
    .filter(collection => collection.location == '/')
  if (personalCollections.length == 0) {
    console.log("[minusx] No root personal collection found, can't use models mode")
    return null
  }
  return collectionIdToNumber(personalCollections[0].id)
}

export const currentOriginCatalogs = (catalogs: ContextCatalog[]): ContextCatalog[] => {
  return catalogs.filter(catalog => doesCatalogOriginMatch(catalog))
}

export const getOrCreateMxCollectionId = async(userEmail: string): Promise<number | null> => {
  const personalRootCollectionId = await getPersonalRootCollectionId()
  if (!personalRootCollectionId) {
    return null
  }
  const allPersonalCollectionsResponse = await 
    fetchData(`/api/collection/${personalRootCollectionId}/items?models=collection`, 'GET') as CollectionItemsCollectionsOnlyResponse
  const allPersonalCollections = allPersonalCollectionsResponse.data
  const mxCollectionName = 'mx_internal_' +  userEmail
  let minusxCollection = allPersonalCollections.find(collection => collection.name === mxCollectionName)
  if (!minusxCollection) {
    try {
      minusxCollection = await fetchData('/api/collection', 'POST', {
        "name": mxCollectionName,
        "parent_id": personalRootCollectionId
      }) as CreateCollectionResponse
      if (!minusxCollection || !minusxCollection.id) {
        throw new Error('Invalid response from create collection')
      }
    } catch (err) {
      console.error('[minusx] Error creating mx user collection', err)
      return null
    }
  }
  const mxCollectionId = collectionIdToNumber(minusxCollection.id)
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

const doesCatalogOriginMatch = (catalog: ContextCatalog ) => catalog.origin == getParsedIframeInfo().origin
  
export const createOrUpdateModelsForCatalog = async (mxCollectionId: number, allMxModels: MxModel[], contextCatalog: ContextCatalog) => {
  const entities: Entity[] = get(contextCatalog, 'content.entities', [])
  // check if origin matches the context catalog
  if (!doesCatalogOriginMatch(contextCatalog)) {
    console.warn(`[minusx] Catalog origin ${contextCatalog.origin} does not match iframe origin ${origin}`)
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
    try {
      await createOrUpdateModelsForCatalog(mxCollectionId, allMxModels, catalog)
    } catch (e) {
      console.log("[minusx] Error creating models for catalog", catalog.name, e)
    }
  }
}

// right now just checks if metabase models exist for each entity in the catalog
// if so, then models mode can be used
export const canUseModelsModeForCatalog = (catalog: ContextCatalog, allMxModels: MxModel[]) => {
  if (!doesCatalogOriginMatch(catalog)) {
    return false
  }
  const entities: Entity[] = get(catalog, 'content.entities', [])
  for (const entity of entities) {
    if (doesEntityRequireModel(entity)) {
      const modelIdentifier = getModelIdentifierForEntity(entity, catalog.name)
      if (!allMxModels.find(model => model.name === modelIdentifier)) {
        return false
      }
    }
  }
  return true
}

// Add CTEs to SQL query
export function addCtesToQuery(ctes: [string, string][], sql: string): string {
  if (ctes.length === 0) {
    return sql;
  }

  const pattern = /^\s*(?:--[^\n]*\n\s*)*(WITH)\b/i;
  const match = sql.match(pattern);
  const cteClauses = ctes.map(
    ([name, query]) => `${name} AS (\n${query.trim()}\n)`
  );

  if (!match) {
    const cteBlock = "WITH " + cteClauses.join(",\n");
    return `${cteBlock}\n${sql.trim()}`;
  } else {
    const insertAt = match.index! + match[1].length;
    const injected = " " + cteClauses.join(",\n") + ",";
    return sql.slice(0, insertAt) + injected + sql.slice(insertAt);
  }
}

// Process SQL with either CTEs or Metabase models
export function processSQLWithCtesOrModels(
  sql: string,
  ctes: [string, string][]
): string {
  const state = getState();
  
  const selectedCatalog = find(state.settings.availableCatalogs, { name: state.settings.selectedCatalog });
  const modelsMode = state.settings.modelsMode;
  const mxModels = state.cache.mxModels;
  
  if (!modelsMode || (selectedCatalog && !canUseModelsModeForCatalog(selectedCatalog, mxModels))) {
    sql = addCtesToQuery(ctes, sql);
  } else {
    // for entities for which snippets were created, replace entity.name with their snippet identifier
    if (selectedCatalog) {
      sql = replaceEntityNamesInSqlWithModels(sql, selectedCatalog, mxModels);
    }
  }
  
  return sql;
}