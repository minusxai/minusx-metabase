import { getAppStateConfigs } from "apps";
import { getParsedIframeInfo } from "./origin";

const appStateConfigs = getAppStateConfigs()

export function getApp() {
    const parsed = getParsedIframeInfo()
    const tool = parsed.tool as keyof typeof appStateConfigs
    if (tool in appStateConfigs) {
        return appStateConfigs[tool]
    }
    // Default to jupyter
    return appStateConfigs['jupyter']
}