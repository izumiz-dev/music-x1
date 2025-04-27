import { fetchMusicOrNot } from './gemini';
import { isMusicCategory, getVideoDetails } from './youtube';
import { apiKeyManager } from './apiKeyManager';
import { browserAPI } from './browser-polyfill';
import { StorageManager } from './storage-manager';
import { PlaybackRateManager } from './playback-rate-manager';

// Clear cache when extension starts (for security)
apiKeyManager.clearCache();

// Clear cache when extension is disabled or terminated
browserAPI.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message.type === 'EXTENSION_SUSPENDED') {
    apiKeyManager.clearCache();
  }
});

interface CacheData {
  isMusic: boolean;
  timestamp: number;
  detectionMethod: 'youtube' | 'gemini';
}

const CACHE_EXPIRY = 28 * 24 * 60 * 60 * 1000;

// Strictly track previous icon state
let currentIconState = {
  enabled: true,  // Default is enabled
  lastUpdated: 0,  // Last update timestamp
};

// Icon update function (called with throttling)
const updateIcon = (enabled: boolean) => {
  // Skip update if state hasn't changed or if last update was less than 2000ms ago
  const now = Date.now();
  if (currentIconState.enabled === enabled && now - currentIconState.lastUpdated < 2000) {
    console.log(`[background] Skipping icon update: no change or too soon (${now - currentIconState.lastUpdated}ms since last update)`);
    return;
  }

  console.log(`[background] Updating icon: enabled=${enabled}`);

  // Set appropriate icon path
  const iconPath = enabled
    ? {
      16: '/icons/icon16.png',
      48: '/icons/icon48.png',
      128: '/icons/icon128.png',
    }
    : {
      16: '/icons/disabled_icon16.png',
      48: '/icons/disabled_icon48.png',
      128: '/icons/disabled_icon128.png',
    };

  // Update icon
  browserAPI.action.setIcon({ path: iconPath });

  // Update state
  currentIconState = {
    enabled,
    lastUpdated: now,
  };
};

// Update badge and icon display according to extension state and detection method
const updateBadge = async (isMusic: boolean, detectionMethod: 'youtube' | 'gemini' | null, visible: boolean = true) => {
  // First check if extension is enabled
  const extensionEnabled = await StorageManager.get<boolean>('extensionEnabled');
  const enabled = extensionEnabled !== false; // Default to true if not set

  // Set badge
  const text = visible && enabled ? (isMusic ? '♪' : '🎞️') : '';
  const color = isMusic ? '#4CAF50' : '#808080';
  // const _title = visible && enabled
  //   ? `Music: ${isMusic ? 'Yes' : 'No'} (via ${detectionMethod || 'unknown'})`
  //   : '';

  // Update badge
  browserAPI.action.setBadgeText({ text });
  browserAPI.action.setBadgeBackgroundColor({ color });

  // Call icon update function
  updateIcon(enabled);
};

// Determine tab type based on URL
type TabType = 'youtube_video' | 'youtube_other' | 'other';

const getTabType = (url: string | undefined): TabType => {
  if (!url) {
    return 'other';
  }
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
  // First check if extension is enabled
  const enabled = await isExtensionEnabled();
  if (!enabled) {
    // If disabled, ensure badge is hidden but update icon to disabled state
    updateBadge(false, null, false);
    return;
  }

  const tabType = getTabType(tab.url);
  console.log('[background] Updating badge for tab type:', tabType);

  switch (tabType) {
    case 'youtube_video': {
      try {
        const url = new URL(tab.url!);
        const videoId = url.searchParams.get('v');
        if (videoId) {
          // Get state from cache
          const videoData = await StorageManager.get<CacheData>(videoId);
          if (videoData) {
            updateBadge(videoData.isMusic, videoData.detectionMethod, true);
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

// Monitor tab activation
browserAPI.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const activeTab = await browserAPI.tabs.query({ active: true, currentWindow: true });
  if (activeTab[0] && activeTab[0].id === tabId) {
    updateBadgeForTab(tab);
  }
});

// Monitor tab updates - optimize by throttling processing
const pendingTabUpdates = new Map();
let lastTabUpdateTime = 0;

browserAPI.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Skip processing if still loading or URL is null
  if (changeInfo.status !== 'complete' || !tab.url) {
    return;
  }

  // Skip if last tab update was less than 200ms ago
  const now = Date.now();
  if (now - lastTabUpdateTime < 200) {
    console.log('[background] Skipping tab update processing - too frequent');
    return;
  }
  lastTabUpdateTime = now;

  // Clear any pending timers for this tab ID
  if (pendingTabUpdates.has(tabId)) {
    clearTimeout(pendingTabUpdates.get(tabId));
  }

  // Set a 500ms debounce
  const timerId = setTimeout(async () => {
    // For non-YouTube pages, just hide the badge
    if (tab.url && !tab.url.includes('youtube.com')) {
      updateBadge(false, null, false);
      pendingTabUpdates.delete(tabId);
      return;
    }

    // Always update badge (which checks for extension enabled state)
    updateBadgeForTab(tab);

    // Wait 500ms after badge update before continuing processing
    setTimeout(async () => {
      // Only proceed with YouTube processing if on YouTube watch page
      if (tab.url && tab.url.includes('youtube.com/watch')) {
        // Check if extension is enabled before doing any processing
        const enabled = await isExtensionEnabled();
        if (!enabled) {
          console.log('[background] Extension is disabled, skipping YouTube processing');
          return;
        }

        try {
          const url = new URL(tab.url);
          const videoId = url.searchParams.get('v');
          if (videoId) {
            handleYouTubePage(tabId, videoId);
          }
        } catch (error) {
          console.error('Error in tab update listener:', error);
        }
      }

      pendingTabUpdates.delete(tabId);
    }, 500);
  }, 500);

  pendingTabUpdates.set(tabId, timerId);
});

// Check if extension is enabled
async function isExtensionEnabled(): Promise<boolean> {
  const extensionEnabled = await StorageManager.get<boolean>('extensionEnabled');
  // Default to true if not set
  return extensionEnabled !== false;
}

// Add missing functions
async function getVideoRate(
  videoId: string,
  title: string,
  categoryId: number | null = null,
): Promise<number> {
  try {
    // Check if extension is enabled
    const enabled = await isExtensionEnabled();
    if (!enabled) {
      console.log('[background] Extension is disabled, not changing playback rate');
      return 1.0; // Default to 1x when disabled
    }

    const storedData = await StorageManager.get<CacheData>(videoId);
    const now = Date.now();

    let isMusic: boolean;
    let currentDetectionMethod: 'youtube' | 'gemini';

    if (storedData && (now - storedData.timestamp) < CACHE_EXPIRY) {
      console.log(`[background] Detection from cache - isMusic: ${storedData.isMusic}, method: ${storedData.detectionMethod}`);
      isMusic = storedData.isMusic;
      currentDetectionMethod = storedData.detectionMethod;
    } else {
      if (categoryId !== null && isMusicCategory(categoryId)) {
        console.log('[background] Music category detected via YouTube API');
        isMusic = true;
        currentDetectionMethod = 'youtube';
      } else {
        // Use Gemini for detection if not music category or no categoryId
        console.log(`[background] Non-music category or no category, checking with Gemini...`);
        isMusic = await fetchMusicOrNot(title);
        currentDetectionMethod = 'gemini';
      }

      // Update cache
      await StorageManager.set(videoId, {
        isMusic,
        timestamp: now,
        detectionMethod: currentDetectionMethod,
      });
    }

    // Save badge state
    await StorageManager.set('lastBadgeState', {
      isMusic,
      detectionMethod: currentDetectionMethod,
    });

    updateBadge(isMusic, currentDetectionMethod, true);

    const defaultPlaybackRate = await PlaybackRateManager.getDefaultPlaybackRate();
    const rate = isMusic ? 1.0 : defaultPlaybackRate;
    console.log(`[background] Setting playback rate: ${rate} (isMusic: ${isMusic}, detected via ${currentDetectionMethod})`);
    return rate;

  } catch (error) {
    console.error('Error in getVideoRate:', error);
    return 1.0; // Default playback speed on error
  }
}

// Object to track videos being processed
const processingVideos = new Map();

// Function to handle YouTube page processing
async function handleYouTubePage(tabId: number, videoId: string) {
  // Skip early if already processing this video
  const processingKey = `${tabId}-${videoId}`;
  if (processingVideos.has(processingKey)) {
    console.log(`[background] Already processing video ${videoId} in tab ${tabId}, skipping`);
    return;
  }

  // Mark as processing
  processingVideos.set(processingKey, Date.now());

  try {
    // Check if extension is enabled
    const enabled = await isExtensionEnabled();
    if (!enabled) {
      console.log('[background] Extension is disabled, not processing YouTube page');
      updateBadge(false, null, false);
      return;
    }

    console.log('[background] Starting YouTube processing');

    // Check cache first
    const storedData = await StorageManager.get<CacheData>(videoId);
    const now = Date.now();

    let rate: number;

    if (storedData && (now - storedData.timestamp) < CACHE_EXPIRY) {
      console.log('[background] Using cached music detection result');
      const isMusic = storedData.isMusic;
      const defaultPlaybackRate = await PlaybackRateManager.getDefaultPlaybackRate();
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

    console.log('[background] Setting playback rate with PlaybackRateManager:', rate);
    // PlaybackRateManagerを使用して再生速度を設定
    const success = await PlaybackRateManager.setCurrentTabPlaybackRate(rate, false);

    if (!success) {
      console.error('[background] Failed to set playback rate using PlaybackRateManager');
    }

  } catch (error) {
    console.error('Error handling YouTube page:', error);
  } finally {
    // Remove processing mark when complete
    processingVideos.delete(processingKey);
  }
}

// Track last processed navigation URL
let lastProcessedUrl = '';
let lastNavigationTime = 0;

// Handle messages from popup and content script
// コールバック関数をasyncに変更して、await操作をサポート
browserAPI.runtime.onMessage.addListener(async (message, sender, sendResponse) => {

  // Handle page navigation notification from content script
  if (message.type === 'PAGE_NAVIGATION' && message.url && sender.tab && typeof sender.tab.id === 'number') {
    const now = Date.now();

    // Don't process the same URL again within a short time period
    if (message.url === lastProcessedUrl && now - lastNavigationTime < 5000) {
      console.log(`[background] Skipping duplicate navigation to ${message.url} (${now - lastNavigationTime}ms since last process)`);
      sendResponse({ success: true, skipped: true });
      return true;
    }

    console.log('[background] Received page navigation notification:', message.url);
    lastProcessedUrl = String(message.url);
    lastNavigationTime = now;

    // Check if this is a YouTube watch page and process it
    if (typeof message.url === 'string' && message.url.includes('youtube.com/watch')) {
      try {
        const url = new URL(message.url as string);
        const videoId = url.searchParams.get('v');
        if (videoId && sender.tab?.id) {
          const tabId = sender.tab.id;
          setTimeout(() => {
            handleYouTubePage(tabId, videoId);
          }, 1000);
        }
      } catch (error) {
        console.error('[background] Error processing navigation URL:', error);
      }
    }

    sendResponse({ success: true });
    return true;
  }

  // Handle extension toggle
  if (message.type === 'EXTENSION_TOGGLE') {
    const enabled = Boolean(message.enabled);
    console.log(`[background] Extension ${enabled ? 'enabled' : 'disabled'}`);

    // Update icon directly
    updateIcon(enabled);

    // Clear badge text
    if (!enabled) {
      browserAPI.action.setBadgeText({ text: '' });

      // For all YouTube tabs, reset playback to 1x
      const youtubeTabs = await browserAPI.tabs.query({url: '*://*.youtube.com/watch*'});
      for (const tab of youtubeTabs) {
        if (tab && typeof tab.id === 'number') {
          try {
            await PlaybackRateManager.setCurrentTabPlaybackRate(1.0, false, true);
          } catch (error) {
            console.error('[background] Failed to reset playback rate:', error);
          }
        }
      }
    } else {
      // Restore badge state when enabled - asyncで囲まれているので、awaitが使用可能
      const lastBadgeState = await StorageManager.get<{isMusic: boolean; detectionMethod: string}>('lastBadgeState');
      if (lastBadgeState) {
        // Set badge settings directly without calling updateBadge
        const isMusic = lastBadgeState.isMusic;
        const currentDetectionMethod = lastBadgeState.detectionMethod as 'youtube' | 'gemini';

        const text = isMusic ? '♪' : '🎞️';
        const color = isMusic ? '#4CAF50' : '#808080';

        browserAPI.action.setBadgeText({ text });
        browserAPI.action.setBadgeBackgroundColor({ color });

        // Update badge with detection method
        updateBadge(isMusic, currentDetectionMethod, true);
      }
    }

    sendResponse({ success: true });
    return true;
  }

  // Handle request to refresh video detection
  if (message.type === 'REFRESH_VIDEO_DETECTION' && message.videoId && typeof message.tabId === 'number') {
    handleYouTubePage(message.tabId, String(message.videoId));
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'UPDATE_DEFAULT_RATE') {
    try {
      // Check if extension is enabled before processing rate change
      const enabled = await isExtensionEnabled();
      if (!enabled) {
        console.log('[background] Extension is disabled, ignoring playback rate change');
        sendResponse({ success: false, error: 'Extension is disabled' });
        return true;
      }

      const success = await PlaybackRateManager.setCurrentTabPlaybackRate(Number(message.rate), true);
      sendResponse({ success });
    } catch (error) {
      console.error('Error updating playback rate:', error);
      sendResponse({ success: false, error: String(error) });
    }

    return true; // Return true to indicate we'll respond asynchronously
  }

  // falseを返すと他のリスナーに処理を続けることを示す
  return false;
});
