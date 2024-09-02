import { QuerySelector } from "../../helpers/pageParse/querySelectorTypes"
import { getElementsFromQuerySelector } from '../../helpers/pageParse/getElements'
import {pick} from 'lodash'

export interface DOMQuery {
    selector: QuerySelector,
    attrs?: string[],
    children?: DOMQueryMap
}

export type DOMQueryMap = Record<string, DOMQuery>

export type DOMQueryResponse = DOMQuerySingleResponse[]

type Coordinates = {
  x: number
  y: number
  left: number
  right: number
  top: number
  bottom: number
  width: number
  height: number
}

export interface DOMQuerySingleResponse {
    attrs: Record<string, any>
    children?: DOMQueryMapResponse
    index: number
    coords: Coordinates
}

export type DOMQueryMapResponse = Record<string, DOMQueryResponse>

export function queryDOMSingle(query: DOMQuery): DOMQueryResponse {
  return getElementsWithParent(query)
}

export function queryDOMMap(queryMap: DOMQueryMap): DOMQueryMapResponse {
  const response: DOMQueryMapResponse = {}
  for (const key in queryMap) {
    response[key] = getElementsWithParent(queryMap[key])
  }
  return response
}

function getElementsWithParent(query: DOMQuery, parent?: Element): DOMQueryResponse {
    const elements = getElementsFromQuerySelector(query.selector, parent)
    const response: DOMQueryResponse = []
    elements.forEach((element, index) => {
      const attrs = Array.from(element.attributes).reduce((obj, attr) => {
        // Expensive
        if (attr.name == 'style') {
            return obj
        }
        if (!query.attrs || query.attrs.includes(attr.name) || query.attrs.includes('*')) {
            obj[attr.name] = attr.value;
        }
        return obj;
      }, {} as Record<string,any>)
      if (!query.attrs || query.attrs.includes('text')) {
        attrs['text'] = element.textContent || ''
      }
      if (!query.attrs || query.attrs.includes('style')) {
        attrs['style'] = Object.entries((element as HTMLElement).style || {})
          .filter(([_, value]) => value)
          .reduce((obj, [key, value]) => {
          obj[key] = value;
          return obj;
        }, {} as Record<string, string>)
      }
      if (!query.attrs || query.attrs.includes('node')) {
        attrs['node'] = element.nodeName
      }
      const bounds = element.getBoundingClientRect()
      const coords = pick(bounds, ['x', 'y', 'left', 'right', 'top', 'bottom', 'width', 'height'])
      const queryResponse: DOMQuerySingleResponse = {
        attrs,
        index,
        coords
      }
      if (query.children) {
        queryResponse.children = {}
        for (const name in query.children) {
          const childQuery = query.children[name]
          queryResponse.children[name] = getElementsWithParent(childQuery, element)
        }
      }
      response.push(queryResponse)
    }) 
    return response
}