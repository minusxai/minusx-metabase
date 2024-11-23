import { QuerySelector } from "extension/types"
import { attachNativeElementsListener } from "../app/rpc"

type EventListener = (event: string) => void

const listeners: Record<number, EventListener> = {}

export const addNativeEventListener = async (selector: QuerySelector, listener: EventListener, events: string[]=['click']) => {
  const eventID = await attachNativeElementsListener(selector, events)
}

export const onNativeEvent = (eventID: number, event: string) => {}