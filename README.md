# Somos Thugs

server: cd server && npm i && npm start (puerto 4000). .env con MONGODB_URI y JWT_SECRET.
app: npm i && npx expo start. BASE_URL en src/config/api.js.

**Por qué solo funciona en local:** La app en Netlify usa por defecto `http://localhost:4000`. En otra laptop "localhost" es el PC de esa persona, no tu servidor, así que el registro no llega a tu base de datos.

**Para que Netlify guarde usuarios en MongoDB:** (1) Sube el backend (carpeta `server`) a Railway o Render y obtén la URL pública. (2) En Netlify → Site settings → Build & deploy → Environment añade `EXPO_PUBLIC_API_URL` = esa URL (ej. `https://tu-app.railway.app`). Redeploy. Alternativa: en `src/config/api.js` rellena `API_URL_PRODUCCION` con la URL del backend y haz redeploy.

Google (web): En Google Cloud Console crea un cliente OAuth "Aplicación web". En "Orígenes autorizados" y "URIs de redirección" añade la URL de la app (ej. http://localhost:8081, https://somosthugs.netlify.app). En Expo Go Google no funciona; usa navegador o un development build.
