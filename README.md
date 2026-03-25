# Somos Thugs

**Server:** `cd server && npm i && npm start` (puerto 4000). En `server/.env`: `MONGODB_URI`, `JWT_SECRET`, etc.

**App:** `npm i && npx expo start`. La URL del API en producción se resuelve en `src/config/api.js` (`getBaseUrl()`): en web, cualquier dominio que no sea localhost usa Railway por defecto o `EXPO_PUBLIC_API_PRODUCTION_URL`.

## Web en producción (Hostinger)

1. En tu PC: `npm run build:web:production` — genera `dist-web/` (HTML, JS, assets, `.htaccess`, `404.html`).
2. Sube **todo** el contenido de `dist-web/` a `public_html` (Administrador de archivos o FTP de Hostinger).
3. Asegúrate de que Apache tenga `mod_rewrite` activo (suele venir en planes compartidos). El `.htaccess` hace que las rutas de la SPA carguen `index.html`.
4. Si la app no está en la raíz sino en una subcarpeta, edita `RewriteBase` en `hostinger/.htaccess` antes del build y vuelve a generar `dist-web`.

**Google OAuth (web):** En Google Cloud Console, orígenes y redirecciones deben incluir `https://somosthugs.com` (y `https://www.somosthugs.com` si aplica).

**Backend (Railway):** El repo es un monorepo (Expo en la raíz, API en `server/`). En Railway debe usarse el **`Dockerfile` de la raíz** (lo indica `railway.toml`); así el servicio arranca `node index.js` y no `expo start` (este último deja el build colgado hasta el *timeout*). Variables en el servicio: `MONGODB_URI`, `JWT_SECRET`, `PORT` la asigna Railway. Alternativa sin Docker: en **Settings → Root Directory** pon `server` y deja el builder por defecto.

**CORS:** Deben estar permitidos los orígenes de tu web (`server/index.js`).
