import { MetabaseAppState } from "./metabase/helpers/DOMToState";
import { JupyterNotebookState } from "./jupyter/helpers/DOMToState";

export type AppState = MetabaseAppState | JupyterNotebookState;
export type { ActionDescription, ToolPlannerConfig, CoTPlannerConfig, SimplePlannerConfig } from "./base/defaultState";