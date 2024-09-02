// Execute script in the webpage context
export function setupStyles(styleURL: string, isChrome = true): void {
  // Remember to add in manifest and webpack.config respectively
  // and webpack.config, options.entry
  const url = isChrome ? chrome.runtime.getURL(styleURL) : styleURL;
  let link = document.createElement("link");
  link.setAttribute('rel', 'stylesheet');
  link.setAttribute('href', url);
  document.head.appendChild(link);
}