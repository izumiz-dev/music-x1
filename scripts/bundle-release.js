const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const packageJson = require('../package.json');

// Read the package version
const version = packageJson.version;

// Create builds for both Chrome and Firefox
console.log(`Building extension version ${version}...`);

// Clean previous builds
try {
  if (fs.existsSync(path.join(__dirname, '../dist-chrome'))) {
    console.log('Cleaning previous Chrome build...');
    execSync(`rmdir /S /Q "${path.join(__dirname, '../dist-chrome')}"`);
  }
  
  if (fs.existsSync(path.join(__dirname, '../dist-firefox'))) {
    console.log('Cleaning previous Firefox build...');
    execSync(`rmdir /S /Q "${path.join(__dirname, '../dist-firefox')}"`);
  }
} catch (error) {
  console.error('Error cleaning previous builds:', error);
}

// Build Chrome version
try {
  console.log('\nBuilding Chrome version...');
  execSync('pnpm build', { stdio: 'inherit' });
  
  console.log('Creating Chrome ZIP archive...');
  const chromeOutputDir = path.join(__dirname, '../release');
  
  // Create the output directory if it doesn't exist
  if (!fs.existsSync(chromeOutputDir)) {
    fs.mkdirSync(chromeOutputDir, { recursive: true });
  }
  
  // Create ZIP archive
  const chromeZipFileName = `music-x1-chrome-v${version}.zip`;
  execSync(`cd "${path.join(__dirname, '../dist-chrome')}" && powershell Compress-Archive -Path * -DestinationPath "${path.join(chromeOutputDir, chromeZipFileName)}" -Force`);
  
  console.log(`Chrome build completed: ${path.join(chromeOutputDir, chromeZipFileName)}`);
} catch (error) {
  console.error('Error building Chrome version:', error);
}

// Build Firefox version
try {
  console.log('\nBuilding Firefox version...');
  execSync('pnpm build:firefox', { stdio: 'inherit' });
  
  console.log('Creating Firefox ZIP archive...');
  const firefoxOutputDir = path.join(__dirname, '../release');
  
  // Create the output directory if it doesn't exist
  if (!fs.existsSync(firefoxOutputDir)) {
    fs.mkdirSync(firefoxOutputDir, { recursive: true });
  }
  
  // Create ZIP archive
  const firefoxZipFileName = `music-x1-firefox-v${version}.zip`;
  execSync(`cd "${path.join(__dirname, '../dist-firefox')}" && powershell Compress-Archive -Path * -DestinationPath "${path.join(firefoxOutputDir, firefoxZipFileName)}" -Force`);
  
  console.log(`Firefox build completed: ${path.join(firefoxOutputDir, firefoxZipFileName)}`);
} catch (error) {
  console.error('Error building Firefox version:', error);
}

console.log('\nBuild process completed!');
console.log(`Chrome version: ${path.join(__dirname, '../release', `music-x1-chrome-v${version}.zip`)}`);
console.log(`Firefox version: ${path.join(__dirname, '../release', `music-x1-firefox-v${version}.zip`)}`);
