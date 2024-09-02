import { ToolMatcher } from "../base/appSetup";

export const metabaseFingerprintMatcher: ToolMatcher = {
  default: {
    type: "combination",
    or: [
      {
        type: "domQueryCondition",
        domQuery: {
          selector: {
            type: "CSS",
            selector: "#_metabaseUserLocalization",
          },
        },
      },
      {
        type: "domQueryCondition",
        domQuery: {
          selector: {
            type: "CSS",
            selector: "#_metabaseBootstrap",
          },
        },
      },
    ],
  },
};
