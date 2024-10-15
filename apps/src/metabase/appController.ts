import { BlankMessageContent } from "web/types";
import { RPCs } from "web";
import { AppController, Action } from "../base/appController";
import {
  MetabaseAppState,
  MetabaseAppStateSQLEditor,
} from "./helpers/DOMToState";
import {
  getAndFormatOutputTable,
  getSqlErrorMessage,
  waitForQueryExecution,
} from "./helpers/operations";
import {
  extractTableInfo,
  getSelectedDbId,
} from "./helpers/getDatabaseSchema";
import { get, map, set, truncate } from "lodash";
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
  ParameterValues
 } from "./helpers/types";

 // not using this right now, but might be useful later?
const getVariablesInQuery = (query: string): string[] => {
  const variablesInQuery: string[] = [];
  const regex = /{{(\w+)}}/g;
  let match;
  while ((match = regex.exec(query)) !== null) {
    variablesInQuery.push(match[1]);
  }
  return variablesInQuery;
}

export class MetabaseController extends AppController<MetabaseAppState> {
  // 0. Exposed actions --------------------------------------------
  @Action({
    labelRunning: "Updating SQL query",
    labelDone: "Updated query",
    description: "Updates the SQL query in the Metabase SQL editor and executes it.",
    renderBody: ({ sql }: { sql: string }) => {
      return {text: null, code: sql}
    }
  })
  async updateSQLQuery({ sql, executeImmediately = true }: { sql: string, executeImmediately?: boolean }) {
    const actionContent: BlankMessageContent = {
      type: "BLANK",
    };
    const userApproved = await RPCs.getUserConfirmation({content: sql, contentTitle: "Update SQL query?"});
    if (!userApproved) {
      throw new Error("Action (and subsequent plan) cancelled!");
    }
    const state = (await this.app.getState()) as MetabaseAppStateSQLEditor;
    if (state.sqlEditorState == "closed") {
      await this.toggleSQLEditor("open");
    }
    const currentCard = await RPCs.getMetabaseState("qb.card") as Card;
    // const currentVariables = getVariablesInQuery(currentCard.dataset_query.native.query);
    // const variablesInQuery = getVariablesInQuery(sql);
    await this.uDblClick({ query: "sql_query" });
    await this.setValue({ query: "sql_query", value: sql });

    
    if (executeImmediately) {
      return await this._executeSQLQueryInternal();
    } else {
      actionContent.content = "OK";
      return actionContent;
    }
  }

  @Action({
    labelRunning: "Executing SQL Query",
    labelDone: "Executed SQL query",
    description: "Executes the SQL query in the Metabase SQL editor.",
    renderBody: () => {
      return {text: null, code: null}
    }
  })
  async executeSQLQuery() {
    const userApproved = await RPCs.getUserConfirmation({content: "Execute query", contentTitle: "Accept below action?"});
    if (!userApproved) {
      throw new Error("Action (and subsequent plan) cancelled!");
    }
    return await this._executeSQLQueryInternal();
  }

  @Action({
    labelRunning: "Updating SQL Variable",
    labelDone: "Updated SQL Variable",
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
    const currentCard = await RPCs.getMetabaseState("qb.card") as Card;
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
          let variableInfo = currentCard.dataset_query.native['template-tags'][variable];
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
          console.log("currentCard.parameters", currentCard.parameters);
          for (let i = 0; i < currentCard.parameters.length; i++) {
            const parameter = currentCard.parameters[i];
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
    labelRunning: "Plotting data",
    labelDone: "Plotted data",
    description: "Plots the data in the SQL editor using the given visualization type.",
    renderBody: ({ visualization_type, dimensions, metrics}: { visualization_type: VisualizationType, dimensions?: string[], metrics?: string[] }) => {
      return {text: `plot: ${visualization_type}`, code: JSON.stringify({dimensions, metrics})}
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
    // vivek: ensure the visualization type is capital case
    function toCapitalCase(str: string) {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }
    visualization_type = toCapitalCase(visualization_type);    
    console.log("Setting visualization type to", visualization_type, dimensions, metrics);
    if (primaryVisualizationTypes.includes(visualization_type) && (dimensions && metrics)) {
      const currentCard = await RPCs.getMetabaseState("qb.card") as Card;
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
        return
      }
      catch (error) {
        console.error("Failed to update visualization type, falling back to UI method", error);
      }
    }
    const state = (await this.app.getState()) as MetabaseAppStateSQLEditor;
    if (state.visualizationType === visualization_type.toLowerCase()) {
      return;
    }
    if (state.visualizationSettingsStatus == "closed") {
      await this.uClick({ query: "vizualization_button" });
    }

    const querySelectorMap = await this.app.getQuerySelectorMap();
    const query = `${visualization_type}_button`;
    await this.uClick({ query });
    await this.uClick({ query: "vizualization_button" });
    // @vivek: Check if the visualization is invalid. Need to actually solve the issue
    const vizInvalid = await RPCs.queryDOMSingle({
      selector: querySelectorMap["viz_invalid"],
    });
    if (vizInvalid.length > 0) {
      await this.uClick({ query: "switch_to_data" });
    }
    return;
  }

  @Action({
    labelRunning: "Retrieving table schemas",
    labelDone: "Analyzed tables",
    description: "Retrieves the schemas of the specified tables by their ids in the database.",
    renderBody: ({ids}: { ids: number[] }) => {
      return {text: null, code: JSON.stringify(ids)}
    }
  })
  async getTableSchemasById({ ids }: { ids: number[] }) {
    const actionContent: BlankMessageContent = { type: "BLANK" };
    // need to fetch schemas
    const tablesPromises = ids.map(async (id) => {
      const resp: any = await RPCs.fetchData(
        `/api/table/${id}/query_metadata`,
        "GET"
      );
      if (!resp) {
        console.warn("Failed to get table schema", id, resp);
        return "missing";
      }
      return extractTableInfo(resp, true);
    });
    const tables = await Promise.all(tablesPromises);
    const tableSchemasContent = JSON.stringify(tables);
    actionContent.content = tableSchemasContent;
    return actionContent;
  }

  @Action({
    labelRunning: "Searching for tables",
    labelDone: "Found tables",
    description: "Searches for tables in the database based on the query.",
    renderBody: ({ query }: { query: string }) => {
      return {text: null, code: query}
    }
  })
  async searchTableSchemas({ query }: { query: string }) {
    const actionContent: BlankMessageContent = { type: "BLANK" };
    const selectedDbId = await getSelectedDbId();
    if (!selectedDbId) {
      actionContent.content = "No database selected";
      return actionContent;
    }
    const resp: any = await RPCs.fetchData(
      `/api/search?models=table&table_db_id=${selectedDbId}&filters_items_in_personal_collection=only&q=${query}`,
      "GET"
    );
    // only get top 20 tables
    const ids = map(get(resp, "data", []), (table: any) => table.id).slice(
      0,
      20
    );
    const content = await this.getTableSchemasById({ ids });
    return content;
  }

  @Action({
    labelRunning: "Searching for previous SQL queries",
    labelDone: "Retrieved queries",
    description: "Searches for previous SQL queries using the specified words.",
    renderBody: ({words}: { words: string[] }) => {
      return {text: null, code: JSON.stringify(words)}
    }
  })
  async searchPreviousSQLQueries({ words }: { words: string[] }) {
    interface SearchApiResponse {
      total: number
      data: {
        description: string | null
        name: string
        dataset_query: {
          native: {
            query: string
          }
        }
      }[]
    }
    const actionContent: BlankMessageContent = { type: "BLANK" };
    const selectedDbId = await getSelectedDbId();
    const endpoint = `/api/search?table_db_id=${selectedDbId}&models=card&q=${words.join('+')}`;
    let queries: {
      name: string
      description?: string
      query: string
    }[] = []
    try {
      const response = await RPCs.fetchData(endpoint, 'GET') as SearchApiResponse;
      // need to get name, description, and query from each card and put into a json obj
      queries = (response.data || []).map((card: any) => {
        const query = get(card, 'dataset_query.native.query')
        const name = get(card, 'name')
        const description = get(card, 'description')
        return {
          name,
          // only keep description if it's not null
          ...(description != null && { description }),
          query
        }
      }).filter(i => !!i)
      // keep only the first 10 queries. TODO: pagination?
      .slice(0, 10);
    } catch (error) {
      queries = [];
    }
    // truncate to 5k chars and add a ...[truncated] if needed
    actionContent.content = JSON.stringify(queries, null, 2)
    if (actionContent.content.length > 5000) {
      actionContent.content = actionContent.content.slice(0, 5000) + '...[truncated]';
    }
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
      await RPCs.getMetabaseState("dashboard") as DashboardMetabaseState;

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


  // 1. Internal actions -------------------------------------------
  async toggleSQLEditor(mode: "open" | "close") {
    if (mode === "open") {
      await this.uDblClick({ query: "expand_editor" });
    } else if (mode === "close") {
      await this.uDblClick({ query: "contract_editor" });
    }
    return;
  }
  async _executeSQLQueryInternal() {
    const actionContent: BlankMessageContent = {
      type: "BLANK",
    };
    await this.uClick({ query: "run_query" });
    await waitForQueryExecution();
    const sqlErrorMessage = await getSqlErrorMessage();
    if (sqlErrorMessage) {
      actionContent.content = sqlErrorMessage;
    } else {
      // table output
      const tableOutput = await getAndFormatOutputTable();
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
