import { AppController } from "../base/appController";
import { jupyterInternalState } from "../jupyter/defaultState";
import { DefaultAppState } from "../base/appState";

interface GoogleState {}

export class GoogleAppState extends DefaultAppState<GoogleState> {
    initialInternalState = jupyterInternalState
    actionController = new GoogleController(this)

    public async setup() {
        // Subscribe & update internal state
    }

    public async getState() {
        // DOM to state
        return {}
    }
}

export class GoogleController extends AppController<GoogleState> {
  async writeContent(content: string) {
    console.log('Writing content', content)
    return;
  }
}