import { h } from "preact";
import { useEffect, useState } from "preact/hooks";
import "./popup.css";

const Popup = () => {
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1.5);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error('tabs.query error:', chrome.runtime.lastError, chrome.runtime.lastError);
      }
      if (tabs[0]) {
        setCurrentTab(tabs[0]);
      }
    });

    // Load saved playback rate
    chrome.storage.local.get(["defaultPlaybackRate"], (result) => {
      if (result.defaultPlaybackRate) {
        setPlaybackRate(result.defaultPlaybackRate);
      }
    });
  }, []);

  const updatePlaybackRate = async (newRate: number, save: boolean = true) => {
    setPlaybackRate(newRate);
    if (save) {
      await chrome.storage.local.set({ defaultPlaybackRate: newRate });
      // Send message to current tab to update playback rate
      if (currentTab?.id) {
        try {
          const response = await chrome.tabs.sendMessage(currentTab.id, {
            type: 'SET_PLAYBACK_RATE',
            rate: newRate
          });
          
          if (!response?.success) {
            console.warn('Failed to set playback rate:', response?.error || 'Unknown error');
          }
        } catch (error) {
          console.error('Error occurred while updating playback rate:', error);
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

  return (
    <div class="popup-container">
      <h2>Music x1</h2>
      
      <div class="playback-settings">
        <div class="speed-display">
          <span class="speed-value">{playbackRate}x</span>
          <span class="speed-label">Default Playback Speed</span>
        </div>

        <div class="slider-container">
          <input
            type="range"
            min="1"
            max="2.5"
            step="0.25"
            value={playbackRate}
            onChange={handlePlaybackRateChange}
            onInput={handleSliderInput}
            class="speed-slider"
          />
          
        </div>
      </div>
    </div>
  );
};

export default Popup;
