import { addNativeEventListener, RPCs, configs, renderString } from "web";
import { DefaultAppState } from "../base/appState";
import { MetabaseController } from "./appController";
import { DB_INFO_DEFAULT, metabaseInternalState } from "./defaultState";
import { convertDOMtoState, isDashboardPage, MetabaseAppState } from "./helpers/DOMToState";
import { getDashboardPrimaryDbId, isDashboardPageUrl } from "./helpers/dashboard/util";
import { cloneDeep, get, isEmpty } from "lodash";
import { DOMQueryMapResponse } from "extension/types";
import { subscribe, GLOBAL_EVENTS, captureEvent } from "web";
import { getCleanedTopQueries, getRelevantTablesForSelectedDb, memoizedGetDatabaseTablesWithoutFields, getCardsCountSplitByType, memoizedFetchTableData, getTablesWithFields, memoizedGetDatabaseFields } from "./helpers/getDatabaseSchema";
import { querySelectorMap } from "./helpers/querySelectorMap";
import { getSelectedDbId } from "./helpers/getUserInfo";
import { createRunner, handlePromise } from "../common/utils";
import { getDashboardAppState } from "./helpers/dashboard/appState";

const runStoreTasks = createRunner()


export class MetabaseState extends DefaultAppState<MetabaseAppState> {
  initialInternalState = metabaseInternalState;
  actionController = new MetabaseController(this);

  public async setup() {
    const state = this.useStore().getState();
    const whitelistQuery = state.whitelistQuery
    if (!whitelistQuery) {
      return
    }
    subscribe(whitelistQuery, ({elements, url}) => {
      const state = this.useStore().getState();
      const toolEnabledNew = shouldEnable(elements, url);
      state.update({
        isEnabled: toolEnabledNew,
      });
      runStoreTasks(async () => {
        const pageType = isDashboardPageUrl(url) ? 'dashboard' : 'sql';
        const dbId = await getSelectedDbId();
        const currentToolContext = this.useStore().getState().toolContext
        const oldDbId = get(currentToolContext, 'dbId')
        const oldPageType = get(currentToolContext, 'pageType')
        if (oldPageType != pageType) {
          state.update({
            toolContext: {
              ...currentToolContext,
              pageType
            }
          })
        }
        if (dbId && dbId !== oldDbId) {
          const toolContext = state.toolContext
          state.update({
            toolContext: {
              ...toolContext,
              loading: true
            }
          })
          const [relevantTables, dbInfo] = await Promise.all([
            handlePromise(getRelevantTablesForSelectedDb(''), "Failed to get relevant tables", []),
            handlePromise(memoizedGetDatabaseTablesWithoutFields(dbId), "Failed to get database info", DB_INFO_DEFAULT)
          ])
          state.update({
            toolContext: {
              pageType,
              dbId,
              relevantTables,
              dbInfo,
              loading: false
            }
          })
        }
      })
    })
    // heat up cache
    const heatUpCache = async (times = 0) => {
      const filledTableInfo = await getTablesWithFields()
      if (isEmpty(filledTableInfo)) {
        setTimeout(() => heatUpCache(times+1), Math.pow(2, times) * 1000);
      }
    }
    heatUpCache();
    
    getCardsCountSplitByType().then(cardsCount => {
        captureEvent(GLOBAL_EVENTS.metabase_card_count, { cardsCount })
    });
    

    // Listen to clicks on Error Message
    const errorMessageSelector = querySelectorMap['error_message_head']
    const uniqueID = await RPCs.addNativeElements(errorMessageSelector, {
      tag: 'button',
      attributes: {
        class: 'Button Button--primary',
        style: 'background-color: #16a085; color: white; font-size: 15px; padding: 5px 10px; margin-left: 5px; border-radius: 5px; cursor: pointer;',
      },
      children: ['✨ Fix with MinusX']
    })
    addNativeEventListener({
      type: "CSS",
      selector: `#${uniqueID}`,
    }, (event) => {
      RPCs.toggleMinusXRoot('closed', false)
      RPCs.addUserMessage({
        content: {
          type: "DEFAULT",
          text: "Fix the error",
          images: []
        },
      });
    })
    // const entityMenuSelector = querySelectorMap['dashboard_header']
    // const entityMenuId = await RPCs.addNativeElements(entityMenuSelector, {
    //   tag: 'button',
    //   attributes: {
    //     class: 'Button Button--secondary',
    //     style: 'background-color: #16a085; color: white; font-size: 15px; padding: 5px 10px; margin-left: 5px; border-radius: 5px; cursor: pointer;',
    //     // style: 'background-color: #16a085; color: white; font-size: 15px; padding: 5px 10px; margin-left: 5px; border-radius: 5px; cursor: pointer;',
    //   },
    //   children: ['✨ Create Catalog from Dashboard']
    // }, 'firstChild')
  }

  public async getState(): Promise<MetabaseAppState> {
    return await convertDOMtoState();
  }

  public async getPlannerConfig() {
    const url = await RPCs.queryURL();
    const internalState = this.useStore().getState()
    // Change depending on dashboard or SQL
    // if (isDashboardPageUrl(url)) {
    //   return internalState.llmConfigs.dashboard;
    // }
    const appSettings = RPCs.getAppSettings()
    if(appSettings.semanticPlanner) {
      return internalState.llmConfigs.semanticQuery;
    }
    const defaultConfig = internalState.llmConfigs.default;
    if ('systemPrompt' in defaultConfig) {
      const dbId = await getSelectedDbId();
      let savedQueries: string[] = []
      if (dbId && appSettings.savedQueries) {
        savedQueries = await getCleanedTopQueries(dbId)
      }
      return {
        ...defaultConfig,
        systemPrompt: renderString(defaultConfig.systemPrompt, {
          savedQueries: savedQueries.join('\n--END_OF_QUERY\n')
        })
      }
    }
    return defaultConfig
  }
}

function shouldEnable(elements: DOMQueryMapResponse, url: string) {
  const hash = btoa(JSON.stringify({
        "dataset_query": {
            "database": null,
            "type": "native",
            "native": {
                "query": "",
                "template-tags": {}
            }
        },
        "display": "table",
        "parameters": [],
        "visualization_settings": {},
        "type": "question"
    }))
  const SQLQueryURL = new URL(url).origin + '/question#' + hash;
  const reason = `To enable MinusX on Metabase, head over to the SQL query [page](${SQLQueryURL})!`
  if (isDashboardPageUrl(url)) {
    return {
      value: true,
      reason: "",
    };
  }
  if (isEmpty(elements.editor)) {
    return {
      value: false,
      reason: reason
    };
  }
  return {
    value: true,
    reason: "",
  };
}
