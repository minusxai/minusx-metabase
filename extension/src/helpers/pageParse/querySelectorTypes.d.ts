import type { Subset } from "../utils"

type QuerySelectorType = 'XPATH' | 'CSS'
export type QuerySelectorValue = string
type QuerySelectorKey = string
type QuerySelectorRange = {
    from?: number
    to?: number
}

interface BaseQuerySelector {
    type: QuerySelectorType
    selector: QuerySelectorValue
    range?: QuerySelectorRange
}

interface XPATHQuerySelector extends BaseQuerySelector {
    type: Subset<QuerySelectorType, 'XPATH'>
}

interface CSSQuerySelector extends BaseQuerySelector {
    type: Subset<QuerySelectorType, 'CSS'>
}

export type QuerySelector = XPATHQuerySelector | CSSQuerySelector

export type QuerySelectorMap = Record<QuerySelectorKey, QuerySelector>