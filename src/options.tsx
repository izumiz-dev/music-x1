import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { apiKeyManager, ApiKeyType } from './apiKeyManager';

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
        
        // 安全に暗号化されたAPIキーを取得
        const geminiKey = await apiKeyManager.getApiKey(ApiKeyType.GEMINI);
        const youtubeKey = await apiKeyManager.getApiKey(ApiKeyType.YOUTUBE);
        
        // デフォルト再生速度を取得
        const result = await chrome.storage.sync.get(['defaultPlaybackRate']);
        
        if (geminiKey) {
          setGeminiApiKey(geminiKey);
        }
        if (youtubeKey) {
          setYoutubeApiKey(youtubeKey);
        }
        if (result.defaultPlaybackRate) {
          setDefaultPlaybackRate(result.defaultPlaybackRate);
        }
      } catch (error) {
        console.error('設定の読み込み中にエラーが発生しました:', error);
        setStatus('設定の読み込みに失敗しました');
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
      setStatus('保存中...');
      
      // APIキーを暗号化して保存
      await apiKeyManager.saveApiKey(ApiKeyType.GEMINI, geminiApiKey.trim());
      await apiKeyManager.saveApiKey(ApiKeyType.YOUTUBE, youtubeApiKey.trim());
      
      // デフォルト再生速度を保存
      await chrome.storage.sync.set({ defaultPlaybackRate });
      
      setStatus('Settings saved');
      setTimeout(() => {
        setStatus('');
      }, 3000);
    } catch (error) {
      console.error('設定の保存中にエラーが発生しました:', error);
      setStatus('設定の保存に失敗しました');
    }
  };

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
