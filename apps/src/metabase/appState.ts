import { addNativeEventListener, RPCs, configs, renderString, getParsedIframeInfo, unsubscribe, captureEvent, GLOBAL_EVENTS, processAllMetadata } from "web";
import { DefaultAppState } from "../base/appState";
import { MetabaseController } from "./appController";
import { DB_INFO_DEFAULT, metabaseInternalState } from "./defaultState";
import { convertDOMtoState, MetabaseAppState } from "./helpers/DOMToState";
import { cloneDeep, get, isEmpty, memoize, times } from "lodash";
import type { DOMQueryMapResponse, HTMLJSONNode } from "extension/types";
import { subscribe, setInstructions, dispatch } from "web";
import { getRelevantTablesForSelectedDb } from "./helpers/getDatabaseSchema";
import { getDatabaseTablesAndModelsWithoutFields, getDatabaseInfo, getDatabaseTablesModelsCardsWithoutFields } from "./helpers/metabaseAPIHelpers";
import { querySelectorMap } from "./helpers/querySelectorMap";
import { getSelectedDbId } from "./helpers/metabaseStateAPI";
import { abortable, createRunner, handlePromise } from "../common/utils";
import { subscribeMB } from "./helpers/stateSubscriptions";
import { MetabasePageType, determineMetabasePageType } from "./helpers/utils";

const runStoreTasks = createRunner()
const explainSQLTasks = createRunner()
const highlightTasks = createRunner()

/**
 * Create intro banner HTML structure
 */
async function createIntroBannerElement(options: {
  title?: string;
  description?: string;
  className?: string;
  metrics?: string[];
  dimensions?: string[];
  supportedQuestions?: string[];
  unsupportedQuestions?: string[];
  zIndex?: number;
} = {}): Promise<HTMLJSONNode> {
  const {
    title = 'Welcome to MinusX!',
    description = 'What would you like to analyze today?',
    className = 'minusx-intro-summary-banner',
    metrics = [],
    dimensions = [],
    supportedQuestions = [],
    unsupportedQuestions = [],
    zIndex = 240,
  } = options;
  // Helper function to create tag elements
  const createTags = (items: string[], color: string) => items.map(item => ({
    tag: 'span',
    attributes: {
      style: `display: inline-block; background-color: ${color}; color: white; padding: 6px 12px; margin: 4px; border-radius: 16px; font-size: 13px; font-weight: 500;`,
      class: ''
    },
    children: [item]
  }));

  // Check if dbId is defined
  const dbId = await getSelectedDbId();
  const showAskButton = dbId !== undefined && dbId !== null;

  // Create question list items with event listeners
  const questionListItems: HTMLJSONNode[] = await Promise.all(supportedQuestions.map(async (q, index) => {
    const buttonId = `minusx-intro-ask-btn-${Date.now()}-${index}`;

    const listItemChildren: (string | HTMLJSONNode)[] = [
      {
        tag: 'span',
        attributes: { style: '', class: '' },
        children: [`• ${q}`]
      }
    ];

    // Only add the Ask button if dbId is defined
    if (showAskButton) {
      // Set up event listener for this specific button
      addNativeEventListener({
        type: "CSS",
        selector: `#${buttonId}`,
      }, async () => {
        console.log('Question button clicked:', q);
        RPCs.createNewThreadIfNeeded();
        RPCs.toggleMinusXRoot('closed', false);
        RPCs.addUserMessage({
          content: {
            type: "DEFAULT",
            text: q,
            images: []
          },
        });
      }, ['click']);

      listItemChildren.push({
        tag: 'button',
        attributes: {
          style: 'background-color: #16a085; color: white; border: none; border-radius: 5px; font-size: 14px; cursor: pointer; margin-left: 8px; display: flex; align-items: center; justify-content: center; padding: 2px 5px;',
          id: buttonId,
          class: `minusx-intro-ask-btn`
        },
        children: ['Ask 🔍']
      });
    }

    const listItem: HTMLJSONNode = {
      tag: 'li',
      attributes: { style: 'margin-bottom: 12px; display: flex; align-items: center;', class: '' },
      children: listItemChildren
    };
    return listItem;
  }));


  // Build children array conditionally
  const children: (string | HTMLJSONNode)[] = [
    // Title
    {
      tag: 'div',
      attributes: {
        style: 'color: #222222; font-size: 24px; font-weight: bold; margin-bottom: 15px;',
        class: ''
      },
      children: [title]
    },
    // Description
    {
      tag: 'div',
      attributes: {
        style: 'color: #222222; font-size: 16px; line-height: 1.5; margin-bottom: 25px;',
        class: ''
      },
      children: [description]
    }
  ];

  // Add metrics and dimensions section only if at least one has content
  if (metrics.length > 0 || dimensions.length > 0) {
    const metricsAndDimensionsChildren: HTMLJSONNode[] = [];

    if (metrics.length > 0) {
      metricsAndDimensionsChildren.push({
        tag: 'div',
        attributes: {
          style: 'background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);',
          class: ''
        },
        children: [
          {
            tag: 'h3',
            attributes: {
              style: 'color: #333; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;',
              class: ''
            },
            children: ['Common Metrics']
          },
          {
            tag: 'div',
            attributes: {
              style: 'display: flex; flex-wrap: wrap; gap: 4px;',
              class: ''
            },
            children: createTags(metrics, '#3498db')
          }
        ]
      });
    }

    if (dimensions.length > 0) {
      metricsAndDimensionsChildren.push({
        tag: 'div',
        attributes: {
          style: 'background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);',
          class: ''
        },
        children: [
          {
            tag: 'h3',
            attributes: {
              style: 'color: #333; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;',
              class: ''
            },
            children: ['Common Dimensions']
          },
          {
            tag: 'div',
            attributes: {
              style: 'display: flex; flex-wrap: wrap; gap: 4px;',
              class: ''
            },
            children: createTags(dimensions, '#e74c3c')
          }
        ]
      });
    }

    children.push({
      tag: 'div',
      attributes: {
        style: `display: grid; grid-template-columns: ${metricsAndDimensionsChildren.length === 2 ? '1fr 1fr' : '1fr'}; gap: 20px; margin-bottom: 20px;`,
        class: ''
      },
      children: metricsAndDimensionsChildren
    });
  }

  // Add supported questions section only if there are questions
  if (supportedQuestions.length > 0) {
    children.push({
      tag: 'div',
      attributes: {
        style: 'background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);',
        class: ''
      },
      children: [
        {
          tag: 'h3',
          attributes: {
            style: 'color: #333; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;',
            class: ''
          },
          children: ['✅ Here are all the things you can ask']
        },
        {
          tag: 'ul',
          attributes: {
            style: 'color: #555; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 0; list-style-type: none;',
            class: ''
          },
          children: questionListItems
        }
      ]
    });
  }

  // Add unsupported questions section only if there are questions
  if (unsupportedQuestions.length > 0) {
    children.push({
      tag: 'div',
      attributes: {
        style: 'background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);',
        class: ''
      },
      children: [
        {
          tag: 'h3',
          attributes: {
            style: 'color: #333; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;',
            class: ''
          },
          children: ['🚧 Questions not supported (yet)']
        },
        {
          tag: 'ul',
          attributes: {
            style: 'color: #999; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px; list-style-type: disc;',
            class: ''
          },
          children: unsupportedQuestions.map(q => ({
            tag: 'li',
            attributes: { style: 'margin-bottom: 8px;', class: '' },
            children: [q]
          }))
        }
      ]
    });
  }

  // Sign-off Section (absolutely positioned at bottom)
  const signOffChildren: (string | HTMLJSONNode)[] = [
    {
      tag: 'div',
      attributes: {
        style: 'color: #555; font-size: 16px; font-weight: 800; margin-bottom: 10px;',
        class: ''
      },
      children: ['Happy Analysis!']
    }
  ];

  // Create container for buttons
  const buttonContainer: HTMLJSONNode[] = [];
    buttonContainer.push({
      tag: 'a',
      attributes: {
        style: 'background-color: #3498db; color: white; border: none; padding: 8px 16px; border-radius: 5px; font-size: 14px; font-weight: bold; cursor: pointer; text-decoration: none; display: inline-block; margin-right: 10px;',
        class: 'minusx-intro-docs-btn',
        href: 'https://docs.minusx.ai',
        target: '_blank'
      },
      children: ['Docs →']
    });

  if (buttonContainer.length > 0) {
    signOffChildren.push({
      tag: 'div',
      attributes: {
        style: 'display: flex; justify-content: center; align-items: center;',
        class: ''
      },
      children: buttonContainer
    });
  }

  children.push({
    tag: 'div',
    attributes: {
      style: 'position: absolute; bottom: 0; left: 0; right: 0; text-align: center; padding: 20px 30px; background-color: #eee; border-top: 1px solid #ddd; border-radius: 0 0 10px 10px;',
      class: ''
    },
    children: signOffChildren
  });

  return {
    tag: 'div',
    attributes: {
      style: `position: absolute; top: 50px; left: 5%; width: 90%; height: 90%; z-index: ${zIndex}; background-color: #eee; padding: 30px 30px 80px 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); min-width: 300px; overflow-y: auto;`,
      class: className
    },
    children
  }
}

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
  @keyframes minusx-pulse-ring {
    0% {
      transform: scale(1);
      opacity: 0.8;
    }
    100% {
      transform: scale(2);
      opacity: 0;
    }
  }
  .minusx_style_notification_badge {
    color: white;
    top: -10px;
    position: absolute;
    background-color: #e74c3c;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    cursor: pointer;
    display: none;
    z-index: 1;
  }
  .minusx_style_notification_badge::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-color: #e74c3c;
    z-index: -1;
    animation: minusx-pulse-ring 2s ease-out infinite;
  }
  .minusx_style_absolute_container {
    position: absolute;
  }
  div[class$="Modal-root"] {
    position: absolute;
    top: 0;
    left: 0;
  }
  div.emotion-Modal-root {
    position: absolute;
    top: 0;
    left: 0;
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

function minifyDbs(allDBs: any) {
  return Object.values(allDBs || {}).map((db: any) => ({ id: db.id, name: db.name }))
}

async function fetchAllDBsIfEmpty() {
  let minifiedDBs = minifyDbs(await RPCs.getMetabaseState('entities.databases'))
  let _tries = 0
  while (isEmpty(minifiedDBs)) {
    await new Promise(resolve => setTimeout(resolve, 500))
    minifiedDBs = minifyDbs(await RPCs.getMetabaseState('entities.databases'))
    if (_tries++ > 50) {
      break
    }
  }
  return minifiedDBs
}

export class MetabaseState extends DefaultAppState<MetabaseAppState> {
  initialInternalState = metabaseInternalState;
  actionController = new MetabaseController(this);

  private async triggerMetabaseStateUpdate(url: string, elements: DOMQueryMapResponse) {
    const [queryType, dbId, allDBs] = await Promise.all([
      RPCs.getMetabaseState('qb.card.dataset_query.type') as Promise<string>,
      getSelectedDbId(),
      RPCs.getMetabaseState('entities.databases')
    ]);
    
    const getState = this.useStore().getState
    let minifiedDBs = minifyDbs(allDBs)
    if (isEmpty(minifiedDBs)) {
      minifiedDBs = await fetchAllDBsIfEmpty()
    }
    
    let toolEnabledNew = shouldEnable(elements, url);
    // if (dbId === undefined || dbId === null) {
    //   toolEnabledNew = {
    //     value: false,
    //     reason: "Unable to detect correct database. Please navigate to a SQL query page to enable MinusX."
    //   }
    // }
    const pageType: MetabasePageType = determineMetabasePageType(elements, url, queryType);
    getState().update((oldState) => ({
      ...oldState,
      isEnabled: toolEnabledNew,
      toolContext: {
        ...oldState.toolContext,
        pageType,
        url,
        allDBs: minifiedDBs
      }
    }));
    const currentToolContext = getState().toolContext
    const oldDbId = get(currentToolContext, 'dbId')
    if (dbId && dbId !== oldDbId) {
      getState().update((oldState) => ({
        ...oldState,
        toolContext: {
          ...oldState.toolContext,
          dbId,
        }
      }))
      await this.loadDatabaseData(dbId, oldDbId)
    }
  }

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
      await this.triggerMetabaseStateUpdate(url, elements)
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

    //   await RPCs.addNativeElements({
    //     type: 'CSS',
    //     selector: '.cm-selectionBackground:last-of-type',
    //   }, explainButtonJSON);
    //   await RPCs.addNativeElements({
    //     type: 'CSS',
    //     selector: '.ace_selection:last-of-type',
    //   }, explainButtonJSON);

    //   await RPCs.addNativeElements({
    //     type: 'CSS',
    //     selector: '.cm-selectionBackground:last-of-type',
    //   }, modifyButtonJSON);
    //   await RPCs.addNativeElements({
    //     type: 'CSS',
    //     selector: '.ace_selection:last-of-type',
    //   }, modifyButtonJSON);

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
        RPCs.createNewThreadIfNeeded();
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
          RPCs.createNewThreadIfNeeded();
          RPCs.toggleMinusXRoot('closed', false)
          dispatch(setInstructions(`Modify only this snippet of the SQL query as instructed. You have to incorporate the modified snippet into the original (current) query and return the full query. DO NOT change the rest of the query: 
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
    const isEmbedded = getParsedIframeInfo().isEmbedded as unknown === 'true'
    const uniqueID = await RPCs.addNativeElements(errorMessageSelector, {
      tag: 'button',
      attributes: {
        class: 'Button Button--primary minusx_style_error_button',
      },
      children: [(isEmbedded ? '✨ Fix with AI' : '✨ Fix with MinusX')]
    })
    addNativeEventListener({
      type: "CSS",
      selector: `#${uniqueID}`,
    }, (event) => {
      RPCs.createNewThreadIfNeeded();
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
        RPCs.createNewThreadIfNeeded();
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

    // Add sample styled div to intro-summary - Subscribe to detect when on home page
    // await subscribe({
    //   intro_page: {
    //     selector: querySelectorMap['intro_addon'],
    //     attrs: ['class']
    //   }
    // }, async ({elements}) => {
    //   const introExists = (get(elements, 'intro_page') || []).length > 0;
    //   if (!introExists) {
    //     const introSummarySelector = querySelectorMap['intro_summary']
    //     const bannerElement = await createIntroBannerElement();
    //     await RPCs.addNativeElements(
    //       introSummarySelector,
    //       bannerElement
    //     )
    //   }
    // })
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
    const currentDBId = this.useStore().getState().toolContext?.dbId || undefined;
    return await convertDOMtoState(currentDBId);
  }

  public async getPlannerConfig() {
    const internalState = this.useStore().getState()
    const appSettings = RPCs.getAppSettings()
    if(appSettings.semanticPlanner) {
      return internalState.llmConfigs.semanticQuery;
    }
    return internalState.llmConfigs.default;
  }

  public async triggerStateUpdate() {
    const url = await RPCs.queryURL();
    const elements = await RPCs.queryDOMMap(this.useStore().getState().whitelistQuery || {});
    return await this.triggerMetabaseStateUpdate(url, elements);
  }

  private async loadDatabaseData(dbId: number, oldDbId?: number) {
    const state = this.useStore();
    runStoreTasks(async (taskStatus) => {
      state.getState().update((oldState) => ({
        ...oldState,
        toolContext: {
          ...oldState.toolContext,
          loading: true
        }
      }))
      const isCancelled = () => taskStatus.status === 'cancelled';
      const [relevantTables, dbInfo] = await Promise.all([
        handlePromise(abortable(getRelevantTablesForSelectedDb(dbId), isCancelled), "Failed to get relevant tables", []),
        handlePromise(abortable(getDatabaseTablesModelsCardsWithoutFields(dbId), isCancelled), "Failed to get database info", DB_INFO_DEFAULT)
      ])
      state.getState().update((oldState) => ({
        ...oldState,
        toolContext: {
          ...oldState.toolContext,
          relevantTables,
          dbInfo,
          loading: false
        }
      }))
      // Perf caching
      if (!isCancelled() && dbId !== oldDbId) {
        console.log('Running perf caching')
        processAllMetadata(false, dbId)
        getDatabaseInfo(dbId)
      }
    })
  }

  public async manuallySelectDb(dbId: number) {
    const state = this.useStore();
    const currentDbId = state.getState().toolContext.dbId;

    state.getState().update((oldState) => ({
      ...oldState,
      toolContext: {
        ...oldState.toolContext,
        dbId
      }
    }));

    await this.loadDatabaseData(dbId, currentDbId);
  }

  /**
   * Update the intro banner content dynamically by replacing it with new content
   */
  public async updateIntroBanner(options: {
    title?: string;
    description?: string;
    className?: string;
    zIndex?: number;
    metrics?: string[];
    dimensions?: string[];
    supportedQuestions?: string[];
    unsupportedQuestions?: string[];
  } = {}) {
    try {
      const introSummarySelector = querySelectorMap['intro_summary']
      const bannerElement = await createIntroBannerElement(options);
      await RPCs.addNativeElements(
        introSummarySelector,
        bannerElement,
        "lastChild"
      )
      console.log('updateIntroBanner: banner added successfully');
    } catch (error) {
      console.error('updateIntroBanner: failed to update banner', error);
    }
  }
}


function shouldEnable(elements: DOMQueryMapResponse, url: string) {
  return {
    value: true,
    reason: "",
  }
}
