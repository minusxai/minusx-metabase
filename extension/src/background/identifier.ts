import { get, throttle } from "lodash";

function generateIdentifier() {
    // E.g. 8 * 8 = 64 bits token
    var randomPool = new Uint8Array(8);
    crypto.getRandomValues(randomPool);
    var hex = '';
    for (var i = 0; i < randomPool.length; ++i) {
        hex += randomPool[i].toString(16);
    }
    return hex;
}

async function _getExtensionID() {
    const localConfigs = await chrome.storage.local.get('id');
    let id = get(localConfigs, "id")
    if (!id) {
        id = generateIdentifier()
        await chrome.storage.local.set({ id });
    }
    return id
}

// Assume local storage read won't take 3 seconds
export const getExtensionID = throttle(_getExtensionID, 3000);