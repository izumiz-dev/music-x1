# Unified Build System

This directory contains the unified build system for the Music-X1 browser extension. It replaces the separate build scripts (`esbuild.config.js` and `esbuild.firefox.js`) with a single, more flexible build system.

## New Build Commands

| Command | Description |
|---------|-------------|
| `pnpm build` | Build extensions for all browsers |
| `pnpm build:chrome` | Build Chrome extension only |
| `pnpm build:firefox` | Build Firefox extension only |
| `pnpm build:dev` | Build all extensions in development mode |
| `pnpm build:chrome:dev` | Build Chrome extension in development mode |
| `pnpm build:firefox:dev` | Build Firefox extension in development mode |
| `pnpm dev` | Watch mode for all browsers |
| `pnpm dev:chrome` | Watch mode for Chrome |
| `pnpm dev:firefox` | Watch mode for Firefox |
| `pnpm package` | Build and package all extensions |
| `pnpm package:chrome` | Build and package Chrome extension |
| `pnpm package:firefox` | Build and package Firefox extension |

## New Directory Structure

All build artifacts are now organized under the `dist/` directory:

```
dist/
├── chrome/         (Chrome build files)
├── chrome-ext/     (Packaged Chrome extension)
├── firefox/        (Firefox build files)
├── firefox-addon/  (Packaged Firefox addon)
└── icons/          (Generated icons)
```

## Migration Notes

The original build scripts have been backed up to `scripts/build/backup/` for reference. The GitHub workflows have been updated to use the new build commands.

## Changes Made

1. Unified build system that can handle both Chrome and Firefox builds
2. Simplified command structure with more intuitive names
3. Added combined commands that run the entire build and package process in one step
4. Consistent directory structure under `dist/`
5. Consistent naming conventions