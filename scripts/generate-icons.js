const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function generateIcons() {
  const svgPath = path.join(__dirname, '../src/icons/icon.svg');
  const sizes = [16, 48, 128];

  try {
    const svgBuffer = await fs.readFile(svgPath);
    
    // dist/iconsディレクトリを作成
    const distIconsDir = path.join(__dirname, '../dist/icons');
    await fs.mkdir(distIconsDir, { recursive: true });

    // 各サイズのPNGを生成
    for (const size of sizes) {
      const pngPath = path.join(distIconsDir, `icon${size}.png`);
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(pngPath);
      console.log(`Generated ${size}x${size} icon: ${pngPath}`);
    }
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
