import { RPCs } from "web";
import { AppController, Action } from "../base/appController";
import { DefaultAppState } from "../base/appState";
import { googleSheetInternalState } from "./googleSheetInternalState";
import { BlankMessageContent, GoogleState } from "web/types";
// import { isEmpty } from "lodash";
// import { RPCs } from "web";

export class GoogleAppState extends DefaultAppState<GoogleState> {
    initialInternalState = googleSheetInternalState
    actionController = new GoogleController(this)

    public async setup() {
      // Subscribe & update internal state
      // setInterval(async () => {
      //   try {
      //       const message = await RPCs.getPendingMessage()
      //       if (!isEmpty(message)) {
      //           console.log("received message", message)
      //       }
      //   } catch (err){

      //   }
      // }, 1000)
    }

    public async getState() {
        // DOM to state
        return await RPCs.gsheetGetState()
    }
}

export class GoogleController extends AppController<GoogleState> {
  @Action({
    labelRunning: "Running AppScript",
    labelDone: "Sheet Actions",
    description: "Runs AppScript code in the Google Sheets",
    renderBody: ({ code }: { code: string }) => {
      return {text: null, code: code}
    }
  })
  async runAppsScriptCode(code: string) {
    if (typeof code === 'object') {
      code = code.code as string
    }
    console.log('Writing code', code)
    let content: string = ''
    try {
      content = await RPCs.gsheetEvaluate(code) as string
    } catch (err) {
      content = err?.message || 'Error running code'
    }
    console.log('Output is', content)
    const actionContent: BlankMessageContent = {
      type: "BLANK",
      content 
    };
    console.log("Apps script output is", actionContent);
    return actionContent;
  }
}