# Music X1 Build and Packaging Guide

This document explains the build and packaging process for the Music X1 browser extension.

## Overview

The Music X1 project supports both Chrome and Firefox browsers with a unified build system. The build process has two main stages:

1. **Build**: Compiles, bundles, and prepares files for testing
2. **Package**: Creates distributable files for sharing or publishing

## Build vs Package

### What is "Build"?

The build process transforms source code into a usable form directly in the browser:

- TypeScript/TSX files are compiled to JavaScript
- Dependencies are bundled together
- Source code is minified (in production builds)
- Static files (HTML, CSS) are copied to output directories
- Browser-specific manifest adaptations are handled
- Icons are generated from SVG sources

The build output is placed in `dist/chrome` or `dist/firefox` directories and can be loaded as an "unpacked extension" for testing.

### What is "Package"?

The packaging process takes the built files and creates installable artifacts:

- For Chrome/Edge: Creates a ZIP file in `dist/chrome-ext`
- For Firefox: Creates an XPI file in `dist/firefox-addon`

These packaged files can be:
- Submitted to browser extension stores
- Distributed to users for direct installation
- Used for release management

## Build System Architecture

### Key Components

- `esbuild.config.js`: The main build configuration for both browsers
- `scripts/firefox/generate-manifest.js`: Transforms Chrome's Manifest V3 into Firefox's Manifest V2
- `scripts/create-chrome-addon.js`: Packages Chrome extension into distributable format
- `scripts/create-firefox-addon.js`: Packages Firefox extension into distributable format
- `scripts/bundle-release.js`: Creates release packages for both browsers in one step
- `scripts/generate-icons.js`: Generates PNG icons from SVG sources

### Build Flow

1. Source TypeScript files are compiled and bundled with esbuild
2. Static files are copied to the output directory
3. Firefox builds get manifest transformation
4. Icons are generated and placed in the correct location
5. Completed builds are placed in browser-specific directories

### Packaging Flow

1. Check if builds exist (run build if needed)
2. Validate and ensure icon files are present
3. Create ZIP (Chrome) or XPI (Firefox) from build directories
4. Place packaged files in the appropriate output directories

## Available Commands

| Command | Description |
|---------|-------------|
| `pnpm build` | Build for all browsers (outputs to `dist/chrome` and `dist/firefox`) |
| `pnpm build:chrome` | Build for Chrome only (outputs to `dist/chrome`) |
| `pnpm build:firefox` | Build for Firefox only (outputs to `dist/firefox`) |
| `pnpm build:dev` | Build for development mode (with sourcemaps, without minification) |
| `pnpm package:chrome` | Package Chrome extension (will build if needed) |
| `pnpm package:firefox` | Package Firefox extension (will build if needed) |
| `pnpm package:all` | Package both Chrome and Firefox extensions |

## Browser Compatibility

The build system handles browser compatibility in two key ways:

1. **Build-time adaptation**:
   - Firefox uses Manifest V2, Chrome uses Manifest V3
   - Icon paths and permissions are adjusted per browser requirements
   - Background scripts vs service workers are handled appropriately

2. **Runtime adaptation**:
   - The `browser-polyfill.ts` file abstracts browser API differences
   - Dynamically detects browser environment and uses appropriate APIs
   - Provides unified interfaces for storage, messaging, and browser actions

## Development Workflow

### For development and testing:

1. Run `pnpm build:chrome` or `pnpm build:firefox` (or `pnpm build:dev` for both)
2. Load the extension from the `dist/{browser}` directory
   - Chrome: Open chrome://extensions, enable "Developer mode", click "Load unpacked"
   - Firefox: Open about:debugging#/runtime/this-firefox, click "Load Temporary Add-on"

### For preparing releases:

1. Run `pnpm package:all` to create distributable files for both browsers
2. Distributable files will be available in:
   - Chrome: `dist/chrome-ext/music-x1-chrome-v{version}.zip`
   - Firefox: `dist/firefox-addon/music-x1-firefox-v{version}.xpi`

## Troubleshooting

### Common Build Issues

- **TypeScript errors**: Run `pnpm type-check` to identify type issues
- **Missing files**: Ensure all required source files exist
- **Firefox manifest errors**: Check browser console for manifest validation issues

### Common Packaging Issues

- **Missing icons**: Verify that icons are correctly generated
- **Manifest errors**: Review browser-specific manifest requirements
- **Permission issues**: Ensure appropriate permissions are set for each browser

## Tips

- Use development builds (`pnpm build:dev`) for faster iterations during development
- Package commands always ensure a fresh build, no need to build separately
- Both browsers can be built in parallel using `pnpm build` which is faster than running them separately
