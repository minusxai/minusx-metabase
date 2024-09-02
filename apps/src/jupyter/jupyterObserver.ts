import { isEmpty } from "lodash";

const MAX_OBSERVER_TIME = 3000

function modifyJupyterConfig(jsonData: any) {
    jsonData.exposeAppInBrowser = true;
    return jsonData;
}

function trackScriptTag(scriptNode: Node) {
    const observer = new MutationObserver(() => {
        if (scriptNode) {
            const originalJson = JSON.parse(scriptNode.textContent || '{}');
            if (!isEmpty(originalJson)) {
                const modifiedJson = modifyJupyterConfig(originalJson);
                scriptNode.textContent = JSON.stringify(modifiedJson);
                observer.disconnect();
            }
        }
    });

    if (scriptNode) {
        observer.observe(scriptNode, { childList: true, subtree: true });
        setTimeout(() => {
            observer.disconnect()
        }, MAX_OBSERVER_TIME)
    }
}

function processScriptTag(scriptTag: Node) {
    if (scriptTag) {
        const originalJson = JSON.parse(scriptTag.textContent || '{}');
        if (isEmpty(originalJson)) {
            return trackScriptTag(scriptTag)
        }
        const modifiedJson = modifyJupyterConfig(originalJson);
        scriptTag.textContent = JSON.stringify(modifiedJson);
    }
}

// Observe the document for the addition of the script tag
export const initObserveJupyterApp = () => {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.tagName === 'SCRIPT' && node.id === 'jupyter-config-data') {
                        processScriptTag(node);
                        console.log('Found script! removing observer')
                        observer.disconnect();  // Stop observing once we've found and processed the script
                    }
                });
            }
        });
    });
    
    observer.observe(document.documentElement, { childList: true, subtree: true });
    document.onload = function() {
        console.log('Removing observer')
        observer.disconnect();
    }
    setTimeout(() => {
        console.log('Removing observer')
        observer.disconnect();
    }, MAX_OBSERVER_TIME)
    console.log('Started observing')
}
