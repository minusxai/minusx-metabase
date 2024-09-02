import { remotelySendDebuggerCommand } from './rpcCalls'

const sendCommand = async (tabId: number, method: string, params?: any) => {
  // return chrome.debugger.sendCommand({ tabId }, method, params);
  const response = await remotelySendDebuggerCommand({
    tabId,
    method,
    params,
  })
  return response
}

type Point = {
  x: number
  y: number
}
const getCenterCoordinates = (element: Element): Point => {
  const {x, y, width, height} = element.getBoundingClientRect()
  const centerX = x + width/2
  const centerY = y + height/2
  return { x: centerX, y: centerY }
}

const clickAtPosition = async (tabId:number, point: Point, clickCount = 1): Promise<void> => {
  const {x, y} = point
  await sendCommand(tabId, 'Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x,
    y,
    button: 'left',
    clickCount,
  })
  await sendCommand(tabId, 'Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x,
    y,
    button: 'left',
    clickCount,
  })
}

type KeyOptions = {
  type: string
  text: string
  key?: string
  code?: string
}
const typeChar = async (tabId: number, char: string) => {
  const keyOptions: KeyOptions = {
    type: 'keyDown',
    text: char,
  };
  if (char === '\n' || char === '\r') {
    keyOptions.key = 'Enter'
    keyOptions.code = 'Enter'
  }
  await sendCommand(tabId, 'Input.dispatchKeyEvent', keyOptions)
  keyOptions.type = 'keyUp'
  await sendCommand(tabId, 'Input.dispatchKeyEvent', keyOptions)
}

export const typeText = async (tabId: number, text: string): Promise<void> => {
  // replace \n with \r
  const replacedText = text.replace(/\n/g, '\r')
  for (const char of replacedText) {
    await typeChar(tabId, char)
  }
}

export const clickAtCenter = async (tabId:number, element: Element, clickCount = 1): Promise<void> => {
  const point = getCenterCoordinates(element)
  await clickAtPosition(tabId, point, clickCount)
}