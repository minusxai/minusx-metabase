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

interface EventListener {
    event: string
    path: Parameters<typeof get>[1]
}

const eventListeners: Array<EventListener> = []

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
    let oldState = store.getState()
    store.subscribe(() => {
        const state = store.getState()
        eventListeners.forEach(({ event, path }) => {
            const oldValue = get(oldState, path)
            const newValue = get(state, path)
            if (oldValue !== newValue) {
                set(oldState, path, newValue)
                sendIFrameMessage({
                    key: 'metabaseStateChange',
                    value: {
                        event,
                        path
                    }
                })
            }
        })
    })
}

const subscribeMetabaseState = (events: Array<EventListener>) => {
    eventListeners.push(...events)
}

export const rpc = {
    getMetabaseState,
    dispatchMetabaseAction,
    getSelectedTextOnEditor
}

initWindowListener(rpc)