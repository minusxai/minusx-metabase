import { QuerySelector } from "extension/types"
import { attachNativeElementsListener } from "../app/rpc"

type EventListener = (event: string) => void

interface NativeEventPayload {
  eventID: number
  event: string
}

const listeners: Record<number, EventListener> = {}

export const addNativeEventListener = async (selector: QuerySelector, listener: EventListener, events: string[]=['click']) => {
  const eventID = await attachNativeElementsListener(selector, events)
  listeners[eventID] = listener
}

export const onNativeEvent = (payload: NativeEventPayload) => {
  const { eventID, event } = payload
  if (!(eventID in listeners)) {
    return
  }
  listeners[eventID](event)
}