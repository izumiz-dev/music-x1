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

*Read this in other languages: [日本語](README_JA.md)*

## Documentation

Detailed documentation is available in the docs directory:

- [Installation Guide](docs/installation.md) - How to install the extension
- [Usage Guide](docs/usage.md) - How to use the extension's features
- [Build Guide](docs/build.md) - Building and packaging process
- [Development Guide](docs/development.md) - Development workflow and commands
- [Architecture](docs/architecture.md) - Technical architecture and implementation details

## Quick Start

### Installation

1. Download the latest release from the [Releases page](https://github.com/izumiz-dev/music-x1/releases)
2. For Chrome/Edge: Drag and drop the ZIP file into `chrome://extensions/` with Developer mode enabled
3. For Firefox: Go to `about:addons`, click the gear icon and select "Install Add-on From File"

### Configuration

1. Set up API keys from the [Google Cloud Console](https://console.cloud.google.com/)
2. Enable YouTube Data API v3 and Gemini API
3. Enter your API keys in the extension settings

See the [Installation Guide](docs/installation.md) and [Usage Guide](docs/usage.md) for more details.

## Browser Compatibility

This extension supports both Chrome/Edge (Manifest V3) and Firefox (Manifest V2).
