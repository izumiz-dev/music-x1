# Music x1 Development Guide

## Development Environment Setup

To set up your development environment for Music x1:

1. Clone the repository and install dependencies
```bash
git clone https://github.com/izumiz-dev/music-x1.git
cd music-x1
pnpm install
```

2. Install Firefox-specific dependencies (if developing for Firefox)
```bash
pnpm install:firefox-deps
```

## Available Commands

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
- `pnpm lint` - Run ESLint to check for code style issues
- `pnpm lint:fix` - Run ESLint and automatically fix issues
- `pnpm type-check` - Run TypeScript compiler to check for type errors

For more detailed information about the build process, see [Build Guide](build.md).

## Tech Stack

Music x1 is built using the following technologies:

- **TypeScript** - Main programming language
- **Google Gemini AI** - For content analysis
- **Preact** - Lightweight alternative to React for UI components
- **esbuild** - Fast JavaScript bundler and minifier

## Project Structure

The project has the following structure:

```
music-x1/
├── docs/                   # Documentation
├── scripts/                # Build and utility scripts
│   ├── build/              # Build scripts
│   ├── firefox/            # Firefox-specific scripts
│   └── ...
├── src/                    # Source code
│   ├── background/         # Background script
│   ├── content/            # Content scripts
│   ├── icons/              # SVG icons
│   ├── managers/           # Core management classes
│   ├── pages/              # UI pages (popup, options)
│   ├── services/           # API services
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   └── browser-polyfill.ts # Browser compatibility layer
├── manifest.json           # Chrome extension manifest (v3)
└── ...
```

## Browser Compatibility

This extension supports both Chrome/Edge (Manifest V3) and Firefox (Manifest V2).

The browser compatibility is handled through:

1. **Different Manifest Files**:
   - Chrome uses the root `manifest.json` (Manifest V3)
   - Firefox uses a transformed version created during build (Manifest V2)

2. **Browser Polyfill**:
   - The `src/browser-polyfill.ts` file provides a unified API for both browsers
   - It detects the browser environment and uses appropriate API calls
   - This allows the rest of the code to use a single consistent interface

## Contributing

When contributing to this project, please:

1. Follow the existing code style and structure
2. Run `pnpm lint` and `pnpm type-check` before submitting changes
3. Test your changes in both Chrome and Firefox
4. Document any new features or API changes

For detailed technical information about the extension's architecture, please refer to the [Architecture Documentation](architecture.md).
