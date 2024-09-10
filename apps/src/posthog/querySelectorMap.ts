import { QuerySelectorMap, DOMQuery } from 'extension/types';

export const querySelectorMap: QuerySelectorMap = {
  "hogql_query": {
    type: "XPATH",
    selector:  `//div[contains(@class,"view-lines") and @role="presentation"]`
  },
  "sql_read": {
    type: "XPATH",
    selector:  `//div[contains(@class,"view-lines") and @role="presentation"]//div[@class="view-line"]`
  },
  "run_button": {
    type: "XPATH",
    selector:  `//button[@data-attr="hogql-query-editor-save"]`
  },
  "disabled_run_button": {
    type: "XPATH",
    selector:  `//button[@data-attr="hogql-query-editor-save" and @aria-disabled="true"]`
  },
  "sql_error_message": {
    type: "XPATH",
    selector:  `//div[@class="insight-empty-state error"]//*[contains(@class,"leading-tight")]`
  },
  "cancel_button": {
    type: "XPATH",
    selector:  `//span[@class="LemonButton__content" and text()="Cancel"]`
  },
  "hoql_container_to_resize": {
    type: "XPATH",
    selector: `//div[@data-attr="hogql-query-editor"]//div[contains(@class,"resize-y overflow-hidden")]`
  }
};

export const outputTableQuery: DOMQuery = {
  selector: {
    type: "XPATH",
    selector:  `//table`
  },
  attrs: [],
  children: {
    headers: {
      selector: {
        type: "XPATH",
        selector:  `.//thead/tr`
      },
      attrs: [],
      children: {
        cells: {
          selector: {
            type: "XPATH",
            selector:  `.//th`
          },
          attrs: ['text']
        }
      }
    },
    rows: {
      selector: {
        type: "XPATH",
        selector:  `.//tbody/tr`
      },
      attrs: [],
      children: {
        cells: {
          selector: {
            type: "XPATH",
            selector:  `.//td`
          },
          attrs: ['text']
        }
      }
    }
  }
}