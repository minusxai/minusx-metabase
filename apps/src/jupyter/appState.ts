import { DefaultAppState } from "../base/appState";
import { JupyterController } from "./appController";
import { jupyterInternalState } from "./defaultState";
import { convertDOMtoState, JupyterNotebookState } from "./helpers/DOMToState";
import { subscribe } from "web";

export class JupyterState extends DefaultAppState<JupyterNotebookState> {
    initialInternalState = jupyterInternalState
    actionController = new JupyterController(this)

    public async setup() {
        // Subscribe & update internal state
        // try to getState and see if it times out or throws an error. if so, disable rendering
        // but until when? i guess use the subscribe to whitelistQuery functionality
        const state = this.useStore().getState();
        const whitelistQuery = state.whitelistQuery
        if (!whitelistQuery) {
            return
        }
        subscribe(whitelistQuery, ({ elements, url }) => {
            const state = this.useStore().getState();
            this.shouldEnable().then(toolEnabledNew => {
                state.update({
                    isEnabled: toolEnabledNew,
                });
            })
        })
    }

    public async getState() {
        // DOM to state
        return convertDOMtoState()
    }
    async shouldEnable() {
        try {
            const state = await this.getState()
        } catch (err) {
            return {
                value: false,
                reason: "Please upgrade to Jupyter Notebook v4.0 or higher to use MinusX",
            };
        }
        return {
            value: true,
            reason: "",
        };
    }

}


