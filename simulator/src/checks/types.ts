import { Expect } from "playwright/test";
import { JupyterNotebookState, RootState } from "web";

interface TestCheckArgs {
    instruction: string;
    initialMinusxState: RootState;
    initialAppState: JupyterNotebookState;
    finalMinusxState: RootState;
    finalAppState: JupyterNotebookState;
}

export type TestCheck = (testCheckArgs: TestCheckArgs, expect: Expect) => void | Promise<void>;
