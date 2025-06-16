import '../polyfill'
import { configs } from "../../constants"

export type RPCPayload = {
  fn: string
  args: any[]
  id: number
  timeout: number
}

export type RPCError = {
    message: string,
    error?: any
}

type RPCs = { [key: string]: (...args: any[]) => any }

export type RPCSuccessResponse<rpc extends RPCs, key extends keyof rpc> = {
    id: number
    response: ReturnType<rpc[key]>
    type: 'success'
}

export type RPCErrorResponse = {
    id: number
    error: RPCError
    type: 'error'
}

export const initWindowListener = <T extends RPCs> (rpc: T) => {
    const TRUSTED_ORIGINS = [configs.WEB_URL]
    window.addEventListener('message', function(event) {
        const payload: RPCPayload = event.data
        if (!TRUSTED_ORIGINS.includes(event.origin) || !payload || !(payload.fn in rpc)) {
            return false;
        }
        Promise.resolve((async () => {
            const timeout = payload.timeout || 0
            let completed = false
            const rpcPromise = (async () => {
                const response = await rpc[payload.fn](...payload.args);
                completed = true;
                return response;
            })();
            if (!timeout) {
                return rpcPromise;
            }
            const timeoutPromise = new Promise((resolve, reject) => {
                setTimeout(() => {
                    if (completed) resolve(1);
                    reject({
                        message: `${payload.fn} RPC timed out`,
                    });
                }, timeout);
            });
            return Promise.race([rpcPromise, timeoutPromise]);
        })()).then((response) => {
            event.source?.postMessage({
                type: 'success',
                response,
                id: payload.id
            }, {
                targetOrigin: event.origin
            });
        }).catch(rawError => {
            const error: RPCError = {
                message: rawError?.message?? 'An error occurred',
            }
            try {
                error.error = JSON.parse(JSON.stringify(rawError))
            } catch (e) {
                error.error = "Couldn't serialise error"
            }
            event.source?.postMessage({
                type: 'error',
                error,
                id: payload.id
            }, {
                targetOrigin: event.origin
            });
        })
        return true
    });
}