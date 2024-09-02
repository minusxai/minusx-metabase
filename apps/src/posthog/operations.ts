import { RPCs } from "web"; 
import { querySelectorMap } from "./querySelectorMap";
import { sleep } from "../common/utils";
export const waitForQueryExecution = async () => {
 // TODO
}

export const getSqlErrorMessage = async () => {
  // TODO
  return undefined;
}

export const getAndFormatOutputTable = async () => {
  // TODO
  return "";
}

export const waitForRunButton = async () => {
  while (true) {
    const isDisabled = await RPCs.queryDOMSingle({
      selector: querySelectorMap["disabled_run_button"],
    });
    if (isDisabled.length == 0) {
      return;
    }
    await sleep(100);
  }
}