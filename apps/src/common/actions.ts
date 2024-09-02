import { utils } from 'web'
import { getAppState } from './stateActions';
import { DefaultMessageContent } from '../../state/chat/reducer'
import * as RPC from '../../app/rpc';
import { getQuerySelectorMap } from './querySelectorMap';
import { get, findIndex } from 'lodash'

const { sleep } = utils

export const respondToUser = ({ content }) => {
  const actionContent: DefaultMessageContent = {
    type: 'DEFAULT',
    text: content,
    images: []
  }
  return actionContent
}

export const wait = async ({ time }) => {
  await sleep(time);
}

export const getCellOutputValue = async ({ index }) => {
  const state = await getAppState();
  if (state.cells.length <= index) {
    return; // TODO: how to fail?
  }
  const cell = state.cells[index];
  return cell.output;
}

export const click = async ({ query, index = 0}) => {
  // const tabId = getState().appInfo.tabId
  // const element = getElementFromQuery(query, index);
  // const selectorMap = getQuerySelectorMap()
  // const selector = selectorMap[query];
  // if (tabId && element) {
  //   await RPC.scrollIntoView(selector)
  //   await clickAtCenter(tabId, element, 1)
  // }
}

export const uClick = async ({ query, index = 0}) => {
  const selectorMap = getQuerySelectorMap()
  const selector = selectorMap[query];
  return await RPC.uClick(selector, index)
}

export const uDblClick = async ({ query, index = 0}) => {
  const selectorMap = getQuerySelectorMap()
  const selector = selectorMap[query];
  return await RPC.uDblClick(selector, index)
}

export const scrollIntoView = async ({ query, index = 0}) => {
  const selectorMap = getQuerySelectorMap()
  const selector = selectorMap[query];
  return await RPC.scrollIntoView(selector, index)
}

export const setValue = async ({ query, index = 0, value = '' }) => {
  // const tabId = getState().appInfo.tabId
  // const element = getElementFromQuery(query, index);
  // const selectorMap = getQuerySelectorMap()
  // const selector = selectorMap[query];
  // if (tabId && element) {
  //   await RPC.scrollIntoView(selector)
  //   document.execCommand('selectall', null, false)
  //   await typeText(tabId, value)
  // }
}

export const uSetValue = async ({ query, value='', index = 0}) => {
  const selectorMap = getQuerySelectorMap()
  const selector = selectorMap[query];
  await getRippleEffect(selector, index)
  await uDblClick({ query, index });
  await RPC.uSetValue(selector, value, index, 'fast')
}

const getRippleEffect = async (selector, index) => {
  const queryResponse = await RPC.queryDOMSingle({selector})
  const coords = get(queryResponse, `[${index}].coords`)
  if (coords) {
    const { x, y } = coords
    const rippleTime = 500
    const numRipples = 2
    RPC.ripple(x, y, rippleTime, {
      "background-color": 'rgba(22, 160, 133, 1.0)',
      "animation": `web-agent-ripple ${rippleTime/(1000 * numRipples)}s infinite`

    })
  }
}

export const waitForCellExecution = async ({ index }) => {
  while (true) {
    const state = await getAppState();
    const cell = state.cells[index];
    // check if cell.inputAreaPrompt has an asterisk (it can be anywhere in the string)
    if (!cell.isExecuting) {
      break
    }
    await sleep(100);
  }
}

export const getCurrentlySelectedCell = async () => {
  const querySelectorMap = getQuerySelectorMap()
  const queryResponse = await RPC.queryDOMSingle({selector: querySelectorMap.whole_cell})
  const selectedCell = findIndex(queryResponse, cell => cell.attrs.class.includes?.('jp-mod-selected'))
  return selectedCell
}

export const uHighlight = RPC.uHighlight