# Somos Thugs

**Server:** `cd server && npm i && npm start` (puerto 4000). En `server/.env`: `MONGODB_URI`, `JWT_SECRET`, etc.

**App:** `npm i && npx expo start`. La URL del API en producción se resuelve en `src/config/api.js` (`getBaseUrl()`): en web, cualquier dominio que no sea localhost usa Render por defecto o `EXPO_PUBLIC_API_PRODUCTION_URL`.

## Web en producción (Hostinger)

1. En tu PC: `npm run build:web:production` — genera `dist-web/` (HTML, JS, assets, `.htaccess`, `404.html`).
2. Sube **todo** el contenido de `dist-web/` a `public_html` (Administrador de archivos o FTP de Hostinger).
3. Asegúrate de que Apache tenga `mod_rewrite` activo (suele venir en planes compartidos). El `.htaccess` hace que las rutas de la SPA carguen `index.html`.
4. Si la app no está en la raíz sino en una subcarpeta, edita `RewriteBase` en `hostinger/.htaccess` antes del build y vuelve a generar `dist-web`.

**Google OAuth (web):** En Google Cloud Console, orígenes y redirecciones deben incluir `https://somosthugs.com` (y `https://www.somosthugs.com` si aplica).

## Backend en Render (gratis)

1. Sube este repo a GitHub (si no está).
2. En Render crea un **Web Service** apuntando al repo.
3. Configuración del servicio:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Runtime:** Node 18+
4. Variables de entorno en Render:
   - `MONGODB_URI=<tu uri de MongoDB Atlas>`
   - `JWT_SECRET=<tu secreto largo>`
   - `GOOGLE_MAPS_API_KEY=<api key server>`
   - `NODE_ENV=production`
   - `PORT` no se define manualmente (Render la inyecta).
5. Tras el deploy, copia la URL pública (por ejemplo `https://somosthugs.onrender.com`) y colócala en:
   - `.env` (raíz): `EXPO_PUBLIC_API_PRODUCTION_URL=<url render>`
   - o directamente en `src/config/api.js` como valor por defecto.
6. Verifica con `https://TU-URL-RENDER/health` y luego vuelve a generar web:
   - `npm run build:web:production`
   - sube `dist-web/` a `public_html`.

**CORS:** Deben estar permitidos los orígenes de tu web (`server/index.js`).
