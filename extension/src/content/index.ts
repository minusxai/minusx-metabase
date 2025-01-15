import { configs } from "../constants";
import { initRPC } from "./RPCs";
import { identifyToolNative } from "./RPCs/domEvents";
import { setupStyles } from "../helpers/setupStyles";
import { TOOLS } from "../constants";
import { get } from "lodash"
import { enableButtonDragAndToggle } from "./dragAndToggle";
import { initPosthog, posthogRPCs } from "../posthog";
import { initWindowListener } from "./RPCs/initListeners";
import { setupScript } from "../helpers/setupScript";
import { once } from "lodash";
import { appSetupConfigs } from "./apps";
import { IframeInfo } from "./types";
import { getExtensionID } from "../background/identifier";
import { registerTabIdForTool } from "./RPCs/rpcCalls";

const WEB_URL = configs.WEB_URL
async function _init(localConfigs: Promise<object>) {
  await localConfigs
  const mode = get(localConfigs, "configs.mode", "open-sidepanel")
  const extensionId = await getExtensionID()
  const { tool, toolVersion, inject } = identifyToolNative()
  if (configs.IS_DEV) {
    console.log('Injecting debug script')
    setupScript(`debug.bundle.js`)
  } else {
    console.log = () => {}
    console.error = () => {}
  }
  if (tool === TOOLS.OTHER) {
    return
  } 
  if (inject) {
    setupScript(`${tool}.bundle.js`)
  }
  registerTabIdForTool({ tool });
  initRPC()
  if (!configs.IS_DEV) {
    // initialise Posthog
    initPosthog()
    initWindowListener(posthogRPCs)
  }

  setupStyles('content.styles.css')
  // setupStyles(configs.WEB_CSS_CONFIG_URL, false)

  const origin = window.location.origin
  const href = window.location.href
  const width = '350'
  const variant = 'default'

  const iframeInfo: IframeInfo = {
    tool,
    toolVersion,
    origin,
    href,
    mode,
    r:extensionId,
    variant,
    width,
    gitCommitId: configs.GIT_COMMIT_ID,
    npmPackageVersion: configs.NPM_PACKAGE_VERSION,
  }

  // Google Docs is not supported yet
  // if (tool == 'google') {
    // #HACK to insert as a 'collaborator' in Google Apps
    // setTimeout(() => {
    //   const gDocPresenceContainer = document.querySelector("div.docs-presence-plus-widget-inner.goog-inline-block")
    //   const minusXButton = document.createElement('div')
    //   minusXButton.className = 'docs-presence-plus-collab-widget-container goog-inline-block docs-presence-plus-collab-widget-focus'
    //   minusXButton.ariaLabel = 'MinusX'
    //   minusXButton.role = 'button'
    //   minusXButton.id = 'minusx-google-button'
    //   minusXButton.style.backgroundImage = `url(${chrome.runtime.getURL('logo_x.svg')})`
    //   minusXButton.style.backgroundSize = 'contain'
    //   minusXButton.style.cursor = 'pointer'
    //   gDocPresenceContainer?.appendChild(minusXButton)
    // }, 2000)
    // return
  // }
  if (tool == 'google' && toolVersion == 'docs') {
    return
  }

  const root = document.createElement('div')
  root.className = `mode-${mode} closed invisible`
  root.id = 'minusx-root';

  const iframe = document.createElement('iframe');
  iframe.id = 'minusx-iframe'; 
  if (tool == 'google') {
    iframeInfo.variant = 'instructions'
  }
  const params = new URLSearchParams(iframeInfo as unknown as Record<string, string>).toString()
  iframe.src = `${WEB_URL}?${params}`;
  const iframeParent = document.createElement('div')
  iframeParent.id = 'minusx-iframe-parent'
  iframeParent.appendChild(iframe)
  root.appendChild(iframeParent)

  const button = document.createElement('div');
  button.id = 'minusx-toggle';
  button.title = 'Cmd-K to toggle';
  // button.style.backgroundImage = `url(${chrome.runtime.getURL('logo_x.svg')})`
  // enable dragging and toggling the minusx button
  enableButtonDragAndToggle(button)
  root.appendChild(button)
  document.body.appendChild(root);
}

const init = once(_init)
const localConfigs = chrome.storage.local.get();
for (const appSetupConfig of appSetupConfigs) {
  const { appSetup } = appSetupConfig
  appSetup.setup(localConfigs)
}

if (document.readyState === 'complete') {
  init(localConfigs)
} else {
  document.addEventListener('DOMContentLoaded', () => {
    init(localConfigs)
  })
}