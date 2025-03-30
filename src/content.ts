// YouTube page content script

let isInitialized = false;

// Handle initialization after YouTube SPA navigation
const handleNavigation = () => {
  console.log('[content] Handling navigation');
  isInitialized = false;
  
  // Start initialization process
  initializeContentScript();
  
  // A single notification is sufficient, so reduce the number of notifications
  setTimeout(() => {
    console.log('[content] Notifying background script about navigation');
    try {
      chrome.runtime.sendMessage({ 
        type: 'PAGE_NAVIGATION',
        url: window.location.href
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[content] Error sending navigation message:', chrome.runtime.lastError);
          // Only try again in case of error
          setTimeout(() => {
            chrome.runtime.sendMessage({ 
              type: 'PAGE_NAVIGATION',
              url: window.location.href
            });
          }, 1000);
        } else if (response?.success) {
          console.log('[content] Background script acknowledged navigation');
        }
      });
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
  characterData: false
};

// Function to find and initialize video element
const findAndInitializeVideo = () => {
  const video = document.querySelector('video.html5-main-video');
  if (video) {
    console.log('[content] Video element found');
    if (!isInitialized) {
      isInitialized = true;
      chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' });
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
const observer = new MutationObserver((mutations) => {
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

// Setup message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Check initialization status
  if (message.type === 'CHECK_READY') {
    sendResponse(isInitialized);
    return true;
  }

  // Return error if not initialized
  if (!isInitialized && message.type !== 'CHECK_READY') {
    sendResponse({ 
      success: false, 
      error: 'Content script not initialized' 
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
        chrome.storage.sync.get(['extensionEnabled'], async (result) => {
          const isEnabled = result.extensionEnabled !== false; // Default to true if not set
          
          // Only proceed if extension is enabled OR this is a reset from disabling
          if (isEnabled || isDisabledReset) {
            const videoElement = document.querySelector('video.html5-main-video');
            if (videoElement instanceof HTMLVideoElement) {
              console.log('[content] Current playback rate:', videoElement.playbackRate);
              videoElement.playbackRate = message.rate;
              
              // YouTube sometimes resets the rate, so set again after a short delay
              setTimeout(() => {
                try {
                  if (videoElement instanceof HTMLVideoElement && videoElement.playbackRate !== message.rate) {
                    videoElement.playbackRate = message.rate;
                    console.log('[content] Re-applied playback rate:', message.rate);
                  }
                } catch (e) {
                  console.error('[content] Error in delayed rate setting:', e);
                }
              }, 500);
              
              console.log('[content] Set new playback rate:', message.rate);
              sendResponse({ success: true });
            } else {
              console.log('[content] Video element not found');
              sendResponse({ 
                success: false, 
                error: 'Video player not found' 
              });
            }
          } else {
            console.log('[content] Extension is disabled, ignoring playback rate change');
            sendResponse({
              success: false,
              error: 'Extension is disabled'
            });
          }
        });
        
        return true; // Required for async response
      }
    }
  } catch (error) {
    console.error('Error in message listener:', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
  return true;  // Required for async response
});

console.log('[content] Message listener installed');
