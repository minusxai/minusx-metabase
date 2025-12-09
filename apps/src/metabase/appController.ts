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

import { getCardProp, MetabasePageType, setCardProp } from "./helpers/utils";

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
import { get, isEmpty, map, sample, truncate } from "lodash";
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
  CardV2,
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
import { fetchTableMetadata, getSQLFromMBQL } from "./helpers/metabaseAPI";
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
    labelRunning: "Updating SQL query with parameters",
    labelDone: "Updated query with parameters",
    description: "Updates the SQL query in the Metabase SQL editor with explicit template tags and parameters.",
    renderBody: ({ sql, template_tags, parameters }: { sql: string, template_tags: object, parameters: any[] }, appState: MetabaseAppStateSQLEditor) => {
      const sqlQuery = appState?.sqlQuery
      return {text: `Using ${Object.keys(template_tags || {}).length} template tags and ${(parameters || []).length} parameters`, code: sql, oldCode: sqlQuery}
    }
  })
  async updateSQLQueryWithParams({ sql, template_tags = {}, parameters = [], parameterValues = [], executeImmediately = true, _type = "markdown", ctes = [], skipConfirmation=false }: { sql: string, template_tags?: object, parameters?: any[], parameterValues?: Array<{id: string, value: string[]}>, executeImmediately?: boolean, _type?: string, ctes: CTE[], skipConfirmation?: boolean }) {
    const actionContent: BlankMessageContent = {
      type: "BLANK",
    };
    const state = (await this.app.getState()) as MetabaseAppStateSQLEditor;
    const oldContent = state.currentCard?.dataset_query?.native?.query || state.sqlQuery || ''
    const isContentUnchanged = sql == oldContent
    const override = skipConfirmation || isContentUnchanged || !oldContent ? false : undefined
    const { userApproved, userFeedback } = await RPCs.getUserConfirmation({content: sql, contentTitle: "Approve SQL Query?", oldContent, override});
    if (!userApproved) {
      actionContent.content = '<UserCancelled>Reason: ' + (userFeedback === '' ?  'No particular reason given' : userFeedback) + '</UserCancelled>';
      return actionContent;
    }
    if (state.sqlEditorState == "closed") {
      await this.toggleSQLEditor("open");
    }
    const currentCard = await getCurrentCard() as Card | CardV2;
    
    // Get existing template tags and parameters to merge with provided ones
    const allSnippetsDict = await getSnippets() as MetabaseStateSnippetsDict;
    const allTemplateTags = getAllTemplateTagsInQuery(sql, allSnippetsDict)
    // const existingTemplateTags = currentCard.dataset_query.native['template-tags'] || {};
    const existingTemplateTags = getCardProp(currentCard, 'template-tags')
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
    
    setCardProp(currentCard, 'template-tags', mergedTemplateTags)
    currentCard.parameters = mergedParameters;
    setCardProp(currentCard, 'query', sql)
    setCardProp(currentCard, 'native', sql)
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
    renderBody: ({ sql, explanation="", template_tags={}, parameters=[], parameterValues=[] }: { sql: string, explanation: string, template_tags?: object, parameters?: any[], parameterValues?: Array<{id: string, value: string[]}> }, appState: MetabaseAppStateSQLEditor | MetabaseAppStateSQLEditorV2) => {
      const currentQuery = appState?.currentCard?.dataset_query?.native?.query || appState?.sqlQuery || "";
      const currentTemplateTags = appState?.currentCard?.dataset_query?.native?.['template-tags'] || {};
      const currentParameters = appState?.currentCard?.parameters || [];
      return {text: null, code: sql, oldCode: currentQuery, language: "sql", extraArgs: {old: {template_tags: currentTemplateTags, parameters: currentParameters}, new: {template_tags, parameters, parameterValues}}}
    }
  })
  async ExecuteQueryV2({ sql, _ctes = [], explanation = "", template_tags={}, parameters=[], parameterValues=[], skipConfirmation=false }: { sql: string, _ctes?: CTE[], explanation?: string, template_tags?: object, parameters?: any[], parameterValues?: Array<{id: string, value: string[]}>, skipConfirmation?: boolean }) {
    return await this.ExecuteQuery({ sql, _ctes, explanation, template_tags, parameters, parameterValues, skipConfirmation });
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
  async ExecuteQuery({ sql, _ctes = [], explanation = "", template_tags={}, parameters=[], parameterValues=[], skipConfirmation=false }: { sql: string, _ctes?: CTE[], explanation?: string, template_tags?: object, parameters?: any[], parameterValues?: Array<{id: string, value: string[]}>, skipConfirmation?: boolean }) {
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
        return await this.updateSQLQueryWithParams({ sql, template_tags, parameters, parameterValues, executeImmediately: true, _type: "markdown", ctes: _ctes, skipConfirmation });
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
    renderBody: ({ sql_edits, template_tags={}, parameters=[], parameterValues=[] }: { sql_edits: SQLEdits, template_tags?: object, parameters?: any[], parameterValues?: Array<{id: string, value: string[]}> }, appState: MetabaseAppStateSQLEditor | MetabaseAppStateSQLEditorV2) => {
      const currentQuery = appState?.currentCard?.dataset_query?.native?.query || appState?.sqlQuery || "";
      const currentTemplateTags = appState?.currentCard?.dataset_query?.native?.['template-tags'] || {};
      const currentParameters = appState?.currentCard?.parameters || [];
      const newQuery = applySQLEdits(currentQuery, sql_edits);
      return {text: null, code: newQuery, oldCode: currentQuery, language: "sql", extraArgs: {old: {template_tags: currentTemplateTags, parameters: currentParameters}, new: {template_tags, parameters, parameterValues}}}
    }
  })
  async EditAndExecuteQueryV2({ sql_edits, _ctes = [], explanation = "", template_tags={}, parameters=[], parameterValues=[] }: { sql_edits: SQLEdits, _ctes?: CTE[], explanation?: string, template_tags?: object, parameters?: any[], parameterValues?: Array<{id: string, value: string[]}> }) {
    return await this.EditAndExecuteQuery({ sql_edits, _ctes, explanation, template_tags, parameters, parameterValues });
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
    labelRunning: "Constructs the MBQL query",
    labelDone: "MBQL built",
    labelTask: "Built MBQL query",
    description: "Constructs the MBQL query in the GUI editor",
    renderBody: ({ mbql, explanation="" }: { mbql: any, explanation: string }) => {
        if (isEmpty(mbql)) {
            return {text: "This MBQL query has errors", code: null, language: "markdown"}
        }
      return {text: null, code: JSON.stringify(mbql), language: "json"}
    }
  })
  async ExecuteMBQLQueryV2({ mbql, explanation }: { mbql: any, explanation: string }) {
    if (typeof(mbql) == 'string') {
      try {
        mbql = JSON.parse(mbql)
      } catch (err) {
        console.log('Failed to parse string mbql', mbql)
      }
    }
    return await this.ExecuteMBQLQuery({ mbql, explanation });
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
    console.log('Executing MBQL', mbql)


    try {
        const sqlQuery = await getSQLFromMBQL({
            database: dbID,
            type: 'query',
            query: mbql,
        });
        // console.log("Derived SQL query is", sqlQuery);
    } catch (error) {
        // console.log('Full error is', error)
        let errorMessage = error?.response?.message || error.message || 'Unknown error';
        try {
            let errorDetails = {}
            if (errorMessage.includes('DETAILS:')) {
                errorDetails = JSON.parse(errorMessage.split('DETAILS:')[1]);
                errorMessage = errorDetails?.message?? 'Error deriving SQL from MBQL';
            }
        } catch (e) {
            console.error('Error while processing error message:', e);
        }
        actionContent.content = `<ERROR>Error with the MBQL: ${errorMessage}</ERROR>`;
        return actionContent;
    }

    if (mbql) {
        const table_ids = getSourceTableIds(mbql);
        await updateMBEntities(table_ids)
    }

    

    const metabaseState = this.app as App<MetabaseAppState>;
    const pageType = metabaseState.useStore().getState().toolContext?.pageType as MetabasePageType;
    if (pageType === 'mbql') {
        const finCard = {
          type: "question",
          visualization_settings: {},
          display: "table",
          dataset_query: {
              database: dbID,
              type: "query",
              query: mbql,
          }
      };
      const currentCard = await getCurrentCard() as Card;
      const nativeCard = getCardProp(currentCard)
      if (get(nativeCard, 'lib/type')) {
        finCard['dataset_query'] = {
            database: dbID,
            "lib/type": "mbql/query",
            "stages": [mbql]
        }
      }
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
    labelRunning: "Asking for clarification",
    labelDone: "Questions answered",
    labelTask: "Clarifying questions answered",
    description: "Asks the user clarifying questions to better understand their request.",
    renderBody: ({ questions }: { questions: Array<{question: string, options: string[]}> }) => {
      const questionsText = questions.map((q, i) => `${i + 1}. ${q.question}\n   Options: ${get(q, 'options', []).join(', ')}`).join('\n')
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

  // 2. Deprecated or unused actions -------------------------------
  async getOutputAsImage(){
    const img = await RPCs.getElementScreenCapture({selector: "//*[@data-testid='query-visualization-root']", type: "XPATH"});
    return img;
  }

  async getOutputAsText(){
    return;
  }

}