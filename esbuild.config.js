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

// Build configuration
const buildOptions = {
  entryPoints,
  bundle: true,
  format: 'esm',
  outdir: 'dist',
  target: ['chrome58'],
  define: {
    'process.env.NODE_ENV': '"production"'
  },
};

// Copy static files
function copyStaticFiles() {
  try {
    // Copy HTML files
    const htmlFiles = glob.sync('src/**/*.html');
    htmlFiles.forEach(file => {
      const relativePath = path.relative('src', file);
      fs.copyFileSync(file, path.join('dist', relativePath));
    });
    fs.copyFileSync('manifest.json', path.join('dist', 'manifest.json'));

    // Copy CSS files
    const cssFiles = glob.sync('src/**/*.css');
    cssFiles.forEach(file => {
      const relativePath = path.relative('src', file);
      fs.copyFileSync(file, path.join('dist', relativePath));
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
                // require('child_process').exec('wslview "http://reload.extensions"', (error) => {
                //   if (error) {
                //     logWithDateTime(`Failed to open browser: ${error}`);
                //   }
                // });
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
      logWithDateTime('Build completed successfully!');
    }
  } catch (error) {
    logWithDateTime(`Build failed: ${error}`);
    process.exit(1);
  }
}

// Determine watch mode from command line arguments
const isWatch = process.argv.includes('--watch');
build(isWatch);
