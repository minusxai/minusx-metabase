import { get } from "lodash";
import { AppSetup } from "../base/appSetup";
import { metabaseFingerprintMatcher } from "./fingerprint";

export class MetabaseSetup extends AppSetup {
  fingerprintMatcher = metabaseFingerprintMatcher;

  async setup(extensionConfigs: Promise<object>) {
    const localConfigs = await extensionConfigs
    const metabaseMatcher = get(localConfigs, "configs.versioned_tool_configs.metabase")
    if (metabaseMatcher) {
      this.fingerprintMatcher = metabaseMatcher
    }
  }
}
