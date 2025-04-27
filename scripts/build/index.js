const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { execSync } = require('child_process');
require('dotenv').config();

// Function to output logs with timestamp
function logWithDateTime(message) {
  const now = new Date();
  const datetime = now.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  console.log(`[${datetime}] ${message}`);
}

/**
 * Run type checking and linting
 * @param {boolean} fix - Whether to automatically fix linting issues
 * @returns {boolean} - Whether the checks passed
 */
function runQualityChecks(fix = false) {
  try {
    // Run TypeScript type checking
    logWithDateTime('Running TypeScript type checking...');
    execSync('pnpm type-check', { stdio: 'inherit' });
    
    // Run ESLint
    logWithDateTime(`Running ESLint${fix ? ' with auto-fix' : ''}...`);
    execSync(`pnpm lint${fix ? ':fix' : ''}`, { stdio: 'inherit' });
    
    logWithDateTime('Quality checks passed!');
    return true;
  } catch (error) {
    logWithDateTime('Quality checks failed!');
    return false;
  }
}

/**
 * Build extension for a specific browser
 * @param {string} browser - Browser to build for ('chrome' or 'firefox')
 * @param {object} options - Build options
 */
async function buildExtension(browser, options = {}) {
  // Extract options
  const isDevMode = options.dev || false;
  const isWatch = options.watch || false;
  const isPackage = options.package || false;
  const skipQualityChecks = options.skipQualityChecks || false;
  
  // Set browser-specific options
  const browserOptions = {
    chrome: {
      outputDir: 'dist/chrome',
      target: ['chrome58'],
      manifestTransform: null, // Chrome doesn't need manifest transformation
    },
    firefox: {
      outputDir: 'dist/firefox',
      target: ['firefox102'],
      manifestTransform: './scripts/firefox/generate-manifest', // Firefox needs manifest transformation
    }
  };
  
  if (!browserOptions[browser]) {
    throw new Error(`Unsupported browser: ${browser}. Supported browsers are 'chrome' and 'firefox'.`);
  }
  
  const { outputDir, target, manifestTransform } = browserOptions[browser];
  
  // Get entry points
  const entryPoints = glob.sync('src/**/*.{ts,tsx}');
  
  // Build configuration
  const buildOptions = {
    entryPoints,
    bundle: true,
    format: 'esm',
    outdir: outputDir,
    target,
    minify: !isDevMode,
    sourcemap: isDevMode,
    define: {
      'process.env.NODE_ENV': isDevMode ? '"development"' : '"production"',
      'process.env.BROWSER': `"${browser}"`
    },
  };
  
  // Run quality checks before building
  if (!skipQualityChecks) {
    const qualityChecksPassed = runQualityChecks(isDevMode);
    if (!qualityChecksPassed && !isDevMode) {
      logWithDateTime('Build aborted due to quality check failures.');
      process.exit(1);
    }
  }
  
  // Execute build
  try {
    // Build with esbuild
    if (isWatch) {
      const ctx = await esbuild.context({
        ...buildOptions,
        plugins: [{
          name: 'watch-plugin',
          setup(build) {
            build.onEnd(result => {
              if (result.errors.length > 0) {
                logWithDateTime(`${browser} build failed with errors`);
              } else {
                logWithDateTime(`${browser} build completed successfully`);
                copyStaticFiles(browser, manifestTransform);
              }
            });
          },
        }],
      });
      
      await ctx.watch();
      logWithDateTime(`Watching for changes in ${browser} build...`);
      copyStaticFiles(browser, manifestTransform);
    } else {
      await esbuild.build(buildOptions);
      copyStaticFiles(browser, manifestTransform);
      logWithDateTime(`${browser} build completed successfully!`);
      
      // If package flag is set, create the extension package
      if (isPackage) {
        logWithDateTime(`Packaging ${browser} extension...`);
        
        if (browser === 'chrome') {
          require('../create-chrome-addon');
        } else if (browser === 'firefox') {
          require('../create-firefox-addon');
        }
      }
    }
  } catch (error) {
    logWithDateTime(`${browser} build failed: ${error}`);
    process.exit(1);
  }
}

/**
 * Copy static files to the output directory
 * @param {string} browser - Browser target ('chrome' or 'firefox')
 * @param {string|null} manifestTransform - Path to manifest transform module or null
 */
function copyStaticFiles(browser, manifestTransform) {
  const outputDir = `dist/${browser}`;
  
  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Copy HTML files
    const htmlFiles = glob.sync('src/**/*.html');
    htmlFiles.forEach(file => {
      const relativePath = path.relative('src', file);
      fs.copyFileSync(file, path.join(outputDir, relativePath));
    });
    
    // Handle manifest
    if (manifestTransform) {
      // Use transform for Firefox manifest
      const sourceManifestPath = path.join(process.cwd(), 'manifest.json');
      const outputManifestPath = path.join(outputDir, 'manifest.json');
      require(manifestTransform).generateFirefoxManifest(sourceManifestPath, outputManifestPath);
    } else {
      // Direct copy for Chrome manifest
      fs.copyFileSync('manifest.json', path.join(outputDir, 'manifest.json'));
    }
    
    // Copy CSS files
    const cssFiles = glob.sync('src/**/*.css');
    cssFiles.forEach(file => {
      const relativePath = path.relative('src', file);
      fs.copyFileSync(file, path.join(outputDir, relativePath));
    });
    
    // Generate PNG icons from SVG
    require('../generate-icons');
    
    // Copy generated icons to browser build directory
    const iconFiles = glob.sync('dist/icons/*.png');
    if (!fs.existsSync(path.join(outputDir, 'icons'))) {
      fs.mkdirSync(path.join(outputDir, 'icons'), { recursive: true });
    }
    
    iconFiles.forEach(file => {
      const fileName = path.basename(file);
      fs.copyFileSync(file, path.join(outputDir, 'icons', fileName));
    });
    
    logWithDateTime(`Static files copied successfully for ${browser}`);
  } catch (error) {
    logWithDateTime(`Failed to copy static files for ${browser}: ${error}`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dev: args.includes('--dev'),
  watch: args.includes('--watch'),
  package: args.includes('--package'),
  skipQualityChecks: args.includes('--skip-quality-checks'),
};

// Determine browser target(s)
let browsers = [];

if (args.includes('--chrome')) {
  browsers.push('chrome');
}

if (args.includes('--firefox')) {
  browsers.push('firefox');
}

// If no specific browser is specified, build for all browsers
if (browsers.length === 0) {
  browsers = ['chrome', 'firefox'];
}

// Build for each specified browser
async function runBuilds() {
  for (const browser of browsers) {
    await buildExtension(browser, options);
  }
}

runBuilds();
