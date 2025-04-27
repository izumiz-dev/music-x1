const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const packageJson = require('../package.json');

// Read the package version
const version = packageJson.version;

/**
 * Script to create Firefox add-on build and XPI file
 */
async function createFirefoxAddon() {
  try {
    console.log(`== Creating Firefox Add-on v${version} ==`);

    // Check Firefox build directory
    const firefoxDistDir = path.join(__dirname, '../dist/firefox');
    
    // Check if already built
    if (!fs.existsSync(firefoxDistDir) || !fs.existsSync(path.join(firefoxDistDir, 'manifest.json'))) {
      console.log('Running Firefox build...');
      execSync('pnpm build:firefox', { stdio: 'inherit' });
    } else {
      console.log('Firefox build already exists. Reusing it.');
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
    
    // Create ZIP file (XPI is essentially a ZIP file)
    execSync(`cd "${firefoxDistDir}" && powershell Compress-Archive -Path * -DestinationPath "${xpiFilePath}" -Force`);
    
    // Change extension from zip to xpi if needed
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
