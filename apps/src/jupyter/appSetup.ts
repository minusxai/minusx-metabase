import { get } from "lodash";
import { AppSetup } from "../base/appSetup";
import { jupyterFingerprintMatcher } from "./fingerprint";
import { initObserveJupyterApp } from "./jupyterObserver";

export class JupyterSetup extends AppSetup {
  fingerprintMatcher = jupyterFingerprintMatcher;

  async setup(extensionConfigs: Promise<object>) {
    initObserveJupyterApp()
    const localConfigs = await extensionConfigs
    const jupyterMatcher = get(localConfigs, "configs.versioned_tool_configs.jupyter")
    if (jupyterMatcher) {
      this.fingerprintMatcher = jupyterMatcher
    }
  }
}
