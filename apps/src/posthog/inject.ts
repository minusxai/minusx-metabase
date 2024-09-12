import { get, isEmpty } from "lodash"
import { initWindowListener } from 'extension'
import { querySelectorMap } from "./querySelectorMap"
import { QuerySelector } from "extension/types";
import { userEvent } from "@testing-library/user-event";
import { sleep } from "../common/utils";
import { resolveSelector } from "extension";
// quite a bit of hacks here; shouldn't be importing all this stuff into this file
// kind of breaks extension/apps/web abstraction. will generalize later
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
setInterval(() => {
  const hogQLContainerSelector = querySelectorMap["hoql_container_to_resize"]
  const elements = resolveSelector(hogQLContainerSelector)
  // check if its an element
  if (elements && elements.length > 0) {
    const container = elements[0] as HTMLElement
    // height is set in style property, just change it 400px
    container.style.height = '400px'
    // don't remove timeout, need it for page switching etc.
    // clearInterval(interval)
  }
}, 1000)

const setTextPosthog = async (selector: QuerySelector, value: string = '') => {
  const elements = resolveSelector(selector)
  if (elements && elements.length > 0) {
    const element = elements[0]
    await userEvent.click(element);
    await sleep(200)
    await document.execCommand('selectall', false)
    await sleep(200)
    await userEvent.keyboard(value);
  }
}



export const rpc = {
  getPosthogAppContext,
  setTextPosthog
}

initWindowListener(rpc)