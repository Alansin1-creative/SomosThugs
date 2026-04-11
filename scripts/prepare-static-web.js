const fs = require('fs');
const path = require('path');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function escapeAttr(s) {
  return String(s || '').
  replace(/&/g, '&amp;').
  replace(/"/g, '&quot;').
  replace(/</g, '&lt;');
}

const root = process.cwd();
const distDir = process.env.DIST_DIR || path.join(root, 'dist-web');
const htaccessSrc = path.join(root, 'hostinger', '.htaccess');
const seoPath = path.join(root, 'src', 'config', 'seo.json');

ensureDir(distDir);

const indexPath = path.join(distDir, 'index.html');
const dest404 = path.join(distDir, '404.html');

if (fs.existsSync(indexPath) && fs.existsSync(seoPath)) {
  const seo = JSON.parse(fs.readFileSync(seoPath, 'utf8'));
  let html = fs.readFileSync(indexPath, 'utf8');

  const metas = [
  `<meta name="description" content="${escapeAttr(seo.defaultDescription)}" />`,
  `<meta property="og:site_name" content="${escapeAttr(seo.siteName)}" />`,
  `<meta property="og:type" content="${escapeAttr(seo.ogType || 'website')}" />`,
  `<meta property="og:title" content="${escapeAttr(seo.defaultTitle)}" />`,
  `<meta property="og:description" content="${escapeAttr(seo.defaultDescription)}" />`,
  `<meta name="twitter:card" content="${escapeAttr(seo.twitterCard || 'summary_large_image')}" />`,
  `<meta name="twitter:title" content="${escapeAttr(seo.defaultTitle)}" />`,
  `<meta name="twitter:description" content="${escapeAttr(seo.defaultDescription)}" />`].
  join('\n    ');

  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeAttr(seo.defaultTitle)}</title>`);

  if (!html.includes('name="description"')) {
    html = html.replace(/<\/title>/i, `</title>\n    ${metas}`);
  }

  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('[prepare-static-web] SEO (título + meta) inyectado en index.html');
}


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