// YouTube page content script

// Setup message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    switch (message.type) {
      case 'CHECK_VIDEO': {
        // Verification request from background script
        sendResponse({ 
          title: document.title,
          success: true
        });
        break;
      }
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
