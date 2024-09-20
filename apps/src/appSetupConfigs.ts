import { once } from "lodash";
import { AppSetup } from "./base/appSetup";
import { JupyterSetup } from "./jupyter/appSetup";
import { MetabaseSetup } from "./metabase/appSetup";
import { PosthogSetup } from "./posthog/appSetup";
import { GoogleSetup } from "./google/appSetup";

interface AppSetupConfig {
    name: string;
    appSetup: AppSetup;
    inject?: boolean;
}

export const getAppSetupConfigs = once(() : AppSetupConfig[] => [
    {
        name: "metabase",
        appSetup: new MetabaseSetup(),
        inject: true,
    },
    {
        name: "jupyter",
        appSetup: new JupyterSetup(),
        inject: true,
    },
    {
        name: "posthog",
        appSetup: new PosthogSetup(),
        inject: true,
    },
    {
        name: "google",
        appSetup: new GoogleSetup(),
        inject: false
    }
]);