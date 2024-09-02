import { QuerySelectorMap } from 'extension';

export const querySelectorMap: QuerySelectorMap = {
  "sql_query": {
    type: "XPATH",
    selector:  `//div[contains(@class,"view-lines") and @role="presentation"]`
  },
  "run_button": {
    type: "XPATH",
    selector:  `//button[@data-attr="hogql-query-editor-save"]`
  },
  "disabled_run_button": {
    type: "XPATH",
    selector:  `//button[@data-attr="hogql-query-editor-save" and @aria-disabled="true"]`
  },
};
