import { debounce, isEqual, memoize, set, uniq } from "lodash";
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

interface nativeAddOn {
    querySelector: QuerySelector,
    nodeID: string,
    attachType: AttachType,
    htmlElement: HTMLJSONNode
}
const nativeAddOns: Array<nativeAddOn> = []

export type SubscriptionPayload = {
    id: number
    elements: DOMQueryMapResponse
    url: string
}

type SubscriptionResults = Omit<SubscriptionPayload, 'id'>[]

let oldResponses: SubscriptionResults = []

const notifyNativeEvent = memoize((event: string, eventID: number) => {
    return () => {
        sendIFrameMessage({
            key: 'nativeEvent',
            value: {
                event,
                eventID
            }
        })
    }
})

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

    nativeAddOns.forEach(({querySelector, htmlElement, nodeID, attachType}, index) => {
        const elements = getElementsFromQuerySelector(querySelector)
        elements.forEach(element => {
            const node = element.querySelector(`#${nodeID}`)
            if (!!node) {
                return
            }
            const parsedJson = jsonToHtml(htmlElement)
            const html = parseHtmlString(parsedJson)
            if (html) {
                element.appendChild(html)
            }
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

export type AttachType = 'before' | 'after' | 'firstChild' | 'lastChild'

export type HTMLJSONNode = {
  tag: string; // The HTML tag name (e.g., 'div', 'p', etc.)
  attributes?: Record<string, string>; // Attributes as key-value pairs
  children?: (HTMLJSONNode | string)[]; // Child nodes (either HTMLNode or text)
};

export const addNativeElements = (selector: QuerySelector, htmlElement: HTMLJSONNode, attachType: AttachType = 'lastChild') => {
    const eventID = nativeAddOns.length 
    const uniqueID = 'minusx-augmented-' + eventID
    set(htmlElement, 'attributes.id', uniqueID)
    nativeAddOns.push({querySelector: selector, htmlElement, nodeID: uniqueID, attachType})
    return uniqueID
}

function jsonToHtml(json: HTMLJSONNode | string): string {
  if (!json || typeof json !== 'object') {
    return (typeof json === 'string') ? json : '';
  }

  const { tag, attributes = {}, children = [] } = json;

  const attrs = Object.entries(attributes)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');

  const childrenHtml = children.map(jsonToHtml).join('');

  return `<${tag}${attrs ? ' ' + attrs : ''}>${childrenHtml}</${tag}>`;
}

function parseHtmlString(htmlString: string): Element | null {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    return doc.body.firstElementChild; // Returns the first element
}