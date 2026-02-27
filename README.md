# Somos Thugs

server: cd server && npm i && npm start (puerto 4000). .env con MONGODB_URI y JWT_SECRET.
app: npm i && npx expo start. BASE_URL en src/config/api.js.

**Para que Netlify guarde usuarios en MongoDB:** sube el backend (carpeta `server`) a Railway o Render. En Netlify → Site settings → Environment variables añade `EXPO_PUBLIC_API_URL` = URL pública del backend (ej. https://tu-app.railway.app). Redeploy.

Google (web): En Google Cloud Console crea un cliente OAuth "Aplicación web". En "Orígenes autorizados" y "URIs de redirección" añade la URL de la app (ej. http://localhost:8081, https://somosthugs.netlify.app). En Expo Go Google no funciona; usa navegador o un development build.
