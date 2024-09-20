import { once } from "lodash";
import { JupyterState } from "./jupyter/appState";
import { MetabaseState } from "./metabase/appState";
import { PosthogState }  from "./posthog/appState";
import { GoogleAppState } from "./google/appState";

export const getAppStateConfigs = once(() => ({
    metabase: new MetabaseState(),
    jupyter: new JupyterState(),
    posthog: new PosthogState(),
    google: new GoogleAppState()
}));