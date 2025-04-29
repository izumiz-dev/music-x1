const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const packageJson = require('../package.json');

// Get package version
const version = packageJson.version;

/**
 * Create release packages for both Chrome and Firefox extensions
 * Bundle builds and packaging for both browsers in a single operation
 */
async function bundleRelease() {
  console.log(`=== Music X1 Extension v${version} Release Build Started ===\n`);

  try {
    // Clean up previous builds
    console.log('Cleaning up previous builds...');
    const distDir = path.join(__dirname, '../dist');

    // Clean dist directory if it exists
    if (fs.existsSync(distDir)) {
      if (process.platform === 'win32') {
        // Windows environment
        execSync(`rmdir /S /Q "${distDir}"`, { stdio: 'inherit' });
      } else {
        // Linux/macOS environment
        execSync(`rm -rf "${distDir}"`, { stdio: 'inherit' });
      }
      console.log('Cleanup completed');
    }

    // Create output directory
    fs.mkdirSync(distDir, { recursive: true });

    // Build & package Chrome extension
    console.log('\n--- Starting Chrome Extension Build ---');
    execSync('node scripts/create-chrome-addon.js', { stdio: 'inherit' });

    // Build & package Firefox extension
    console.log('\n--- Starting Firefox Extension Build ---');
    execSync('node scripts/create-firefox-addon.js', { stdio: 'inherit' });

    // Copy final artifacts to release directory
    const releaseDir = path.join(__dirname, '../release');
    if (!fs.existsSync(releaseDir)) {
      fs.mkdirSync(releaseDir, { recursive: true });
    }

    // Copy Chrome extension artifact
    const chromeExtDir = path.join(__dirname, '../dist/chrome-ext');
    const chromeFiles = fs.readdirSync(chromeExtDir);
    const chromeZipFile = chromeFiles.find(file => file.includes('.zip'));

    if (chromeZipFile) {
      fs.copyFileSync(
        path.join(chromeExtDir, chromeZipFile),
        path.join(releaseDir, chromeZipFile)
      );
      console.log(`Copied Chrome extension package to release directory: ${chromeZipFile}`);
    }

    // Copy Firefox extension artifact
    const firefoxExtDir = path.join(__dirname, '../dist/firefox-addon');
    const firefoxFiles = fs.readdirSync(firefoxExtDir);
    const firefoxXpiFile = firefoxFiles.find(file => file.includes('.xpi'));

    if (firefoxXpiFile) {
      fs.copyFileSync(
        path.join(firefoxExtDir, firefoxXpiFile),
        path.join(releaseDir, firefoxXpiFile)
      );
      console.log(`Copied Firefox extension package to release directory: ${firefoxXpiFile}`);
    }

    console.log('\n=== Release Build Completed ===');
    console.log('Artifacts:');
    console.log(`- Chrome: ${path.join(releaseDir, chromeZipFile)}`);
    console.log(`- Firefox: ${path.join(releaseDir, firefoxXpiFile)}`);
  } catch (error) {
    console.error('\nAn error occurred:', error);
    process.exit(1);
  }
}

// Execute script
bundleRelease();
