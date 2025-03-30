const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function generateIcons() {
  const svgPath = path.join(__dirname, '../src/icons/icon.svg');
  const disabledSvgPath = path.join(__dirname, '../src/icons/disabled_icon.svg');
  const sizes = [16, 48, 128];

  try {
    const svgBuffer = await fs.readFile(svgPath);
    const disabledSvgBuffer = await fs.readFile(disabledSvgPath);
    
    // dist/iconsディレクトリを作成
    const distIconsDir = path.join(__dirname, '../dist/icons');
    await fs.mkdir(distIconsDir, { recursive: true });

    // 通常アイコンの各サイズのPNGを生成
    for (const size of sizes) {
      const pngPath = path.join(distIconsDir, `icon${size}.png`);
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(pngPath);
      console.log(`Generated ${size}x${size} icon: ${pngPath}`);
    }

    // 無効状態アイコンの各サイズのPNGを生成
    for (const size of sizes) {
      const disabledPngPath = path.join(distIconsDir, `disabled_icon${size}.png`);
      await sharp(disabledSvgBuffer)
        .resize(size, size)
        .png()
        .toFile(disabledPngPath);
      console.log(`Generated ${size}x${size} disabled icon: ${disabledPngPath}`);
    }
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();