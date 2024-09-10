import { get, isEmpty } from "lodash"
import { initWindowListener } from 'extension'
import { querySelectorMap } from "./querySelectorMap"

console.log('Loading posthog RPCs')

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

// HACK: resize hogQL editor so that normal queries can fit
let interval = setInterval(() => {
  const hogQLContainerSelector = querySelectorMap["hoql_container_to_resize"]
  const container = document.evaluate(hogQLContainerSelector.selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE).singleNodeValue as HTMLElement
  // check if its an element
  if (container) {
    // height is set in style property, just change it 400px
    container.style.height = '400px'
    // remove timeout
    clearInterval(interval)
  }
}, 1000)




export const rpc = {
  getPosthogAppContext
}

initWindowListener(rpc)