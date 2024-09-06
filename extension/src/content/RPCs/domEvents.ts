import { configs, TOOLS } from "../../constants";
import {isEmpty, some} from 'lodash'
import {get, every} from 'lodash'
import { DOMQuery, queryDOMSingle } from "./getElements";
import { appSetupConfigs } from "../apps";

export async function setMinusxMode(mode: string) {
  const root = document.getElementById('minusx-root') as HTMLIFrameElement;
  if (!root) {
    return
  }
  root.classList.forEach(cls => {
    if (cls.startsWith('mode-')) {
        root.classList.remove(cls);
    }
  });
  root.classList.add(`mode-${mode}`)
  sendIFrameMessage({
    key: 'mode',
    value: mode
  })
}

export type ValidMinusxRootClass = 'closed' | 'invisible'

export function checkMinusXClassName(className: ValidMinusxRootClass) : boolean {
  return document.getElementById('minusx-root')?.classList.contains(className) || false
}

export async function toggleMinusXRoot(className: ValidMinusxRootClass, value?: boolean) {
  const root = document.getElementById('minusx-root')
  if (!root) {
    return
  }
  if (value == undefined) {
    value = !root.classList.contains(className)
  }
  if (value) {
    root.classList.add(className)
  } else {
    root.classList.remove(className)
  }
  sendIFrameMessage({
    key: `class-${className}`,
    value
  })
}

export async function toggleMinusX(value?: boolean) {
  return toggleMinusXRoot('closed', value)
}

export type ToolID = {
  tool: string,
  toolVersion: string
  inject?: boolean
}

export function identifyToolNative(): ToolID {
  for (const appSetupConfig of appSetupConfigs) {
    const { name, appSetup, inject } = appSetupConfig
    const toolVersion = identifyToolVersion(appSetup.fingerprintMatcher)
    if (toolVersion) {
      return {
        tool: name,
        toolVersion,
        inject
      }
    }
  }
  return {
    tool: TOOLS.OTHER,
    toolVersion: TOOLS.OTHER
  }
}

export type DomQueryToolCondition = {
  type: 'domQueryCondition'
  domQuery: DOMQuery
  path?: string
  negative?: boolean
}

export type UrlRegexToolCondition = {
  type: 'urlRegexCondition'
  urlRegex: string
  negative?: boolean
}

interface ToolCombination {
  type: 'combination'
  or?: ToolExpression[];
  and?: ToolExpression[];
}

export type ToolExpression = ToolCombination | DomQueryToolCondition | UrlRegexToolCondition;

type Fingerprint = string;
export type ToolMatcher = Record<Fingerprint, ToolExpression>

const evaluateToolExpression = (expression: ToolExpression): boolean => {
  if (expression.type == 'domQueryCondition') {
    const elements = queryDOMSingle(expression.domQuery)
    const element = expression.path ? get(elements, expression.path) : elements
    const result = !isEmpty(element)
    if (expression.negative) {
      return !result
    }
    return result
  } else if (expression.type == 'urlRegexCondition') {
    const url = window.location.href
    // do regex match
    const regex = new RegExp(expression.urlRegex)
    const result = regex.test(url)
    if (expression.negative) {
      return !result
    }
    return result
  } else if (expression.type == 'combination') {
    let condition = true
    if (expression.and) {
      condition &&= every(expression.and.map(evaluateToolExpression))
    }
    if (expression.or) {
      condition &&= some(expression.or.map(evaluateToolExpression))
    }
    return condition
  }
  return false;
}

export function identifyToolVersion(toolVersionMatcher: ToolMatcher) {
  if (!toolVersionMatcher) {
    return
  }
  for (const toolVersion in toolVersionMatcher) {
    const toolConfig = toolVersionMatcher[toolVersion]
    if (evaluateToolExpression(toolConfig)) {
      return toolVersion
    }
  }
}

export type IFrameKV = {
  key: string,
  value: any,
}

export const sendIFrameMessage = (payload: IFrameKV) => {
  const event = {
    type: 'STATE_SYNC',
    payload
  }
  const iframe = document.getElementById('minusx-iframe') as HTMLIFrameElement
  if (!iframe) {
    return
  }
  iframe?.contentWindow?.postMessage(event, configs.WEB_URL)
}