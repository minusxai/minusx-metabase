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

export const initMutationObserver = () => {
    let oldResponses: SubscriptionResults = []
    const masterCallback = () => {
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
    const observer = new MutationObserver(debounce(masterCallback, OBSERVER_INTERVAL, {
        trailing: true,
    }));
    observer.observe(document, {
        childList: true,
        subtree: true,
    });
}

export const attachMutationListener = (domQueryMap: DOMQueryMap) => {
    domQueries.push(domQueryMap)
    return domQueries.length - 1
}

export const detachMutationListener = (id: number) => {
    delete domQueries[id]
}