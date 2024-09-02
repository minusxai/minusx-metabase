import { once } from "lodash";
import { AppSetup } from "./base/appSetup";
import { JupyterSetup } from "./jupyter/appSetup";
import { MetabaseSetup } from "./metabase/appSetup";

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
]);