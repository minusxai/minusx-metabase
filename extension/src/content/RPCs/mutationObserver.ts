import { debounce, isEqual, memoize } from "lodash";
import { DOMQuery, DOMQueryMap, DOMQueryMapResponse, DOMQueryResponse, queryDOMMap, queryDOMSingle } from "./getElements";
import { sendIFrameMessage } from "./domEvents";
import { QuerySelector } from "../../helpers/pageParse/querySelectorTypes";
import { getElementsFromQuerySelector } from "../../helpers/pageParse/getElements";

const OBSERVER_INTERVAL = 100

const domQueries: Array<DOMQueryMap> = []

interface EventListener {
    querySelector: QuerySelector,
    events: string[],
}
const eventListeners: Array<EventListener> = []

export type SubscriptionPayload = {
    id: number
    elements: DOMQueryMapResponse
    url: string
}

type SubscriptionResults = Omit<SubscriptionPayload, 'id'>[]

let oldResponses: SubscriptionResults = []

const notifyNativeEvent = (event: string, eventID: number) => {
    return memoize(() => {
        sendIFrameMessage({
            key: 'nativeEvent',
            value: {
                event,
                eventID
            }
        })
    })
}

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
    eventListeners.forEach(({querySelector, events}, index) => {
        const elements = getElementsFromQuerySelector(querySelector)
        elements.forEach(element => {
            events.forEach(event => {
                element.addEventListener(event, notifyNativeEvent(event, index))
            })
        })
    })
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

export const attachEventsListener = (selector: QuerySelector, events: string[]=['click']) => {
    const eventID = eventListeners.length 
    eventListeners.push({querySelector: selector, events})
    return eventID
}

export const detachMutationListener = (id: number) => {
    delete domQueries[id]
}