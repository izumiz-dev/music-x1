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

// Strictly track previous icon state
let currentIconState = {
  enabled: true,  // Default is enabled
  lastUpdated: 0  // Last update timestamp
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
        128: '/icons/icon128.png'
      }
    : {
        16: '/icons/disabled_icon16.png',
        48: '/icons/disabled_icon48.png',
        128: '/icons/disabled_icon128.png'
      };
  
  // Update icon
  chrome.action.setIcon({ path: iconPath });
  
  // Update state
  currentIconState = {
    enabled,
    lastUpdated: now
  };
};

// Update badge and icon display according to extension state and detection method
const updateBadge = async (isMusic: boolean, detectionMethod: 'youtube' | 'gemini' | null, visible: boolean = true) => {
  // First check if extension is enabled
  const { extensionEnabled } = await chrome.storage.sync.get(['extensionEnabled']);
  const enabled = extensionEnabled !== false; // Default to true if not set
  
  // Set badge
  const text = visible && enabled ? (isMusic ? '♪' : '🎞️') : '';
  const color = isMusic ? '#4CAF50' : '#808080';
  const title = visible && enabled
    ? `Music: ${isMusic ? 'Yes' : 'No'} (via ${detectionMethod || 'unknown'})`
    : '';

  // Update badge
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setTitle({ title });
  
  // Call icon update function
  updateIcon(enabled);
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

// Monitor tab updates - optimize by throttling processing
let pendingTabUpdates = new Map();
let lastTabUpdateTime = 0;

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
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
  const { extensionEnabled } = await chrome.storage.sync.get(['extensionEnabled']);
  // Default to true if not set
  return extensionEnabled !== false;
}

// Add missing functions
async function getVideoRate(
  videoId: string,
  title: string,
  categoryId: number | null = null
): Promise<number> {
  try {
    // Check if extension is enabled
    const enabled = await isExtensionEnabled();
    if (!enabled) {
      console.log('[background] Extension is disabled, not changing playback rate');
      return 1.0; // Default to 1x when disabled
    }
    
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
    
    // Use multiple attempts to set the playback rate
    const maxAttempts = 3; // Reduce number of attempts
    let success = false;
    
    for (let i = 0; i < maxAttempts && !success; i++) {
      try {
        console.log(`[background] Setting playback rate attempt ${i+1}/${maxAttempts}`);
        
        // Add a delay that increases with each attempt
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000 * i));
        }
        
        // First check if content script is ready
        const isReady = await waitForContentScript(tabId);
        if (!isReady) {
          console.log('[background] Content script not ready, retrying...');
          continue;
        }
        
        const response = await trySendMessage(tabId, { 
          type: 'SET_PLAYBACK_RATE',
          rate 
        });
        
        if (response?.success) {
          console.log('[background] Successfully set playback rate');
          success = true;
          break;
        }
      } catch (error) {
        console.error(`[background] Attempt ${i+1} failed:`, error);
      }
    }
    
    if (!success) {
      console.log('[background] All attempts to set playback rate failed');
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
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
  // Handle page navigation notification from content script
  if (message.type === 'PAGE_NAVIGATION' && message.url && sender.tab && sender.tab.id) {
    const now = Date.now();
    
    // Don't process the same URL again within a short time period
    if (message.url === lastProcessedUrl && now - lastNavigationTime < 5000) {
      console.log(`[background] Skipping duplicate navigation to ${message.url} (${now - lastNavigationTime}ms since last process)`);
      sendResponse({ success: true, skipped: true });
      return true;
    }
    
    console.log('[background] Received page navigation notification:', message.url);
    lastProcessedUrl = message.url;
    lastNavigationTime = now;
    
    // Check if this is a YouTube watch page and process it
    if (message.url.includes('youtube.com/watch')) {
      try {
        const url = new URL(message.url);
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
    const enabled = message.enabled;
    console.log(`[background] Extension ${enabled ? 'enabled' : 'disabled'}`);
    
    // Update icon directly
    updateIcon(enabled);
    
    // Clear badge text
    if (!enabled) {
      chrome.action.setBadgeText({ text: '' });
      
      // For all YouTube tabs, reset playback to 1x
      chrome.tabs.query({url: '*://*.youtube.com/watch*'}, async (tabs) => {
        for (const tab of tabs) {
          if (tab && typeof tab.id === 'number') {
            try {
              await trySendMessage(tab.id, {
                type: 'SET_PLAYBACK_RATE',
                rate: 1.0,
                save: false, // Don't save this as the default
                fromDisabledToggle: true // Special flag for disabled toggle
              });
            } catch (error) {
              console.error('[background] Failed to reset playback rate:', error);
            }
          }
        }
      });
    } else {
      // Restore badge state when enabled
      chrome.storage.local.get('lastBadgeState', (result) => {
        if (result.lastBadgeState) {
          // Set badge settings directly without calling updateBadge
          const isMusic = result.lastBadgeState.isMusic;
          const detectionMethod = result.lastBadgeState.detectionMethod;
          
          const text = isMusic ? '♪' : '🎞️';
          const color = isMusic ? '#4CAF50' : '#808080';
          const title = `Music: ${isMusic ? 'Yes' : 'No'} (via ${detectionMethod || 'unknown'})`;
          
          chrome.action.setBadgeText({ text });
          chrome.action.setBadgeBackgroundColor({ color });
          chrome.action.setTitle({ title });
        }
      });
    }
    
    sendResponse({ success: true });
    return true;
  }
  
  // Handle request to refresh video detection
  if (message.type === 'REFRESH_VIDEO_DETECTION' && message.videoId && typeof message.tabId === 'number') {
    handleYouTubePage(message.tabId, message.videoId);
    sendResponse({ success: true });
    return true;
  }
  
  if (message.type === 'UPDATE_DEFAULT_RATE') {
    // Check if extension is enabled before processing rate change
    isExtensionEnabled().then(enabled => {
      if (!enabled) {
        console.log('[background] Extension is disabled, ignoring playback rate change');
        sendResponse({ success: false, error: 'Extension is disabled' });
        return;
      }
      
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (tabs[0] && typeof tabs[0].id === 'number') {
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
    }).catch(error => {
      console.error('Error checking extension enabled state:', error);
      sendResponse({ success: false, error: String(error) });
    });
    
    return true; // Return true to indicate we'll respond asynchronously
  }
});
