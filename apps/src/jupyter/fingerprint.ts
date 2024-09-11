import { ToolMatcher } from "extension/types"

export const jupyterFingerprintMatcher: ToolMatcher = {
  default: {
    type: "combination",
    or: [
      {
        type: "domQueryCondition",
        domQuery: {
          selector: {
            type: "XPATH",
            selector: "//title[text()='JupyterLab']",
          },
        },
      },
      {
        type: "domQueryCondition",
        domQuery: {
          selector: {
            type: "XPATH",
            selector: "//title[text()='JupyterLite']",
          },
        },
      },
      {
        type: "domQueryCondition",
        domQuery: {
          selector: {
            type: "XPATH",
            selector: "//title[contains(., 'Jupyter Notebook')]",
          },
        },
      },
      {
        type: "domQueryCondition",
        domQuery: {
          selector: {
            type: "XPATH",
            selector: "//div[text()='About JupyterLab']",
          },
        },
      },
      {
        type: "domQueryCondition",
        domQuery: {
          selector: {
            type: "CSS",
            selector: "#jupyter-config-data",
          },
        },
      },
    ],
  },
};
