// YouTube page content script
import { browserAPI } from '../browser-polyfill';
import { StorageManager } from '../managers/storageManager';

let isInitialized = false;

// Handle initialization after YouTube SPA navigation
const handleNavigation = async () => {
  console.log('[content] Handling navigation');
  isInitialized = false;

  // Start initialization process
  initializeContentScript();

  // A single notification is sufficient, so reduce the number of notifications
  setTimeout(async () => {
    console.log('[content] Notifying background script about navigation');
    try {
      const response = await browserAPI.runtime.sendMessage({
        type: 'PAGE_NAVIGATION',
        url: window.location.href,
      });

      if (response?.success) {
        console.log('[content] Background script acknowledged navigation');
      } else {
        // Only try again in case of error
        setTimeout(async () => {
          await browserAPI.runtime.sendMessage({
            type: 'PAGE_NAVIGATION',
            url: window.location.href,
          });
        }, 1000);
      }
    } catch (e) {
      console.error('[content] Failed to notify background about navigation:', e);
    }
  }, 1000);
};

// Configuration for video element observation
const videoObserverConfig = {
  childList: true,
  subtree: true,
  attributes: true,
  characterData: false,
};

// Function to find and initialize video element
const findAndInitializeVideo = () => {
  const video = document.querySelector('video.html5-main-video');
  if (video) {
    console.log('[content] Video element found');
    if (!isInitialized) {
      isInitialized = true;
      browserAPI.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' });
      console.log('[content] Initialization complete');
    }
    return true;
  }
  return false;
};

// Function to attempt initialization (with retries)
const tryInitialize = async (maxAttempts = 15) => {
  console.log(`[content] Attempting initialization (max ${maxAttempts} attempts)`);
  for (let i = 0; i < maxAttempts; i++) {
    if (findAndInitializeVideo()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  console.log('[content] Failed to find video element after all attempts');
};

// Monitor dynamic DOM changes
const observer = new MutationObserver((_mutations) => {
  if (!isInitialized) {
    findAndInitializeVideo();
  }
});

// Monitor SPA navigation
const navigationObserver = new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl.includes('youtube.com/watch')) {
    handleNavigation();
  }
});

// Implementation of initialization check
const initializeContentScript = async () => {
  console.log('[content] Starting initialization process');

  // Immediate check
  if (!findAndInitializeVideo()) {
    // Start monitoring video element
    observer.observe(document.body, videoObserverConfig);
    // Try initialization asynchronously
    tryInitialize();

    // Also check after window load event completes
    window.addEventListener('load', () => {
      console.log('[content] Window load event fired');
      if (!isInitialized) {
        findAndInitializeVideo();
      }
    });
  }
};

// Initial setup
console.log('[content] Setting up content script');
navigationObserver.observe(document, { subtree: true, childList: true });
initializeContentScript();

// Initialization on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('[content] DOMContentLoaded event fired');
  initializeContentScript();
});

// 再生速度変更のヘルパー関数
// Firefox と Chrome の両方で動作するように最適化
const setVideoPlaybackRate = (rate: number, retry = 0, maxRetries = 3) => {
  const videoElement = document.querySelector('video.html5-main-video');
  if (videoElement instanceof HTMLVideoElement) {
    try {
      console.log(`[content] Current playback rate: ${videoElement.playbackRate}, setting to: ${rate}`);
      videoElement.playbackRate = rate;

      // YouTubeはしばしば再生速度をリセットするので、一定時間後に再確認する
      setTimeout(() => {
        try {
          const currentVideo = document.querySelector('video.html5-main-video');
          if (currentVideo instanceof HTMLVideoElement && currentVideo.playbackRate !== rate) {
            console.log('[content] Playback rate was reset, re-applying:', rate);
            currentVideo.playbackRate = rate;
          }
        } catch (e) {
          console.error('[content] Error in delayed rate setting:', e);
        }
      }, 500);

      return true;
    } catch (error) {
      console.error('[content] Error setting playback rate:', error);

      // リトライロジック
      if (retry < maxRetries) {
        console.log(`[content] Retrying set playback rate (${retry + 1}/${maxRetries})`);
        setTimeout(() => {
          setVideoPlaybackRate(rate, retry + 1, maxRetries);
        }, 300);
      }

      return false;
    }
  } else {
    console.log('[content] Video element not found for playback rate setting');

    // ビデオ要素が見つからない場合もリトライ
    if (retry < maxRetries) {
      console.log(`[content] Waiting for video element (${retry + 1}/${maxRetries})`);
      setTimeout(() => {
        setVideoPlaybackRate(rate, retry + 1, maxRetries);
      }, 500);
    }

    return false;
  }
};

// Setup message listener
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Check initialization status
  if (message.type === 'CHECK_READY') {
    sendResponse({ success: isInitialized });
    return true;
  }

  // Return error if not initialized
  if (!isInitialized && message.type !== 'CHECK_READY') {
    sendResponse({
      success: false,
      error: 'Content script not initialized',
    });
    return true;
  }

  try {
    switch (message.type) {
      case 'SET_PLAYBACK_RATE': {
        // Playback rate setting request
        console.log('[content] Received playback rate setting message:', message.rate, 'save:', message.save);

        // First check if the message is explicitly marked as from a disabled state toggle
        // This allows resetting to 1x when disabling the extension
        const isDisabledReset = message.save === false && message.rate === 1.0 && message.fromDisabledToggle;

        // Get extension enabled state
        StorageManager.get<boolean>('extensionEnabled').then(extensionEnabled => {
          const isEnabled = extensionEnabled !== false; // Default to true if not set

          // Only proceed if extension is enabled OR this is a reset from disabling
          if (isEnabled || isDisabledReset) {
            const success = setVideoPlaybackRate(Number(message.rate));

            if (success) {
              console.log('[content] Set playback rate successfully');
              sendResponse({ success: true });
            } else {
              console.log('[content] Failed to set playback rate immediately, but retrying');
              // リトライするため、成功として応答（非同期で再設定を試みるため）
              sendResponse({ success: true, retrying: true });
            }
          } else {
            console.log('[content] Extension is disabled, ignoring playback rate change');
            sendResponse({
              success: false,
              error: 'Extension is disabled',
            });
          }
        }).catch(error => {
          console.error('[content] Error checking extension state:', error);
          sendResponse({
            success: false,
            error: 'Failed to check extension state',
          });
        });

        return true; // Required for async response
      }
    }
  } catch (error) {
    console.error('Error in message listener:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  return true;  // Required for async response
});

console.log('[content] Message listener installed');
