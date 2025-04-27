const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const packageJson = require('../package.json');

// Read the package version from environment variable or package.json
const version = process.env.PACKAGE_VERSION || packageJson.version;

/**
 * Script to create Chrome extension file (.crx or .zip)
 */
async function createChromeExtension() {
  try {
    console.log(`== Creating Chrome Extension v${version} ==`);

    // Check Chrome build directory
    const chromeDistDir = path.join(__dirname, '../dist/chrome');

    // Check if already built
    if (!fs.existsSync(chromeDistDir) || !fs.existsSync(path.join(chromeDistDir, 'manifest.json'))) {
      console.log('Running Chrome build...');
      execSync('pnpm build', { stdio: 'inherit' });
    } else {
      console.log('Chrome build already exists. Reusing it.');
    }

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
      // Use PowerShell on Windows
      execSync(`cd "${chromeDistDir}" && powershell Compress-Archive -Path * -DestinationPath "${zipFilePath}" -Force`);
    } else {
      // Use zip on Linux/macOS
      // Ensure zip is installed in the environment (GitHub Actions runners usually have it)
      execSync(`cd "${chromeDistDir}" && zip -r "${zipFilePath}" *`);
    }

    // Check if we have a private key for .crx creation
    const privateKeyPath = path.join(__dirname, '../chrome-ext.pem');
    if (fs.existsSync(privateKeyPath)) {
      try {
        // If crx package is installed, use it to create a .crx file
        console.log('Private key found. Attempting to create .crx file...');

        // You would need to have the 'crx' package installed
        // This is a placeholder for the actual implementation
        const crxFileName = `music-x1-chrome-v${version}.crx`;
        const crxFilePath = path.join(outputDir, crxFileName);

        console.log('To create .crx files, please install the crx package:');
        console.log('  npm install -g crx');
        console.log('Then use:');
        console.log(`  crx pack ${chromeDistDir} -o ${crxFilePath} -p ${privateKeyPath}`);

        console.log('\nAlternatively, you can use Chrome to pack the extension:');
        console.log('1. Open Chrome and go to chrome://extensions/');
        console.log('2. Enable Developer mode');
        console.log('3. Click "Pack extension"');
        console.log(`4. Browse to the extension directory: ${chromeDistDir}`);
        console.log(`5. If you have a private key, select it: ${privateKeyPath}`);
        console.log('6. Click "Pack Extension"');
      } catch (crxError) {
        console.log('Could not create .crx file:', crxError.message);
        console.log('Falling back to ZIP file only.');
      }
    } else {
      console.log('\nNo private key (chrome-ext.pem) found in the project root.');
      console.log('Only a ZIP file was created. To create a proper .crx file:');
      console.log('1. First, generate a private key:');
      console.log('   openssl genrsa -out chrome-ext.pem 2048');
      console.log('2. Place the key file in the project root directory');
      console.log('3. Run this script again');
    }

    console.log('\nCompleted!');
    console.log(`Chrome extension file created: ${zipFilePath}`);
    console.log('\nInstallation Instructions:');
    console.log('1. Open Chrome/Edge');
    console.log('2. Go to "chrome://extensions/"');
    console.log('3. Enable "Developer mode" in the top right corner');
    console.log('4. Drag and drop the ZIP file into the Chrome/Edge extensions page');
    console.log('   OR');
    console.log('5. Click "Load unpacked" and select the dist-chrome directory');
  } catch (error) {
    console.error('Error occurred:', error);
    process.exit(1);
  }
}

// Execute the script
createChromeExtension();
