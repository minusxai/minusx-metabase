import { sendMessage as sendMessageRaw, SendMessageOptions } from "./sendMessage";
import { DOMQuery, DOMQueryMap, HttpMethod, QuerySelector, RPC, RPCKey, RPCPayload, ValidMinusxRootClass } from 'extension/types'
import { get } from "lodash";

// Hack to handle RPC messages until we replace all instances
// Once all instances are replaced, we can remove this function
const sendMessage = async <key extends RPCKey>(
    fn: key,
    args: RPCPayload<key>["args"],
    options: SendMessageOptions = {}
):  Promise<ReturnType<RPC[key]>> => {
    const response = await sendMessageRaw(fn, args, options)
    if (response.type == 'error') {
        throw new Error(response.error.message, response.error.error)
    }
    // Hack for backword compatibility
    if (response.error) {
        throw new Error(response.error)
    }
    return response.response
}

// In the future, we can tie web RPCs directly to extension via types
const sendMessageTemplate = <key extends RPCKey>(
    fn: key,
    options: SendMessageOptions = {}
) => {
    return (...args: Parameters<RPC[key]>) => sendMessage(fn, args, options)
}

// Deprecated RPCs
// None so far

// Active RPCs
export const log = async (...args: any[]) => sendMessage("log", args)
export const queryDOMSingle = async (query: DOMQuery) => sendMessage("queryDOMSingle", [query])
export const queryDOMMap = async (queryMap: DOMQueryMap) => sendMessage("queryDOMMap", [queryMap])
export const uClick = (selector: QuerySelector, index: number = 0) => sendMessage("uClick", [selector, index], {log_rpc: true})
export const uDblClick = (selector: QuerySelector, index: number = 0) => sendMessage("uDblClick", [selector, index], {log_rpc: true})
export const uHighlight = (selector: QuerySelector, index: number = 0, styles?: Partial<HTMLEmbedElement["style"]>) => sendMessage("uHighlight", [selector, index, styles], {log_rpc: true})
export const scrollIntoView = (selector: QuerySelector, index: number = 0) => sendMessage("scrollIntoView", [selector, index], {log_rpc: true})
export const setMinusxMode = (mode: string) => sendMessage("setMinusxMode", [mode], {log_rpc: true})
export const toggleMinusXRoot = (className: ValidMinusxRootClass, value?: boolean) => sendMessage("toggleMinusXRoot", [className, value], {log_rpc: true})
export const captureVisibleTab = () => sendMessage("captureVisibleTab", [], {log_rpc: true})
export const getElementScreenCapture = (selector: QuerySelector) => sendMessage("getElementScreenCapture", [selector], {log_rpc: true})
export const uSelectAllText = (shouldDelete = false) => sendMessage("uSelectAllText", [shouldDelete], {log_rpc: true})
export const identifyPosthogUser = (profile_id: string, kv?: Record<string, string>) => sendMessage("identifyPosthogUser", [profile_id, kv])
export const setPosthogGlobalProperties = (kv: Record<string, any>) => sendMessage("setPosthogGlobalProperties", [kv])
export const setPosthogPersonProperties = (kv: Record<string, any>) => sendMessage("setPosthogPersonProperties", [kv])
export const resetPosthog = () => sendMessage("resetPosthog", [])
export const startPosthog = () => sendMessage("startPosthog", [])
export const stopPosthog = () => sendMessage("stopPosthog", [])
export const capturePosthogEvent = (event: string, kv?: object) => sendMessage("capturePosthogEvent", [event, kv])
export const takeFullPosthogSnapshot = () => sendMessage("takeFullPosthogSnapshot", [])
export const ripple = (x: number, y: number, wait: number, style?: Record<string, string>) => sendMessage("ripple", [x, y, wait, style], {log_rpc: true})
export const fetchData = (url: string, method: HttpMethod, body?: unknown, headers?: Record<string, string>, csrfInfo?: {cookieKey: string, headerKey: string}) => sendMessage("fetchData", [url, method, body, headers || {}, csrfInfo], {log_rpc: true})
export const queryURL = () => sendMessage("queryURL", [])
export const getMetabaseState = (path: Parameters<typeof get>[1]) => sendMessage("getMetabaseState", [path], {log_rpc: true})
export const getJupyterState = (mode?: string) => sendMessage("getJupyterState", [mode], {log_rpc: true, timeout: 3000})
export const getJupyterCodeOutput = (code?: string, notebookId?: string, mode?: string) => sendMessage("getJupyterCodeOutput", [code, notebookId, mode])
export const getPosthogAppContext = (path: Parameters<typeof get>[1]) => sendMessage("getPosthogAppContext", [path], {log_rpc: false})
export const setTextPosthog = (selector: QuerySelector, value: string = '') => sendMessage("setTextPosthog", [selector, value], {log_rpc: true})
export const attachMutationListener = (domQueryMap: DOMQueryMap) => sendMessage("attachMutationListener", [domQueryMap], {log_rpc: true})
export const detachMutationListener = (id: number) => sendMessage("detachMutationListener", [id], {log_rpc: true})
export const forwardToTab = (tool: string, message: string) => sendMessage("forwardToTab", [ tool, message ], {log_rpc: false})
export const getPendingMessage = () => sendMessage("getPendingMessage", [], {log_rpc: false})

// New RPCs meant to replace setValue
export const dragAndDropText = (selector: QuerySelector, value: string = '', index: number = 0) => sendMessage("dragAndDropText", [selector, value, index], {log_rpc: true})
export const typeText = (selector: QuerySelector, value: string = '', index: number = 0) => sendMessage("typeText", [selector, value, index], {log_rpc: true})

export { getUserConfirmation } from "./userConfirmation";
export const gdocReadSelected = () => sendMessage("gdocReadSelected", [], {direct: true})
export const gdocRead = () => sendMessage("gdocRead", [], {direct: true})
export const gdocWrite = (content, url) => sendMessage("gdocWrite", [content, url], {direct: true})
export const gdocImage = (image, width) => sendMessage("gdocImage", [image, width], {direct: true})

// RPCs that exposes MinusX as an API
export { useAppFromExternal } from "./sidechat";
