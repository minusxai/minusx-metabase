import { ToolMatcher } from "extension/types";

export const posthogFingerprintMatcher: ToolMatcher = {
  default: {
    type: "combination",
    or: [
      {
        type: "domQueryCondition",
        domQuery: {
          selector: {
            type: "XPATH",
            // ends-with PostHog
            selector: "//title[substring(text(), string-length(text()) - string-length('PostHog') + 1) = 'PostHog']",
          },
        },
      },
    ],
  },
};
