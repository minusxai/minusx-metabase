import { get, isEmpty } from "lodash"
import { initWindowListener } from 'extension'

const getMetabaseState = (path: Parameters<typeof get>[1]) => {
    const store = get(window, 'Metabase.store')
    if (store && store.getState) {
        if (isEmpty(path)) {
            return store.getState()
        }
        return get(store.getState(), path)
    }
    return null
}

const setVisualizationTypePrimary = (card: any) => {
    const store = get(window, 'Metabase.store')
    if (store && store.dispatch) {
        console.log("DISPATCHING")
        store.dispatch({
            type: 'metabase/qb/UPDATE_QUESTION',
            payload: {
                card: card
            }
        })
    }
}

export const rpc = {
    getMetabaseState,
    setVisualizationTypePrimary
}

initWindowListener(rpc)