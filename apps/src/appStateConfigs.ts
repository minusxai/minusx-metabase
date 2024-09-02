import { once } from "lodash";
import { JupyterState } from "./jupyter/appState";
import { MetabaseState } from "./metabase/appState";

export const getAppStateConfigs = once(() => ({
    metabase: new MetabaseState(),
    jupyter: new JupyterState(),
}));