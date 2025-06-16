import { addNativeEventListener, RPCs, configs, renderString, getParsedIframeInfo, unsubscribe } from "web";
import { DefaultAppState } from "../base/appState";
import { MetabaseController } from "./appController";
import { DB_INFO_DEFAULT, metabaseInternalState } from "./defaultState";
import { convertDOMtoState, MetabaseAppState } from "./helpers/DOMToState";
import { isDashboardPageUrl } from "./helpers/dashboard/util";
import { cloneDeep, get, isEmpty, memoize, times } from "lodash";
import { DOMQueryMapResponse } from "extension/types";
import { subscribe, GLOBAL_EVENTS, captureEvent } from "web";
import { getRelevantTablesForSelectedDb } from "./helpers/getDatabaseSchema";
import { getDatabaseTablesWithoutFields, getDatabaseInfo } from "./helpers/metabaseAPIHelpers";
import { querySelectorMap } from "./helpers/querySelectorMap";
import { getSelectedDbId } from "./helpers/metabaseStateAPI";
import { abortable, createRunner, handlePromise } from "../common/utils";
import { getTableData } from "../package";
const runStoreTasks = createRunner()
const explainSQLTasks = createRunner()

const metabaseStyles = `
  .minusx_style_error_button {
    background-color: #519ee4;
    color: white;
    font-size: 15px;
    padding: 5px 10px;
    margin-left: 5px;
    border-radius: 5px;
    cursor: pointer;
  }
  .minusx_style_explain_sql_button {
    background-color: #519ee4;
    color: white;
    padding: 5px 10px;
    margin-left: 5px;
    border-radius: 5px;
    cursor: pointer;
    display: inline-block;
  }
  .minusx_style_login_box {
    background-color: white;
    color: black;
    font-size: 15px;
    border-radius: 5px;
  }
  .minusx_style_notification_badge {
    color: white;
    top: -10px;
    position: absolute;
    background-color: red;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    cursor: pointer;
    display: none;
  }
  .minusx_style_absolute_container {
    position: absolute;
  }
`;

export class MetabaseState extends DefaultAppState<MetabaseAppState> {
  initialInternalState = metabaseInternalState;
  actionController = new MetabaseController(this);

  private async createStyles() {
    
  }

  public async setup() {
    const state = this.useStore().getState();
    const whitelistQuery = state.whitelistQuery
    if (!whitelistQuery) {
      return
    }
    subscribe(whitelistQuery, async ({elements, url}) => {
      const getState = this.useStore().getState
      const toolEnabledNew = shouldEnable(elements, url);
      const pageType = isDashboardPageUrl(url) ? 'dashboard' : 'sql';
      getState().update((oldState) => ({
        ...oldState,
        isEnabled: toolEnabledNew,
        toolContext: {
          ...oldState.toolContext,
          pageType
        }
      }));
      const dbId = await getSelectedDbId();
      const currentToolContext = getState().toolContext
      const oldDbId = get(currentToolContext, 'dbId')
      if (dbId && dbId !== oldDbId) {
        getState().update((oldState) => ({
          ...oldState,
          toolContext: {
            ...oldState.toolContext,
            dbId
          }
        }))
        runStoreTasks(async (taskStatus) => {
          state.update((oldState) => ({
            ...oldState,
            toolContext: {
              ...oldState.toolContext,
              loading: true
            }
          }))
          const isCancelled = () => taskStatus.status === 'cancelled';
          const [relevantTables, dbInfo] = await Promise.all([
            handlePromise(abortable(getRelevantTablesForSelectedDb(''), isCancelled), "Failed to get relevant tables", []),
            handlePromise(abortable(getDatabaseTablesWithoutFields(dbId), isCancelled), "Failed to get database info", DB_INFO_DEFAULT)
          ])
          state.update((oldState) => ({
            ...oldState,
            toolContext: {
              ...oldState.toolContext,
              relevantTables,
              dbInfo,
              loading: false
            }
          }))
          // Perf caching
          getDatabaseInfo(dbId)
        })
      }
    })
    
    // Listen to clicks on Error Message
    const nonceElement = await RPCs.queryDOMSingle({
      selector: {
        type: 'CSS',
        selector: '#_metabaseNonce'
      },
      attrs: ['text'],
    })
    const nonceValue = get(nonceElement, '0.attrs.text', '').trim().slice(1, -1)
    await RPCs.addNativeElements({
      type: 'CSS',
      selector: 'head',
    }, {
      tag: 'style',
      attributes: {
        class: 'minusx-metabase-styles',
        nonce: nonceValue,
      },
      children: [metabaseStyles]
    });
    const errorMessageSelector = querySelectorMap['error_message_head']
    const uniqueID = await RPCs.addNativeElements(errorMessageSelector, {
      tag: 'button',
      attributes: {
        class: 'Button Button--primary minusx_style_error_button',
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

    const explainSQLBtnCls = 'minusx-explain-sql-btn'

    const sqlExplainState = {
      display: false
    }

    await subscribe({
      editor: {
      selector: {
        type: "CSS",
        selector: ".ace_text-layer"
      },
      attrs: ["text"],
    },
    }, ({elements, url}) => {
      const elementText = get(elements, 'editor.0.attrs.text', '').trim();
      const shouldDisplay = elementText.length > 100
      explainSQLTasks(async (taskStatus) => {
        if (shouldDisplay && !sqlExplainState['display']) {
          await addExplainSQL() 
          await RPCs.uHighlight({
            type: "CSS",
            selector: `.${explainSQLBtnCls}`,
          }, 0, {
            display: 'inline-block',
          })
          sqlExplainState['display'] = true
        } else if (!shouldDisplay && sqlExplainState['display']) {
          await RPCs.uHighlight({
            type: "CSS",
            selector: `.${explainSQLBtnCls}`,
          }, 0, {
            display: 'none',
          })
          sqlExplainState['display'] = false
        }
      }) 
    })

    const addExplainSQL = memoize(async () => {
      const sqlSelector = querySelectorMap['native_query_top_bar']
      const uniqueIDSQL = await RPCs.addNativeElements(sqlSelector, {
        tag: 'button',
        attributes: {
          class: `Button Button--primary ${explainSQLBtnCls} minusx_style_explain_sql_button`,
        },
        children: ['🔍 Explain SQL with MinusX']
      })
      addNativeEventListener({
        type: "CSS",
        selector: `#${uniqueIDSQL}`,
      }, (event) => {
        RPCs.toggleMinusXRoot('closed', false)
        RPCs.addUserMessage({
          content: {
            type: "DEFAULT",
            text: "Explain the current SQL query",
            images: []
          },
        });
      }, ['mouseup']) 
    })

    const loginBoxSelector = querySelectorMap['login_box']
    const origin = getParsedIframeInfo().origin
    if (origin.includes('metabase.minusx.ai')) {
      await RPCs.addNativeElements(loginBoxSelector, {
        tag: 'pre',
        attributes: {
          class: 'Button Button--primary minusx_style_login_box',
        },
        children: ['Username: player01@minusx.ai', '\n', 'Password: player01']
      })
    }

    const childNotifs = times(10, i => ({
      tag: 'span',
      attributes: {
        style: `z-index: ${1000+i};`,
        class: `minusx-notification-${i + 1} minusx_style_notification_badge`,
      },
      children: [`${i + 1}`]
    }))
    await RPCs.addNativeElements({
      type: "CSS",
      selector: "#minusx-toggle"
    }, {
      tag: 'div',
      attributes: {
        class: 'minusx_style_absolute_container'
      },
      children: [{
        'tag': 'span',
        'attributes': {
          class: `minusx-notification-parent`
        },
        'children': childNotifs
      }]
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
    const internalState = this.useStore().getState()
    const appSettings = RPCs.getAppSettings()
    if(appSettings.semanticPlanner) {
      return internalState.llmConfigs.semanticQuery;
    }
    return internalState.llmConfigs.default;
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
