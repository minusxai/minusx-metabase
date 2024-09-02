export const captureVisibleTab = async () => {
  return await new Promise((resolve) => {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, dataUrl => {
      console.log('Data url retrieved is', dataUrl)
      resolve(dataUrl)
    });
  })
}