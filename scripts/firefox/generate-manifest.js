const fs = require('fs');
const path = require('path');

/**
 * Function to convert Chrome Manifest V3 to Firefox-compatible Manifest V2 format
 * @param {string} sourcePath - Path to the original manifest.json
 * @param {string} outputPath - Path where to save the Firefox manifest
 * @returns {object} - The transformed Firefox manifest
 */
function generateFirefoxManifest(sourcePath, outputPath) {
  console.log(`Firefox manifest conversion: ${sourcePath} -> ${outputPath}`);

  // Read the original manifest
  const manifest = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

  // Create Firefox-compatible version
  const firefoxManifest = {
    // Common properties
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    icons: manifest.icons,

    // Add host permissions directly to the permissions array for Firefox
    permissions: [
      ...(manifest.permissions || []),
      ...(manifest.host_permissions || [])
    ],

    // Firefox uses browser_action instead of action in MV3
    browser_action: {
      default_popup: manifest.action?.default_popup || "pages/popup/index.html"
    },

    // Firefox uses background scripts instead of service workers
    background: {
      scripts: [manifest.background?.service_worker || "background/index.js"]
    },

    // Content scripts remain the same
    content_scripts: manifest.content_scripts,

    // Options page
    options_ui: {
      page: manifest.options_page || "pages/options/index.html",
      open_in_tab: true
    },

    // Add explicit Firefox addon ID
    browser_specific_settings: {
      gecko: {
        id: "music-x1@izumiz.dev",
        strict_min_version: "58.0"
      }
    },

    // Set manifest version to 2 for Firefox
    manifest_version: 2
  };

  // Write out the Firefox manifest
  fs.writeFileSync(outputPath, JSON.stringify(firefoxManifest, null, 2));
  console.log(`Firefox manifest generated: ${outputPath}`);

  return firefoxManifest;
}

// Handle direct script execution
if (require.main === module) {
  // Get source manifest path from first argument
  const sourceManifestPath = process.argv[2] || path.join(__dirname, '../../manifest.json');
  const outputManifestPath = process.argv[3] || path.join(__dirname, '../../dist/firefox/manifest.json');

  // Generate Firefox manifest
  generateFirefoxManifest(sourceManifestPath, outputManifestPath);
}

// Export as module
module.exports = {
  generateFirefoxManifest
};
