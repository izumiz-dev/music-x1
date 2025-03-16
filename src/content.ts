// YouTube page content script

let isInitialized = false;

// Handle initialization after YouTube SPA navigation
const handleNavigation = () => {
  console.log('[content] Handling navigation');
  isInitialized = false;
  initializeContentScript();
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
const tryInitialize = async (maxAttempts = 10) => {
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
        console.log('[content] Received playback rate setting message:', message.rate);
        const videoElement = document.querySelector('video.html5-main-video');
        if (videoElement instanceof HTMLVideoElement) {
          console.log('[content] Current playback rate:', videoElement.playbackRate);
          videoElement.playbackRate = message.rate;
          console.log('[content] Set new playback rate:', message.rate);
          sendResponse({ success: true });
        } else {
          console.log('[content] Video element not found');
          sendResponse({ 
            success: false, 
            error: 'Video player not found' 
          });
        }
        break;
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
