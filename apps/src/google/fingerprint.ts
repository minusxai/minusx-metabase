import { ToolMatcher } from "extension/types";

export const googleDocFingerprintMatcher: ToolMatcher = {
  docs: {
    type: "combination",
    or: [
      {
        type: "urlRegexCondition",
        urlRegex: "^https:\/\/docs\.google\.com\/document\/d",
      },
    ],
  },
};