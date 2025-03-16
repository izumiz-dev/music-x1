import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

const Options = () => {
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [youtubeApiKey, setYoutubeApiKey] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    // Load saved API keys
    chrome.storage.sync.get(['geminiApiKey', 'youtubeApiKey'], (result) => {
      if (result.geminiApiKey) {
        setGeminiApiKey(result.geminiApiKey);
      }
      if (result.youtubeApiKey) {
        setYoutubeApiKey(result.youtubeApiKey);
      }
    });
  }, []);

  const saveOptions = () => {
    chrome.storage.sync.set(
      {
        geminiApiKey,
        youtubeApiKey,
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
          <p class="help-text">Optional: Used for faster video category detection</p>
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
      <button onClick={saveOptions} class="save-button">Save</button>
      {status && <div class={`status-message ${status ? 'visible' : ''}`}>{status}</div>}
    </div>
  );
};

const container = document.getElementById('app');
if (container) {
  render(<Options />, container);
}
