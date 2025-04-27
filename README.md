<div align="center">
  <img src="src/icons/icon.svg" alt="Music x1 Logo" width="128" height="128" />
  
  # Music x1 Browser Extension

  [![Release](https://img.shields.io/github/v/release/izumiz-dev/music-x1?style=flat-square)](https://github.com/izumiz-dev/music-x1/releases)
  [![License](https://img.shields.io/github/license/izumiz-dev/music-x1?style=flat-square)](LICENSE)

  [English](README.md) | [日本語](README_JA.md)

  Smart YouTube playback speed controller powered by AI
</div>

---

> [!CAUTION]
> This is an experimental browser extension. Use at your own risk. Features and functionality may change without notice.

A browser extension that leverages YouTube Data API and Google Gemini AI to detect music content on YouTube automatically and adjusts playback speed accordingly:
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
- Download the appropriate ZIP file for your browser:
  - Chrome/Edge: `music-x1-chrome-vX.X.X.zip`
  - Firefox: `music-x1-firefox-vX.X.X.zip`
  (where X.X.X is the version number)

2. Install in Chrome/Edge
- Method 1 (Direct Install from Release):
  - Simply drag and drop the downloaded ZIP file into Chrome's extensions page (`chrome://extensions/`) with Developer mode enabled

- Method 2 (Unpacked):
  - Open Chrome or Edge
  - Navigate to `chrome://extensions/`
  - Enable "Developer mode" in the top right corner
  - Click "Load unpacked" in the top left
  - Extract the Chrome zip file and select the extracted directory

3. Install in Firefox
- Method 1 (Direct Install from Release):
  - Open Firefox
  - Type `about:addons` in the address bar
  - Click the gear icon > Select "Install Add-on From File"
  - Select the downloaded XPI file

- Method 2 (Temporary Install):
  - Open Firefox
  - Navigate to `about:debugging#/runtime/this-firefox`
  - Click "Load Temporary Add-on..."
  - Select the `manifest.json` file from the extracted Firefox zip file

### From Source (Development)

If you need to build from source:

1. Clone and Setup
```bash
git clone https://github.com/izumiz-dev/music-x1.git
cd music-x1
pnpm install
```

2. Build for Chrome
```bash
# Build production version
pnpm build:chrome
# OR build development version
pnpm build:chrome:dev
```
The Chrome extension will be built in the `dist/chrome` directory.

3. Create installable Chrome extension file
```bash
pnpm package:chrome
```
The Chrome extension ZIP file will be created in the `dist/chrome-ext` directory. If you have a private key (`chrome-ext.pem`) in the project root, it will also create a `.crx` file.

4. Build for Firefox
```bash
# Install Firefox-specific dependencies first
pnpm install:firefox-deps
# Build production version
pnpm build:firefox
# OR build development version
pnpm build:firefox:dev
```
The Firefox extension will be built in the `dist/firefox` directory.

5. Create installable Firefox add-on file
```bash
pnpm package:firefox
```
The Firefox XPI file will be created in the `dist/firefox-addon` directory.

6. Install the extension using one of the methods described in the Quick Installation section.

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
- Click the extension icon in your browser
- Open extension settings
- Enter both API keys in their respective fields
- Save the settings

## Development

### Available Commands

- `pnpm build` - Build extensions for all browsers (outputs to `dist` folder)
- `pnpm build:chrome` - Build Chrome extension only (outputs to `dist/chrome`)
- `pnpm build:firefox` - Build Firefox extension only (outputs to `dist/firefox`)
- `pnpm build:dev` - Build all extensions in development mode
- `pnpm build:chrome:dev` - Build Chrome extension in development mode
- `pnpm build:firefox:dev` - Build Firefox extension in development mode
- `pnpm dev` - Start development mode with hot reload for all browsers
- `pnpm dev:chrome` - Start development mode with hot reload for Chrome
- `pnpm dev:firefox` - Start development mode with hot reload for Firefox
- `pnpm package` - Build and package all extensions
- `pnpm package:chrome` - Build and package Chrome extension (outputs to `dist/chrome-ext`)
- `pnpm package:firefox` - Build and package Firefox extension (outputs to `dist/firefox-addon`)
- `pnpm install:firefox-deps` - Install Firefox-specific dependencies

### Tech Stack

- TypeScript
- Google Gemini AI
- Preact
- esbuild

### Testing Unsigned Extensions in Firefox

During development, you can test unsigned extensions in Firefox Developer Edition or Firefox Nightly:

1. Open Firefox Developer Edition or Firefox Nightly
2. Navigate to `about:config`
3. Search for `xpinstall.signatures.required`
4. Set it to `false` by double-clicking the preference
5. Now you can install unsigned extensions for testing

**Note**: This is only for development/testing purposes. For distribution to regular users, you must sign your extension with Mozilla.

### Signing Firefox Extensions

For distribution to regular Firefox users, all extensions must be signed by Mozilla:

1. Create a developer account on [addons.mozilla.org](https://addons.mozilla.org/)
2. Generate an XPI file using `pnpm create:firefox-addon`
3. Submit the XPI file through the AMO developer dashboard
4. Choose either public listing or self-distribution (unlisted)
5. After approval, download the signed XPI for distribution

For detailed information about the signing process, visit the [Mozilla Extension Workshop](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/).

## Browser Compatibility

This extension supports both Chrome/Edge (Manifest V3) and Firefox (Manifest V2). For detailed information about Firefox compatibility implementation, see [FIREFOX_SETUP.md](FIREFOX_SETUP.md).
