import { QuerySelectorMap } from "extension/types";

export const visualizationTypes = ["Table", "Bar", "Line", "Pie", "Row", "Area", "Combo", "Trend", "Funnel", "Detail", "Scatter", "Waterfall", "Number", "Gauge", "Progress", "Map", "PivotTable"]

const visualizationSelectors = Object.fromEntries(
  visualizationTypes.map((type) => [
    `${type}_button`,
    {
      type: 'XPATH',
      selector: `//div[@data-testid='${type}-button']`
    }
  ])
);

export const querySelectorMap: QuerySelectorMap = {
  expand_editor: {
    type: 'XPATH',
    selector: '//a/*[@aria-label="expand icon"]',
  },
  contract_editor: {
    type: 'XPATH',
    selector: '//a/*[@aria-label="contract icon"]',
  },
  sql_query: {
    type: 'CSS',
    selector: 'div.ace_scroller',
  },
  run_query: {
    type: 'XPATH',
    selector: '//button[@data-testid="run-button"]|//button[contains(@class,"RunButton")]',
  },
  sql_read: {
    type: 'XPATH',
    selector: '//div[@id="id_sql"]//div[contains(@class, "ace_line")]'
  },
  vizualization_button: {
    type: 'XPATH',
    selector: "//button[@data-testid='viz-type-button']"
  },
  viz_content: {
    type: 'XPATH',
    selector: "//div[@data-testid='query-visualization-root']"
  },
  viz_invalid: {
    type: 'XPATH',
    selector: "//div[@data-testid='visualization-root' and contains(@style, 'grayscale()') and contains(@style, 'pointer-events: none')]"
  },
  viz_settings: {
    type: 'XPATH',
    selector: "//div[@data-testid='chart-type-sidebar']"
  },
  // NOTE(@arpit): seems super fragile, but works for now
  error_message: {
    type: 'XPATH',
    selector: '//div[contains(text(), "An error occurred in your query")]/../../div[2]'
  },
  selected_database: {
    type: 'XPATH',
    selector: "//*[@data-testid='native-query-top-bar']/div[1]"
  },
  query_editor: {
    type: 'XPATH',
    selector: "//div[@data-testid='native-query-editor']|//div[@id='id_sql']"
  },
  cell_headers: {
    type: 'CSS',
    selector: '[role="columnheader"]'
  },
  cell_value: {
    type: 'CSS',
    selector: '[role="gridcell"]'
  },
  switch_to_data: {
    type: 'CSS',
    selector: '[aria-label="Switch to data"]'
  },
  cancel_running_query: {
    type: 'XPATH',
    selector: '//button[@aria-label="Cancel" and @data-testid="run-button"]|//button[contains(@class,"RunButton")]/div/*[@aria-label="close icon"]/../..'
  },
  ...visualizationSelectors
};
