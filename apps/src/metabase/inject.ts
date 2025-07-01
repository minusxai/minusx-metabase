import { get, isEmpty, set } from "lodash"
import { initWindowListener, sendIFrameMessage } from 'extension'

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

const listeningPaths: Array<string> = []

async function onMetabaseLoad() {
    while (true) {
        const store = get(window, 'Metabase.store') as any
        if (!store || !store.getState) {
            await new Promise(resolve => setTimeout(resolve, 500))
        } else {
            break
        }
    }
    const store = get(window, 'Metabase.store') as any
    const oldState = {}
    const callback = () => {
        const state = store.getState()
        listeningPaths.forEach((path, id) => {
            const oldValue = get(oldState, path)
            const newValue = get(state, path)
            if (oldValue !== newValue) {
                set(oldState, path, newValue)
                sendIFrameMessage({
                    key: 'metabaseStateChange',
                    value: {
                        value: newValue,
                        path,
                        id
                    }
                })
            }
        })
    }
    callback()
    store.subscribe(callback)
}

const subscribeMetabaseState = (path: string) => {
    const index = listeningPaths.indexOf(path)
    if (index !== -1) {
        // Already subscribed to this path
        return index
    }
    const newIndex = listeningPaths.length
    listeningPaths.push(path)
    const newValue = getMetabaseState(path) // Initialize the state for this path
    sendIFrameMessage({
        key: 'metabaseStateChange',
        value: {
            value: newValue,
            path,
            id: newIndex
        }
    })
    return newIndex
}

onMetabaseLoad()

export const rpc = {
    getMetabaseState,
    dispatchMetabaseAction,
    getSelectedTextOnEditor,
    subscribeMetabaseState
}

initWindowListener(rpc)