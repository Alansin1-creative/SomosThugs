const fs = require('fs');
const path = require('path');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

const root = process.cwd();
const distDir = process.env.DIST_DIR || path.join(root, 'dist-web');
const htaccessSrc = path.join(root, 'hostinger', '.htaccess');

ensureDir(distDir);

const indexPath = path.join(distDir, 'index.html');
const dest404 = path.join(distDir, '404.html');

// SPA: algunos hosts muestran 404.html para URLs desconocidas
if (fs.existsSync(indexPath)) {
  fs.copyFileSync(indexPath, dest404);
  console.log('[prepare-static-web] 404.html = copia de index.html');
} else {
  console.warn('[prepare-static-web] Falta index.html — ejecuta antes npm run export:web');
}

if (fs.existsSync(htaccessSrc)) {
  fs.copyFileSync(htaccessSrc, path.join(distDir, '.htaccess'));
  console.log('[prepare-static-web] Copiado .htaccess (Apache / Hostinger)');
} else {
  console.warn('[prepare-static-web] No existe hostinger/.htaccess');
}
