import { fetchMusicOrNot } from './gemini';
import { getVideoCategory, isMusicCategory, getVideoDetails } from './youtube';

interface CacheData {
  isMusic: boolean;
  timestamp: number;
  detectionMethod: 'youtube' | 'gemini';
}

const CACHE_EXPIRY = 28 * 24 * 60 * 60 * 1000; 

// バッジ表示を更新し、判定方法も表示
const updateBadge = (isMusic: boolean, detectionMethod: 'youtube' | 'gemini' | null, visible: boolean = true) => {
  const text = visible ? (isMusic ? '♪' : '🎞️') : '';
  const color = isMusic ? '#4CAF50' : '#808080';
  const title = visible 
    ? `Music: ${isMusic ? 'Yes' : 'No'} (via ${detectionMethod || 'unknown'})`
    : '';

  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setTitle({ title });
};

// URLに基づいてタブの種類を判定する
type TabType = 'youtube_video' | 'youtube_other' | 'other';

const getTabType = (url: string | undefined): TabType => {
  if (!url) return 'other';
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com')) {
      return urlObj.pathname.startsWith('/watch') ? 'youtube_video' : 'youtube_other';
    }
  } catch (error) {
    console.error('[background] Error parsing URL:', error);
  }
  return 'other';
};

// バッジを適切に更新する
const updateBadgeForTab = async (tab: chrome.tabs.Tab) => {
  const tabType = getTabType(tab.url);
  console.log('[background] Updating badge for tab type:', tabType);

  switch (tabType) {
    case 'youtube_video': {
      try {
        const url = new URL(tab.url!);
        const videoId = url.searchParams.get('v');
        if (videoId) {
          // キャッシュから状態を取得
          const cached = await chrome.storage.local.get(videoId);
          if (cached[videoId]) {
            const { isMusic, detectionMethod } = cached[videoId];
            updateBadge(isMusic, detectionMethod, true);
          }
        }
      } catch (error) {
        console.error('[background] Error processing YouTube URL:', error);
        updateBadge(false, null, false);
      }
      break;
    }
    case 'youtube_other':
      // YouTube.comの他のページではバッジを非表示
      updateBadge(false, null, false);
      break;
    case 'other':
      // YouTube以外のページではバッジを非表示
      updateBadge(false, null, false);
      break;
  }
};

// タブの更新を監視
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    updateBadgeForTab(tab);
  }
});

// タブのアクティブ化を監視
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  updateBadgeForTab(tab);
});

// ウィンドウにフォーカスが当たった時の処理
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    if (tab) {
      updateBadgeForTab(tab);
    }
  }
});

async function getVideoRate(
  videoId: string,
  title: string,
  categoryId: number | null = null
): Promise<number> {
  try {
    const cachedResult = await chrome.storage.local.get(videoId);
    const storedData: CacheData | undefined = cachedResult[videoId];
    const now = Date.now();

    let isMusic: boolean;
    let detectionMethod: 'youtube' | 'gemini';

    if (storedData && (now - storedData.timestamp) < CACHE_EXPIRY) {
      console.log(`[background] Detection from cache - isMusic: ${storedData.isMusic}, method: ${storedData.detectionMethod}`);
      isMusic = storedData.isMusic;
      detectionMethod = storedData.detectionMethod;
    } else {
      if (categoryId !== null && isMusicCategory(categoryId)) {
        console.log('[background] Music category detected via YouTube API');
        isMusic = true;
        detectionMethod = 'youtube';
      } else {
        // 音楽カテゴリー以外またはcategoryIdが無い場合はGeminiで判定
        console.log(`[background] Non-music category or no category, checking with Gemini...`);
        isMusic = await fetchMusicOrNot(title);
        detectionMethod = 'gemini';
      }

      // キャッシュを更新
      await chrome.storage.local.set({
        [videoId]: {
          isMusic,
          timestamp: now,
          detectionMethod
        }
      });
    }

    // バッジの状態を保存
    await chrome.storage.local.set({ 
      lastBadgeState: { 
        isMusic,
        detectionMethod 
      }
    });
    updateBadge(isMusic, detectionMethod, true);

    const { defaultPlaybackRate = 2.0 } = await chrome.storage.sync.get(['defaultPlaybackRate']);
    const rate = isMusic ? 1.0 : defaultPlaybackRate;
    console.log(`[background] Setting playback rate: ${rate} (isMusic: ${isMusic}, detected via ${detectionMethod})`);
    return rate;

  } catch (error) {
    console.error('Error in getVideoRate:', error);
    return 1.0; // エラー時はデフォルトの再生速度
  }
}

// Function to wait for content script initialization
async function waitForContentScript(tabId: number, maxAttempts = 20): Promise<boolean> {
  console.log('[background] Waiting for content script initialization');
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      console.log(`[background] Initialization check attempt ${i + 1}/${maxAttempts}`);
      const ready = await chrome.tabs.sendMessage(tabId, { type: 'CHECK_READY' })
        .catch(() => false);
      
      if (ready) {
        console.log('[background] Content script is ready');
        return true;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.log(`[background] Check attempt ${i + 1} failed:`, error);
    }
  }
  
  console.log('[background] Content script initialization timeout');
  return false;
}

// Function to retry message sending
async function trySendMessage(tabId: number, message: any, maxRetries = 3): Promise<any> {
  console.log('[background] Attempting to send message');
  
  // 最初にコンテンツスクリプトの初期化を待つ
  const isReady = await waitForContentScript(tabId);
  if (!isReady) {
    throw new Error('Content script failed to initialize');
  }

  // メッセージ送信の再試行
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`[background] Message send attempt ${i + 1}/${maxRetries}`);
      const response = await chrome.tabs.sendMessage(tabId, message);
      console.log('[background] Message send successful:', response);
      return response;
    } catch (error) {
      console.log(`[background] Send attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  throw new Error('Failed to send message after all retries');
}

// Function to handle YouTube page processing
async function handleYouTubePage(tabId: number, videoId: string) {
  try {
    console.log('[background] Starting YouTube processing');

    // まずキャッシュをチェック
    const cachedResult = await chrome.storage.local.get(videoId);
    const storedData: CacheData | undefined = cachedResult[videoId];
    const now = Date.now();

    let rate: number;

    if (storedData && (now - storedData.timestamp) < CACHE_EXPIRY) {
      console.log('[background] Using cached music detection result');
      const isMusic = storedData.isMusic;
      const { defaultPlaybackRate = 2.0 } = await chrome.storage.sync.get(['defaultPlaybackRate']);
      rate = isMusic ? 1.0 : defaultPlaybackRate;
      updateBadge(isMusic, storedData.detectionMethod, true);
    } else {
      // キャッシュがない場合のみYouTube APIを呼び出し
      console.log('[background] Cache miss - fetching from API');
      const details = await getVideoDetails(videoId);
      if ('type' in details) {
        console.log('[background] Failed to get video details:', details.message);
        return;
      }
      const pureTitle = details.title
        .replace(/^\([0-9]+\)\s*/, '')
        .replace(/\s*-\s*YouTube$/, '');

      rate = await getVideoRate(videoId, pureTitle, details.categoryId);
    }

    console.log('[background] Sending playback rate setting message:', rate);
    await trySendMessage(tabId, { 
      type: 'SET_PLAYBACK_RATE',
      rate 
    });
    console.log('[background] Playback rate setting message sent');

  } catch (error) {
    console.error('Error handling YouTube page:', error);
  }
}

// Monitor tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('youtube.com/watch')) {
    try {
      const url = new URL(tab.url);
      const videoId = url.searchParams.get('v');
      if (!videoId) return;

      handleYouTubePage(tabId, videoId);
    } catch (error) {
      console.error('Error in tab update listener:', error);
    }
  }
});

// Handle playback rate update requests from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_DEFAULT_RATE') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]?.id) {
        try {
          await trySendMessage(tabs[0].id, {
            type: 'SET_PLAYBACK_RATE',
            rate: message.rate
          });
          sendResponse({ success: true });
        } catch (error) {
          console.error('Error updating playback rate:', error);
          sendResponse({ success: false, error: String(error) });
        }
      }
    });
    return true;
  }
});
