import { h } from "preact";
import { useEffect, useState } from "preact/hooks";

import "./popup.css";


const Popup = () => {
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1.5);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [isMusicVideo, setIsMusicVideo] = useState(false);
  const [isYouTube, setIsYouTube] = useState(false);
  const [isExtensionEnabled, setIsExtensionEnabled] = useState(true);

  useEffect(() => {
    // Check if API key is set
    // Load saved playback rate, extension enabled state, and check API key
    chrome.storage.sync.get(["defaultPlaybackRate", "geminiApiKey", "extensionEnabled"], (result) => {
      if (result.defaultPlaybackRate) {
        setPlaybackRate(result.defaultPlaybackRate);
      }
      setHasApiKey(!!result.geminiApiKey);
      setIsExtensionEnabled(result.extensionEnabled !== false); // Default to true if not set
    });

    const checkIfMusicVideo = async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0];
        console.log('Current URL:', currentTab?.url);

        if (currentTab?.url?.includes('youtube.com/watch')) {
          const videoId = new URL(currentTab.url).searchParams.get('v');
          console.log('Video ID:', videoId);

          if (videoId) {
            const video = await chrome.storage.local.get(videoId);
            const videoData = video[videoId];
            console.log('Video data:', videoData);
            console.log('Is music video:', videoData?.isMusic);
            setIsMusicVideo(videoData?.isMusic ?? false);
          }
        }
      } catch (error) {
        console.error('Error checking music video:', error);
      }
    };

    const checkIsYouTube = async () => {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      setIsYouTube(currentTab?.url?.includes('youtube.com') || false);
    }

    checkIfMusicVideo();
    checkIsYouTube();


    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error('tabs.query error:', chrome.runtime.lastError);
      }
      if (tabs[0]) {
        setCurrentTab(tabs[0]);
      }
    });
  }, []);

  const toggleExtensionState = async () => {
    const newState = !isExtensionEnabled;
    setIsExtensionEnabled(newState);
    await chrome.storage.sync.set({ extensionEnabled: newState });
    
    // Notify background script about the state change
    chrome.runtime.sendMessage({ type: 'EXTENSION_TOGGLE', enabled: newState });
    
    // If disabling, reset playback speed to 1x
    if (!newState && currentTab?.id && typeof currentTab.id === 'number') {
      await trySendPlaybackRateMessage(currentTab.id, 1.0, false, true);
    }
    // If turning extension back on, refresh current tab's playback rate
    else if (newState && currentTab?.id && typeof currentTab.id === 'number' && currentTab?.url?.includes('youtube.com/watch')) {
      const videoId = new URL(currentTab.url).searchParams.get('v');
      if (videoId) {
        chrome.runtime.sendMessage({ type: 'REFRESH_VIDEO_DETECTION', videoId, tabId: currentTab.id });
      }
    }
  };

  // Helper function to try sending playback rate message with retries
  const trySendPlaybackRateMessage = async (tabId: number, rate: number, save: boolean = true, fromDisabledToggle: boolean = false) => {
    const delays = [1000, 2000, 3000]; // Gradual delay times

    for (let i = 0; i < delays.length; i++) {
      try {
        console.log(`[popup] Playback rate update attempt ${i + 1}/${delays.length}`);
        await new Promise(resolve => setTimeout(resolve, delays[i]));

        // Check initialization status
        const ready = await chrome.tabs.sendMessage(tabId, {
          type: 'CHECK_READY'
        }).catch(() => false);

        if (!ready) {
          console.log('[popup] Content script not ready, retrying...');
          continue;
        }

        const response = await chrome.tabs.sendMessage(tabId, {
          type: 'SET_PLAYBACK_RATE',
          rate,
          save,
          fromDisabledToggle
        });

        if (response?.success) {
          console.log('[popup] Playback rate updated successfully');
          return;
        }

        console.warn('[popup] Failed to set playback rate:', response?.error || 'Unknown error');
      } catch (error) {
        console.error(`[popup] Update attempt ${i + 1} failed:`, error);
        if (i === delays.length - 1) {
          console.error('[popup] All update attempts failed');
        }
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
      await chrome.storage.sync.set({ defaultPlaybackRate: newRate });
      // Send message to current tab to update playback rate
      if (currentTab?.id && typeof currentTab.id === 'number') {
        await trySendPlaybackRateMessage(currentTab.id, newRate, true);
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

  const openOptions = () => {
    chrome.runtime.openOptionsPage();
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
