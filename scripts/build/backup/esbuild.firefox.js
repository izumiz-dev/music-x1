const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
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

// Get entry points
const entryPoints = glob.sync('src/**/*.{ts,tsx}');

// Set Firefox build directory
const OUTPUT_DIR = 'dist/firefox';

// Determine dev mode from command line arguments
const isDevMode = process.argv.includes('--dev');

// Build configuration
const buildOptions = {
  entryPoints,
  bundle: true,
  format: 'esm',
  outdir: OUTPUT_DIR,
  // Target Firefox instead of Chrome
  target: ['firefox102'],
  minify: !isDevMode,
  sourcemap: isDevMode,
  define: {
    'process.env.NODE_ENV': isDevMode ? '"development"' : '"production"',
    // Define a global variable to identify Firefox build
    'process.env.BROWSER': '"firefox"'
  },
};

// Copy static files
function copyStaticFiles() {
  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    // Copy HTML files
    const htmlFiles = glob.sync('src/**/*.html');
    htmlFiles.forEach(file => {
      const relativePath = path.relative('src', file);
      fs.copyFileSync(file, path.join(OUTPUT_DIR, relativePath));
    });
    
    // Generate Firefox-compatible manifest
    const sourceManifestPath = path.join(__dirname, 'manifest.json');
    const outputManifestPath = path.join(OUTPUT_DIR, 'manifest.json');
    require('./scripts/firefox/generate-manifest').generateFirefoxManifest(sourceManifestPath, outputManifestPath);

    // Copy CSS files
    const cssFiles = glob.sync('src/**/*.css');
    cssFiles.forEach(file => {
      const relativePath = path.relative('src', file);
      fs.copyFileSync(file, path.join(OUTPUT_DIR, relativePath));
    });

    // Generate PNG icons from SVG
    require('./scripts/generate-icons');

    // Copy generated icons to Firefox build directory
    const iconFiles = glob.sync('dist/icons/*.png');
    if (!fs.existsSync(path.join(OUTPUT_DIR, 'icons'))) {
      fs.mkdirSync(path.join(OUTPUT_DIR, 'icons'), { recursive: true });
    }
    
    iconFiles.forEach(file => {
      const fileName = path.basename(file);
      fs.copyFileSync(file, path.join(OUTPUT_DIR, 'icons', fileName));
    });

    logWithDateTime('Static files copied successfully');
  } catch (error) {
    logWithDateTime(`Failed to copy static files: ${error}`);
  }
}

// Execute build
async function build(watch = false) {
  try {
    // Build with esbuild
    if (watch) {
      const ctx = await esbuild.context({
        ...buildOptions,
        plugins: [{
          name: 'watch-plugin',
          setup(build) {
            build.onEnd(result => {
              if (result.errors.length > 0) {
                logWithDateTime('Build failed with errors');
              } else {
                logWithDateTime('Build completed successfully');
                copyStaticFiles();
              }
            });
          },
        }],
      });
      
      await ctx.watch();
      logWithDateTime('Watching for changes...');
      copyStaticFiles();
    } else {
      await esbuild.build(buildOptions);
      copyStaticFiles();
      logWithDateTime('Firefox build completed successfully!');
    }
  } catch (error) {
    logWithDateTime(`Firefox build failed: ${error}`);
    process.exit(1);
  }
}

// Determine watch mode from command line arguments
const isWatch = process.argv.includes('--watch');
build(isWatch);