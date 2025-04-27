# Firefox Compatibility Setup Guide

This guide explains how to build and test the Music X1 extension for Firefox.

## Prerequisites

- Node.js (v14 or newer)
- pnpm package manager
- Basic knowledge of browser extensions

## Setup Steps

1. **Install Firefox-specific dependencies**

   ```bash
   pnpm install:firefox-deps
   ```

   This will install the necessary TypeScript types for Firefox WebExtensions.

2. **Build for Firefox**

   ```bash
   pnpm build:firefox
   ```

   This will create a Firefox-compatible build in the `dist/firefox` directory.

3. **Test in Firefox**

   - Open Firefox
   - Navigate to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on..."
   - Select the `manifest.json` file from your `dist` directory

## Development Workflow

When actively developing, you can use:

```bash
pnpm dev:firefox
```

This will start a watch mode that rebuilds the extension whenever you make changes.

## How Firefox Compatibility Works

### Browser Compatibility Layer

The project uses a compatibility layer (`browser-polyfill.ts`) that abstracts away the differences between Chrome and Firefox extension APIs. This layer detects the browser environment and uses the appropriate API calls.

### Manifest Differences

Firefox currently uses Manifest V2, while Chrome uses Manifest V3. The build process automatically converts the manifest to the correct format for each browser.

Key differences:
- Firefox uses `browser_action` instead of `action`
- Firefox uses background scripts instead of service workers
- Firefox includes host permissions inside the permissions array

### Testing Both Browsers

You can check if your code works in both browsers by:
1. Building for Chrome: `pnpm build`
2. Testing in Chrome
3. Building for Firefox: `pnpm build:firefox`
4. Testing in Firefox

Any issues specific to one browser should be handled in the browser compatibility layer.

## Troubleshooting

### Common Issues

1. **Extension not loading in Firefox**
   
   Check the console in `about:debugging` for error messages. Common issues include:
   - Manifest format errors
   - Missing permission declarations
   - API compatibility issues

2. **Features working in Chrome but not Firefox**

   Some APIs have different behaviors between browsers. Check the Firefox WebExtension documentation for specific differences and update the `browser-polyfill.ts` file accordingly.

3. **Background script not running**

   Firefox uses a different background script implementation. Ensure your background code is compatible with Firefox's background script model.

### Getting Help

For Firefox WebExtension API documentation, visit:
https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions

## Creating a Release Bundle

To create distributable files for both Chrome and Firefox with a single command:

```bash
pnpm package
```

This will generate:
- `dist/chrome-ext/music-x1-chrome-v{version}.zip` for Chrome
- `dist/firefox-addon/music-x1-firefox-v{version}.xpi` for Firefox

Or you can create packages for specific browsers:

```bash
# For Chrome only
pnpm package:chrome

# For Firefox only
pnpm package:firefox
```

These files can be used for submission to the respective extension stores or for distribution to users.
