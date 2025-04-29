const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const packageJson = require('../package.json');

// Get package version
const version = process.env.PACKAGE_VERSION || packageJson.version;

/**
 * Script to create Firefox add-on XPI file
 */
async function createFirefoxAddon() {
  try {
    console.log(`== Creating Firefox Add-on v${version} ==`);

    // Check Firefox build directory
    const firefoxDistDir = path.join(__dirname, '../dist/firefox');

    // Check if already built, build if needed
    if (!fs.existsSync(firefoxDistDir) || !fs.existsSync(path.join(firefoxDistDir, 'manifest.json'))) {
      console.log('Running Firefox build...');
      execSync('node esbuild.config.js --firefox', { stdio: 'inherit' });
    } else {
      console.log('Using existing Firefox build.');
    }

    // Verify and fix icon files
    const iconsDir = path.join(firefoxDistDir, 'icons');
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
    }

    // Check if generated icons exist, generate if needed
    const distIconsDir = path.join(__dirname, '../dist/icons');
    if (!fs.existsSync(distIconsDir) || fs.readdirSync(distIconsDir).length === 0) {
      console.log('Generating icons...');
      execSync('node scripts/generate-icons.js', { stdio: 'inherit' });
    }

    // Copy icon files
    if (fs.existsSync(distIconsDir)) {
      console.log('Copying icon files...');
      const iconFiles = fs.readdirSync(distIconsDir);
      for (const file of iconFiles) {
        if (file.endsWith('.png')) {
          const sourcePath = path.join(distIconsDir, file);
          const targetPath = path.join(iconsDir, file);
          fs.copyFileSync(sourcePath, targetPath);
        }
      }
      console.log('Icons copied successfully');
    }

    // Create output directory
    const outputDir = path.join(__dirname, '../dist/firefox-addon');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Set the XPI file name (XPI is the Firefox add-on extension)
    const xpiFileName = `music-x1-firefox-v${version}.xpi`;
    const xpiFilePath = path.join(outputDir, xpiFileName);

    // Package the contents of the dist-firefox directory into an XPI file
    console.log(`Creating XPI file: ${xpiFilePath}`);

    // Create ZIP file (XPI is essentially a ZIP file) based on OS
    if (process.platform === 'win32') {
      // Use PowerShell on Windows
      execSync(`cd "${firefoxDistDir}" && powershell Compress-Archive -Path * -DestinationPath "${xpiFilePath}" -Force`);
    } else {
      // Use zip on Linux/macOS
      execSync(`cd "${firefoxDistDir}" && zip -r "${xpiFilePath}" *`);
    }

    // Change extension from zip to xpi if needed (zip command might create .zip)
    if (path.extname(xpiFilePath) === '.zip') {
      const newPath = xpiFilePath.replace('.zip', '.xpi');
      fs.renameSync(xpiFilePath, newPath);
      console.log(`Renamed file to: ${path.basename(newPath)}`);
    }

    console.log('\nCompleted!');
    console.log(`Firefox add-on file created: ${xpiFilePath}`);
    console.log('\nInstallation Instructions:');
    console.log('1. Open Firefox');
    console.log('2. Type "about:addons" in the address bar');
    console.log('3. Click the gear icon > Select "Install Add-on From File"');
    console.log(`4. Select the created "${xpiFileName}" file`);
  } catch (error) {
    console.error('Error occurred:', error);
    process.exit(1);
  }
}

// Execute the script
createFirefoxAddon();
