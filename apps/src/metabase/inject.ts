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

const getSelectedTextOnEditor = () => {
    try {
        const editor = window.ace.edit('id_sql')
        return editor.getSelectedText();
    } catch (e) {
        console.error('Error getting selected text from editor:', e);
    }
    const text: any = window.getSelection()?.toString()
    if (text && text.length > 0) {
        return text
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
    dispatchMetabaseAction,
    getSelectedTextOnEditor
}

initWindowListener(rpc)