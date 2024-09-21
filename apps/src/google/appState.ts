import { AppController } from "../base/appController";
import { jupyterInternalState } from "../jupyter/defaultState";
import { DefaultAppState } from "../base/appState";
import { isEmpty } from "lodash";
import { RPCs } from "web";

interface GoogleState {}

export class GoogleAppState extends DefaultAppState<GoogleState> {
    initialInternalState = jupyterInternalState
    actionController = new GoogleController(this)

    public async setup() {
        // Subscribe & update internal state
        setInterval(async () => {
          try {
              const message = await RPCs.getPendingMessage()
              if (!isEmpty(message)) {
                  console.log("received message", message)
              }
          } catch (err){

          }
      }, 1000)
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