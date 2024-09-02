import { AppSetup } from "../base/appSetup";
import { posthogFingerprintMatcher } from "./fingerprint";
import { initObservePosthog } from "./posthogObserver";

export class PosthogSetup extends AppSetup {
  fingerprintMatcher = posthogFingerprintMatcher;

  async setup(extensionConfigs: Promise<object>) {
    initObservePosthog()
  }
}
