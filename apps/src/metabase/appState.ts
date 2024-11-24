import { addNativeEventListener, RPCs } from "web";
import { DefaultAppState } from "../base/appState";
import { MetabaseController } from "./appController";
import { metabaseInternalState } from "./defaultState";
import { convertDOMtoState, MetabaseAppState } from "./helpers/DOMToState";
import { isDashboardPage } from "./helpers/dashboard/util";
import { isEmpty } from "lodash";
import { DOMQueryMapResponse } from "extension/types";
import { subscribe } from "web";
import { getRelevantTablesForSelectedDb } from "./helpers/getDatabaseSchema";
import { querySelectorMap } from "./helpers/querySelectorMap";

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
    })
    // heat up cache
    await getRelevantTablesForSelectedDb('');

    // Listen to clicks on Error Message
    // const errorMessageSelector = querySelectorMap['error_message']
    // const uniqueID = await RPCs.addNativeElements(errorMessageSelector, {
    //   tag: 'button',
    //   attributes: {
    //     class: 'Button Button--primary',
    //     style: 'width: 100px; height: 50px; background-color: black; color: white;font-size: 20px;',
    //   },
    //   children: ['Report Error']
    // })
    // addNativeEventListener({
    //   type: "CSS",
    //   selector: `#${uniqueID}`,
    // }, (event) => {
    //   console.log('Fix It button event', event)
    // })
  }

  public async getState(): Promise<MetabaseAppState> {
    return await convertDOMtoState();
  }

  public async getPlannerConfig() {
    const url = await RPCs.queryURL();
    const internalState = this.useStore().getState()
    // Change depending on dashboard or SQL
    if (isDashboardPage(url)) {
      return internalState.llmConfigs.dashboard;
    }
    return internalState.llmConfigs.default;
  }
}

function shouldEnable(elements: DOMQueryMapResponse, url: string) {
  if (isDashboardPage(url)) {
    return {
      value: true,
      reason: "",
    };
  }
  if (isEmpty(elements.editor)) {
    return {
      value: false,
      reason:
        "To enable MinusX on Metabase, head over to a dashboard or the SQL query page!",
    };
  }
  return {
    value: true,
    reason: "",
  };
}
