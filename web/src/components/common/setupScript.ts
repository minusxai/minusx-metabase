// Execute script in the webpage context
export function setup(scriptURL: string): void {
  // Remember to add in manifest and webpack.config respectively
  // and webpack.config, options.entry
  const url = chrome.runtime.getURL(scriptURL);
  let script = document.createElement("script");
  script.setAttribute('type', 'text/javascript');
  script.setAttribute('src', url);
  document.body.appendChild(script);
}