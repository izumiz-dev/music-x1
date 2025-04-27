/**
 * Browser compatibility layer to handle differences between Chrome and Firefox extension APIs
 * With improved error handling for Firefox temporary addon limitations
 */

// Determine if we're in Firefox or Chrome
const isFirefox = typeof browser !== 'undefined';
const isTemporaryAddon = isFirefox && (browser.runtime.id || '').includes('-');

if (isTemporaryAddon) {
  console.warn('[browser-polyfill] Running as a temporary Firefox addon. Some APIs may have limitations.');
}

// Log any API errors for debugging
function logAPIError(apiName: string, error: any) {
  console.error(`[browser-polyfill] Error in ${apiName}:`, error);
  if (isTemporaryAddon && error.message && error.message.includes('temporary addon ID')) {
    console.warn('[browser-polyfill] This appears to be related to Firefox temporary addon limitations.');
  }
  return error;
}

// Create a unified API that works with both Chrome and Firefox
export const browserAPI = {
  // Storage API
  storage: {
    sync: {
      get: async <T = any>(keys?: any): Promise<T> => {
        try {
          if (isFirefox) {
            return await browser.storage.sync.get(keys as any) as T;
          } else {
            return await new Promise<T>((resolve) => {
              chrome.storage.sync.get(keys as any, (result) => {
                const error = chrome.runtime.lastError;
                if (error) {
                  console.error('[browser-polyfill] Chrome storage.sync.get error:', error);
                }
                resolve(result as T);
              });
            });
          }
        } catch (error) {
          logAPIError('storage.sync.get', error);
          // For Firefox temporary addons, try local storage
          if (isTemporaryAddon) {
            try {
              console.log('[browser-polyfill] Falling back to storage.local for temporary addon');
              return await browser.storage.local.get(keys) as T;
            } catch (fallbackError) {
              logAPIError('storage.local.get (fallback)', fallbackError);
              return {} as T; // Return empty object as last resort
            }
          }
          throw error;
        }
      },
      set: async (items: object): Promise<void> => {
        try {
          if (isFirefox) {
            return await browser.storage.sync.set(items);
          } else {
            return await new Promise<void>((resolve, reject) => {
              chrome.storage.sync.set(items, () => {
                const error = chrome.runtime.lastError;
                if (error) {
                  console.error('[browser-polyfill] Chrome storage.sync.set error:', error);
                  reject(error);
                } else {
                  resolve();
                }
              });
            });
          }
        } catch (error) {
          logAPIError('storage.sync.set', error);
          // For Firefox temporary addons, try local storage
          if (isTemporaryAddon) {
            try {
              console.log('[browser-polyfill] Falling back to storage.local for temporary addon');
              return await browser.storage.local.set(items);
            } catch (fallbackError) {
              logAPIError('storage.local.set (fallback)', fallbackError);
            }
          }
          throw error;
        }
      },
      remove: async (keys: string | string[]): Promise<void> => {
        try {
          if (isFirefox) {
            return await browser.storage.sync.remove(keys);
          } else {
            return await new Promise<void>((resolve, reject) => {
              chrome.storage.sync.remove(keys, () => {
                const error = chrome.runtime.lastError;
                if (error) {
                  console.error('[browser-polyfill] Chrome storage.sync.remove error:', error);
                  reject(error);
                } else {
                  resolve();
                }
              });
            });
          }
        } catch (error) {
          logAPIError('storage.sync.remove', error);
          // For Firefox temporary addons, try local storage
          if (isTemporaryAddon) {
            try {
              console.log('[browser-polyfill] Falling back to storage.local for temporary addon');
              return await browser.storage.local.remove(keys);
            } catch (fallbackError) {
              logAPIError('storage.local.remove (fallback)', fallbackError);
            }
          }
          throw error;
        }
      }
    },
    local: {
      get: async <T = any>(keys?: any): Promise<T> => {
        try {
          if (isFirefox) {
            return await browser.storage.local.get(keys as any) as T;
          } else {
            return await new Promise<T>((resolve) => {
              chrome.storage.local.get(keys as any, (result) => {
                const error = chrome.runtime.lastError;
                if (error) {
                  console.error('[browser-polyfill] Chrome storage.local.get error:', error);
                }
                resolve(result as T);
              });
            });
          }
        } catch (error) {
          logAPIError('storage.local.get', error);
          throw error;
        }
      },
      set: async (items: object): Promise<void> => {
        try {
          if (isFirefox) {
            return await browser.storage.local.set(items);
          } else {
            return await new Promise<void>((resolve, reject) => {
              chrome.storage.local.set(items, () => {
                const error = chrome.runtime.lastError;
                if (error) {
                  console.error('[browser-polyfill] Chrome storage.local.set error:', error);
                  reject(error);
                } else {
                  resolve();
                }
              });
            });
          }
        } catch (error) {
          logAPIError('storage.local.set', error);
          throw error;
        }
      },
      remove: async (keys: string | string[]): Promise<void> => {
        try {
          if (isFirefox) {
            return await browser.storage.local.remove(keys);
          } else {
            return await new Promise<void>((resolve, reject) => {
              chrome.storage.local.remove(keys, () => {
                const error = chrome.runtime.lastError;
                if (error) {
                  console.error('[browser-polyfill] Chrome storage.local.remove error:', error);
                  reject(error);
                } else {
                  resolve();
                }
              });
            });
          }
        } catch (error) {
          logAPIError('storage.local.remove', error);
          throw error;
        }
      }
    }
  },
  
  // Tabs API
  tabs: {
    query: async (queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> => {
      try {
        if (isFirefox) {
          return await browser.tabs.query(queryInfo);
        } else {
          return await new Promise<chrome.tabs.Tab[]>((resolve) => {
            chrome.tabs.query(queryInfo, resolve);
          });
        }
      } catch (error) {
        logAPIError('tabs.query', error);
        throw error;
      }
    },
    sendMessage: async <T = any>(tabId: number, message: any): Promise<T> => {
      try {
        if (isFirefox) {
          return await browser.tabs.sendMessage(tabId, message) as T;
        } else {
          return await new Promise<T>((resolve, reject) => {
            chrome.tabs.sendMessage(tabId, message, (response) => {
              const error = chrome.runtime.lastError;
              if (error) {
                reject(error);
              } else {
                resolve(response as T);
              }
            });
          });
        }
      } catch (error) {
        logAPIError('tabs.sendMessage', error);
        throw error;
      }
    },
    onUpdated: {
      addListener: (
        callback: (tabId: number, changeInfo: any, tab: chrome.tabs.Tab) => void
      ) => {
        if (isFirefox) {
          browser.tabs.onUpdated.addListener(callback);
        } else {
          chrome.tabs.onUpdated.addListener(callback);
        }
      },
      removeListener: (
        callback: (tabId: number, changeInfo: any, tab: chrome.tabs.Tab) => void
      ) => {
        if (isFirefox) {
          browser.tabs.onUpdated.removeListener(callback);
        } else {
          chrome.tabs.onUpdated.removeListener(callback);
        }
      }
    }
  },
  
  // Runtime API
  runtime: {
    sendMessage: async <T = any>(message: any): Promise<T> => {
      try {
        if (isFirefox) {
          return await browser.runtime.sendMessage(message);
        } else {
          return await new Promise<T>((resolve, reject) => {
            chrome.runtime.sendMessage(message, (response) => {
              const error = chrome.runtime.lastError;
              if (error) {
                reject(error);
              } else {
                resolve(response as T);
              }
            });
          });
        }
      } catch (error) {
        logAPIError('runtime.sendMessage', error);
        throw error;
      }
    },
    onMessage: {
      addListener: (callback: (message: any, sender: any, sendResponse: any) => void) => {
        if (isFirefox) {
          browser.runtime.onMessage.addListener(callback);
        } else {
          chrome.runtime.onMessage.addListener(callback);
        }
      },
      removeListener: (callback: (message: any, sender: any, sendResponse: any) => void) => {
        if (isFirefox) {
          browser.runtime.onMessage.removeListener(callback);
        } else {
          chrome.runtime.onMessage.removeListener(callback);
        }
      }
    },
    getURL: (path: string) => {
      try {
        if (isFirefox) {
          return browser.runtime.getURL(path);
        } else {
          return chrome.runtime.getURL(path);
        }
      } catch (error) {
        logAPIError('runtime.getURL', error);
        throw error;
      }
    }
  },
  
  // Action API (browserAction in Firefox, action in Chrome MV3)
  action: {
    setBadgeText: async (details: { text: string; tabId?: number }) => {
      try {
        if (isFirefox) {
          return await browser.browserAction.setBadgeText(details);
        } else {
          return await new Promise<void>((resolve) => {
            chrome.action.setBadgeText(details, () => resolve());
          });
        }
      } catch (error) {
        logAPIError('action.setBadgeText', error);
        throw error;
      }
    },
    setBadgeBackgroundColor: async (details: { color: string; tabId?: number }) => {
      try {
        if (isFirefox) {
          return await browser.browserAction.setBadgeBackgroundColor(details);
        } else {
          return await new Promise<void>((resolve) => {
            chrome.action.setBadgeBackgroundColor(details, () => resolve());
          });
        }
      } catch (error) {
        logAPIError('action.setBadgeBackgroundColor', error);
        throw error;
      }
    },
    setIcon: async (details: { path: string | { [key: string]: string }; tabId?: number }) => {
      try {
        if (isFirefox) {
          return await browser.browserAction.setIcon(details);
        } else {
          return await new Promise<void>((resolve) => {
            chrome.action.setIcon(details, () => resolve());
          });
        }
      } catch (error) {
        logAPIError('action.setIcon', error);
        throw error;
      }
    }
  }
};

// TypeScript declarations
declare global {
  interface Window {
    browser?: typeof chrome;
  }
  var browser: typeof chrome;
}
