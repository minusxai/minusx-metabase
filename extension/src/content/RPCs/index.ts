import { queryDOMMap, queryDOMSingle } from "./getElements"
import { log } from "./log"
import { checkMinusXClassName, identifyToolNative, setMinusxMode, toggleMinusX, toggleMinusXRoot } from "./domEvents"
import { uClick, uDblClick, uHighlight, scrollIntoView, uSelectAllText, typeText, dragAndDropText } from "./actions"
import { captureVisibleTab } from "./rpcCalls"
import { copyToClipboard } from "./copyToClipboard"
import { getElementScreenCapture } from "./elementScreenCapture"
import ripple from "./ripple"
import { fetchData } from "./fetchData"
import { initWindowListener, RPCPayload } from './initListeners'
import { attachMutationListener, detachMutationListener, initMutationObserver } from "./mutationObserver"
import { respondToOtherTab, forwardToTab, getPendingMessage } from "./crossInstanceComms"
import { configs } from "../../constants"
export const rpc = {
    log,
    queryDOMMap,
    queryDOMSingle,
    uClick,
    uDblClick,
    uSelectAllText,
    uHighlight,
    scrollIntoView,
    setMinusxMode,
    toggleMinusX,
    toggleMinusXRoot,
    identifyToolNative,
    checkMinusXClassName,
    captureVisibleTab,
    copyToClipboard,
    ripple,
    getElementScreenCapture,
    fetchData,
    queryURL: () => window.location.href,
    attachMutationListener,
    detachMutationListener,
    dragAndDropText,
    typeText,
    respondToOtherTab,
    forwardToTab,
    getPendingMessage
}

type RPC = typeof rpc

export const initRPC = () => {
    initWindowListener<RPC>(rpc)
    // Function to handle messages from the background script
    chrome.runtime.onMessage.addListener((event, sender, sendResponse) => {
        const payload: RPCPayload = event
        if (!payload || !(payload.fn in rpc)) {
            const error = 'Invalid payload'
            sendResponse({ error });
            return true;
        }
        if (sender.id == chrome.runtime.id) {
            try {
                Promise.resolve(rpc[payload.fn](payload.args, sender)).then((response) => {
                    sendResponse({ response });
                }).catch(error => {
                    sendResponse({ error });
                })
            } catch (error) {
                sendResponse({ error });
            }
        }
        return true
    });
    initMutationObserver()
}