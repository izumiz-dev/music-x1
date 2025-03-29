import { fetchMusicOrNot } from './gemini';
import { isMusicCategory, getVideoDetails } from './youtube';
import { apiKeyManager } from './apiKeyManager';

// Clear cache when extension starts (for security)
apiKeyManager.clearCache();

// Clear cache when extension is disabled or terminated
chrome.runtime.onSuspend.addListener(() => {
  apiKeyManager.clearCache();
});

interface CacheData {
  isMusic: boolean;
  timestamp: number;
  detectionMethod: 'youtube' | 'gemini';
}

const CACHE_EXPIRY = 28 * 24 * 60 * 60 * 1000; 

// Update badge display and show detection method
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

// Determine tab type based on URL
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

// Update badge appropriately
const updateBadgeForTab = async (tab: chrome.tabs.Tab) => {
  const tabType = getTabType(tab.url);
  console.log('[background] Updating badge for tab type:', tabType);

  switch (tabType) {
    case 'youtube_video': {
      try {
        const url = new URL(tab.url!);
        const videoId = url.searchParams.get('v');
        if (videoId) {
          // Get state from cache
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
      // Hide badge on other YouTube.com pages
      updateBadge(false, null, false);
      break;
    case 'other':
      // Hide badge on non-YouTube pages
      updateBadge(false, null, false);
      break;
  }
};

// Monitor tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    updateBadgeForTab(tab);
  }
});

// Monitor tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  updateBadgeForTab(tab);
});

// Handle window focus change
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
        // Use Gemini for detection if not music category or no categoryId
        console.log(`[background] Non-music category or no category, checking with Gemini...`);
        isMusic = await fetchMusicOrNot(title);
        detectionMethod = 'gemini';
      }

      // Update cache
      await chrome.storage.local.set({
        [videoId]: {
          isMusic,
          timestamp: now,
          detectionMethod
        }
      });
    }

    // Save badge state
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
    return 1.0; // Default playback speed on error
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
  
  // Wait for content script initialization first
  const isReady = await waitForContentScript(tabId);
  if (!isReady) {
    throw new Error('Content script failed to initialize');
  }

  // Retry message sending
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

    // Check cache first
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
      // Only call YouTube API if no cache exists
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
