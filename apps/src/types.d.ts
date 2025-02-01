import { MetabaseAppState } from "./metabase/helpers/DOMToState";
import { JupyterNotebookState } from "./jupyter/helpers/DOMToState";

export type AppState = MetabaseAppState | JupyterNotebookState;
export type { ActionDescription, ToolPlannerConfig, CoTPlannerConfig, SimplePlannerConfig } from "./base/defaultState";
export type { MetabaseContext } from "./metabase/defaultState";
export type { FormattedTable } from "./metabase/helpers/types";