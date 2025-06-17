import { QuerySelectorMap } from "extension/types";
import { visualizationTypes } from "./types";

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
  error_message_head: {
    type: 'XPATH',
    selector: '//div[contains(text(), "An error occurred in your query")]'
  },
  login_box: {
    type: 'XPATH',
    selector: '//div[contains(text(), "Sign in to Metabase")]'
  },
  dashboard_header: {
    type: 'XPATH',
    // selector: "//div[@data-testid='fixed-width-dashboard-header']/div[@role='heading']"
    selector: "//div[contains(@class, 'Header-buttonSection')]"
  },
  dashcard: {
    type: 'CSS',
    selector: "[data-testid='dashcard-container']"
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
  select_database_dropdown: {
    type: 'XPATH',
    selector: '//div[contains(@class, "GuiBuilder-data")]//a | //div[@data-testid="gui-builder-data"]//a'
  },
  select_database_dropdown_options: {
    type: 'XPATH',
    selector: '//div[@id="DatabasePicker"]//div[contains(@class,"List-section") or @data-element-id="list-section"]/div/*'
  },
  native_query_top_bar: {
    type: 'XPATH',
    selector: '//div[contains(@class, "GuiBuilder-data")] | //div[@data-testid="gui-builder-data"]'
  },
  format_query_button: {
    type: 'CSS',
    selector: 'button[aria-label="Format query"]'
  },
  mbql_run: {
    type: 'XPATH',
    selector: '//button[.//span[text()="Visualize"]]',
  },
  mbql_run_parent: {
    type: 'XPATH',
    selector: '//button[.//span[text()="Visualize"]]/..',
  },
  show_mbql_editor: {
    type: 'XPATH',
    selector: '//button[.//span[text()="Show Editor"]]',
  },
  show_mbql_editor_embedded: {
    type: 'XPATH',
    selector: '//button[.//span[text()="Editor"]]',
  },
  ...visualizationSelectors
};
