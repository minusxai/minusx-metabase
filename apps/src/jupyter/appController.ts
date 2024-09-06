import { clone, findIndex, isArray } from "lodash";
import { AppController } from "../base/appController";
import { JupyterNotebookState } from "./helpers/DOMToState";
import { RPCs } from "web";
import { BlankMessageContent } from "web/types";

export class JupyterController extends AppController<JupyterNotebookState> {
  async insertCellBelow({ cell_index }: { cell_index: number }) {
    await this.uClick({ query: "select_cell", index: cell_index });
    await this.uClick({ query: "insert_cell_below" });
    return;
  }

  async insertCellAbove({ cell_index }: { cell_index: number }) {
    await this.uClick({ query: "select_cell", index: cell_index });
    await this.uClick({ query: "insert_cell_above" });
    return;
  }

  async setCellValue({
    cell_index,
    source,
  }: {
    cell_index: number;
    source: string | string[];
  }) {
    const value = isArray(source) ? source.join("\r") : source;
    await this.uDblClick({ query: "select_cell", index: cell_index });
    await this.scrollIntoView({ query: "select_cell", index: cell_index });
    await this.uHighlight({ query: "select_cell", index: cell_index });
    const userApproved = await RPCs.getUserConfirmation({content: value});
    await this.uHighlight({ query: "select_cell", index: cell_index });
    if (!userApproved) {
      throw new Error("Action (and subsequent plan) cancelled!");
    }
    await this.setValue({
      query: "select_cell_text",
      index: cell_index,
      value,
    });
    return;
  }

  async runCell({ cell_index }: { cell_index: number }) {
    cell_index = await this.cellIndexOrCurrentlySelected(cell_index);
    await this.uClick({ query: "select_cell", index: cell_index });
    await this.uClick({ query: "run_cell" });
    await this.waitForCellExecution({ index: cell_index });
    // select the cell again because after execution, jupyter selects the next cell
    await this.uClick({ query: "select_cell", index: cell_index });
    return;
  }

  async executeCell({ cell_index }: { cell_index: number }) {
    const actionContent: BlankMessageContent = {
      type: "BLANK",
    };
    await this.uClick({ query: "select_cell", index: cell_index });
    await this.uClick({ query: "run_cell" });
    await this.waitForCellExecution({ index: cell_index });
    const state = await this.app.getState();
    const cellOutput = state?.cells[cell_index].output || [];
    actionContent.content = JSON.stringify(cellOutput);
    console.log("Cell output is", actionContent);
    return actionContent;
  }

  async deleteCells({ cell_indexes }: { cell_indexes: number[] }) {
    const sortedIds = clone(cell_indexes);
    sortedIds.sort();
    sortedIds.reverse();
    for (const id of sortedIds) {
      // TODO: does the id change between delete calls? probably does.
      await this.uClick({ query: "select_cell", index: id });
      await this.uClick({ query: "delete_cell" });
    }
    return;
  }

  async insertSetValueExecuteCell({
    cell_index,
    source,
  }: {
    cell_index: number;
    source: string | string[];
  }) {
    await this.insertCellBelow({ cell_index });
    await this.setCellValue({ cell_index: cell_index + 1, source });
    await this.executeCell({ cell_index: cell_index + 1 });
    return;
  }

  async addCodeAndRun({
    cell_index,
    source,
  }: {
    cell_index: number;
    source: string | string[];
  }) {
    cell_index = await this.cellIndexOrCurrentlySelected(cell_index);
    await this.insertCellBelow({ cell_index });
    await this.setCellValue({ cell_index: cell_index + 1, source });
    const cellOutput = await this.executeCell({ cell_index: cell_index + 1 });
    await this.uClick({ query: "select_cell", index: cell_index + 1 });
    return cellOutput;
  }

  async setValueExecuteCell({
    cell_index,
    source,
  }: {
    cell_index: number;
    source: string | string[];
  }) {
    await this.setCellValue({ cell_index, source });
    const cellOutput = await this.executeCell({ cell_index });
    return cellOutput;
  }

  async replaceCodeAndRun({
    cell_index,
    source,
  }: {
    cell_index: number;
    source: string | string[];
  }) {
    cell_index = await this.cellIndexOrCurrentlySelected(cell_index);
    await this.setCellValue({ cell_index, source });
    const cellOutput = await this.executeCell({ cell_index });
    await this.uClick({ query: "select_cell", index: cell_index });
    return cellOutput;
  }

  async getCurrentlySelectedCell() {
    const querySelectorMap = await this.app.getQuerySelectorMap();
    const queryResponse = await RPCs.queryDOMSingle({
      selector: querySelectorMap.whole_cell,
    });
    const selectedCell = findIndex(queryResponse, (cell) =>
      cell.attrs.class.includes?.("jp-mod-selected")
    );
    return selectedCell;
  }

  async cellIndexOrCurrentlySelected(cell_index: number | undefined) {
    if (cell_index === undefined) {
      const selectedCell = await this.getCurrentlySelectedCell();
      cell_index = selectedCell;
    }
    return cell_index;
  }

  async waitForCellExecution({ index }) {
    while (true) {
      const state = await this.app.getState();
      const cell = state.cells[index];
      // check if cell.inputAreaPrompt has an asterisk (it can be anywhere in the string)
      if (!cell.isExecuting) {
        break;
      }
      await this.wait({ time: 100 });
    }
  }

  async getOutputAsImage(){
    return null;
  }

  async getOutputAsText(){
    const state = await this.app.getState();
    const selectedCell = state.cells.filter((cell) => cell.isSelected)[0];
    return selectedCell.output[0].value;
  }

  async sendNotebookToGoogleDoc() {
    const notebook = await this.app.getState();
    let response = await RPCs.forwardToTab("gdoc", JSON.stringify(notebook))
    return response;
  }
}
