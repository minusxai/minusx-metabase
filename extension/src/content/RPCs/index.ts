import { queryDOMMap, queryDOMSingle } from "./getElements"
import { log } from "./log"
import { checkMinusXClassName, identifyToolNative, setMinusxMode, toggleMinusX, toggleMinusXRoot } from "./domEvents"
import { uClick, uDblClick, uHighlight, scrollIntoView, uSelectAllText, typeText, dragAndDropText } from "./actions"
import { captureVisibleTab } from "./rpcCalls"
import { copyToClipboard } from "./copyToClipboard"
import { getElementScreenCapture } from "./elementScreenCapture"
import ripple from "./ripple"
import { fetchData } from "./fetchData"
import { initBgRpc, initWindowListener, RPCPayload } from './initListeners'
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
    initBgRpc<RPC>(rpc)
    initMutationObserver()
}