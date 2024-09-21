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
  // Google Docs is not supported yet
  if (tool == 'google' && toolVersion == 'docs') {
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
  const root = document.createElement('div')
  root.className = `mode-${mode} closed invisible`
  root.id = 'minusx-root';

  const iframe = document.createElement('iframe');
  iframe.id = 'minusx-iframe';
  const iframeInfo: IframeInfo = {
    tool,
    toolVersion,
    origin,
    href,
    mode,
    r:extensionId,
    gitCommitId: configs.GIT_COMMIT_ID,
    npmPackageVersion: configs.NPM_PACKAGE_VERSION,
  }
  const params = new URLSearchParams(iframeInfo as unknown as Record<string, string>).toString()
  iframe.src = `${WEB_URL}?${params}`;
  const iframeParent = document.createElement('div')
  iframeParent.id = 'minusx-iframe-parent'
  iframeParent.appendChild(iframe)
  root.appendChild(iframeParent)

  const button = document.createElement('div');
  button.id = 'minusx-toggle';
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