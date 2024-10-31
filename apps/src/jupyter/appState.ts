import { DefaultAppState } from "../base/appState";
import { JupyterController } from "./appController";
import { jupyterInternalState } from "./defaultState";
import { convertDOMtoState, JupyterNotebookState } from "./helpers/DOMToState";
import { RPCs, subscribe } from "web";
import { querySelectorMap } from "./helpers/querySelectorMap";
import { pick } from "lodash";

export class JupyterState extends DefaultAppState<JupyterNotebookState> {
    initialInternalState = jupyterInternalState
    actionController = new JupyterController(this)

    public async setup() {
        // Subscribe & update internal state
        // for jupyter version checking, just do a getState once here and see if it
        // errors out. kind of hacky
        try {
            await this.getState()
            const state = this.useStore().getState();
            state.update({
                isEnabled: {
                    value: true,
                    reason: "",
                },
            });
        } catch (err) {
            const state = this.useStore().getState();
            state.update({
                isEnabled: {
                    value: false,
                    reason: "Please upgrade to Jupyter Notebook v7.0+ or JupyterLab v4.0+ to use MinusX",
                },
            });
            setTimeout(() => {
                this.setup()
            }, 1000)
        }
    }
    public async getState() {
        // DOM to state
        return convertDOMtoState()
    }

    public async getDiagnostics() {
        const jupyterDiagnostics = await RPCs.queryDOMSingle({
            selector: querySelectorMap.jupyter_config_data,
            attrs: ['text']
        });
        try {
            const jupyterConfigData = JSON.parse(jupyterDiagnostics[0].attrs.text);
            return pick(
                jupyterConfigData,
                ['appName', 'appNamespace', 'appUrl', 'appVersion', 'baseUrl', 'notebookVersion', 'exposeAppInBrowser']
            );
        } catch (err) {
            return {
                error: 'Error parsing jupyter config data'
            }
        }
    }
}


