import { RPCs } from 'web'
import { getRelevantTablesForSelectedDb, getDatabaseInfoForSelectedDb, extractTableInfo, memoizedGetDatabases, memoizedGetDatabaseTablesWithoutFields, extractDbInfo, getTablesWithFields } from './getDatabaseSchema';
import { getAndFormatOutputTable, getSqlErrorMessage } from './operations';
import { isDashboardPageUrl } from './dashboard/util';
import { DashboardInfo } from './dashboard/types';
import { getDashboardAppState } from './dashboard/appState';
import { visualizationSettings, Card, ParameterValues, FormattedTable } from './types';
const { getMetabaseState, queryURL } = RPCs;
import { Measure, Dimension, SemanticQuery, TableInfo } from "web/types";
import { applyTableDiffs, handlePromise } from '../../common/utils';
import { getSelectedDbId } from './getUserInfo';
import { add, assignIn, find, get, keyBy, map } from 'lodash';
import { getTablesFromSqlRegex } from './parseSql';
import { getTableContextYAML } from './catalog';

interface ExtractedDataBase {
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

export enum MetabaseAppStateType {
    SQLEditor = 'metabaseSQLEditor',
    Dashboard = 'metabaseDashboard',
    SemanticQuery = 'metabaseSemanticQuery'
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
}

// make this DashboardInfo
export interface MetabaseAppStateDashboard extends DashboardInfo {
  type: MetabaseAppStateType.Dashboard;
  tableContextYAML?: Record<string, any>;
  selectedDatabaseInfo?: ExtractedDataBase;
  metabaseOrigin?: string;
}

export interface MetabaseSemanticQueryAppState {
  type: MetabaseAppStateType.SemanticQuery;
  availableMeasures: Measure[];
  availableDimensions: Dimension[];
  currentSemanticQuery: SemanticQuery;
  dialect?: string;
  outputTableMarkdown?: string;
  currentSemanticLayer?: string;
}

export type MetabaseAppState = MetabaseAppStateSQLEditor | MetabaseAppStateDashboard | MetabaseSemanticQueryAppState;

export async function convertDOMtoStateSQLQuery() {
  // CAUTION: This one does not update when changed via ui for some reason
  // const dbId = _.get(hashMetadata, 'dataset_query.database');
  const url = new URL(await RPCs.queryURL()).origin;
  const availableDatabases = (await memoizedGetDatabases())?.data?.map(({ name }) => name);
  const selectedDatabaseInfo = await getDatabaseInfoForSelectedDb();
  const defaultSchema = selectedDatabaseInfo?.default_schema;
  const sqlQuery = await getMetabaseState('qb.card.dataset_query.native.query') as string
  const appSettings = RPCs.getAppSettings()
  const sqlTables = getTablesFromSqlRegex(sqlQuery)
  const selectedCatalog = get(find(appSettings.availableCatalogs, { name: appSettings.selectedCatalog }), 'content')
  if (defaultSchema) {
    sqlTables.forEach((table) => {
      if (table.schema === undefined || table.schema === '') {
        table.schema = defaultSchema
      }
    })
  }
  const relevantTablesWithFields = await getTablesWithFields(appSettings.tableDiff, appSettings.drMode, !!selectedCatalog, sqlTables)
  const tableContextYAML = getTableContextYAML(relevantTablesWithFields, selectedCatalog, appSettings.drMode);
  
  const queryExecuted = await getMetabaseState('qb.queryResults') !== null;
  const isNativeEditorOpen = await getMetabaseState('qb.uiControls.isNativeEditorOpen')
  const sqlErrorMessage = await getSqlErrorMessage();
  const outputTableMarkdown = await getAndFormatOutputTable();
  const isShowingRawTable = await getMetabaseState('qb.uiControls.isShowingRawTable')
  const isShowingChartTypeSidebar = await getMetabaseState('qb.uiControls.isShowingChartTypeSidebar')
  const vizType = await getMetabaseState('qb.card.display') as string
  const visualizationSettings = await getMetabaseState('qb.card.visualization_settings') as visualizationSettings
  const sqlVariables = await getSqlVariables();
  const metabaseAppStateSQLEditor: MetabaseAppStateSQLEditor = {
    type: MetabaseAppStateType.SQLEditor,
    availableDatabases,
    selectedDatabaseInfo,
    relevantTables: relevantTablesWithFields,
    sqlQuery,
    queryExecuted,
    sqlEditorState: isNativeEditorOpen ? 'open' : 'closed',
    visualizationType: isShowingRawTable ? 'table' : vizType,
    visualizationSettingsStatus: isShowingChartTypeSidebar ? 'open' : 'closed',
    outputTableMarkdown,
    visualizationSettings,
    sqlVariables,
    metabaseOrigin: url
  };
  if (appSettings.drMode) {
    metabaseAppStateSQLEditor.tableContextYAML = tableContextYAML;
    metabaseAppStateSQLEditor.relevantTables = []
  }
  if (sqlErrorMessage) {
    metabaseAppStateSQLEditor.sqlErrorMessage = sqlErrorMessage;
  }
  return metabaseAppStateSQLEditor;
}

// check if on dashboard page
export async function convertDOMtoStateDashboard(): Promise<MetabaseAppStateDashboard> {
    const dashboardInfo = await getDashboardAppState();
    return dashboardInfo as MetabaseAppStateDashboard;
};

export async function semanticQueryState() {
  const { semanticLayer, semanticQuery, currentSemanticLayer } = RPCs.getSemanticInfo()
  const { availableMeasures, availableDimensions } = semanticLayer
  const selectedDatabaseInfo = await getDatabaseInfoForSelectedDb();
  const outputTableMarkdown = await getAndFormatOutputTable();
  
  const metabaseSemanticQueryAppState: MetabaseSemanticQueryAppState = {
    type: MetabaseAppStateType.SemanticQuery,
    availableMeasures,
    availableDimensions,
    currentSemanticQuery: semanticQuery,
    dialect: selectedDatabaseInfo?.dialect,
    outputTableMarkdown,
    currentSemanticLayer
  }
  return metabaseSemanticQueryAppState;
}

export async function isDashboardPage() {
  const url = await queryURL();
  return isDashboardPageUrl(url);
}

export async function convertDOMtoState() {
  if (await isDashboardPage()) {
    return await convertDOMtoStateDashboard();
  }
  const appSettings = RPCs.getAppSettings()
  if(appSettings.semanticPlanner) {
    return await semanticQueryState();
  }
  return await convertDOMtoStateSQLQuery();
}
async function getSqlVariables() {
  const currentCard = await RPCs.getMetabaseState("qb.card") as Card;
  if (!currentCard) {
    return {};
  }
  const currentParameterValues = await RPCs.getMetabaseState("qb.parameterValues") as ParameterValues;
  const parameters = currentCard.dataset_query.native['template-tags'];
  const sqlVariables: Record<string, {
    value: string,
    type: string,
    displayName: string
  }> = {};
  for (const [key, value] of Object.entries(parameters)) {
    const parameterId = value.id;
    const parameterValue = currentParameterValues[parameterId];
    sqlVariables[key] = {
      value: parameterValue,
      type: value.type,
      displayName: value['display-name']
    };
  }
  return sqlVariables; 
}
