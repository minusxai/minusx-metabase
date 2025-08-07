import { DOMQueryMapResponse } from "extension/types";
import { isDashboardPageUrl } from "./dashboard/util";
import { isMBQLPageUrl } from "./mbql/utils";
import { RPCs } from 'web'
import { MetabaseTableOrModel } from './metabaseAPITypes';
import { getSelectedDbId } from './metabaseStateAPI';
import { getAllRelevantTablesForSelectedDb, getRelevantTablesForSelectedDb, getTablesWithFields, validateTablesInDB } from './getDatabaseSchema';
import { getAllRelevantModelsForSelectedDb, getDatabaseInfo, getDatabases, getTableData } from './metabaseAPIHelpers';
import { getTablesFromSqlRegex } from './parseSql';
import { find, get } from 'lodash';
import { getSourceTableIds } from './mbql/utils';
import { getModelsWithFields, getSelectedAndRelevantModels } from './metabaseModels';


export const isQuestionPageUrl = (url: string) => {
  return url.includes('/question');
}

export const isModelPageUrl = (url: string) => {
  return url.includes('/model');
}

export type MetabasePageType = 'sql' | 'dashboard' | 'mbql' | 'unknown';


export function determineMetabasePageType(elements: DOMQueryMapResponse, url: string, queryType: string): MetabasePageType {
    console.log('determineMetabasePageType', { url, queryType, })
    if (isDashboardPageUrl(url)) {
        return 'dashboard';
    }
    if (isMBQLPageUrl(url)) {
        return 'mbql';
    }
    if (isModelPageUrl(url) && queryType === 'query') {
        return 'mbql'
    }
    if (isModelPageUrl(url) && queryType === 'native') {
        return 'sql';
    }
    if (isQuestionPageUrl(url) && queryType === 'query') {
        return 'mbql';
    }
    if (isQuestionPageUrl(url) && queryType === 'native') {
        return 'sql';
    }
    // if (elements.editor && !isEmpty(elements.editor)) {
    //     return 'sql';
    // }
    // if (elements.mbql && (!isEmpty(elements.mbql) || !isEmpty(elements.mbql_embedded))) {
    //     return 'mbql';
    // }
    return 'unknown';
}

export async function getLimitedEntitiesFromMBQLQueries(mbqlQueries: any): Promise<MetabaseTableOrModel[]> {
    const entities : MetabaseTableOrModel[] = [];
    for (const mbqlQuery of mbqlQueries) {
        const limitedEntities = await getLimitedMBQLEntities(mbqlQuery);
        entities.push(...limitedEntities);
    }
    // Remove duplicates based on id and type
    const uniqueEntities = Array.from(new Map(entities.map(entity => [entity.id, entity])).values());
    return uniqueEntities;
}

async function getLimitedMBQLEntities(mbqlQuery: any): Promise<MetabaseTableOrModel[]> {
    const appSettings = RPCs.getAppSettings();
  if (!appSettings.analystMode || !appSettings.manuallyLimitContext) {
    return [];
  }
  const dbId = await getSelectedDbId();
  const selectedDatabaseInfo = dbId ? await getDatabaseInfo(dbId) : undefined
  const defaultSchema = selectedDatabaseInfo?.default_schema;
  const selectedCatalogObj = find(appSettings.availableCatalogs, { name: appSettings.selectedCatalog });
  const selectedCatalog = get(selectedCatalogObj, 'content');
  
  
  const sourceTableModelIds = getSourceTableIds(mbqlQuery);
    const allModels = dbId ?  await getAllRelevantModelsForSelectedDb(dbId) : []
    const relevantModels = await getSelectedAndRelevantModels('', appSettings.selectedModels, allModels, sourceTableModelIds)
    const relevantModelsWithFields = await getModelsWithFields(relevantModels)
    
    let relevantTablesWithFields = await getTablesWithFields(appSettings.tableDiff, appSettings.drMode, !!selectedCatalog, [], sourceTableModelIds)
    relevantTablesWithFields = relevantTablesWithFields.map(table => {
      if (table.schema === undefined || table.schema === '') {
        table.schema = defaultSchema || 'unknown'
      }
      return table
    })
    const relevantModelsWithFieldsMod = relevantModelsWithFields.map(model => {
      return {
        ...model,
        id: 'card__' + model.id, // prefix with 'card__' to avoid conflicts with table IDs
      }
    })
    return getCombinedTablesAndModels(relevantTablesWithFields, relevantModelsWithFieldsMod, 'MBQL');
}


export async function getLimitedEntitiesFromQueries(sqlQueries: string[]): Promise<MetabaseTableOrModel[]> {
    const entities : MetabaseTableOrModel[] = [];
    for (const sqlQuery of sqlQueries) {
        const limitedEntities = await getLimitedEntities(sqlQuery);
        entities.push(...limitedEntities);
    }
    // Remove duplicates based on id and type
    const uniqueEntities = Array.from(new Map(entities.map(entity => [entity.id, entity])).values());
    return uniqueEntities;
}

export async function getLimitedEntities(sqlQuery: string): Promise<MetabaseTableOrModel[]> {
  const appSettings = RPCs.getAppSettings();
  
  // Early return if conditions not met
  if (!appSettings.analystMode || !appSettings.manuallyLimitContext) {
    return [];
  }
  
  const dbId = await getSelectedDbId();
  const selectedDatabaseInfo = dbId ? await getDatabaseInfo(dbId) : undefined;
  const defaultSchema = selectedDatabaseInfo?.default_schema;
  
  const sqlTables = getTablesFromSqlRegex(sqlQuery);
  const selectedCatalogObj = find(appSettings.availableCatalogs, { name: appSettings.selectedCatalog });
  const selectedCatalog = get(selectedCatalogObj, 'content');
  
  // Apply default schema to tables if needed
  if (defaultSchema) {
    sqlTables.forEach((table) => {
      if (table.schema === undefined || table.schema === '') {
        table.schema = defaultSchema;
      }
    });
  }
  
  let relevantTablesWithFields = await getTablesWithFields(appSettings.tableDiff, appSettings.drMode, !!selectedCatalog, sqlTables, []);
  
  // Add defaultSchema back to relevantTablesWithFields
  relevantTablesWithFields = relevantTablesWithFields.map(table => {
    if (table.schema === undefined || table.schema === '') {
      table.schema = defaultSchema || 'unknown';
    }
    return table;
  });
  
  const allModels = dbId ? await getAllRelevantModelsForSelectedDb(dbId) : [];
  const relevantModels = await getSelectedAndRelevantModels(sqlQuery || "", appSettings.selectedModels, allModels);

  return getCombinedTablesAndModels(relevantTablesWithFields, relevantModels, 'SQL');
}

export function getCombinedTablesAndModels(
    tables: any,
    models: any,
    type: 'SQL' | 'MBQL' = 'SQL'
): MetabaseTableOrModel[] {
    // Transform and combine tables and models with type annotations
  const relevantTablesWithFieldsAndType: MetabaseTableOrModel[] = tables.map(table => ({
    type: 'table',
    id: table.id,
    name: table.name,
    schema: table.schema,
    description: table.description,
  }));
  
  const relevantModelsWithFieldsAndType: MetabaseTableOrModel[] = models.map(model => ({
    type: 'model',
    id: type === 'SQL' ? model.modelId || 0 : model.id,
    name: model.name,
    description: model.description,
  }));
  
  return [...relevantTablesWithFieldsAndType, ...relevantModelsWithFieldsAndType];
}
