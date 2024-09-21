import { getStuffFromToolInstance } from "./rpcCalls";
import { configs } from "../../constants";

export const sendIFrameMessageAndGetResponse = async (message: string) => {
  const iframe = document.getElementById('minusx-iframe') as HTMLIFrameElement
  if (!iframe) {
    return
  }
  // make a uuid specific to this call
  const uuid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  const event = {
    type: 'CROSS_TAB_REQUEST',
    uuid,
    message
  }
  return new Promise((resolve) => {
    const listener = (event: MessageEvent) => {
      if (event.data.type == 'RESPONSE' && event.data.uuid == uuid) {
        resolve(event.data.payload)
        window.removeEventListener('message', listener)
      }
    }
    window.addEventListener('message', listener)
    iframe?.contentWindow?.postMessage(event, configs.WEB_URL)
  })
}

let _messageReceived = {}

export async function respondToOtherTab({ message }: { message: string }) {
  // return `Hi from ${window.location.href} ` + message;
  if (location.origin == 'https://docs.google.com') {
    _messageReceived = message
    return true
  } else {
    return sendIFrameMessageAndGetResponse(message)
  }
}

export async function getPendingMessage() {
  // send message to bg script using bgscript's RPC
  let message = _messageReceived
  _messageReceived = {}
  return message
}

export async function forwardToTab(tool: string, message: string) {
  // send message to bg script using bgscript's RPC
  return getStuffFromToolInstance({ tool, message })
}