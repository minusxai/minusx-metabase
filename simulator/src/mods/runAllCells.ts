import { JupyterNotebookState } from "web";
import { TestMod } from "./types";
import { getAppStateActions } from "../utils/appState";
import { runAppActions } from "../utils/appState";

export const runAllCells: TestMod = async ({ frame, page }) => {
    const state: JupyterNotebookState = (await getAppStateActions(frame)).state
    for (const cell of state.cells) {
        await runAppActions(frame, 'executeCell', { cell_index: cell.cellIndex })
    }
}