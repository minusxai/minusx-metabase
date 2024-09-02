import { DOMQuery, DOMQueryMap, DOMQueryMapResponse, SubscriptionPayload } from "extension/types";
import { attachMutationListener, detachMutationListener } from "../app/rpc";

type Callback = (d: SubscriptionPayload) => void

const listeners: Record<number, Callback> = {}

export const subscribe = async (domQueryMap: DOMQueryMap, callback: Callback) => {
    const id = await attachMutationListener(domQueryMap)
    listeners[id] = callback
    return id
}

export const unsubscribe = async (id: number) => {
    delete listeners[id]
    await detachMutationListener(id)
}

export const onSubscription = (payload: SubscriptionPayload) => {
    const { id } = payload
    if (!(id in listeners)) {
        return
    }
    listeners[id](payload)
}