import { addNativeEventListener, RPCs, configs, renderString, getParsedIframeInfo, unsubscribe, captureEvent, GLOBAL_EVENTS } from "web";
import { DefaultAppState } from "../base/appState";
import { MetabaseController } from "./appController";
import { DB_INFO_DEFAULT, metabaseInternalState } from "./defaultState";
import { convertDOMtoState, MetabaseAppState, MetabasePageType } from "./helpers/DOMToState";
import { isDashboardPageUrl } from "./helpers/dashboard/util";
import { isMBQLPageUrl } from "./helpers/mbql/utils";
import { cloneDeep, get, isEmpty, memoize, times } from "lodash";
import { DOMQueryMapResponse } from "extension/types";
import { subscribe, setInstructions, dispatch } from "web";
import { getRelevantTablesForSelectedDb } from "./helpers/getDatabaseSchema";
import { getDatabaseTablesAndModelsWithoutFields, getDatabaseInfo } from "./helpers/metabaseAPIHelpers";
import { querySelectorMap } from "./helpers/querySelectorMap";
import { getSelectedDbId } from "./helpers/metabaseStateAPI";
import { abortable, createRunner, handlePromise } from "../common/utils";
import { subscribeMB } from "./helpers/stateSubscriptions";

const runStoreTasks = createRunner()
const explainSQLTasks = createRunner()
const highlightTasks = createRunner()

const getBaseStyles = () => `
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

const getHighlightStyles = () => `
  /* Highlight button styles */
  .cm-selectionLayer {
    z-index: 2 !important;
  }
  div.cm-selectionLayer > div.cm-selectionBackground {
    background: rgba(100, 180, 255, 0.4) !important;
    pointer-events: none !important;
  }
  .cm-selectionLayer span {
    display: none;
  }
  .cm-selectionLayer span:nth-child(1) {
    display: block;
  }
  .ace_marker-layer {
    z-index: 2 !important;
    pointer-events: auto !important;
  }
  .ace_marker-layer:empty {
    display: none !important;
  }
  div.ace_marker-layer > div.ace_selection {
    background: rgba(100, 180, 255, 0.4) !important;
  }
  
  div.ace_marker-layer > div.ace_selected-word {
    background: rgba(100, 180, 255, 0.4) !important;
  }

  .ace_layer > .ace_selection > .minusx_highlight_button {
    display: none;
  }

  .ace_layer > .ace_selection:last-of-type > .minusx_highlight_button {
    display: block;
  }

  .cm-selectionLayer > .cm-selectionBackground > .minusx_highlight_button {
    display: none;
  }

  .cm-selectionLayer > .cm-selectionBackground:last-of-type > .minusx_highlight_button {
    display: block;
  }

  #explain-snippet {
    background-color: #519ee4;
    color: white;
    cursor: pointer;
    pointer-events: auto !important;
  }
  #modify-snippet {
    background-color: #519ee4;
    color: white;
    cursor: pointer;
    pointer-events: auto !important;
  }
`;

export class MetabaseState extends DefaultAppState<MetabaseAppState> {
  initialInternalState = metabaseInternalState;
  actionController = new MetabaseController(this);

  public async setup() {
    const state = this.useStore().getState();
    const whitelistQuery = state.whitelistQuery
    RPCs.getMetabaseState('settings.values').then(settings => {
      const payload = {
        version: get(settings, 'last-acknowledged-version', 'unknown'),
        adminEmail: get(settings, 'admin-email', 'unknown'),
        siteUrl: get(settings, 'site-url', 'unknown'),
        latestVersion: get(settings, 'version-info.latest.version', 'unknown'),
        latestPatched: get(settings, 'version-info.latest.patch', 'unknown'),
      }
      captureEvent(GLOBAL_EVENTS.metabase_settings, payload);
      console.log('Metabase settings:', payload);
    }).catch((e) => {
      console.error('Failed to get Metabase settings:', e);
    })
    if (!whitelistQuery) {
      return
    }
    // Example of subscribing to Metabase state
    // subscribeMB('qb.card', async ({value}) => {
    //   console.log('Current qb card value:', value);
    // })
    subscribe(whitelistQuery, async ({elements, url}) => {
      const getState = this.useStore().getState
      const dbId = await getSelectedDbId();
      let toolEnabledNew = shouldEnable(elements, url);
      if (dbId === undefined || dbId === null) {
        toolEnabledNew = {
          value: false,
          reason: "Unable to detect correct database. Please navigate to a SQL query page to enable MinusX."
        }
      }
      const pageType: MetabasePageType = determineMetabasePageType(elements, url);
      getState().update((oldState) => ({
        ...oldState,
        isEnabled: toolEnabledNew,
        toolContext: {
          ...oldState.toolContext,
          pageType,
          url
        }
      }));
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
            handlePromise(abortable(getRelevantTablesForSelectedDb(), isCancelled), "Failed to get relevant tables", []),
            handlePromise(abortable(getDatabaseTablesAndModelsWithoutFields(dbId), isCancelled), "Failed to get database info", DB_INFO_DEFAULT)
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

    const appSettings = await RPCs.getAppSettings()
    const enableHighlightHelpers = appSettings.enable_highlight_helpers

    if (enableHighlightHelpers) {
      const explainButtonJSON = {
      tag: 'div',
      attributes: {
        style: 'position: absolute; bottom: -10px; z-index: 5;',
        class: 'minusx_highlight_button'
      },
      children: [{
        tag: 'button',
        attributes: {
          style: 'position: absolute; opacity: 1; font-weight: bold; padding: 5px 10px; border-radius: 5px; cursor: pointer; border-radius: 5px; width: 100px;',
          id: 'explain-snippet'
        },
        children: ['🔎 Explain']
      }]
    }

    const modifyButtonJSON = {
      tag: 'div',
      attributes: {
        style: 'position: absolute; bottom: -10px; z-index: 5;',
        class: 'minusx_highlight_button'
      },
      children: [{
        tag: 'button',
        attributes: {
          style: 'position: absolute; opacity: 1; font-weight: bold; padding: 5px 10px; border-radius: 5px; cursor: pointer; border-radius: 5px; width: 100px; left: 105px;',
          id: 'modify-snippet'
        },
        children: ['🪄 Modify']
      }]
    }

      await RPCs.addNativeElements({
        type: 'CSS',
        selector: '.cm-selectionBackground:last-of-type',
      }, explainButtonJSON);
      await RPCs.addNativeElements({
        type: 'CSS',
        selector: '.ace_selection:last-of-type',
      }, explainButtonJSON);

      await RPCs.addNativeElements({
        type: 'CSS',
        selector: '.cm-selectionBackground:last-of-type',
      }, modifyButtonJSON);
      await RPCs.addNativeElements({
        type: 'CSS',
        selector: '.ace_selection:last-of-type',
      }, modifyButtonJSON);

      let _currentlySelectedText = '';
      await subscribe({
        editor: {
        selector: {
          type: "CSS",
          selector: ".minusx_highlight_button"
        },
        attrs: ["text"],
      },
      }, ({elements, url}) => {
        highlightTasks(async (taskStatus) => {
          const selectedText = await RPCs.getSelectedTextOnEditor() as string;
          if (selectedText && !isEmpty(selectedText)) {
            _currentlySelectedText = selectedText;
          }
        })
      })


      addNativeEventListener({
        type: "CSS",
        selector: 'button#explain-snippet'
      }, async (event) => {
        const selectedText = _currentlySelectedText.trim();
        RPCs.toggleMinusXRoot('closed', false)
        RPCs.addUserMessage({
          content: {
            type: "DEFAULT",
            text: `explain the highlighted SQL snippet: 
\`\`\`
${selectedText}
\`\`\`
`, images: []}});
      }, ['mousedown'])
      
      addNativeEventListener({
        type: "CSS",
        selector: 'button#modify-snippet'
      }, async (event) => {
          const selectedText = _currentlySelectedText.trim();
          RPCs.toggleMinusXRoot('closed', false)
          dispatch(setInstructions(`Modify only this snippet of the SQL query: 
\`\`\`
${selectedText}
\`\`\`
---
Here's what I need modified:

`));
      }, ['mousedown'])
    }
    
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
      children: [getBaseStyles() + (enableHighlightHelpers ? getHighlightStyles() : '')]
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
      // @ts-ignore
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


function determineMetabasePageType(elements: DOMQueryMapResponse, url: string): MetabasePageType {
    try {
      const hash = new URL(url).hash.slice(1);
      const parsedHash = JSON.parse(atob(hash));
      if (get(parsedHash, 'dataset_query.type') == 'query') {
        return 'mbql'
      }
    } catch (e) {}
    if (isDashboardPageUrl(url)) {
        return 'dashboard';
    }
    if (isMBQLPageUrl(url)) {
        return 'mbql';
    }
    if (elements.editor && !isEmpty(elements.editor)) {
        return 'sql';
    }
    if (elements.mbql && (!isEmpty(elements.mbql) || !isEmpty(elements.mbql_embedded))) {
        return 'mbql';
    }
    return 'unknown';
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
  const MBQLURL = new URL(url).origin + '/question/notebook';
  const reason = `To use MinusX on Metabase, head over to the [SQL query](${SQLQueryURL}), [Question Builder](${MBQLURL}) or any of your Dashboard pages!`
  const metabasePageType = determineMetabasePageType(elements, url);
  if (metabasePageType === 'unknown') {
    return {
        value: false,
        reason: reason
    };
  }
  return {
    value: true,
    reason: "",
  }
}
