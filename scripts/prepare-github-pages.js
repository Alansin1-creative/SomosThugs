const fs = require('fs');
const path = require('path');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

const root = process.cwd();
const distDir = process.env.DIST_DIR || path.join(root, 'dist-web');
const templateDir = path.join(root, 'github-pages');

const src404 = path.join(templateDir, '404.html');
const srcNoJekyll = path.join(templateDir, '.nojekyll');

ensureDir(distDir);

// 1) Copiar 404.html para que GitHub Pages redirija a la raíz
if (fs.existsSync(src404)) {
  fs.copyFileSync(src404, path.join(distDir, '404.html'));
  console.log('[prepare-github-pages] Copiado 404.html');
} else {
  console.warn('[prepare-github-pages] No existe github-pages/404.html');
}

// 2) Copiar .nojekyll para desactivar procesamiento de Jekyll
if (fs.existsSync(srcNoJekyll)) {
  fs.copyFileSync(srcNoJekyll, path.join(distDir, '.nojekyll'));
  console.log('[prepare-github-pages] Copiado .nojekyll');
} else {
  console.warn('[prepare-github-pages] No existe github-pages/.nojekyll');
}

// Nota: no tocamos otros assets del export.

