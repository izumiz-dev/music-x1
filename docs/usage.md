# Music x1 Usage Guide

## Basic Features

The Music x1 extension provides an intelligent playback speed control system for YouTube videos:

- The extension automatically detects when you're watching a music video on YouTube
- For music videos, playback speed is locked to 1x for optimal listening
- For non-music videos, you can adjust playback speed from 1x to 3x

## Extension Toggle

- Click the extension icon to open the popup panel
- Use the toggle switch in the top-right corner to enable/disable the extension
- When disabled:
  - All videos play at normal (1x) speed
  - Speed controls are inactive
  - Badge icon is hidden
- When enabled:
  - The extension resumes normal operation
  - Current video is analyzed and speed is adjusted accordingly

## Configuration

Both API keys are required and can be obtained from Google Cloud Console:

1. Set up Google Cloud Project
- Visit [Google Cloud Console](https://console.cloud.google.com/)
- Create a new project or select an existing one
- Enable billing for your project (required for API access)

2. Enable APIs
- Go to "APIs & Services" > "Library"
- Search for and enable "YouTube Data API v3"
- Search for and enable "Gemini API"

3. Create API Keys
- Go to "APIs & Services" > "Credentials"
- Click "Create Credentials" > "API key"
- Create two keys: one for YouTube Data API and one for Gemini API
- (Optional) Restrict the API keys by service for better security

4. Configure the Extension
- Click the extension icon in your browser
- Open extension settings
- Enter both API keys in their respective fields
- Save the settings

## Visual Feedback

The extension provides various visual cues to indicate its status:

### Badge Icons
- 🎵 (Green): Music content detected
- 🎞️ (Gray): Non-music content is detected

### Extension Icon
- Colored icon: Extension is enabled and functioning
- Grayscale icon: Extension is disabled

### Speed Controls
- For music: Fixed at 1x with visual indicator
- For non-music: Adjustable slider (1x-3x range with 0.1x steps)
- When disabled: Controls appear grayed out with overlay message
