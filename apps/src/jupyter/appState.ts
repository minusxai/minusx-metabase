import { DefaultAppState } from "../base/appState";
import { JupyterController } from "./appController";
import { jupyterInternalState } from "./defaultState";
import { convertDOMtoState, JupyterNotebookState } from "./helpers/DOMToState";

export class JupyterState extends DefaultAppState<JupyterNotebookState> {
    initialInternalState = jupyterInternalState
    actionController = new JupyterController(this)

    public async setup() {
        // Subscribe & update internal state
    }

    public async getState() {
        // DOM to state
        return convertDOMtoState()
    }
}