import { DefaultAppState } from "../base/appState";
import { memoizedGetCurrentProjectDatabaseSchema } from "./api";
import { PosthogController } from "./appController";
import { posthogInternalState } from "./defaultState";
import { getAndFormatOutputTable, getSqlQuery } from "./operations";
import { PosthogAppState } from "./types";
import { DOMQueryMapResponse } from "extension/types";
import { subscribe } from "web";
import { isEmpty } from "lodash";


export class PosthogState extends DefaultAppState<PosthogAppState> {
    initialInternalState = posthogInternalState
    actionController = new PosthogController(this)

    public async setup(isDev: boolean) {
        // Subscribe & update internal state
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
    }

    public async getState() {
        let relevantTablesFull = await memoizedGetCurrentProjectDatabaseSchema()
        let sqlQuery = await getSqlQuery();
        let outputTableMarkdown = await getAndFormatOutputTable();
        return {
            relevantTables: relevantTablesFull.map((table) => ({
                id: table.id,
                name: table.name,
                ...(table.type == "data_warehouse" ? {schema:  table.schema?.name} : {}), 
            })),
            sqlQuery,
            outputTableMarkdown, 
        }
    }
}


function shouldEnable(elements: DOMQueryMapResponse, url: string) {
    // check if url looks like this: https://{eu/us}.posthog.com/project/{projectId}/data-warehouse
    let regex = /https:\/\/([a-z]+)\.posthog\.com\/project\/([a-z0-9-]+)\/data-warehouse/;
    let match = url.match(regex);
    if (match) {
      return {
        value: true,
        reason: "",
      };
    }
    if (isEmpty(elements.editor)) {
      return {
        value: false,
        reason:
          "To enable MinusX on Posthog, head over to the data warehouse page or the SQL editor tab!",
      };
    }
    return {
      value: true,
      reason: "",
    };
  }
  