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
const envPath = path.join(root, '.env');

function readDotEnvKeys() {
  const o = {};
  if (!fs.existsSync(envPath)) return o;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      v.length >= 2 &&
      ((v[0] === '"' && v[v.length - 1] === '"') ||
        (v[0] === "'" && v[v.length - 1] === "'"))
    ) {
      v = v.slice(1, -1);
    }
    o[k] = v;
  }
  return o;
}

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

const dotEnv = readDotEnvKeys();
const adsenseClient = String(
  process.env.EXPO_PUBLIC_ADSENSE_CLIENT || dotEnv.EXPO_PUBLIC_ADSENSE_CLIENT || ''
).trim();
if (fs.existsSync(indexPath) && adsenseClient) {
  let htmlAds = fs.readFileSync(indexPath, 'utf8');
  if (!htmlAds.includes('name="google-adsense-account"')) {
    htmlAds = htmlAds.replace(
      /<\/title>/i,
      `</title>\n    <meta name="google-adsense-account" content="${escapeAttr(adsenseClient)}" />`
    );
    fs.writeFileSync(indexPath, htmlAds, 'utf8');
    console.log('[prepare-static-web] Meta google-adsense-account inyectada (verificación AdSense)');
  }
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

const swSrc = path.join(root, 'public', 'sw.js');
const swDest = path.join(distDir, 'sw.js');
if (fs.existsSync(swSrc) && fs.existsSync(distDir)) {
  fs.copyFileSync(swSrc, swDest);
  console.log('[prepare-static-web] Copiado sw.js (notificaciones Web Push)');
} else if (!fs.existsSync(swSrc)) {
  console.warn('[prepare-static-web] Falta public/sw.js (notificaciones escritorio web)');
}