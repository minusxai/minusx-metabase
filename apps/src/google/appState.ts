import { RPCs } from "web";
import { AppController } from "../base/appController";
import { DefaultAppState } from "../base/appState";
import { googleSheetInternalState } from "./googleSheetInternalState";
import { GoogleState } from "web/types";
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
        return await RPCs.readActiveSpreadsheet()
    }
}

export class GoogleController extends AppController<GoogleState> {
  async writeCode(code: string) {
    console.log('Writing code', code)
    return;
  }
}