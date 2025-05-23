import { get } from "lodash";
import { fetchData } from "../app/rpc";
import { ContextCatalog } from "../state/settings/reducer";

export type AllSnippetsResponse = {
  name: string;
  content: string;
  id: number;
}[]

export const getAllSnippets = async () => {
  const response = await fetchData('/api/native-query-snippet', 'GET') as AllSnippetsResponse;
  return response;
}

const createSnippet = async (content: string, snippetIdentifier: string) => {
  const response = await fetchData('/api/native-query-snippet', 'POST', {
      "content": content,
      "description": "",
      "name": snippetIdentifier,
      "collection_id": null
  })
  return response;
}

const updateSnippet = async (content: string, snippetIdentifier: string, snippetId: number) => {
  const response = await fetchData(`/api/native-query-snippet/${snippetId}`, 'PUT', {
      "content": content,
      "description": "",
      "name": snippetIdentifier,
      "collection_id": null
  })
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
    if (doesEntityRequireSnippet(entity)) {
      const snippetIdentifier = getSnippetIdentifierForEntity(entity, catalog.name)
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
    if (doesEntityRequireSnippet(entity)) {
      const snippetIdentifier = getSnippetIdentifierForEntity(entity, catalog.name)
      sql = sql.replace(new RegExp(`{{\\s*snippet:\\s*${snippetIdentifier}\\s*}}`, 'g'), entity.name)
    }
  }
  return sql
}


export const doesEntityRequireSnippet = (entity: Entity) => {
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

export const getSnippetIdentifierForEntity = (entity: Entity, catalogName: string) => {
  const cleanedCatalogName = catalogName.replace(/[^a-zA-Z0-9]/g, "_")
  return `${cleanedCatalogName}_${entity.name}`
}

const getSnippetSubqueryForEntity = (entity: Entity) => {
  if (!doesEntityRequireSnippet(entity)) {
    console.warn("[minusx] Tried to create snippet for entity that doesn't require it", entity)
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
  const snippetSubquery = `(${baseSubquery}${selectQuery.slice(0, -2)}\nFROM base)`
  return snippetSubquery
}


export const createOrUpdateSnippetsForCatalog = async (allSnippets: AllSnippetsResponse, contextCatalog: ContextCatalog) => {
  const entities: Entity[] = get(contextCatalog, 'content.entities', [])
  for (const entity of entities) {
      if (doesEntityRequireSnippet(entity)) {
          const sql = getSnippetSubqueryForEntity(entity)
          const snippetIdentifier = getSnippetIdentifierForEntity(entity, contextCatalog.name)
          if (snippetIdentifier) {
              const existingSnippet = allSnippets.find(snippet => snippet.name === snippetIdentifier)
              if (existingSnippet) {
                if (existingSnippet.content !== sql) {
                  await updateSnippet(sql, snippetIdentifier, existingSnippet.id)
                }
              } else {
                  await createSnippet(sql, snippetIdentifier)
              }
          }
      }
  }
}

export const createOrUpdateSnippetsForAllCatalogs = async (allSnippets: AllSnippetsResponse, contextCatalogs: ContextCatalog[]) => {
  for (const catalog of contextCatalogs) {
    await createOrUpdateSnippetsForCatalog(allSnippets, catalog)
  }
}