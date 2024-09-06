import { getOrigin } from "../helpers/origin";
import { RPCKey, RPCPayload, RPCResponse } from "extension/types";
import { captureEvent } from "../tracking";
let _index = 0
const EVENT_RPC = "rpc"
const EVENT_RPC_CALLBACK = "rpc_callback"

const addCallback = (id: number, origin: string, callback: Function) => {
    const handler = function(event: WindowEventMap["message"]) {
        const payload = event.data
        // if (event.origin !== origin || !payload || payload.id !== id) {
        if (!payload || payload.id !== id) {
            return;
        } 
        window.removeEventListener('message', handler)
        return callback(payload)
    }
    window.addEventListener('message', handler)
}

export interface SendMessageOptions {
    log_rpc?: boolean
    timeout?: number
}

export const sendMessage = async <key extends RPCKey>(
    fn: key,
    args: RPCPayload<key>["args"],
    options: SendMessageOptions = {}
):  Promise<RPCResponse<key>> => {
  const origin = getOrigin()
  const id = _index++
  const log_rpc = options.log_rpc || false
  const timeout = options.timeout || 0
  return new Promise((resolve) => {
    if (origin == '') {
        return resolve({
            id,
            type: 'error',
            error: {
                message: 'Origin not found',
            }
        })
    }
    const start_time = Date.now()
    addCallback(id, origin, (payload: RPCResponse<key>) => { 
        if (log_rpc) {
            captureEvent(`${EVENT_RPC_CALLBACK}/${fn}`, {
                fn,
                args,
                id,
                timeout,
                origin,
                duration: Date.now() - start_time,
                payload,
            })
        }
        return resolve(payload)
    })
    if (log_rpc) {
        captureEvent(`${EVENT_RPC}/${fn}`, {
            fn,
            args,
            id,
            timeout,
            origin
        })
    }
    // window.parent.postMessage({fn, args, id, timeout}, origin);
    const msg = {fn, args, id, timeout}
    let parent = options.direct ? window.parent : window.parent.parent.parent.parent.parent.parent.parent.parent;
    // let parent = window.parent.parent.parent.parent.parent.parent.parent.parent;
    parent.postMessage(msg, '*');
  })
}