# Music x1 Chrome Extension

> [!CAUTION]
> This is an experimental Chrome extension. Use at your own risk. Features and functionality may change without notice.

A Chrome extension that automatically detects music content on YouTube using Google Gemini AI and sets playback speed based on content type:
- For music content: Automatically sets to 1x speed for optimal listening
- For non-music content: Automatically adjusts speed between 1x and 2.5x in 0.25x increments

## Installation

1. Clone this repository
```bash
git clone https://github.com/izumiz-dev/music-x1.git
```

2. Install dependencies
```bash
pnpm install
```

3. Build the extension
```bash
pnpm build
```

4. Load the extension in Chrome
- Open Chrome
- Go to `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked"
- Select the extension's build directory

5. Configure Google Gemini API Key
- Get your API key from Google AI Studio
- Click the extension icon in Chrome
- Open extension settings
- Enter your Gemini API key in the settings page
- Save the settings

## Development

- `pnpm dev` - Start development mode with hot reload
- `pnpm build` - Build for production

## Tech Stack

- TypeScript
- Google Gemini AI
- Preact
- esbuild
