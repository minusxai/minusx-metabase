import { QuerySelectorMap } from 'extension/types';
import _ from 'lodash'

// the or condition is for handling jupyter notebook. TODO(@arpit): figure out more elegant way to handle this
const visibleTabSelector = '//div[(@role="tabpanel" and not(contains(@class,"lm-mod-hidden"))) or @id="main-split-panel"]'
export const querySelectorMap: QuerySelectorMap = {
  // cell_content: {
  //   type: 'QUERY',
  //   selector: '[role="textbox"]',
  // },
  whole_cell: {
    type: 'XPATH',
    // make sure only visible tab's stuff is selected
    selector: `${visibleTabSelector}//div[starts-with(@aria-label, "Code Cell Content")]`
  },
  cell_output: {
    type: 'XPATH',
    // make sure only visible tab's stuff is selected
    selector: `${visibleTabSelector}//div[starts-with(@aria-label, "Code Cell Content")]//div[contains(@class, "jp-OutputArea-output")]`
  },
  cell_content: {
    type: 'XPATH',
    // apparently the copy paste is unavoidable? https://chatgpt.com/share/11af4893-a8bc-4a3e-96e0-dfb6167a9d7a
    selector:
      `${visibleTabSelector}//div[starts-with(@aria-label, "Code Cell Content")]//div[@role="textbox"]|${visibleTabSelector}//div[contains(@class, "jp-OutputArea-output")]`,
  },
  execute_number: {
    type: 'CSS',
    selector: 'div.jp-InputArea-prompt'
  },
  visible_panel: {
    type: 'CSS',
    selector: 'div.jp-WindowedPanel-outer',
  },
  // select_cell: {
  //   type: 'QUERY',
  //   selector: '[role="textbox"]',
  // },
  select_cell: {
    type: 'XPATH',
    selector:
      // `${visibleTabSelector}//div[starts-with(@aria-label, "Code Cell Content")]//div[@role="textbox"] | ${visibleTabSelector}//div[starts-with(@aria-label, "Markdown Cell Content")]//div[@role="textbox"]`,
      `${visibleTabSelector}//div[starts-with(@aria-label, "Code Cell Content")]`,
  },
  select_cell_text: {
    type: 'XPATH',
    selector:
    `${visibleTabSelector}//div[starts-with(@aria-label, "Code Cell Content")]//div[@role="textbox"] | ${visibleTabSelector}//div[starts-with(@aria-label, "Code Cell Content")][not(.//div[@role="textbox"])]`
  },
  run_cell: {
    type: 'XPATH',
    selector:
    // TODO: figure out why this is failing in jupyterlab and not in jupyterhub
      `(${visibleTabSelector}//div[@aria-label="notebook actions"]//button[starts-with(@title, "Run this cell and advance")])`
      +`|(${visibleTabSelector}//jp-toolbar[@aria-label="notebook actions"]//jp-button[starts-with(@title, "Run this cell and advance")])`,
      // '//*[starts-with(@title, "Run this cell and advance")]',
  },
  delete_cell: {
    type: 'CSS',
    selector: '[title="Delete this cell (D, D)"]',
  },
  insert_cell_below: {
    type: 'XPATH',
    selector:
      `(${visibleTabSelector}//div[@aria-label="notebook actions"]//button[@title="Insert a cell below (B)"])`
      +`|(${visibleTabSelector}//jp-toolbar[@aria-label="notebook actions"]//jp-button[@title="Insert a cell below (B)"])`,
      // '//*[@title="Insert a cell below (B)"]',
  },
  insert_cell_above: {
    type: 'XPATH',
    selector:
      `(${visibleTabSelector}//div[@aria-label="notebook actions"]//button[@title="Insert a cell above (A)"])`
      +`|(${visibleTabSelector}//jp-button[@title="Insert a cell above (A)"])`,
      // '//*[@title="Insert a cell above (A)"]',
  },
};

export const UI_SELECTORS = _.pick(querySelectorMap, ['select_cell'])