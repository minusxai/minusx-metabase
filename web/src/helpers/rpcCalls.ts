export const remotelySendDebuggerCommand = async ({
  tabId,
  method,
  params,
}) => {
  return await sendRemoteMessage({
    fn: 'sendDebuggerCommand',
    args: { tabId, method, params },
  });
};

interface TabIDArgs {
  tabId: number
}

export const remotelyAttachDebugger = async (args: TabIDArgs) => {
  return await sendRemoteMessage({ fn: 'attachDebugger', args });
};

export const remotelyDetachDebugger = async (args: TabIDArgs) => {
  return await sendRemoteMessage({ fn: 'detachDebugger', args });
};

export const remotelyDisableIncompatibleExtensions = async () => {
  return await sendRemoteMessage({ fn: 'disableIncompatibleExtensions' });
};

export const remotelyReenableExtensions = async () => {
  return await sendRemoteMessage({ fn: 'reenableExtensions' });
};

interface ActiveChromeTab extends chrome.tabs.Tab {
  id: number
}
export const findActiveTab = async () => {
  return (await sendRemoteMessage({ fn: 'findActiveTab' })) as ActiveChromeTab;
};

export const captureVisibleTab = async (): Promise<string> => {
  return (await sendRemoteMessage({ fn: 'captureVisibleTab' })) as string;
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
        // console.log('Response from background script', payload, error);
        if (error) {
          return reject(error);
        }
        return resolve(payload as string);
      }
    );
  });
};