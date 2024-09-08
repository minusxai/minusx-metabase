import { debounce, isEqual } from "lodash";
import { DOMQuery, DOMQueryMap, DOMQueryMapResponse, DOMQueryResponse, queryDOMMap, queryDOMSingle } from "./getElements";
import { sendIFrameMessage } from "./domEvents";

const OBSERVER_INTERVAL = 100

const domQueries: Array<DOMQueryMap> = []

export type SubscriptionPayload = {
    id: number
    elements: DOMQueryMapResponse
    url: string
}

type SubscriptionResults = Omit<SubscriptionPayload, 'id'>[]

let oldResponses: SubscriptionResults = []

const _masterCallback = () => {
    const newResponses: SubscriptionResults = domQueries.map((query) => {
        const elements = queryDOMMap(query)
        const url = window.location.href
        return { elements, url }
    })
    for (let i = 0; i < Math.max(newResponses.length, oldResponses.length); i++) {
        if (!isEqual(newResponses[i], oldResponses[i])) {
            const value: SubscriptionPayload = {
                id: i,
                ...newResponses[i]
            }
            sendIFrameMessage({
                key: 'subscription',
                value
            })
            oldResponses[i] = newResponses[i]
        }
    }
}

const masterCallback = debounce(_masterCallback, OBSERVER_INTERVAL, {
    trailing: true,
})

export const initMutationObserver = () => { 
    const observer = new MutationObserver(masterCallback);
    observer.observe(document, {
        childList: true,
        subtree: true,
    });
}

export const attachMutationListener = (domQueryMap: DOMQueryMap) => {
    domQueries.push(domQueryMap)
    masterCallback()
    return domQueries.length - 1
}

export const detachMutationListener = (id: number) => {
    delete domQueries[id]
}