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
        // for jupyter version checking, just do a getState once here and see if it
        // errors out. kind of hacky
        try {
            await this.getState()
        } catch (err) {
            const state = this.useStore().getState();
            state.update({
                isEnabled: {
                    value: false,
                    reason: "Please upgrade to Jupyter Notebook v4.0 or higher to use MinusX",
                },
            });
        }
    }
    public async getState() {
        // DOM to state
        return convertDOMtoState()
    }
}


