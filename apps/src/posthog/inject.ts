import { get, isEmpty } from "lodash"
import { initWindowListener } from 'extension'

console.log('Loading metabase RPCs')

const getPosthogAppContext = (path: Parameters<typeof get>[1]) => {
    const appContext = get(window, 'POSTHOG_APP_CONTEXT')
    if (appContext) {
        if (isEmpty(path)) {
            return appContext
        }
        return get(appContext, path)
    }
    return null
}

export const rpc = {
  getPosthogAppContext
}

initWindowListener(rpc)