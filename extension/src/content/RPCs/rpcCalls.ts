// const remotelySendDebuggerCommand = async ({
//   tabId,
//   method,
//   params,
// }) => {
//   return await sendRemoteMessage({
//     fn: 'sendDebuggerCommand',
//     args: { tabId, method, params },
//   });
// };

// To add once we support chrome.debugger
// interface TabIDArgs {
//   tabId: number
// }

// const remotelyAttachDebugger = async (args: TabIDArgs) => {
//   return await sendRemoteMessage({ fn: 'attachDebugger', args });
// };

// const remotelyDetachDebugger = async (args: TabIDArgs) => {
//   return await sendRemoteMessage({ fn: 'detachDebugger', args });
// };

// const remotelyDisableIncompatibleExtensions = async () => {
//   return await sendRemoteMessage({ fn: 'disableIncompatibleExtensions' });
// };

// const remotelyReenableExtensions = async () => {
//   return await sendRemoteMessage({ fn: 'reenableExtensions' });
// };

// interface ActiveChromeTab extends chrome.tabs.Tab {
//   id: number
// }
// const findActiveTab = async () => {
//   return (await sendRemoteMessage({ fn: 'findActiveTab' })) as ActiveChromeTab;
// };

export const captureVisibleTab = async (): Promise<string> => {
  return (await sendRemoteMessage({ fn: 'captureVisibleTab' })) as string;
}
export const registerTabIdForTool = async ({ tool }: { tool: string}) => {
  return await sendRemoteMessage({ fn: 'registerTabIdForTool', args: { tool } });
}
export const getStuffFromToolInstance = async ({ tool, message }: { tool: string, message: string }) => {
  return await sendRemoteMessage({ fn: 'getStuffFromToolInstance', args: { tool, message } });
}
interface RemoteMessage {
  fn: string,
  args?: unknown
}

const sendRemoteMessage = async ({ fn, args }: RemoteMessage) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        fn,
        args,
      },
      (message) => {
        const { payload, error } = message;
        if (error) {
          return reject(error);
        }
        return resolve(payload as string);
      }
    );
  });
};