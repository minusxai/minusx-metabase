import { getElementsFromQuerySelector } from "../../helpers/pageParse/getElements";
import { QuerySelector } from "../../types";

let _eventID = 0

export const attachNativeElementsListener = (selector: QuerySelector, events: string[]=['click']) => {
  const elements = getElementsFromQuerySelector(selector)
  const eventID = _eventID++
  elements.forEach(element => {
    events.forEach(event => {
      element.addEventListener(event, () => {
        console.log('Element clicked', element, eventID)
      })
    })
  })
  return eventID
}

export type AttachType = 'before' | 'after' | 'firstChild' | 'lastChild'

export const addNativeElements = (selector: QuerySelector, htmlElement: object, attachType: AttachType) => {

}