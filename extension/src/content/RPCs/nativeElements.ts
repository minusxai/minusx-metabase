import { QuerySelector } from "../../helpers/pageParse/querySelectorTypes";
import { attachEventsListener } from "./mutationObserver";

export const attachNativeElementsListener = (selector: QuerySelector, events: string[]=['click']) => {
  const eventID = attachEventsListener(selector, () => {
    console.log('Element clicked')
  }, events)
  return eventID
}

export type AttachType = 'before' | 'after' | 'firstChild' | 'lastChild'

export const addNativeElements = (selector: QuerySelector, htmlElement: object, attachType: AttachType) => {

}