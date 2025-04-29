# Music x1 Installation Guide

## Quick Installation (Recommended)

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

## From Source (Development)

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

## Firefox Unsigned Extensions (XPI)

### Firefox Version Compatibility for Unsigned Extensions

Since Firefox 48, Mozilla requires all extensions to be signed for security reasons. Here are your options for using unsigned extensions:

| Firefox Version     | Can Use Unsigned Extensions | Notes |
|---------------------|-------------------------|-------|
| Standard Release    | No                      | Not possible to override signing requirement |
| ESR                 | Yes (with setting)      | Extended Support Release for organizations |
| Developer Edition   | Yes (with setting)      | Recommended for extension developers |
| Nightly             | Yes (with setting)      | Pre-release testing version |
| Unbranded Build     | Yes (with setting)      | Special build without Firefox branding |

### Installing Unsigned Extensions (Advanced Users)

> **⚠️ WARNING**: These procedures are intended for advanced users only. Changing settings in the configuration editor (about:config) can seriously impact browser stability, security, and performance. Only proceed if you are comfortable with advanced settings and understand the potential implications.

Firefox ESR, Developer Edition, and Nightly versions allow disabling the signature enforcement through the Firefox configuration editor:

1. Open Firefox (ESR, Developer Edition, or Nightly)
2. In the address bar, enter `about:config`
3. Accept the warning about proceeding with caution
4. Search for `xpinstall.signatures.required`
5. Double-click the preference to set its value to `false`
6. To override language pack signing requirements, also set `extensions.langpacks.signatures.required` to `false`

You can now install the unsigned XPI file by:
- Going to `about:addons`
- Clicking the gear icon > "Install Add-on From File"
- Selecting your XPI file

**Note**: In standard Firefox release versions, changing the `xpinstall.signatures.required` preference has no effect. You must use one of the special versions mentioned above.

For temporary testing in any Firefox version, you can use:
- Go to `about:debugging#/runtime/this-firefox`
- Click "Load Temporary Add-on..." and select the XPI or `manifest.json`
- Note that this is truly temporary - the extension will be removed when Firefox is closed

For more information, see the [Mozilla Wiki on Extension Signing](https://wiki.mozilla.org/Add-ons/Extension_Signing).

## Signing Firefox Extensions

For distribution to regular Firefox users, all extensions must be signed by Mozilla:

1. Create a developer account on [addons.mozilla.org](https://addons.mozilla.org/)
2. Generate an XPI file using `pnpm package:firefox`
3. Submit the XPI file through the AMO developer dashboard
4. Choose either public listing or self-distribution (unlisted)
5. After approval, download the signed XPI for distribution

For detailed information about the signing process, visit the [Mozilla Extension Workshop](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/).
