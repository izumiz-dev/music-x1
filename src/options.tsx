import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

const Options = () => {
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [youtubeApiKey, setYoutubeApiKey] = useState('');
  const [defaultPlaybackRate, setDefaultPlaybackRate] = useState(1.5);
  const [status, setStatus] = useState('');

  useEffect(() => {
    // Load saved settings
    chrome.storage.sync.get(['geminiApiKey', 'youtubeApiKey', 'defaultPlaybackRate'], (result) => {
      if (result.geminiApiKey) {
        setGeminiApiKey(result.geminiApiKey);
      }
      if (result.youtubeApiKey) {
        setYoutubeApiKey(result.youtubeApiKey);
      }
      if (result.defaultPlaybackRate) {
        setDefaultPlaybackRate(result.defaultPlaybackRate);
      }
    });
  }, []);

  const saveOptions = () => {
    if (!youtubeApiKey.trim()) {
      setStatus('YouTube API Key is required');
      return;
    }
    chrome.storage.sync.set(
      {
        geminiApiKey,
        youtubeApiKey,
        defaultPlaybackRate
      },
      () => {
        setStatus('Settings saved');
        setTimeout(() => {
          setStatus('');
        }, 3000);
      }
    );
  };

  return (
    <div class="options-container">
      <h1>Music x1 Settings</h1>
      <div class="settings-group">
        <h2>API Keys</h2>
        <div class="input-group">
          <label class="input-label">YouTube API Key:</label>
          <input
            type="password"
            value={youtubeApiKey}
            onChange={(e) => setYoutubeApiKey((e.target as HTMLInputElement).value)}
            class="input-field"
          />
          <p class="help-text">Required: Used for accurate video details</p>
        </div>
        <div class="input-group">
          <label class="input-label">Gemini API Key:</label>
          <input
            type="password"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey((e.target as HTMLInputElement).value)}
            class="input-field"
          />
          <p class="help-text">Used for AI-based content analysis</p>
        </div>
      </div>
      <div class="settings-group">
        <h2>Default Playback Rate</h2>
        <div class="input-group">
          <label class="input-label">Playback Rate:</label>
          <input
            type="number"
            min="0.25"
            max="4"
            step="0.25"
            value={defaultPlaybackRate}
            onChange={(e) => setDefaultPlaybackRate(parseFloat((e.target as HTMLInputElement).value))}
            class="input-field"
          />
        </div>
      </div>
      <button onClick={saveOptions} class="save-button">Save</button>
      {status && <div className={`status-message ${status ? 'visible' : ''}`}>{status}</div>}
    </div>
  );
};

const container = document.getElementById('app');
if (container) {
  render(<Options />, container);
}
