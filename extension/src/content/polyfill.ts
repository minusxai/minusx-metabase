(function setupChromeShim() {
  if (typeof window.chrome === 'undefined') {
    window.chrome = {};
  }

  // ========== chrome.runtime ==========
  chrome.runtime = chrome.runtime || {};
  chrome.runtime.id = chrome.runtime.id || undefined;

  chrome.runtime.sendMessage = chrome.runtime.sendMessage || function (...args) {
    console.warn('chrome.runtime.sendMessage is not available', args);
  };

  chrome.runtime.onMessage = chrome.runtime.onMessage || {
    addListener: function () {
      console.warn('chrome.runtime.onMessage.addListener is not available');
    }
  };

  chrome.runtime.getURL = chrome.runtime.getURL || function (path) {
    console.warn('chrome.runtime.getURL is not available', path);
    return '/' + path;
  }

  // ========== chrome.storage ==========
  chrome.storage = chrome.storage || {};

  chrome.storage.local = chrome.storage.local || {
    get: function (keys, callback) {
      console.warn('chrome.storage.local.get is not available', keys);
      callback?.({});
    },
    set: function (items, callback) {
      console.warn('chrome.storage.local.set is not available', items);
      callback?.();
    },
    remove: function (keys, callback) {
      console.warn('chrome.storage.local.remove is not available', keys);
      callback?.();
    },
    clear: function (callback) {
      console.warn('chrome.storage.local.clear is not available');
      callback?.();
    }
  };

  // ========== chrome.tabs ==========
  chrome.tabs = chrome.tabs || {
    sendMessage: function (tabId, message, options, callback) {
      console.warn('chrome.tabs.sendMessage is not available', tabId, message);
      callback?.();
    },
    query: function (queryInfo, callback) {
      console.warn('chrome.tabs.query is not available', queryInfo);
      callback?.([]);
    }
  };
})();