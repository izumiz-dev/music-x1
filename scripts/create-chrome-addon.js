const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const packageJson = require('../package.json');

// Get package version
const version = process.env.PACKAGE_VERSION || packageJson.version;

/**
 * Script to create Chrome extension package (.zip)
 * Includes icon processing and multi-platform compatibility
 */
async function createChromeExtension() {
  try {
    console.log(`== Creating Chrome Extension v${version} ==`);

    // Check Chrome build directory
    const chromeDistDir = path.join(__dirname, '../dist/chrome');

    // Check if already built, build if needed
    if (!fs.existsSync(chromeDistDir) || !fs.existsSync(path.join(chromeDistDir, 'manifest.json'))) {
      console.log('Running Chrome build...');
      execSync('node esbuild.config.js --chrome', { stdio: 'inherit' });
    } else {
      console.log('Using existing Chrome build.');
    }

    // =====================================================
    // FIX: Ensure icons directory and files are correctly set up
    // =====================================================
    const iconsDir = path.join(chromeDistDir, 'icons');
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
      console.log('Created icons directory.');
    }

    // Copy icon files from dist/icons to chrome build icons directory
    const distIconsDir = path.join(__dirname, '../dist/icons');
    if (fs.existsSync(distIconsDir)) {
      console.log('Verifying icon files in Chrome build directory...');
      const iconFiles = fs.readdirSync(distIconsDir);

      // Check each icon file
      let missingIcons = false;
      for (const file of iconFiles) {
        if (file.endsWith('.png')) {
          const sourcePath = path.join(distIconsDir, file);
          const targetPath = path.join(iconsDir, file);

          // Copy if missing or different size
          if (!fs.existsSync(targetPath) ||
              fs.statSync(sourcePath).size !== fs.statSync(targetPath).size) {
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`Copied ${file} to ${iconsDir}`);
            missingIcons = true;
          }
        }
      }

      if (missingIcons) {
        console.log('Successfully fixed missing icon files.');
      } else {
        console.log('All icon files are correctly in place.');
      }
    } else {
      console.error('Warning: dist/icons directory does not exist. Generating icons...');
      // Generate icons
      execSync('node scripts/generate-icons.js', { stdio: 'inherit' });

      // Try again to copy icons
      if (fs.existsSync(distIconsDir)) {
        const iconFiles = fs.readdirSync(distIconsDir);
        for (const file of iconFiles) {
          if (file.endsWith('.png')) {
            const sourcePath = path.join(distIconsDir, file);
            const targetPath = path.join(iconsDir, file);
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`Copied ${file} to ${iconsDir}`);
          }
        }
      } else {
        console.error('Error: Failed to generate icon files.');
        return;
      }
    }
    // =====================================================
    // End of icon fix
    // =====================================================

    // Create output directory
    const outputDir = path.join(__dirname, '../dist/chrome-ext');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Set the ZIP file name
    const zipFileName = `music-x1-chrome-v${version}.zip`;
    const zipFilePath = path.join(outputDir, zipFileName);

    // Create ZIP archive based on OS
    console.log(`Creating Chrome extension ZIP file: ${zipFilePath}`);
    if (process.platform === 'win32') {
      // Windows: Use PowerShell
      execSync(`cd "${chromeDistDir}" && powershell Compress-Archive -Path * -DestinationPath "${zipFilePath}" -Force`);
    } else {
      // Linux/macOS: Use zip
      execSync(`cd "${chromeDistDir}" && zip -r "${zipFilePath}" *`);
    }

    // =====================================================
    // CROSS-PLATFORM FIX: Create a platform-appropriate copy for direct installation
    // =====================================================
    if (process.platform === 'win32') {
      // Windows-specific direct install directory
      const directInstallDir = path.join('D:', `music-x1-chrome-v${version}`);
      console.log(`Creating copy for direct installation at: ${directInstallDir}`);

      // Remove existing directory if it exists
      if (fs.existsSync(directInstallDir)) {
        execSync(`rmdir /s /q "${directInstallDir}"`, { stdio: 'inherit' });
      }

      // Create directory
      fs.mkdirSync(directInstallDir, { recursive: true });

      // Copy all files from Chrome build directory using Windows xcopy
      execSync(`xcopy "${chromeDistDir}\\*" "${directInstallDir}\\" /E /I /H /Y`, { stdio: 'inherit' });

      console.log(`Direct installation directory created: ${directInstallDir}`);
      console.log('\nInstallation Instructions:');
      console.log('1. Open Chrome/Edge');
      console.log('2. Go to "chrome://extensions/"');
      console.log('3. Enable "Developer mode" in the top right corner');
      console.log('4. Click "Load unpacked" and select the directory: ' + directInstallDir);
    } else {
      // Linux/macOS instruction
      console.log('\nInstallation Instructions:');
      console.log('1. Open Chrome/Edge');
      console.log('2. Go to "chrome://extensions/"');
      console.log('3. Enable "Developer mode" in the top right corner');
      console.log('4. Click "Load unpacked" and select the directory: ' + chromeDistDir);
      console.log('   OR');
      console.log('5. Drag and drop the ZIP file into the Chrome/Edge extensions page');
    }
    // =====================================================
    // End of cross-platform fix
    // =====================================================

    console.log('\nCompleted!');
    console.log(`Chrome extension package: ${zipFilePath}`);
    console.log('\nInstallation Instructions:');
    console.log('1. Open Chrome/Edge');
    console.log('2. Go to "chrome://extensions/"');
    console.log('3. Enable "Developer mode" in the top right corner');
    console.log(`4. Drag and drop "${zipFilePath}" into the browser extensions page`);
  } catch (error) {
    console.error('Error occurred:', error);
    process.exit(1);
  }
}

// Execute script
createChromeExtension();
