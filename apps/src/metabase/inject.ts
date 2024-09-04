import { get, isEmpty } from "lodash"
import { initWindowListener } from 'extension'

const getMetabaseState = (path: Parameters<typeof get>[1]) => {
    const store: any = get(window, 'Metabase.store')
    if (store && store.getState) {
        if (isEmpty(path)) {
            return store.getState()
        }
        return get(store.getState(), path)
    }
    return null
}

const dispatchMetabaseAction = (type: string, payload: any) => {
    const store = get(window, 'Metabase.store')
    if (store && store.dispatch) {
        store.dispatch({
            type,
            payload
        })
    }
}

export const rpc = {
    getMetabaseState,
    dispatchMetabaseAction
}

initWindowListener(rpc)