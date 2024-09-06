import { BlankMessageContent } from "web/types";
import { RPCs } from "web";
import { AppController } from "../base/appController";
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
import { get, map, truncate } from "lodash";
import {
  DashboardMetabaseState,
  DashcardDetails,
} from "./helpers/dashboard/types";
import _ from "lodash";

export class MetabaseController extends AppController<MetabaseAppState> {
  async toggleSQLEditor(mode: "open" | "close") {
    if (mode === "open") {
      await this.uDblClick({ query: "expand_editor" });
    } else if (mode === "close") {
      await this.uDblClick({ query: "contract_editor" });
    }
    return;
  }

  async updateSQLQueryAndExecute({ sql }: { sql: string }) {
    const actionContent: BlankMessageContent = {
      type: "BLANK",
    };
    const state = (await this.app.getState()) as MetabaseAppStateSQLEditor;
    if (state.sqlEditorState == "closed") {
      await this.toggleSQLEditor("open");
    }
    await this.uDblClick({ query: "sql_query" });
    await this.setValue({ query: "sql_query", value: sql });
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

  async setVisualizationType({
    visualization_type,
  }: {
    visualization_type: string;
  }) {
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

  async searchPreviousSQLQueries({ words }: { words: string[] }) {
    const actionContent: BlankMessageContent = { type: "BLANK" };
    const endpoint = `/api/search?models=card&q=${words.join('+')}`;
    let queries = []
    try {
      const response = await RPCs.fetchData(endpoint, 'GET');
      queries = map(response.data || [], (card: any) => get(card, 'dataset_query.native.query')).filter(i => !!i).slice(0, 10);
      queries = queries.map((query: string) => query.length >= 1000 ? query.slice(0, 1000) + '...' : query);
    } catch (error) {
      queries = [];
    }
    actionContent.content = queries.join(';\n')
    return actionContent
  }

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

  async getOutputAsImage(){
    const img = await RPCs.getElementScreenCapture({selector: "//*[@data-testid='query-visualization-root']", type: "XPATH"});
    return img;
  }

  async getOutputAsText(){
    return;
  }

}
