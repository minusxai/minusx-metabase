export type Base64URL = string

export interface Base64Image {
  url: Base64URL,
  type: Subset<ImageType, "BASE64">
  width: number,
  height: number,
  context: ImageContext,
}

export type * from './helpers/pageParse/querySelectorTypes'
 
import type { rpc as contentRPC } from './content/RPCs'
import type { posthogRPCs } from './posthog'
import type { RPCPayload as RPCPayloadGeneric } from './content/RPCs/initListeners'
import type { RPCSuccessResponse as RPCSuccessResponseGeneric, RPCErrorResponse } from './content/RPCs/initListeners'

export type RPC = typeof contentRPC & typeof posthogRPCs

export type RPCKey = keyof RPC

export interface RPCPayload<key extends RPCKey> extends RPCPayloadGeneric {
    fn: key
    args: Parameters<RPC[key]>
}

interface RPCSuccessResponse<key extends RPCKey> extends RPCSuccessResponseGeneric<RPC, key> {
    response: ReturnType<RPC[key]>
}

export type RPCResponse<key extends RPCKey> = RPCSuccessResponse<key> | RPCErrorResponse

export type { ToolExpression } from './content/RPCs/domEvents'
export type { SubscriptionPayload } from './content/RPCs/mutationObserver'

export type { DOMQuery, DOMQueryMap, DOMQueryResponse, DOMQueryMapResponse, DOMQuerySingleResponse } from './content/RPCs/getElements'
export type { HttpMethod } from './content/RPCs/fetchData'
export type { ValidMinusxRootClass, ToolMatcher } from './content/RPCs/domEvents'

export type { IframeInfo } from './content/types'
export type { AttachType, HTMLJSONNode } from './content/RPCs/mutationObserver'