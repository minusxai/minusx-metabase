import { AppSetup } from "../base/appSetup";
import { googleDocFingerprintMatcher } from "./fingerprint"

export class GoogleSetup extends AppSetup {
  fingerprintMatcher = googleDocFingerprintMatcher;
}