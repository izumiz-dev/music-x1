import { fetchMusicOrNot } from './gemini';
import { getVideoCategory, isMusicCategory } from './youtube';

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

// YouTubeのタブかどうかを判定する
const isYouTubeTab = (url: string | undefined): boolean => {
  return url?.includes('youtube.com/watch') ?? false;
};

// タブがアクティブになったときの処理
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  const isYouTube = isYouTubeTab(tab.url);
  
  if (isYouTube && tab.url) {
    try {
      const url = new URL(tab.url);
      const videoId = url.searchParams.get('v');
      if (videoId) {
        handleYouTubePage(tab.id!, videoId);
        return;
      }
    } catch (error) {
      console.error('Error processing YouTube URL:', error);
    }
  }
  
  // YouTubeタブでない場合やURLの解析に失敗した場合は、バッジを非表示にする
  updateBadge(false, null, false);
});

async function getVideoRate(videoId: string, title: string): Promise<number> {
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
      // YouTube API Keyが設定されているか確認
      const { youtubeApiKey } = await chrome.storage.sync.get(['youtubeApiKey']);
      
      if (youtubeApiKey) {
        // YouTube APIが設定されている場合はカテゴリーを確認
        console.log('[background] Checking YouTube category...');
        const categoryResult = await getVideoCategory(videoId);
        
        if (typeof categoryResult === 'number') {
          if (isMusicCategory(categoryResult)) {
            console.log('[background] Music category detected via YouTube API');
            isMusic = true;
            detectionMethod = 'youtube';
          } else {
            // 音楽カテゴリー以外はGeminiで再判定
            console.log(`[background] Non-music category (${categoryResult}), checking with Gemini...`);
            isMusic = await fetchMusicOrNot(title);
            detectionMethod = 'gemini';
          }
        } else {
          // YouTube APIエラーの場合、Geminiで判定
          console.log('[background] YouTube API error, falling back to Gemini...');
          isMusic = await fetchMusicOrNot(title);
          detectionMethod = 'gemini';
        }
      } else {
        // YouTube API Keyが設定されていない場合、直接Geminiで判定
        console.log('[background] No YouTube API key configured, using Gemini...');
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

    const { defaultPlaybackRate = 2.0 } = await chrome.storage.local.get(['defaultPlaybackRate']);
    const rate = isMusic ? 1.0 : defaultPlaybackRate;
    console.log(`[background] Setting playback rate: ${rate} (isMusic: ${isMusic}, detected via ${detectionMethod})`);
    return rate;

  } catch (error) {
    console.error('Error in getVideoRate:', error);
    return 1.0; // エラー時はデフォルトの再生速度
  }
}

// Function to retry message sending
async function trySendMessage(tabId: number, message: any, maxRetries = 5, initialDelay = 2000): Promise<any> {
  let delay = initialDelay;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`[background] Message send attempt ${i + 1}/${maxRetries} (delay: ${delay}ms)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const response = await chrome.tabs.sendMessage(tabId, message);
      console.log('[background] Message send successful:', response);
      return response;
    } catch (error) {
      console.log(`[background] Attempt ${i + 1} failed:`, error);
      if (i < maxRetries - 1) {
        // Increase delay time (up to 5 seconds)
        delay = Math.min(delay * 1.5, 5000);
      } else {
        throw error;
      }
    }
  }
}

// Function to handle YouTube page processing
async function handleYouTubePage(tabId: number, videoId: string) {
  try {
    console.log('[background] Starting YouTube processing');
    
    const response = await trySendMessage(tabId, { type: 'CHECK_VIDEO' });
    if (!response?.success || !response.title) {
      console.log('[background] Failed to get title');
      return;
    }

    const pureTitle = response.title
      .replace(/^\([0-9]+\)\s*/, '')
      .replace(/\s*-\s*YouTube$/, '');

    const rate = await getVideoRate(videoId, pureTitle);

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
