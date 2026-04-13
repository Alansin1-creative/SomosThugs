/**
 * Genera iconos PWA cuadrados desde el logo Somos Thugs (PNG con transparencia).
 * Ejecutar: node scripts/generate-pwa-icons.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'assets', 'logo-somos-thugs-banner.png');
const publicDir = path.join(root, 'public');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('[generate-pwa-icons] Instalá sharp: npm install sharp --save-dev');
    process.exit(1);
  }
  if (!fs.existsSync(src)) {
    console.error('[generate-pwa-icons] No existe:', src);
    process.exit(1);
  }
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

  async function squarePng(size, dest) {
    const buf = await sharp(src)
      .resize(size, size, { fit: 'contain', background: transparent })
      .png()
      .toBuffer();
    fs.writeFileSync(dest, buf);
    console.log('[generate-pwa-icons] OK', path.relative(root, dest), `(${size}x${size})`);
  }

  await squarePng(192, path.join(publicDir, 'pwa-icon-192.png'));
  await squarePng(512, path.join(publicDir, 'pwa-icon-512.png'));
}

main().catch((e) => {
  console.error('[generate-pwa-icons]', e);
  process.exit(1);
});
