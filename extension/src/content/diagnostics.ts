import { initBgRpc } from 'extension'

const getPageSource = (selector: any): string => {
  if (selector) {
      selector = document.querySelector(selector);
      if (!selector) return "ERROR: querySelector failed to find node"
  } else {
      selector = document.documentElement;
  }
  return selector.outerHTML;
}


export const rpc = {
  getPageSource,
}
initBgRpc(rpc)