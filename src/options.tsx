import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

const Options = () => {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    // Load saved API key
    chrome.storage.sync.get(['geminiApiKey'], (result) => {
      if (result.geminiApiKey) {
        setApiKey(result.geminiApiKey);
      }
    });
  }, []);

  const saveOptions = () => {
    chrome.storage.sync.set(
      {
        geminiApiKey: apiKey,
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
        <div class="input-group">
          <label class="input-label">Gemini API Key:</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey((e.target as HTMLInputElement).value)}
            class="input-field"
          />
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
