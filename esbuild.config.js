const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
require('dotenv').config();

/**
 * Simplified build process
 * For both Chrome and Firefox
 */

// Logging function
function log(message) {
  const now = new Date();
  const datetime = now.toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
  console.log(`[${datetime}] ${message}`);
}

/**
 * Build for the specified browser
 * @param {string} browser - 'chrome' or 'firefox'
 * @param {boolean} isDev - whether in development mode
 */
async function buildForBrowser(browser, isDev) {
  // Browser-specific configuration
  const browserConfig = {
    chrome: {
      outputDir: 'dist/chrome',
      target: ['chrome58'],
      manifestTransform: false
    },
    firefox: {
      outputDir: 'dist/firefox',
      target: ['firefox102'],
      manifestTransform: true
    }
  }[browser];

  if (!browserConfig) {
    throw new Error(`Unsupported browser: ${browser}`);
  }

  const { outputDir, target, manifestTransform } = browserConfig;

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Find entry points (TypeScript files)
  const entryPoints = glob.sync('src/**/*.{ts,tsx}');

  // Build configuration
  const buildOptions = {
    entryPoints,
    bundle: true,
    format: 'esm',
    outdir: outputDir,
    target,
    minify: !isDev,
    sourcemap: isDev,
    define: {
      'process.env.NODE_ENV': isDev ? '"development"' : '"production"',
      'process.env.BROWSER': `"${browser}"`
    },
  };

  try {
    // Run TypeCheck
    try {
      log(`Running TypeScript type checking...`);
      require('child_process').execSync('pnpm type-check', { stdio: 'inherit' });
    } catch (error) {
      log('TypeScript type check failed');
      if (!isDev) {
        throw error; // Abort on production build
      }
    }

    // Execute build with esbuild
    log(`Starting build for ${browser}...`);
    await esbuild.build(buildOptions);

    // Copy static files
    copyStaticFiles(browser, outputDir, manifestTransform);

    log(`Build for ${browser} completed successfully!`);
    return true;
  } catch (error) {
    log(`Build failed for ${browser}: ${error}`);
    return false;
  }
}

/**
 * Copy static files
 */
function copyStaticFiles(browser, outputDir, manifestTransform) {
  try {
    // Copy HTML files
    const htmlFiles = glob.sync('src/**/*.html');
    htmlFiles.forEach(file => {
      const relativePath = path.relative('src', file);
      fs.copyFileSync(file, path.join(outputDir, relativePath));
    });

    // Copy CSS files
    const cssFiles = glob.sync('src/**/*.css');
    cssFiles.forEach(file => {
      const relativePath = path.relative('src', file);
      fs.copyFileSync(file, path.join(outputDir, relativePath));
    });

    // Handle manifest
    if (manifestTransform) {
      // For Firefox, transform the manifest
      const sourceManifestPath = path.join(process.cwd(), 'manifest.json');
      const outputManifestPath = path.join(outputDir, 'manifest.json');
      require('./scripts/firefox/generate-manifest')
        .generateFirefoxManifest(sourceManifestPath, outputManifestPath);
    } else {
      // For Chrome, copy directly
      fs.copyFileSync('manifest.json', path.join(outputDir, 'manifest.json'));
    }

    // Generate and place icons
    require('./scripts/generate-icons');

    // Copy generated icons
    const iconDir = path.join(outputDir, 'icons');
    if (!fs.existsSync(iconDir)) {
      fs.mkdirSync(iconDir, { recursive: true });
    }

    const iconFiles = glob.sync('dist/icons/*.png');
    iconFiles.forEach(file => {
      const fileName = path.basename(file);
      fs.copyFileSync(file, path.join(iconDir, fileName));
    });

    log(`Static files copied successfully for ${browser}`);
  } catch (error) {
    log(`Failed to copy static files: ${error}`);
    throw error;
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    isDev: args.includes('--dev'),
    browsers: args.includes('--chrome') ? ['chrome'] :
              args.includes('--firefox') ? ['firefox'] :
              ['chrome', 'firefox'], // Default is both
  };
}

// Main process
async function main() {
  const { browsers, isDev } = parseArgs();

  log('Starting build...');

  // Build for each target browser
  const results = [];
  for (const browser of browsers) {
    results.push(await buildForBrowser(browser, isDev));
  }

  // Check if all builds succeeded
  const allSucceeded = results.every(result => result === true);

  if (allSucceeded) {
    log('All builds completed successfully!');
  } else {
    log('Some builds failed');
    process.exit(1);
  }
}

// Execute script
main();
