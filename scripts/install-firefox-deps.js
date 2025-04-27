const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Installing Firefox dependencies...');

// Check if package.json exists
const packageJsonPath = path.join(__dirname, '../package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('package.json not found!');
  process.exit(1);
}

// Install Firefox WebExtension types
try {
  console.log('Installing @types/firefox-webext-browser...');
  execSync('pnpm add -D @types/firefox-webext-browser', { stdio: 'inherit' });
  console.log('Successfully installed Firefox WebExtension types!');
} catch (error) {
  console.error('Failed to install Firefox WebExtension types:', error);
  process.exit(1);
}

console.log('Firefox dependencies installation completed!');
