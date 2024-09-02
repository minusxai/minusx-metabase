import {initBackgroundRPC} from './RPCs'
import { configs as appConfigs } from '../constants'
import { getExtensionID } from './identifier';

initBackgroundRPC()

if (!appConfigs.IS_DEV) {
    console.log = () => {}
}

async function fetchAndStoreConfigs() {
    try {
        const id = await getExtensionID()
        const configURL = `${appConfigs.WEB_JSON_CONFIG_URL}?r=${id}`;
        const response = await fetch(configURL);
        if (!response.ok) throw new Error('Network response was not ok');
        const configs = await response.json();
        await chrome.storage.local.set({ configs });
    } catch (error) {
        console.error('Error fetching or storing configs:', error);
    }
}

fetchAndStoreConfigs()
let CONFIG_REFRESH_TIME = 10*60*1000
if (appConfigs.IS_DEV) {
    CONFIG_REFRESH_TIME = 5*1000
}
setInterval(fetchAndStoreConfigs, CONFIG_REFRESH_TIME);