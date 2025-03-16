// YouTube page content script

let isInitialized = false;

// YouTubeのSPAナビゲーション後の初期化を処理
const handleNavigation = () => {
  console.log('[content] Handling navigation');
  isInitialized = false;
  initializeContentScript();
};

// video要素を監視するための設定
const videoObserverConfig = {
  childList: true,
  subtree: true,
  attributes: true,
  characterData: false
};

// video要素を探して初期化する関数
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

// 初期化を試みる関数（リトライ付き）
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

// 動的なDOM変更を監視
const observer = new MutationObserver((mutations) => {
  if (!isInitialized) {
    findAndInitializeVideo();
  }
});

// SPAナビゲーションを監視
const navigationObserver = new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl.includes('youtube.com/watch')) {
    handleNavigation();
  }
});

// 初期化確認の実装
const initializeContentScript = async () => {
  console.log('[content] Starting initialization process');
  
  // 即時チェック
  if (!findAndInitializeVideo()) {
    // video要素の監視を開始
    observer.observe(document.body, videoObserverConfig);
    // 非同期で初期化を試みる
    tryInitialize();
  }
};

// 初期セットアップ
console.log('[content] Setting up content script');
navigationObserver.observe(document, { subtree: true, childList: true });
initializeContentScript();

// DOMContentLoaded時の初期化
document.addEventListener('DOMContentLoaded', () => {
  console.log('[content] DOMContentLoaded event fired');
  initializeContentScript();
});

// Setup message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 初期化状態の確認
  if (message.type === 'CHECK_READY') {
    sendResponse(isInitialized);
    return true;
  }

  // 未初期化の場合はエラーを返す
  if (!isInitialized && message.type !== 'CHECK_READY') {
    sendResponse({ 
      success: false, 
      error: 'Content script not initialized' 
    });
    return true;
  }

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
