const fs = require('fs');
const path = require('path');

/**
 * Function to convert Manifest V3 to Firefox-compatible format
 * @param {string} sourcePath - Path to source manifest.json
 * @param {string} outputPath - Path where to save the Firefox manifest
 * @returns {void}
 */
function generateFirefoxManifest(sourcePath, outputPath) {
  // Read the original manifest
  const manifest = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

  // Create a Firefox-compatible version
  const firefoxManifest = {
    // Keep common properties
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    icons: manifest.icons,
    permissions: [
      ...manifest.permissions,
      // Add host permissions directly to permissions array for Firefox
      ...(manifest.host_permissions || [])
    ],

    // Firefox uses browser_action instead of action in MV3
    browser_action: {
      default_popup: "pages/popup/index.html" // Use the correct path after build
    },

    // Firefox uses background scripts instead of service workers
    background: {
      scripts: ["background/index.js"] // Use the correct path after build
    },

    // Content scripts remain the same
    content_scripts: manifest.content_scripts,

    // Options page
    options_ui: {
      page: "pages/options/index.html", // Use the correct path after build
      open_in_tab: true
    },

    // Add explicit Firefox addon ID using izumiz.dev domain
    browser_specific_settings: {
      gecko: {
        id: "music-x1@izumiz.dev",
        strict_min_version: "58.0"
      }
    },

    // Set manifest version to 2 for Firefox
    manifest_version: 2
  };

  // Write the Firefox manifest
  fs.writeFileSync(outputPath, JSON.stringify(firefoxManifest, null, 2));
  console.log(`Firefox manifest generated at: ${outputPath}`);

  return firefoxManifest;
}

// スクリプトが直接呼び出された場合の処理
if (require.main === module) {
  // Get the source manifest path from the first argument
  const sourceManifestPath = process.argv[2] || path.join(__dirname, '../../manifest.json');
  const outputManifestPath = process.argv[3] || path.join(__dirname, '../../dist-firefox/manifest.json');

  // Generate the Firefox manifest
  generateFirefoxManifest(sourceManifestPath, outputManifestPath);
}

// モジュールとしてエクスポート
module.exports = {
  generateFirefoxManifest
};
