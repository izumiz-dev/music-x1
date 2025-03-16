import { h } from "preact";
import { useEffect, useState } from "preact/hooks";
import "./popup.css";


const Popup = () => {
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1.5);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [isMusicVideo, setIsMusicVideo] = useState(false);
  const [isYouTube, setIsYouTube] = useState(false);

  useEffect(() => {
    // Check if API key is set
    // Load saved playback rate and check API key
    chrome.storage.sync.get(["defaultPlaybackRate", "geminiApiKey"], (result) => {
      if (result.defaultPlaybackRate) {
        setPlaybackRate(result.defaultPlaybackRate);
      }
      setHasApiKey(!!result.geminiApiKey);
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

  const updatePlaybackRate = async (newRate: number, save: boolean = true) => {
    setPlaybackRate(newRate);
    if (save) {
      await chrome.storage.sync.set({ defaultPlaybackRate: newRate });
      // Send message to current tab to update playback rate
      if (currentTab?.id) {
        const delays = [1000, 2000, 3000]; // Gradual delay times

        for (let i = 0; i < delays.length; i++) {
          try {
            console.log(`[popup] Playback rate update attempt ${i + 1}/${delays.length}`);
            await new Promise(resolve => setTimeout(resolve, delays[i]));

            // Check initialization status
            const ready = await chrome.tabs.sendMessage(currentTab.id, {
              type: 'CHECK_READY'
            }).catch(() => false);

            if (!ready) {
              console.log('[popup] Content script not ready, retrying...');
              continue;
            }

            const response = await chrome.tabs.sendMessage(currentTab.id, {
              type: 'SET_PLAYBACK_RATE',
              rate: newRate
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
      <h2>Music x1</h2>
      
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
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Popup;
