<div align="center">
  <img src="src/icons/icon.svg" alt="Music x1 Logo" width="128" height="128" />
  
  # Music x1 Chrome Extension

  [![Release](https://img.shields.io/github/v/release/izumiz-dev/music-x1?style=flat-square)](https://github.com/izumiz-dev/music-x1/releases)
  [![License](https://img.shields.io/github/license/izumiz-dev/music-x1?style=flat-square)](LICENSE)

  [English](README.md) | [日本語](README_JA.md)

  Smart YouTube playback speed controller powered by AI
</div>

---

> [!CAUTION]
> This is an experimental Chrome extension. Use at your own risk. Features and functionality may change without notice.

A Chrome extension that leverages YouTube Data API and Google Gemini AI to detect music content on YouTube automatically and adjusts playback speed accordingly:
- For music content: Automatically sets to 1x speed for optimal listening experience
- For non-music content: Allows speed adjustment between 1x and 3x with 0.1x increments
- Global toggle: Quickly enable or disable the extension with a single click when needed

For detailed information about the detection system and internal workings, see [ARCHITECTURE.md](ARCHITECTURE.md).

*Read this in other languages: [日本語](README_JA.md)*

## Usage

### Basic Features

- The extension automatically detects when you're watching a music video on YouTube
- For music videos, playback speed is locked to 1x for optimal listening
- For non-music videos, you can adjust playback speed from 1x to 3x

### Extension Toggle

- Click the extension icon to open the popup panel
- Use the toggle switch in the top-right corner to enable/disable the extension
- When disabled:
  - All videos play at normal (1x) speed
  - Speed controls are inactive
  - Badge icon is hidden
- When enabled:
  - The extension resumes normal operation
  - Current video is analyzed and speed is adjusted accordingly

## Installation

### Quick Installation (Recommended)

1. Download the Latest Release
- Visit the [Releases page](https://github.com/izumiz-dev/music-x1/releases)
- Download the latest `music-x1-vX.X.X.zip` file (where X.X.X is the version number)

2. Install in Chrome
- Open Chrome
- Navigate to `chrome://extensions/`
- Enable "Developer mode" in the top right corner
- Click "Load unpacked" in the top left
- Select the directory extracted from the zip file

### From Source (Development)

If you need to build from source:

1. Clone and Setup
```bash
git clone https://github.com/izumiz-dev/music-x1.git
cd music-x1
pnpm install
pnpm build
```

2. Load the extension as described in the Quick Installation section, but select the `dist` directory

### Configuration

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
- Click the extension icon in Chrome
- Open extension settings
- Enter both API keys in their respective fields
- Save the settings

## Development

### Available Commands

- `pnpm dev` - Start development mode with hot reload
- `pnpm build` - Build for production

### Tech Stack

- TypeScript
- Google Gemini AI
- Preact
- esbuild
