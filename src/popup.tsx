import { h } from "preact";
import { useEffect, useState } from "preact/hooks";
import { browserAPI } from "./browser-polyfill";
import { StorageManager } from "./storage-manager";
import { NavigationHelper } from "./navigation-helper";
import { ApiKeyType, apiKeyManager } from "./apiKeyManager";
import { PlaybackRateManager } from "./playback-rate-manager";

import "./popup.css";

const Popup = () => {
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1.5);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [isMusicVideo, setIsMusicVideo] = useState(false);
  const [isYouTube, setIsYouTube] = useState(false);
  const [isExtensionEnabled, setIsExtensionEnabled] = useState(true);

  useEffect(() => {
    // 設定の読み込み
    async function loadSettings() {
      try {
        // PlaybackRateの読み込み
        const defaultPlaybackRate = await PlaybackRateManager.getDefaultPlaybackRate();
        setPlaybackRate(defaultPlaybackRate);
        
        // 拡張機能の有効/無効状態の読み込み
        const extensionEnabled = await StorageManager.get<boolean>("extensionEnabled");
        setIsExtensionEnabled(extensionEnabled !== false); // デフォルトはtrue
        
        // APIキーの確認
        const hasGeminiKey = await apiKeyManager.hasApiKey(ApiKeyType.GEMINI);
        setHasApiKey(hasGeminiKey);
      } catch (error) {
        console.error("[popup] Failed to load settings:", error);
      }
    }

    const checkIfMusicVideo = async () => {
      try {
        const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0] as chrome.tabs.Tab;
        console.log('Current URL:', currentTab?.url);

        if (currentTab?.url?.includes('youtube.com/watch')) {
          const videoId = new URL(currentTab.url).searchParams.get('v');
          console.log('Video ID:', videoId);

          if (videoId) {
            const videoData = await StorageManager.get<{isMusic: boolean, detectionMethod: string}>(videoId);
            console.log('Video data:', videoData);
            if (videoData) {
              console.log('Is music video:', videoData.isMusic);
              setIsMusicVideo(videoData.isMusic);
            } else {
              setIsMusicVideo(false);
            }
          }
        }
      } catch (error) {
        console.error('Error checking music video:', error);
      }
    };

    const checkIsYouTube = async () => {
      const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0] as chrome.tabs.Tab;
      setIsYouTube(currentTab?.url?.includes('youtube.com') || false);
      
      if (tabs[0]) {
        setCurrentTab(tabs[0] as chrome.tabs.Tab);
      }
    }

    loadSettings();
    checkIfMusicVideo();
    checkIsYouTube();
  }, []);

  const toggleExtensionState = async () => {
    const newState = !isExtensionEnabled;
    setIsExtensionEnabled(newState);
    await StorageManager.set("extensionEnabled", newState);
    
    // Notify background script about the state change
    browserAPI.runtime.sendMessage({ type: 'EXTENSION_TOGGLE', enabled: newState });
    
    // If disabling, reset playback speed to 1x
    if (!newState && currentTab?.id && typeof currentTab.id === 'number') {
      await PlaybackRateManager.setCurrentTabPlaybackRate(1.0, false, true);
    }
    // If turning extension back on, refresh current tab's playback rate
    else if (newState && currentTab?.id && typeof currentTab.id === 'number' && currentTab?.url?.includes('youtube.com/watch')) {
      const videoId = new URL(currentTab.url).searchParams.get('v');
      if (videoId) {
        await PlaybackRateManager.refreshVideoDetection(currentTab.id, videoId);
      }
    }
  };

  const updatePlaybackRate = async (newRate: number, save: boolean = true) => {
    setPlaybackRate(newRate);
    // Don't apply playback rate changes if extension is disabled
    if (!isExtensionEnabled) {
      console.log('[popup] Extension is disabled, not applying playback rate change');
      return;
    }
    
    if (save) {
      try {
        // PlaybackRateManagerを使用して再生速度を設定
        const success = await PlaybackRateManager.setCurrentTabPlaybackRate(newRate, true);
        if (!success) {
          console.warn('[popup] Failed to set playback rate');
        }
      } catch (error) {
        console.error('[popup] Error updating playback rate:', error);
      }
    }
  };

  const handlePlaybackRateChange = (event: any) => {
    const newRate = parseFloat(event.target.value);
    updatePlaybackRate(newRate);
  };

  const handleSliderInput = (event: any) => {
    const newRate = parseFloat(event.target.value);
    updatePlaybackRate(newRate, true);
  };

  const openOptions = async () => {
    try {
      await NavigationHelper.openOptionsPage();
    } catch (error) {
      console.error('[popup] Failed to open options page:', error);
      // フォールバック: オプションページのURLを直接開く
      NavigationHelper.openNewTab(browserAPI.runtime.getURL('options.html'));
    }
  };

  return (
    <div class="popup-container">
      <div class="header">
        <h2>Music x1</h2>
        <div class="toggle-container">
          <label class="toggle-switch">
            <input type="checkbox" checked={isExtensionEnabled} onChange={toggleExtensionState} />
            <span class="toggle-slider"></span>
          </label>
          <span class="toggle-label">{isExtensionEnabled ? 'Enabled' : 'Disabled'}</span>
        </div>
      </div>
      
      {!hasApiKey && (
        <div class="api-key-warning">
          <p>Gemini API key is not set.</p>
          <button onClick={openOptions} class="button">Open Settings</button>
        </div>
      )}

      {!isYouTube ? (
        <div class="disabled-message">
          <p>Available only on YouTube.</p>
          <a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer" class="youtube-link button">
            Go to YouTube
          </a>
        </div>
      ) : (
        <div class={`playback-settings ${isMusicVideo ? 'music-mode' : ''}`}>
          <div class="speed-display">
            <span class="speed-value">{isMusicVideo ? 'x1' : `x${playbackRate.toFixed(2)}`}</span>
            <span class="speed-label">{isMusicVideo ? "Enjoy the Music!" : "Set Default Playback Speed"}</span>
          </div>
          {!isMusicVideo && (
            <div class="slider-container">
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={playbackRate}
                onChange={handlePlaybackRateChange}
                onInput={handleSliderInput}
                class="speed-slider"
                disabled={!isExtensionEnabled}
              />
              {!isExtensionEnabled && (
                <div class="disabled-slider-overlay">
                  <p>Enable extension to change speed</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Popup;
