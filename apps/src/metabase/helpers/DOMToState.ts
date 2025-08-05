import { getParsedIframeInfo, RPCs } from 'web'
import { getAllRelevantTablesForSelectedDb, getRelevantTablesForSelectedDb, getTablesWithFields, validateTablesInDB } from './getDatabaseSchema';
import { getAllRelevantModelsForSelectedDb, getDatabaseInfo, getDatabases, getTableData } from './metabaseAPIHelpers';
import { getAndFormatOutputTable, getSqlErrorMessage } from './operations';
import { DashboardInfo } from './dashboard/types';
import { getDashboardAppState } from './dashboard/appState';
import { visualizationSettings, Card, ParameterValues, FormattedTable } from './types';
const { queryURL } = RPCs;
import { Measure, Dimension, SemanticQuery, TableInfo } from "web/types";
import { applyTableDiffs, handlePromise } from '../../common/utils';
import { getSelectedDbId, getCurrentQuery, hasQueryResults, isNativeEditorOpen, isShowingRawTable, isShowingChartTypeSidebar, getVisualizationType, getVisualizationSettings, getCurrentCard, getParameterValues, getQLType } from './metabaseStateAPI';
import { add, assignIn, find, get, keyBy, map } from 'lodash';
import { getTablesFromSqlRegex } from './parseSql';
import { getTableContextYAML } from './catalog';
import { catalogAsModels } from 'web';
import { canUseModelsModeForCatalog } from '../../../../web/src/helpers/catalogAsModels';
import { getMBQLAppState } from './mbql/appState';
import { MBQLInfo } from './mbql/utils';
import { getModelsWithFields, getSelectedAndRelevantModels, modifySqlForMetabaseModels} from './metabaseModels';
import { MetabaseAppStateSQLEditorV2, MetabaseAppStateType, processCard } from './analystModeTypes';
import { MetabaseTableOrModel } from './metabaseAPITypes';
import { determineMetabasePageType, MetabasePageType } from './utils';

const {modifySqlForMxModels} = catalogAsModels

export interface ExtractedDataBase {
  name: string;
  description?: string;
  id: number;
  dialect: string;
  dbms_version: {
    flavor: string;
    version: string;
    semantic_version: number[];
  }
}

interface ExtractedTable {
  name: string;
  description?: string;
  schema?: string;
  id: number;
}


export interface MetabaseAppStateSQLEditor {
  type: MetabaseAppStateType.SQLEditor;
  availableDatabases?: string[];
  selectedDatabaseInfo?: ExtractedDataBase;
  relevantTables: ExtractedTable[];
  tableContextYAML?: Record<string, any>;
  sqlQuery: string;
  sqlVariables: {
    [key: string]: {
      value: string,
      type: string,
      displayName: string
    }
  }
  sqlErrorMessage?: string;
  queryExecuted: boolean;
  sqlEditorState: 'open' | 'closed' | 'unknown';
  visualizationType: string;
  visualizationSettingsStatus: 'open' | 'closed';
  outputTableMarkdown: string
  visualizationSettings: visualizationSettings,
  metabaseOrigin?: string;
  metabaseUrl?: string;
  isEmbedded: boolean;
  limitedEntities?: MetabaseTableOrModel[];
  currentCard?: Card;
}

// make this DashboardInfo
export interface MetabaseAppStateDashboard extends DashboardInfo {
  type: MetabaseAppStateType.Dashboard;
  tableContextYAML?: Record<string, any>;
  selectedDatabaseInfo?: ExtractedDataBase;
  metabaseOrigin?: string;
  metabaseUrl?: string;
  isEmbedded: boolean;
  limitedEntities?: MetabaseTableOrModel[];
}

export interface MetabaseAppStateMBQLEditor extends MBQLInfo {
  type: MetabaseAppStateType.MBQLEditor;
  tableContextYAML?: Record<string, any>;
  selectedDatabaseInfo?: ExtractedDataBase;
  metabaseOrigin?: string;
  metabaseUrl?: string;
  isEmbedded: boolean;
}

export interface MetabaseSemanticQueryAppState {
  type: MetabaseAppStateType.SemanticQuery;
  availableMeasures: Measure[];
  availableDimensions: Dimension[];
  currentSemanticQuery: SemanticQuery;
  dialect?: string;
  outputTableMarkdown?: string;
  currentSemanticLayer?: string;
  isEmbedded: boolean;
}

export type MetabaseAppState = MetabaseAppStateSQLEditor | MetabaseAppStateDashboard | MetabaseSemanticQueryAppState | MetabaseAppStateMBQLEditor | MetabaseAppStateSQLEditorV2;

// no need to fetch fields since we don't want that in limited entities
async function getLimitedEntities(sqlQuery: string): Promise<MetabaseTableOrModel[]> {
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
  
  // Transform and combine tables and models with type annotations
  const relevantTablesWithFieldsAndType: MetabaseTableOrModel[] = relevantTablesWithFields.map(table => ({
    type: 'table',
    id: table.id,
    name: table.name,
    schema: table.schema,
    description: table.description,
  }));
  
  const relevantModelsWithFieldsAndType: MetabaseTableOrModel[] = relevantModels.map(model => ({
    type: 'model',
    id: model.modelId || 0,
    name: model.name,
    description: model.description,
  }));
  
  return [...relevantTablesWithFieldsAndType, ...relevantModelsWithFieldsAndType];
}

export async function convertDOMtoStateSQLQueryV2(pageType: MetabasePageType) : Promise<MetabaseAppStateSQLEditorV2> {
  const [metabaseUrl, currentCardRaw, outputMarkdown, parameterValues] = await Promise.all([
    RPCs.queryURL(),
    getCurrentCard() as Promise<Card>,
    getAndFormatOutputTable(),
    getParameterValues() as Promise<ParameterValues>
  ]);
  const currentCard = processCard(currentCardRaw);
  const metabaseOrigin = new URL(metabaseUrl).origin;
  const isEmbedded = getParsedIframeInfo().isEmbedded
  const sqlQuery =  get(currentCard, 'dataset_query.native.query', '') || ''
  const limitedEntities = await getLimitedEntities(sqlQuery);
  const dbId = await getSelectedDbId();
  const selectedDatabaseInfo = dbId ? await getDatabaseInfo(dbId) : undefined;
  const sqlErrorMessage = await getSqlErrorMessage();
  const appStateType = pageType === 'sql' ? MetabaseAppStateType.SQLEditor : MetabaseAppStateType.RandomPage;
  let relevantTablesWithFields: FormattedTable[] = []
  {
      const dbTables = await getAllRelevantTablesForSelectedDb(dbId || 0)
      const sqlTables = await getTablesFromSqlRegex(sqlQuery)
      const defaultSchema = selectedDatabaseInfo?.default_schema
      // Apply default schema to tables if needed
      if (defaultSchema) {
        sqlTables.forEach((table) => {
          if (table.schema === undefined || table.schema === '') {
            table.schema = defaultSchema;
          }
        });
      }
      const validSqlTables = validateTablesInDB(sqlTables, dbTables, defaultSchema)
      const sqlTablesWithFields = (await Promise.all(validSqlTables.map(table => getTableData(table.id)))).filter(table => table !== "missing")
      relevantTablesWithFields = sqlTablesWithFields
  }
  return {
    type: appStateType,
    version: '2',
    metabaseOrigin,
    metabaseUrl,
    isEmbedded,
    limitedEntities,
    currentCard,
    outputMarkdown,
    parameterValues,
    selectedDatabaseInfo,
    sqlErrorMessage,
    relevantTablesWithFields
  }
}

export async function convertDOMtoStateSQLQuery() {
  // CAUTION: This one does not update when changed via ui for some reason
  // const dbId = _.get(hashMetadata, 'dataset_query.database');
  const fullUrl = await RPCs.queryURL();
  const url = new URL(fullUrl).origin;
  const availableDatabases = (await getDatabases())?.data?.map(({ name }) => name);
  const dbId = await getSelectedDbId();
  const selectedDatabaseInfo = dbId ? await getDatabaseInfo(dbId) : undefined;
  const defaultSchema = selectedDatabaseInfo?.default_schema;
  let sqlQuery = await getCurrentQuery()
  const appSettings = RPCs.getAppSettings()
  const cache = RPCs.getCache()
  const sqlTables = getTablesFromSqlRegex(sqlQuery)
  const selectedCatalogObj = find(appSettings.availableCatalogs, { name: appSettings.selectedCatalog })
  const selectedCatalog = get(selectedCatalogObj, 'content')
  if (defaultSchema) {
    sqlTables.forEach((table) => {
      if (table.schema === undefined || table.schema === '') {
        table.schema = defaultSchema
      }
    })
  }
  let relevantTablesWithFields = await getTablesWithFields(appSettings.tableDiff, appSettings.drMode, !!selectedCatalog, sqlTables, [])
  // add defaultSchema back to relevantTablesWithFields. kind of hacky but whatever
  relevantTablesWithFields = relevantTablesWithFields.map(table => {
    if (table.schema === undefined || table.schema === '') {
      table.schema = defaultSchema || 'unknown'
    }
    return table
  })
  const allModels = dbId ? await getAllRelevantModelsForSelectedDb(dbId) : []
  const relevantModels = await getSelectedAndRelevantModels(sqlQuery || "", appSettings.selectedModels, allModels)
  const relevantModelsWithFields = await getModelsWithFields(relevantModels)
  const allFormattedTables = [...relevantTablesWithFields, ...relevantModelsWithFields]
  const tableContextYAML = getTableContextYAML(allFormattedTables, selectedCatalog, appSettings.drMode);
  sqlQuery = modifySqlForMetabaseModels(sqlQuery || "", relevantModels)
  const queryExecuted = await hasQueryResults();
  const nativeEditorOpen = await isNativeEditorOpen()
  const sqlErrorMessage = await getSqlErrorMessage();
  const outputTableMarkdown = await getAndFormatOutputTable();
  const showingRawTable = await isShowingRawTable()
  const showingChartTypeSidebar = await isShowingChartTypeSidebar()
  const vizType = await getVisualizationType()
  const visualizationSettings = await getVisualizationSettings() as visualizationSettings
  const sqlVariables = await getSqlVariables();
  const currentCard = await getCurrentCard() as Card;
  const metabaseAppStateSQLEditor: MetabaseAppStateSQLEditor = {
    type: MetabaseAppStateType.SQLEditor,
    availableDatabases,
    selectedDatabaseInfo,
    relevantTables: relevantTablesWithFields,
    sqlQuery: sqlQuery || '',
    currentCard,
    queryExecuted,
    sqlEditorState: nativeEditorOpen ? 'open' : 'closed',
    visualizationType: showingRawTable ? 'table' : vizType,
    visualizationSettingsStatus: showingChartTypeSidebar ? 'open' : 'closed',
    outputTableMarkdown,
    visualizationSettings,
    sqlVariables,
    metabaseOrigin: url,
    metabaseUrl: fullUrl,
    isEmbedded: getParsedIframeInfo().isEmbedded,
  };
  if (appSettings.drMode) {
    metabaseAppStateSQLEditor.tableContextYAML = tableContextYAML;
    metabaseAppStateSQLEditor.relevantTables = []
    if (appSettings.modelsMode && selectedCatalogObj && canUseModelsModeForCatalog(selectedCatalogObj, cache.mxModels)) {
      metabaseAppStateSQLEditor.sqlQuery = modifySqlForMxModels(metabaseAppStateSQLEditor.sqlQuery, get(selectedCatalog, 'entities', []), appSettings.selectedCatalog, cache.mxModels)
    }
  }
  if (sqlErrorMessage) {
    metabaseAppStateSQLEditor.sqlErrorMessage = sqlErrorMessage;
  }
  if (appSettings.analystMode && appSettings.manuallyLimitContext) {
    const limitToTables: MetabaseTableOrModel[] = relevantTablesWithFields.map(table => ({
      type: 'table',
      id: table.id,
      name: table.name,
      schema: table.schema,
      description: table.description,
    }))
    const limitToModels: MetabaseTableOrModel[] = relevantModels.map(model => ({
      type: 'model',
      id: model.modelId,
      name: model.name,
      description: model.description,
    }))
    metabaseAppStateSQLEditor.limitedEntities = [...limitToTables, ...limitToModels];
  }
  return metabaseAppStateSQLEditor;
}

export async function convertDOMtoStateMBQLQuery() {
    return await getMBQLAppState() as MetabaseAppStateMBQLEditor;
}

// check if on dashboard page
export async function convertDOMtoStateDashboard(): Promise<MetabaseAppStateDashboard> {
    const dashboardInfo = await getDashboardAppState();
    return dashboardInfo as MetabaseAppStateDashboard;
};

export async function semanticQueryState() {
  const { semanticLayer, semanticQuery, currentSemanticLayer } = RPCs.getSemanticInfo()
  const { availableMeasures, availableDimensions } = semanticLayer
  const dbId = await getSelectedDbId();
  const selectedDatabaseInfo = dbId ? await getDatabaseInfo(dbId) : undefined;
  const outputTableMarkdown = await getAndFormatOutputTable();
  
  const metabaseSemanticQueryAppState: MetabaseSemanticQueryAppState = {
    type: MetabaseAppStateType.SemanticQuery,
    availableMeasures,
    availableDimensions,
    currentSemanticQuery: semanticQuery,
    dialect: selectedDatabaseInfo?.dialect,
    outputTableMarkdown,
    // @ts-ignore
    currentSemanticLayer,
    isEmbedded: getParsedIframeInfo().isEmbedded
  }
  return metabaseSemanticQueryAppState;
}

export async function convertDOMtoState() {
  const url = await queryURL();
  const qlType = await getQLType();
  const metabasePageType = determineMetabasePageType({}, url, qlType);
  if (metabasePageType === 'dashboard') {
    return await convertDOMtoStateDashboard();
  }
  if (metabasePageType === 'mbql') {
    return await convertDOMtoStateMBQLQuery();
  }
  const appSettings = RPCs.getAppSettings()
  if (appSettings.useV2States && appSettings.analystMode) {
    return await convertDOMtoStateSQLQueryV2(metabasePageType);
  }
  return await convertDOMtoStateSQLQuery();
}

async function getSqlVariables() {
  const currentCard = await getCurrentCard() as Card;
  if (!currentCard) {
    return {};
  }
  const currentParameterValues = await getParameterValues() as ParameterValues;
  const parameters = get(currentCard, 'dataset_query.native.template-tags', {});
  const sqlVariables: Record<string, {
    value: string,
    type: string,
    displayName: string
  }> = {};
  // ignore snippets and models
  // snippets are parameters that start with snippet:
  // models are parameters that start with #modelNumber-modelSlug
  // keep in mind leading spaces
  for (const [key, value] of Object.entries(parameters)) {
    const parameterId = value.id;
    const parameterValue = currentParameterValues[parameterId];
    const snippetsRegex = /^\s*snippet:/g;
    const modelsRegex = /^\s*#(\d+)/g;
    if (!snippetsRegex.test(key) && !modelsRegex.test(key)) {
      sqlVariables[key] = {
        value: parameterValue,
        type: value.type,
        displayName: value['display-name']
      };
    }
  }
  return sqlVariables; 
}
