import { DefaultAppState } from "../base/appState";
import { memoizedGetCurrentProjectDatabaseSchema } from "./api";
import { PosthogController } from "./appController";
import { posthogInternalState } from "./defaultState";
import { PosthogAppState } from "./types";

export class PosthogState extends DefaultAppState<PosthogAppState> {
    initialInternalState = posthogInternalState
    actionController = new PosthogController(this)

    public async setup() {
        // Subscribe & update internal state
    }

    public async getState() {
        let relevantTablesFull = await memoizedGetCurrentProjectDatabaseSchema()
        return {
            relevantTables: relevantTablesFull.map((table) => ({
                id: table.id,
                name: table.name,
                ...(table.type == "data_warehouse" ? {schema:  table.schema?.name} : {}), 
            })),
            sqlQuery: "",
            outputTableMarkdown: "",
        }
    }
}