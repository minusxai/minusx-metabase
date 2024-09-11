import { attachDebugger, detachDebugger } from './chromeDebugger';
import { configs } from '../../constants';
import {
  disableIncompatibleExtensions,
  reenableExtensions,
} from './disableExtensions';
import { captureVisibleTab } from './captureVisibleTab'
import { TOOLS } from '../../constants';
import { getExtensionID } from '../identifier';
import { get } from 'lodash';
import { ToolID } from '../../content/RPCs/domEvents';

let INVALID_TAB = 'Invalid tab';
const FUNCTIONS = {
  sendDebuggerCommand: async ({ tabId, method, params }) => {
    console.log('Sending debugger command', tabId, method, params);
    return await chrome.debugger.sendCommand({ tabId }, method, params);
  },
  findActiveTab: async (_, sender) => {
    return sender.tab
    // return (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  },
  attachDebugger: async ({ tabId }) => {
    return await attachDebugger(tabId);
  },
  disableIncompatibleExtensions: async () => {
    return await disableIncompatibleExtensions();
  },
  detachDebugger: async ({ tabId }) => {
    return await detachDebugger(tabId);
  },
  reenableExtensions: async () => {
    return await reenableExtensions();
  },
  captureVisibleTab,
};

const executeFunction = async (message, sender, callback) => {
  const { fn, args } = message;
  try {
    if (fn in FUNCTIONS) {
      const payload = await FUNCTIONS[fn](args, sender);
      return callback({ payload });
    } else {
      throw new Error('Undefined function', fn);
    }
  } catch (error) {
    console.log('Error is', error);
    callback({ error });
  }
};

export const getActiveTab = async () => {
  try {
    return (await chrome.tabs.query({ active: true, currentWindow: true }))[0].id
  } catch (err) {
    return
  }
}

const getTool = async (): Promise<ToolID> => {
  try {
    const response = (await sendContentScriptMessage({fn: 'identifyToolNative'})).response
    if (!response) {
      return {
        tool: TOOLS.OTHER,
        toolVersion: TOOLS.OTHER
      }
    }
    return response
  } catch (err) {
    return {
      tool: TOOLS.OTHER,
      toolVersion: TOOLS.OTHER
    }
  }
}

const isMinusXInvisible = async () => {
  try {
    return (await sendContentScriptMessage({fn: 'checkMinusXClassName', args: 'invisible'})).response
  } catch (err) {
    return false
  }
}

async function callIfNotOther() {
  console.log('Action clicked!');
  sendContentScriptMessage({fn: 'toggleMinusX'})
}
const setCallbacksBasedOnTool = async () => {
  console.log("setting callbacks based on tool")
  let toolID = await getTool();
  let currentTool = toolID.tool;
  let isInvisible = await isMinusXInvisible();
  console.log("is invisible", isInvisible)
  
  console.log("current tool is", currentTool)
  chrome.action.onClicked.removeListener(callIfNotOther)
  chrome.action.setPopup({popup: ''})
  if (currentTool == TOOLS.OTHER || currentTool == INVALID_TAB || isInvisible) {
    chrome.action.setPopup({popup: 'popup.html'})
  } else {
    chrome.action.onClicked.addListener(callIfNotOther)
  }
}
export function initBackgroundRPC() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    executeFunction(message, sender, sendResponse);
    return true;
  });

  chrome.commands.onCommand.addListener(async (command) => {
    console.log(`Command: ${command}`);
    if (command == 'open-chat') {
      console.log('Chat opened!');
      sendContentScriptMessage({fn: 'toggleMinusX'})
    }
  });

  // check for tab changes and set currentTool
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    let currentTabId = await getActiveTab();
    if (currentTabId == tabId) {
      console.log("tab updated")
      setCallbacksBasedOnTool()
    }
  });
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    let currentTabId = await getActiveTab();
    if (currentTabId == activeInfo.tabId) {
      console.log("tab activated")
      setCallbacksBasedOnTool()
    }
  });

  // chrome.action.onClicked.addListener(async () => {
   
  //   if (curren == TOOLS.OTHER) {
  //     // show popup
  //     chrome.
  //   } else {
  //     sendContentScriptMessage({fn: 'toggleMinusX'})
  //   }
  // });

  if (!configs.IS_DEV) {
    chrome.runtime.onInstalled.addListener(async (details) => {
      const extensionId = await getExtensionID();
      if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        const freshInstallLink = `https://minusx.ai/hello-world?r=${extensionId}`;
        chrome.tabs.create({ url: freshInstallLink }, function (tab) {
          console.log(`New tab launched with ${freshInstallLink}`);
        });
      }
      else if (details.reason === chrome.runtime.OnInstalledReason.UPDATE) {
        console.log("Updated");
        // const updateLink = "https://minusx.ai/releases";
        // chrome.tabs.create({ url: updateLink }, function (tab) {
        //   console.log(`New tab launched with ${updateLink}`);
        // });
      }
    });
  }
}

interface RemoteMessage {
  fn: string,
  args?: unknown
}

const sendContentScriptMessage = async ({ fn, args }: RemoteMessage) => {
  const tabId = await getActiveTab()
  if (tabId) {
    return chrome.tabs.sendMessage(tabId, {fn, args})
  }
  return INVALID_TAB
}
