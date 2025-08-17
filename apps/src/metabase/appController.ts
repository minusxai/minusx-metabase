import { BlankMessageContent, SemanticFilter, DefaultMessageContent, TimeDimension, Order } from "web/types";
import { RPCs, configs,  } from "web";
import { AppController, Action, App } from "../base/appController";
import {
  MetabaseAppState,
  MetabaseAppStateDashboard,
  MetabaseAppStateSQLEditor,
  MetabaseSemanticQueryAppState,
  MetabaseAppStateMBQLEditor,
} from "./helpers/DOMToState";

import { MetabasePageType } from "./helpers/utils";

import { MetabaseAppStateSQLEditorV2 } from "./helpers/analystModeTypes";

import {
  getAndFormatOutputTable,
  getSqlErrorMessage,
  metabaseToCSV,
  metabaseToMarkdownTable,
  waitForQueryExecution,
} from "./helpers/operations";
import {
  searchTables,
} from "./helpers/getDatabaseSchema";
import { isEmpty, map, sample, truncate } from "lodash";
import {
  DashboardMetabaseState,
  DashcardDetails,
} from "./helpers/dashboard/types";
import _ from "lodash";
import { 
  VisualizationType,
  primaryVisualizationTypes,
  Card,
  toLowerVisualizationType,
  ParameterValues,
 } from "./helpers/types";
import {
  getTemplateTags as getTemplateTagsForVars,
  getParameters,
  getVariablesAndUuidsInQuery,
  MetabaseStateSnippetsDict,
  getAllTemplateTagsInQuery,
  applySQLEdits,
  SQLEdits
} from "./helpers/sqlQuery";
import axios from 'axios'
import { getSelectedDbId, getCurrentUserInfo as getUserInfo, getSnippets, getCurrentCard, getDashboardState, getCurrentQuery, getParameterValues } from "./helpers/metabaseStateAPI";
import { runSQLQueryFromDashboard, runMBQLQueryFromDashboard } from "./helpers/dashboard/runSqlQueryFromDashboard";
import { getAllRelevantModelsForSelectedDb, getTableData } from "./helpers/metabaseAPIHelpers";
import { processSQLWithCtesOrModels, dispatch, updateIsDevToolsOpen, updateDevToolsTabName, addMemory } from "web";
import { fetchTableMetadata } from "./helpers/metabaseAPI";
import { getSourceTableIds } from "./helpers/mbql/utils";
import { replaceLLMFriendlyIdentifiersInSqlWithModels } from "./helpers/metabaseModels";

const SEMANTIC_QUERY_API = `${configs.SEMANTIC_BASE_URL}/query`
type CTE = [string, string]

async function updateMBEntities(table_ids: Array<number>) {
  const sampleTables = await Promise.all(table_ids.map((table_id) => fetchTableMetadata({ table_id })))
  const databases = Object.fromEntries(sampleTables.map(table => [table.db_id, table.db]));
  const schemas = Object.fromEntries(sampleTables.map(table => [`${table.db_id}:${table.schema}`, {
    id: `${table.db_id}:${table.schema}`,
    name: table.schema,
    database: table.db_id
  }]));
  const fields = Object.fromEntries(sampleTables.flatMap(table => table.fields.map(f => [f.id, {
    ...f,
    uniqueId: f.id
  }])));
  const tables = Object.fromEntries(sampleTables.map(table => [
    table.id, {
      ...table,
      fields: table.fields.map(f => f.id),
      original_fields: table.fields,
      schema_name: table.schema,
      schema: `${table.db_id}:${table.schema}`,
    }
  ]));
  const entityMetadata = {
    result: {
        "databases": Object.keys(databases),
        "tables": Object.keys(tables),
        "fields": Object.keys(fields),
    },
    entities: {
      databases: databases,
      schemas: schemas,
      fields: fields,
      tables: tables,
    }
  }
  await RPCs.dispatchMetabaseAction('metabase/entities/questions/FETCH_METADATA', entityMetadata);
}

export class MetabaseController extends AppController<MetabaseAppState> {
  // 0. Exposed actions --------------------------------------------
  @Action({
    labelRunning: "Updating SQL query",
    labelDone: "Updated query",
    description: "Updates the SQL query in the Metabase SQL editor and executes it.",
    renderBody: ({ sql }: { sql: string }, appState: MetabaseAppStateSQLEditor) => {
      const sqlQuery = appState?.sqlQuery
      return {text: null, code: sql, oldCode: sqlQuery}
    }
  })
  async updateSQLQuery({ sql, executeImmediately = true, _type = "markdown", ctes = [] }: { sql: string, executeImmediately?: boolean, _type?: string, ctes: CTE[] }) {
    const actionContent: BlankMessageContent = {
      type: "BLANK",
    };
    sql = processSQLWithCtesOrModels(sql, ctes);
    const metabaseState = this.app as App<MetabaseAppState>;
    const allModels = metabaseState.useStore().getState().toolContext?.dbInfo?.models || [];
    // use allModels for this replacement
    sql = replaceLLMFriendlyIdentifiersInSqlWithModels(sql, allModels)
    const allSnippetsDict = await getSnippets() as MetabaseStateSnippetsDict;
    const allTemplateTags = getAllTemplateTagsInQuery(sql, allSnippetsDict)
    const state = (await this.app.getState()) as MetabaseAppStateSQLEditor;
    if (state.sqlEditorState == "closed") {
      await this.toggleSQLEditor("open");
    }
    const currentCard = await getCurrentCard() as Card;
    const varsAndUuids = getVariablesAndUuidsInQuery(sql);
    const existingTemplateTags = currentCard.dataset_query.native['template-tags'];
    const existingParameters = currentCard.parameters;
    const templateTags = {
      ...getTemplateTagsForVars(varsAndUuids, existingTemplateTags || {}),
      ...allTemplateTags
    }
    const parameters = getParameters(varsAndUuids, existingParameters || []);
    currentCard.dataset_query.native['template-tags'] = templateTags;
    currentCard.parameters = parameters;
    currentCard.dataset_query.native.query = sql;
    await RPCs.dispatchMetabaseAction('metabase/qb/UPDATE_QUESTION', { card: currentCard });
    await RPCs.dispatchMetabaseAction('metabase/qb/UPDATE_URL');
    // try {
    //   await this.uClick({ query: 'format_query_button' });
    // } catch (error) {
    //   console.error('Error clicking format query button:', error);
    // }
    
    // await this.uDblClick({ query: "sql_query" });
    // await this.setValue({ query: "sql_query", value: sql });

    
    if (executeImmediately) {
      return await this._executeSQLQueryInternal(_type);
    } else {
      actionContent.content = "OK";
      return actionContent;
    }
  }

  @Action({
    labelRunning: "Updating SQL query with parameters",
    labelDone: "Updated query with parameters",
    description: "Updates the SQL query in the Metabase SQL editor with explicit template tags and parameters.",
    renderBody: ({ sql, template_tags, parameters }: { sql: string, template_tags: object, parameters: any[] }, appState: MetabaseAppStateSQLEditor) => {
      const sqlQuery = appState?.sqlQuery
      return {text: `Using ${Object.keys(template_tags || {}).length} template tags and ${(parameters || []).length} parameters`, code: sql, oldCode: sqlQuery}
    }
  })
  async updateSQLQueryWithParams({ sql, template_tags = {}, parameters = [], parameterValues = [], executeImmediately = true, _type = "markdown", ctes = [] }: { sql: string, template_tags?: object, parameters?: any[], parameterValues?: Array<{id: string, value: string[]}>, executeImmediately?: boolean, _type?: string, ctes: CTE[] }) {
    const actionContent: BlankMessageContent = {
      type: "BLANK",
    };
    const state = (await this.app.getState()) as MetabaseAppStateSQLEditor;
    const { userApproved, userFeedback } = await RPCs.getUserConfirmation({content: sql, contentTitle: "Approve SQL Query?", oldContent: state.currentCard?.dataset_query?.native?.query || state.sqlQuery || ''});
    if (!userApproved) {
      actionContent.content = '<UserCancelled>Reason: ' + (userFeedback === '' ?  'No particular reason given' : userFeedback) + '</UserCancelled>';
      return actionContent;
    }
    if (state.sqlEditorState == "closed") {
      await this.toggleSQLEditor("open");
    }
    const currentCard = await getCurrentCard() as Card;
    
    // Get existing template tags and parameters to merge with provided ones
    const allSnippetsDict = await getSnippets() as MetabaseStateSnippetsDict;
    const allTemplateTags = getAllTemplateTagsInQuery(sql, allSnippetsDict)
    const existingTemplateTags = currentCard.dataset_query.native['template-tags'] || {};
    const existingParameters = currentCard.parameters || [];
    
    // Merge provided template tags with existing ones (provided ones take precedence)
    const mergedTemplateTags = {
      ...existingTemplateTags,
      ...allTemplateTags,
      ...template_tags
    };
    
    // Merge provided parameters with existing ones (provided ones take precedence)
    const mergedParameters = [...existingParameters];
    if (parameters && Array.isArray(parameters)) {
      parameters.forEach((param) => {
        const existingParamIndex = mergedParameters.findIndex(p => p.slug === param.slug);
        if (existingParamIndex !== -1) {
          mergedParameters[existingParamIndex] = { ...mergedParameters[existingParamIndex], ...param };
        } else {
          mergedParameters.push(param);
        }
      });
    }
    
    currentCard.dataset_query.native['template-tags'] = mergedTemplateTags;
    currentCard.parameters = mergedParameters;
    currentCard.dataset_query.native.query = sql;
    await RPCs.dispatchMetabaseAction('metabase/qb/UPDATE_QUESTION', { card: currentCard });
    await RPCs.dispatchMetabaseAction('metabase/qb/UPDATE_URL');
    await RPCs.dispatchMetabaseAction('metabase/qb/TOGGLE_TEMPLATE_TAGS_EDITOR');
    await RPCs.dispatchMetabaseAction('metabase/qb/TOGGLE_TEMPLATE_TAGS_EDITOR');
    
    // Set parameter values if provided
    if (parameterValues && Array.isArray(parameterValues) && parameterValues.length > 0) {
      await Promise.all(parameterValues.map(async ({id, value}) => {
        return RPCs.dispatchMetabaseAction('metabase/qb/SET_PARAMETER_VALUE', { id, value });
      }));
    }
    
    if (executeImmediately) {
      return await this._executeSQLQueryInternal(_type);
    } else {
      actionContent.content = "OK";
      return actionContent;
    }
  }
  // for dashboard interface
  @Action({
    labelRunning: "Running SQL Query",
    labelDone: "Ran SQL query",
    description: "Runs an SQL Query against the database",
    renderBody: ({ sql }: { sql: string }, appState: MetabaseAppStateDashboard) => {
      return {text: null, code: sql}
    }
  })
  async runSQLQuery({ sql, ctes = [] }: { sql: string, ctes: CTE[] }) {
    const actionContent: BlankMessageContent = {
      type: "BLANK",
    };
    sql = processSQLWithCtesOrModels(sql, ctes);
    const metabaseState = this.app as App<MetabaseAppState>;
    const allModels = metabaseState.useStore().getState().toolContext?.dbInfo?.models || [];
    // use all models in this replacement
    sql = replaceLLMFriendlyIdentifiersInSqlWithModels(sql, allModels)
    const allSnippetsDict = await getSnippets() as MetabaseStateSnippetsDict;
    const allTemplateTags = getAllTemplateTagsInQuery(sql, allSnippetsDict)
    const state = (await this.app.getState()) as MetabaseAppStateDashboard;
    const dbID = state?.selectedDatabaseInfo?.id as number
    if (!dbID) {
      actionContent.content = "No database selected";
      return actionContent;
    }
    const response = await runSQLQueryFromDashboard(sql, dbID, allTemplateTags);
    if (response.error) {
      actionContent.content = `<ERROR>${response.error}</ERROR>`;
    } else {
    //   const asMarkdown = metabaseToCSV(response.data);
        const asMarkdown = metabaseToMarkdownTable(response.data);
      actionContent.content = asMarkdown;
    }
    return actionContent;
  }

  async runMBQLQuery({ mbql, dbID }: { mbql: any, dbID: number }) {
    const actionContent: BlankMessageContent = {
      type: "BLANK",
    };
    const response = await runMBQLQueryFromDashboard(mbql, dbID);
    if (response.error) {
      actionContent.content = `<ERROR>${response.error}</ERROR>`;
    } else {
    //   const asMarkdown = metabaseToCSV(response.data);
        const asMarkdown = metabaseToMarkdownTable(response.data);
      actionContent.content = asMarkdown;
    }
    return actionContent;
  }

  @Action({
    labelRunning: "Running SQL Query with parameters",
    labelDone: "Ran SQL query with parameters",
    description: "Runs an SQL Query against the database with explicit template tags and parameters",
    renderBody: ({ sql, template_tags, parameters }: { sql: string, template_tags: object, parameters: any[] }, appState: MetabaseAppStateDashboard) => {
      return {text: `Using ${Object.keys(template_tags || {}).length} template tags and ${(parameters || []).length} parameters`, code: sql}
    }
  })
  async runSQLQueryWithParams({ sql, template_tags = {}, parameters = [], ctes = [] }: { sql: string, template_tags?: object, parameters?: any[], ctes: CTE[] }) {
    const actionContent: BlankMessageContent = {
      type: "BLANK",
    };
    sql = processSQLWithCtesOrModels(sql, ctes);
    const metabaseState = this.app as App<MetabaseAppState>;
    const allModels = metabaseState.useStore().getState().toolContext?.dbInfo?.models || [];
    // use all models in this replacement
    sql = replaceLLMFriendlyIdentifiersInSqlWithModels(sql, allModels)
    const state = (await this.app.getState()) as MetabaseAppStateDashboard;
    const dbID = state?.selectedDatabaseInfo?.id as number
    if (!dbID) {
      actionContent.content = "No database selected";
      return actionContent;
    }
    
    const allSnippetsDict = await getSnippets() as MetabaseStateSnippetsDict;
    const allTemplateTags = getAllTemplateTagsInQuery(sql, allSnippetsDict)
    const mergedTemplateTags = {
      ...allTemplateTags,
      ...template_tags
    };
    const response = await runSQLQueryFromDashboard(sql, dbID, mergedTemplateTags);
    if (response.error) {
      actionContent.content = `<ERROR>${response.error}</ERROR>`;
    } else {
    //   const asMarkdown = metabaseToCSV(response.data);
        const asMarkdown = metabaseToMarkdownTable(response.data);

      if (!asMarkdown) {
        actionContent.content = `<OUTPUT>EMPTY_RESULTS</OUTPUT>`;
      } else {
        actionContent.content = `<OUTPUT>${asMarkdown}</OUTPUT>`;
      }
    }
    return actionContent;
  }

   @Action({
    labelRunning: "Showing Data Model Editor",
    labelDone: "Opened Data Model Editor",
    labelTask: "Opened Data Model Editor",
    description: "Opens the Data Model Editor in the MinusX Dev Tools.",
    renderBody: ({ explanation }: { explanation: string }, appState: MetabaseAppStateDashboard) => {
      return {text: null, code: null}
    }
  })
  async showDataModelEditor({explanation}: {explanation: string}) {
    dispatch(updateIsDevToolsOpen(true))
    dispatch(updateDevToolsTabName('Context'))
    await RPCs.setMinusxMode('open-sidepanel-devtools')
    const actionContent: BlankMessageContent = {
      type: "BLANK",
    };
    actionContent.content = "Successfully opened table editor"
    return actionContent;
  }

   @Action({
    labelRunning: "Adding memory",
    labelDone: "Memory Task Completed",
    labelTask: "Memory Triggered",
    description: "Remembers notable memories",
    renderBody: ({ memory }: { memory: string }, appState: MetabaseAppStateDashboard) => {
      return {text: null, code: null}
    }
  })
  async AddMemory({memory}: {memory: string}) {
    const actionContent: BlankMessageContent = {
      type: "BLANK",
    };
    const { userApproved, userFeedback } = await RPCs.getUserConfirmation({content: memory, contentTitle: "Shall I add this to memory?", oldContent: undefined, override: true});
    if (userApproved) {
        dispatch(addMemory(memory));
        dispatch(updateIsDevToolsOpen(true))
        dispatch(updateDevToolsTabName('Memory'))
        await RPCs.setMinusxMode('open-sidepanel-devtools')
        actionContent.content = "Memory added successfully";
    }
    else {
        actionContent.content = "User cancelled adding memory";
    }    
    return actionContent;
  }

  @Action({
    labelRunning: "Executing SQL Query",
    labelDone: "Executed SQL query",
    labelTask: "Kick off SQL query",
    description: "Executes the SQL query in the Metabase SQL editor.",
    renderBody: () => {
      return {text: null, code: null}
    }
  })
  async executeSQLQuery() {
    return await this._executeSQLQueryInternal();
  }

  @Action({
    labelRunning: "Setting parameter values for a query",
    labelDone: "Parameter values set",
    labelTask: "Parameter values set",
    description: "Sets parameter values for a query in the Metabase SQL editor and execute. Use ExecuteQuery with parameterValues argument instead unless solely updating parameter values.",
    renderBody: ({ parameterValues }: { parameterValues: Array<{id: string, value: string[]}> }) => {
      return {text: null, code: JSON.stringify({ parameterValues })}
    }
  })
  async setQueryParameterValues({ parameterValues }: { parameterValues: Array<{id: string, value: string[]}> }) {
    await Promise.all(parameterValues.map(async ({id, value}) => {
      return RPCs.dispatchMetabaseAction('metabase/qb/SET_PARAMETER_VALUE', { id, value });
    }));
    return this._executeSQLQueryInternal()
  }

  @Action({
    labelRunning: "Executes the SQL query with parameters",
    labelDone: "Executed query",
    labelTask: "Kick off SQL query",
    description: "Executes the SQL query in the Metabase SQL editor with support for template tags and parameters.",
    renderBody: ({ sql, explanation, template_tags={}, parameters=[], parameterValues=[] }: { sql: string, explanation: string, template_tags?: object, parameters?: any[], parameterValues?: Array<{id: string, value: string[]}> }, appState: MetabaseAppStateSQLEditor | MetabaseAppStateSQLEditorV2) => {
      const currentQuery = appState?.currentCard?.dataset_query?.native?.query || appState?.sqlQuery || "";
      const currentTemplateTags = appState?.currentCard?.dataset_query?.native?.['template-tags'] || {};
      const currentParameters = appState?.currentCard?.parameters || [];
      const paramValuesInfo = parameterValues && parameterValues.length > 0 ? ` with ${parameterValues.length} parameter values` : '';
      return {text: `${explanation}${paramValuesInfo}`, code: sql, oldCode: currentQuery, language: "sql", extraArgs: {old: {template_tags: currentTemplateTags, parameters: currentParameters}, new: {template_tags, parameters, parameterValues}}}
    }
  })
  async ExecuteQuery({ sql, _ctes = [], explanation = "", template_tags={}, parameters=[], parameterValues=[] }: { sql: string, _ctes?: CTE[], explanation?: string, template_tags?: object, parameters?: any[], parameterValues?: Array<{id: string, value: string[]}> }) {
    // console.log('Template tags are', template_tags)
    // console.log('Parameters are', parameters)
    // Try parsing template_tags and parameters if they are strings
    try {
      if (typeof template_tags === 'string') {
        template_tags = JSON.parse(template_tags);
      }
    } catch (error) {
      console.error('Error parsing template_tags or parameters:', error);
    }
    try {
      if (typeof parameters === 'string') {
        parameters = JSON.parse(parameters);
      }
    } catch (error) {
      console.error('Error parsing parameters:', error);
    }
    try {
      if (typeof parameterValues === 'string') {
        parameterValues = JSON.parse(parameterValues);
      }
    } catch (error) {
      console.error('Error parsing parameterValues:', error);
    }
    const metabaseState = this.app as App<MetabaseAppState>;
    const pageType = metabaseState.useStore().getState().toolContext?.pageType;
    
    if (pageType === 'sql') {
        return await this.updateSQLQueryWithParams({ sql, template_tags, parameters, parameterValues, executeImmediately: true, _type: "markdown", ctes: _ctes });
    }
    else if ((pageType === 'dashboard') || (pageType === 'unknown')) {
        return await this.runSQLQueryWithParams({ sql, template_tags, parameters, ctes: _ctes });
    }
  }

  @Action({
    labelRunning: "Edits the SQL query",
    labelDone: "Edited query",
    labelTask: "Edited SQL query",
    description: "Edits the SQL query in the Metabase SQL editor with support for template tags and parameters.",
    renderBody: ({ explanation, sql_edits, template_tags={}, parameters=[], parameterValues=[] }: { explanation: string, sql_edits: SQLEdits, template_tags?: object, parameters?: any[], parameterValues?: Array<{id: string, value: string[]}> }, appState: MetabaseAppStateSQLEditor | MetabaseAppStateSQLEditorV2) => {
      const currentQuery = appState?.currentCard?.dataset_query?.native?.query || appState?.sqlQuery || "";
      const currentTemplateTags = appState?.currentCard?.dataset_query?.native?.['template-tags'] || {};
      const currentParameters = appState?.currentCard?.parameters || [];
      const newQuery = applySQLEdits(currentQuery, sql_edits);
      const paramValuesInfo = parameterValues && parameterValues.length > 0 ? ` with ${parameterValues.length} parameter values` : '';
      return {text: `${explanation}${paramValuesInfo}`, code: newQuery, oldCode: currentQuery, language: "sql", extraArgs: {old: {template_tags: currentTemplateTags, parameters: currentParameters}, new: {template_tags, parameters, parameterValues}}}
    }
  })
  async EditAndExecuteQuery({ sql_edits, _ctes = [], explanation = "", template_tags={}, parameters=[], parameterValues=[] }: { sql_edits: SQLEdits, _ctes?: CTE[], explanation?: string, template_tags?: object, parameters?: any[], parameterValues?: Array<{id: string, value: string[]}> }) {
    let sql = await getCurrentQuery() || ""
    sql = applySQLEdits(sql, sql_edits);
    return await this.ExecuteQuery({ sql, _ctes, explanation, template_tags, parameters, parameterValues });
  }

  @Action({
    labelRunning: "Executes the SQL query",
    labelDone: "Executed query",
    labelTask: "Kick off SQL query",
    description: "Executes the SQL query in the Metabase SQL editor.",
    renderBody: ({ sql, explanation }: { sql: string, explanation: string }, appState: MetabaseAppStateSQLEditor) => {
      const sqlQuery = appState?.sqlQuery
      return {text: explanation, code: sql, oldCode: sqlQuery, language: "sql"}
    }
  })
  async ExecuteSQLClient({ sql, _ctes = [], explanation = "" }: { sql: string, _ctes?: CTE[], explanation?: string }) {
    const metabaseState = this.app as App<MetabaseAppState>;
    const pageType = metabaseState.useStore().getState().toolContext?.pageType;
    
    if (pageType === 'sql') {
        return await this.updateSQLQuery({ sql, executeImmediately: true, _type: "markdown", ctes: _ctes });
    }
    else if (pageType === 'dashboard') {
        return await this.runSQLQuery({ sql, ctes: _ctes });
    }
  }


  @Action({
    labelRunning: "Updating SQL Variable",
    labelDone: "Updated SQL Variable",
    labelTask: "Updated SQL Variable",
    description: "Updates value or metadata of a variable in the SQL editor.",
    renderBody: ({ variable, value, type, displayName }: { variable: string, value: string, type: string, displayName: string}) => {
      return {text: `variable: ${variable}`, code: JSON.stringify({value, type, displayName})}
    }
  })
  async setSqlVariable({ variable, value, type, displayName }: { variable: string, value: string, type: string, displayName: string }) {
    const actionContent: BlankMessageContent = {
      type: "BLANK",
    };
    const setContentAndWarn = (content: string) => {
      actionContent.content = content;
      console.warn(content);
    }
    const currentCard = await getCurrentCard() as Card;
    if (currentCard) {
      let parameters = _.get(currentCard, 'dataset_query.native.template-tags', {} as any);
      if (parameters[variable] == undefined) {
        setContentAndWarn(`Could not update variable value: Variable "${variable}" not found`);
        return actionContent;
      } else {
        let parameterId = parameters[variable].id;
        if (parameterId == undefined) {
          setContentAndWarn(`Could not update variable value: Variable "${variable}" not found`);
          return actionContent;
        } else {
          // check if type and displayName are present and use the qb.card UPDATE_QUESTION action to update them
          let variableInfo = currentCard.dataset_query.native['template-tags']?.[variable];
          variableInfo['type'] = type ?? variableInfo['type'];
          variableInfo['display-name'] = displayName ?? variableInfo['display-name'];
          currentCard.dataset_query.native['template-tags'][variable] = variableInfo;
          const typeToOtherTypeMap = {
            'text': 'category',
            'number': 'number/=',
            'date': 'date/single',
            '': ''
          } as Record<string, string>;
          let otherType = typeToOtherTypeMap[variableInfo['type']];
          // find the parameter in currentCard.parameters and modify its type to otherType
          let currentParams = currentCard.parameters || [];
          for (let i = 0; i < currentParams.length; i++) {
            const parameter = currentParams[i];
            if (parameter.slug == variable) {
              parameter.type = otherType ?? parameter.type;
              parameter.name = displayName ?? parameter.name;
              break;
            }
          }

          await RPCs.dispatchMetabaseAction('metabase/qb/UPDATE_QUESTION', { card: currentCard });
          // check if value is present. if yes, then update.
          if (value != undefined) {
            await RPCs.dispatchMetabaseAction('metabase/qb/SET_PARAMETER_VALUE', { id: parameterId, value });
          }
          await RPCs.dispatchMetabaseAction('metabase/qb/SET_TEMPLATE_TAG')
        }
      }
    } else {
      setContentAndWarn("Could not update variable value: No current card found");
      return actionContent;
    }
    return actionContent;
  }

  @Action({
    labelRunning: "Constructs the MBQL query",
    labelDone: "MBQL built",
    labelTask: "Built MBQL query",
    description: "Constructs the MBQL query in the GUI editor",
    renderBody: ({ mbql, explanation }: { mbql: any, explanation: string }) => {
        if (isEmpty(mbql)) {
            return {text: "This MBQL query has errors", code: null, language: "markdown"}
        }
      return {text: explanation, code: JSON.stringify(mbql), language: "json"}
    }
  })
  async ExecuteMBQLQuery({ mbql, explanation }: { mbql: any, explanation: string }) {
    const actionContent: BlankMessageContent = {
        type: "BLANK",
    };
    const state = (await this.app.getState()) as MetabaseAppStateMBQLEditor;
    const dbID = state?.selectedDatabaseInfo?.id as number
    if (!dbID) {
      actionContent.content = "No database selected";
      return actionContent;
    }
    if (isEmpty(mbql)) {
        actionContent.content = "This MBQL query has errors: " + explanation;
        return actionContent;
    }

    if (mbql) {
        const table_ids = getSourceTableIds(mbql);
        await updateMBEntities(table_ids)
    }

    const finCard = {
        type: "question",
        visualization_settings: {},
        display: "table",
        dataset_query: {
            database: dbID,
            type: "query",
            query: mbql
        }
    };

    const metabaseState = this.app as App<MetabaseAppState>;
    const pageType = metabaseState.useStore().getState().toolContext?.pageType as MetabasePageType;
    if (pageType === 'mbql') {
      // # Ensure you're in mbql editor mode
      await RPCs.dispatchMetabaseAction('metabase/qb/SET_UI_CONTROLS', {
        queryBuilderMode: "notebook",
      });
      await RPCs.dispatchMetabaseAction('metabase/qb/UPDATE_QUESTION', {card: finCard});
      return await this._executeMBQLQueryInternal()
    }
    else if ((pageType === 'dashboard') || (pageType === 'unknown')) {
        return await this.runMBQLQuery({mbql, dbID});
    }
  }

  @Action({
    labelRunning: "Constructs the MBQL query",
    labelDone: "MBQL built",
    labelTask: "Built MBQL query",
    description: "Constructs the MBQL query in the GUI editor",
    renderBody: ({ mbql, explanation }: { mbql: any, explanation: string }) => {
        if (isEmpty(mbql)) {
            return {text: "This MBQL query has errors", code: null, language: "markdown"}
        }
      return {text: explanation, code: JSON.stringify(mbql), language: "json"}
    }
  })
  async ExecuteMBQLClient({ mbql, explanation }: { mbql: any, explanation: string }) {
    const actionContent: BlankMessageContent = {
        type: "BLANK",
    };
    const state = (await this.app.getState()) as MetabaseAppStateMBQLEditor;
    const dbID = state?.selectedDatabaseInfo?.id as number
    if (!dbID) {
      actionContent.content = "No database selected";
      return actionContent;
    }
    if (isEmpty(mbql)) {
        actionContent.content = "This MBQL query has errors: " + explanation;
        return actionContent;
    }

    if (mbql) {
        const table_ids = getSourceTableIds(mbql);
        await updateMBEntities(table_ids)
    }

    // In mbql, we check each final string and if it starts with mxfield- then we replace it with the fieldRef by json parsing
    // @ts-ignore
    const replaceMBQL = (mbql: any) => {
        if (typeof mbql === 'string') {
            if (mbql.startsWith('mxfield-')) {
                try {
                    const fieldRef = JSON.parse(mbql.slice(8));
                    return fieldRef;
                } catch (error) {
                    console.error("Failed to parse fieldRef from MBQL string:", mbql, error);
                    return mbql; // return original string if parsing fails
                }
            }
            return mbql; // return original string if it doesn't start with mxfield-
        } else if (Array.isArray(mbql)) {
            return mbql.map(replaceMBQL); // recursively replace in arrays
        } else if (typeof mbql === 'object' && mbql !== null) {
            const newObj: any = {};
            for (const key in mbql) {
                newObj[key] = replaceMBQL(mbql[key]); // recursively replace in objects
            }
            return newObj;
        }
        return mbql; // return as is for other types
    }
    mbql = replaceMBQL(mbql);
    const finCard = {
        type: "question",
        visualization_settings: {},
        display: "table",
        dataset_query: {
            database: dbID,
            type: "query",
            query: mbql
        }
    };

    const metabaseState = this.app as App<MetabaseAppState>;
    const pageType = metabaseState.useStore().getState().toolContext?.pageType as MetabasePageType;
    if (pageType === 'mbql') {
      // # Ensure you're in mbql editor mode
      await RPCs.dispatchMetabaseAction('metabase/qb/SET_UI_CONTROLS', {
        queryBuilderMode: "notebook",
      });
    }
    await RPCs.dispatchMetabaseAction('metabase/qb/UPDATE_QUESTION', {card: finCard});
    return await this._executeMBQLQueryInternal()
  }

  @Action({
    labelRunning: "Plotting data",
    labelDone: "Plotted data",
    labelTask: "Setup Metabase visualization",
    description: "Plots the data in the SQL editor using the given visualization type.",
    renderBody: ({ visualization_type, dimensions, metrics}: { visualization_type: VisualizationType, dimensions?: string[], metrics?: string[] }) => {
    //   return {text: `plot: ${visualization_type}`, code: JSON.stringify({dimensions, metrics})}
      return {text: null, code: JSON.stringify({dimensions, metrics})}
    }
  })
  async setVisualizationType({
    visualization_type,
    dimensions,
    metrics
  }: {
    visualization_type: VisualizationType,
    dimensions?: string[],
    metrics?: string[]
  }) {
    const actionContent: BlankMessageContent = { type: "BLANK" };
    // vivek: ensure the visualization type is capital case
    function toCapitalCase(str: string) {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }
    visualization_type = toCapitalCase(visualization_type);    
    if (primaryVisualizationTypes.includes(visualization_type) && (dimensions && metrics)) {
      const currentCard = await getCurrentCard() as Card;
      if (currentCard) {
        currentCard.display = toLowerVisualizationType(visualization_type);
        const visualization_settings = {
          "graph.dimensions": dimensions,
          "graph.metrics": metrics,
          "graph.series_order_dimension": null,
          "graph.series_order": null
        }
        currentCard.visualization_settings = visualization_settings;
      }
      try {
        await RPCs.dispatchMetabaseAction('metabase/qb/UPDATE_QUESTION', { card: currentCard });
        await RPCs.dispatchMetabaseAction('metabase/qb/UPDATE_URL');
        actionContent.content = await this.checkVisualizationInvalid();
        return actionContent;
      }
      catch (error) {
        console.error("Failed to update visualization type, falling back to UI method", error);
      }
    }
    const state = (await this.app.getState()) as MetabaseAppStateSQLEditor;
    if (state.visualizationType === visualization_type.toLowerCase()) {
      actionContent.content = `Visualization type "${visualization_type}" already set`;
      return actionContent;
    }
    if (state.visualizationSettingsStatus == "closed") {
      await this.uClick({ query: "vizualization_button" });
    }

    const query = `${visualization_type}_button`;
    await this.uClick({ query });
    await this.uClick({ query: "vizualization_button" });
    actionContent.content = await this.checkVisualizationInvalid();
    return actionContent;
  }

  @Action({
    labelRunning: "Retrieving table schemas",
    labelDone: "Analyzed tables",
    description: "Retrieves the schemas of the specified tables by their ids in the database.",
    renderBody: ({ids}: { ids: number[] }, _: any, result: BlankMessageContent) => {
      let content = []
      try {
        content = JSON.parse(result.content || "[]");
        content = content.map((table: any) => table.name)
      } catch (error) {
        content = []
      }
      const code = isEmpty(content) ? `No tables found for ids: ${ids.join(', ')}` : `Tables found for ids: ${content.join(', ')}`
      return {text: null, code, language: 'markdown'}
    }
  })
  async getTableSchemasById({ ids }: { ids: number[] }) {
    const actionContent: BlankMessageContent = { type: "BLANK" };
    // need to fetch schemas
    const tablesPromises = ids.map(id => getTableData(id));
    const tables = await Promise.all(tablesPromises);
    const tableSchemasContent = JSON.stringify(tables);
    actionContent.content = tableSchemasContent;
    return actionContent;
  }

  @Action({
    labelRunning: "Searching for tables",
    labelDone: "Found tables",
    description: "Searches for tables in the database based on the query.",
    renderBody: ({ query }: { query: string }, _: any, result: BlankMessageContent) => {
      let searchResults = []
      try {
        searchResults = JSON.parse(result.content || "[]")
      } catch (error) {
        searchResults = []
      }
      const results = searchResults.map((table: any) => table.name).join(', ')
      const code = isEmpty(results) ? `No tables found for '${query}'` : `Search results for '${query}': ${results}` 
      return {text: null, code, language: "markdown"}
    }
  })
  async searchTableSchemas({ query }: { query: string }) {
    const actionContent: BlankMessageContent = { type: "BLANK" };
    const selectedDbId = await getSelectedDbId();
    if (!selectedDbId) {
      actionContent.content = "No database selected";
      return actionContent;
    }
    const userInfo = await getUserInfo()
    if (isEmpty(userInfo)) {
      actionContent.content = "Failed to load user info";
      return actionContent;
    }
    const searchResults = await searchTables(userInfo.id, selectedDbId, query);
    const tableIds = map(searchResults, (table) => table.id);
    const tablesPromises = tableIds.slice(0, 20).map(id => getTableData(id));
    const tableSchemas = await Promise.all(tablesPromises);
    tableSchemas.forEach((tableInfo, index) => {
      if (tableInfo != "missing") {
        tableInfo.count = searchResults[index].count;
      }
    })
    actionContent.content = JSON.stringify(tableSchemas);
    return actionContent
  }

  @Action({
    labelRunning: "Getting dashcard details",
    labelDone: "Retrieved dashcards",
    description: "Gets more detailed information about the specified dashcards, including the visualization type, the query, and the data displayed.",
    renderBody: ({ids}: { ids: number[] }) => {
      return {text: null, code: JSON.stringify(ids)}
    }
  })
  async getDashcardDetailsById({ ids }: { ids: number[] }) {
    let actionContent: BlankMessageContent = { type: "BLANK" };
    const dashboardMetabaseState: DashboardMetabaseState =
      await getDashboardState() as DashboardMetabaseState;

    if (
      !dashboardMetabaseState ||
      !dashboardMetabaseState.dashboards ||
      !dashboardMetabaseState.dashboardId
    ) {
      actionContent.content = "Could not get dashboard info";
      return actionContent;
    }
    const { dashboardId, dashboards, dashcards, dashcardData } =
      dashboardMetabaseState;
    const { ordered_cards, dashcards: dashcardsList } =
      dashboards?.[dashboardId];
    const cardsList = ordered_cards ? ordered_cards : dashcardsList;
    let cardDetailsList: DashcardDetails[] = [];
    if (cardsList) {
      for (const cardId of ids) {
        const card = dashcards?.[cardId];
        // dashcardData[cardId] seems to always have one key, so just get the first one
        const cardData = Object.values(_.get(dashcardData, [cardId]))?.[0];
        if (card && cardData) {
          let cardDetails: DashcardDetails = {
            id: cardId,
            data: {
              rows: cardData?.data?.rows,
              cols: cardData?.data?.cols?.map((col) => col?.display_name),
            },
            description: card?.card?.description,
            visualizationType: card?.card?.display,
          };
          // remove descritiption if it's null or undefined
          if (!cardDetails.description) {
            delete cardDetails.description;
          }
          cardDetailsList.push(cardDetails);
        }
      }
      actionContent.content = truncate(JSON.stringify(cardDetailsList), {
        length: 5000,
      });
    } else if (cardsList == undefined || cardsList == null) {
      console.warn("No cards found for dashboard. Maybe wrong key?");
      actionContent.content = "No cards found for dashboard";
    }
    return actionContent;
  }
  
  @Action({
    labelRunning: "Selecting database",
    labelDone: "Selected database",
    description: "Selects the specified database.",
    renderBody: ({database}: { database: string }) => {
      return {text: null, code: JSON.stringify({database})}
    }
  })
  async selectDatabase({ database }: { database: string }) {
    let actionContent: BlankMessageContent = { type: "BLANK" };
    const state = (await this.app.getState()) as MetabaseAppStateSQLEditor;
    if (state.selectedDatabaseInfo?.name === database) {
      actionContent.content = "Database already selected";
      return actionContent;
    }
    const querySelectorMap = await this.app.getQuerySelectorMap();
    let options = await RPCs.queryDOMSingle({ selector: querySelectorMap["select_database_dropdown_options"], attrs: ['text'] });
    // if no options, need to click on dropdown selector first
    if (options.length === 0) {
      await this.uClick({ query: "select_database_dropdown" });
      options = await RPCs.queryDOMSingle({ selector: querySelectorMap["select_database_dropdown_options"], attrs: ['text'] });
    }
    const optionsTexts = options.map((option: any) => option?.attrs?.text); 
    // find the index of the database in the options
    const index = optionsTexts.findIndex((optionText: string) => optionText?.toLowerCase() === database?.toLowerCase());
    if (index === -1) {
      actionContent.content = `Database "${database}" not found`;
      return actionContent;
    }
    await this.uClick({ query: `select_database_dropdown_options`, index });
    actionContent.content = "Database selected";
    return actionContent;
  }

  @Action({
    labelRunning: "SQL from Semantic Layer",
    labelDone: "Semantic Query Retrieved",
    description: "Gets the SQL query from the semantic query.",
    renderBody: ({ reasoning, measures, dimensions, filters, timeDimensions, order }: { reasoning: string, measures: string[], dimensions: string[], filters: SemanticFilter[], timeDimensions: TimeDimension[], order: Order[] }) => {
      return {text: null, code: JSON.stringify({measures, dimensions, filters, reasoning, timeDimensions, order})}
    }
  })
  async getSemanticQuery({ reasoning, measures, dimensions, filters, timeDimensions, order }: { reasoning: string, measures: string[], dimensions: string[], filters: SemanticFilter[], timeDimensions: TimeDimension[], order: Order[] }) {
    const actionContent: DefaultMessageContent = {
      type: "DEFAULT",
      text: reasoning,
      images: [],
    };
    const semanticQuery = {
      measures,
      dimensions,
      filters,
      timeDimensions,
      order
    }
    RPCs.applySemanticQuery(semanticQuery);
    await this.applySemanticQuery();
    return actionContent;
  }

  @Action({
    labelRunning: "Asking for clarification",
    labelDone: "Questions answered",
    labelTask: "Clarifying questions answered",
    description: "Asks the user clarifying questions to better understand their request.",
    renderBody: ({ questions }: { questions: Array<{question: string, options: string[]}> }) => {
      const questionsText = questions.map((q, i) => `${i + 1}. ${q.question}\n   Options: ${q.options.join(', ')}`).join('\n')
      return { text: null, code: null }
    }
  })
  async Clarify({ questions }: { questions: Array<{question: string, options: string[]}> }) {
    const answers = await RPCs.clarify({ questions });
    
    const actionContent: DefaultMessageContent = {
      type: "DEFAULT",
      text: `Questions answered:\n${answers.map((a, i) => `${i + 1}. ${a.question}\n   Answer: ${a.answer}`).join('\n')}`,
      images: [],
    };
    
    return actionContent;
  }

  @Action({
    labelRunning: "Thinking",
    labelDone: "Formulated a plan",
    labelTask: "Formulated a plan",
    description: "Formulates a plan to answer the user's request.",
    renderBody: ({ thoughts }: { thoughts: string }) => {
      return { text: null, code: null }
    }
  })
  async Think({ thoughts }: { thoughts: string[] }) {
    const actionContent: DefaultMessageContent = {
      type: "DEFAULT",
      text: `Thinking:\n${thoughts}`,
      images: [],
    };
    return actionContent;
  }

  // 1. Internal actions -------------------------------------------
  async checkVisualizationInvalid() {
    let returnMessage = "Visualization set successfully";
    const querySelectorMap = await this.app.getQuerySelectorMap();
    // @vivek: Check if the visualization is invalid. Need to actually solve the issue
    const tableViz = await RPCs.queryDOMMap({
        'metabase_52': {selector: querySelectorMap["table_root"]},
        'metabase_54': {selector: querySelectorMap["table_root2"]},
    });
    // check if any of the tableViz keys have a length > 0
    if (Object.values(tableViz).some((v) => v.length > 0)) {
      await this.uClick({ query: "switch_to_viz" });
    }
    
    const vizInvalid = await RPCs.queryDOMMap({
        'metabase_52': {selector: querySelectorMap["viz_invalid"]},
        'metabase_54': {selector: querySelectorMap["viz_invalid2"]},
    })
    if (Object.values(vizInvalid).some((v) => v.length > 0)) {
      await this.uClick({ query: "switch_to_data" });
      returnMessage = "Error while setting visualization type. Set to table view instead.";
    }
    return returnMessage
  }

  async toggleSQLEditor(mode: "open" | "close") {
    if (mode === "open") {
      await this.uDblClick({ query: "expand_editor" });
    } else if (mode === "close") {
      await this.uDblClick({ query: "contract_editor" });
    }
    return;
  }
  async _executeSQLQueryInternal(_type = "markdown") {
    const actionContent: BlankMessageContent = {
      type: "BLANK",
    };
    await this.uClick({ query: "run_query" });
    await waitForQueryExecution();
    const [currentCard, currentParameterValues] = await Promise.all([
      getCurrentCard(),
      getParameterValues()
    ]) as [Card, ParameterValues];
    const cardState = `<CURRENT_CARD>${JSON.stringify(currentCard)}</CURRENT_CARD>`
    const parameterValuesState = `<CURRENT_PARAMETER_VALUES>${JSON.stringify(currentParameterValues)}</CURRENT_PARAMETER_VALUES>`;
    const sqlErrorMessage = await getSqlErrorMessage();
    if (sqlErrorMessage) {
      actionContent.content = `${cardState}${parameterValuesState}<ERROR>${sqlErrorMessage}</ERROR>`;
    } else {
      // table output
      let output = ""
      output = await getAndFormatOutputTable(_type);
      actionContent.content = `${cardState}${parameterValuesState}<OUTPUT>${output}</OUTPUT>`;
    }
    return actionContent;
  }
  async _executeMBQLQueryInternal(_type = "markdown") {
    const actionContent: BlankMessageContent = {
      type: "BLANK",
    };
    await this.uClick({ query: "mbql_run" });
    await waitForQueryExecution();
    const sqlErrorMessage = await getSqlErrorMessage();
    if (sqlErrorMessage) {
      actionContent.content = `<ERROR>${sqlErrorMessage}</ERROR>`;
    } else {
      // table output
      let tableOutput = ""
      tableOutput = await getAndFormatOutputTable(_type);
      actionContent.content = tableOutput;
    }
    return actionContent;
  }
  async applySemanticQuery() {
    const state = (await this.app.getState()) as MetabaseSemanticQueryAppState;
    const fetchData = async () => {
      if ((state.currentSemanticQuery.measures.length === 0) && (state.currentSemanticQuery.dimensions.length === 0)) {
        return "";
      }
      const payload = {
        ...state.currentSemanticQuery,
        dialect: state.dialect,
        layer: state.currentSemanticLayer,
      }
      const response = await axios.post(SEMANTIC_QUERY_API, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const data = await response.data
      const query = data.query
      return query
    }
    try{
      const query = await fetchData();
      return await this.updateSQLQuery({ sql: query, executeImmediately: true, ctes: [] });
    }
    catch(error){
      console.error("Failed to get query from semantic layer", error)
      return;
    }
    
  }

  // 2. Deprecated or unused actions -------------------------------
  async getOutputAsImage(){
    const img = await RPCs.getElementScreenCapture({selector: "//*[@data-testid='query-visualization-root']", type: "XPATH"});
    return img;
  }

  async getOutputAsText(){
    return;
  }

}