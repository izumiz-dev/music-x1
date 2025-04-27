import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { apiKeyManager, ApiKeyType } from './apiKeyManager';
import { StorageManager } from './storage-manager';
import { NavigationHelper } from './navigation-helper';

const Options = () => {
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [youtubeApiKey, setYoutubeApiKey] = useState('');
  const [defaultPlaybackRate, setDefaultPlaybackRate] = useState(1.5);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load saved settings
    const loadSettings = async () => {
      try {
        setLoading(true);
        
        // Securely retrieve encrypted API keys
        const geminiKey = await apiKeyManager.getApiKey(ApiKeyType.GEMINI);
        const youtubeKey = await apiKeyManager.getApiKey(ApiKeyType.YOUTUBE);
        
        // Get default playback rate
        const playbackRate = await StorageManager.get<number>('defaultPlaybackRate');
        
        if (geminiKey) {
          setGeminiApiKey(geminiKey);
        }
        if (youtubeKey) {
          setYoutubeApiKey(youtubeKey);
        }
        if (playbackRate) {
          setDefaultPlaybackRate(playbackRate);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        setStatus('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const saveOptions = async () => {
    if (!youtubeApiKey.trim()) {
      setStatus('YouTube API Key is required');
      return;
    }

    try {
      setStatus('Saving...');
      
      // Encrypt and save API keys
      await apiKeyManager.saveApiKey(ApiKeyType.GEMINI, geminiApiKey.trim());
      await apiKeyManager.saveApiKey(ApiKeyType.YOUTUBE, youtubeApiKey.trim());
      
      // Save default playback rate
      await StorageManager.set('defaultPlaybackRate', defaultPlaybackRate);
      
      setStatus('Settings saved');
      setTimeout(() => {
        setStatus('');
      }, 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setStatus('Failed to save settings');
    }
  };

  // キーボードショートカットでの保存をサポート
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveOptions();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [youtubeApiKey, geminiApiKey, defaultPlaybackRate]);

  if (loading) {
    return <div class="options-container"><p>Loading settings...</p></div>;
  }

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
      <div class="security-info">
        <h3>Security Information</h3>
        <p>API keys are stored in a securely encrypted state.</p>
        <p>Keys are only temporarily held in memory when in use and are cleared when the extension is closed.</p>
      </div>
    </div>
  );
};

const container = document.getElementById('app');
if (container) {
  render(<Options />, container);
}
