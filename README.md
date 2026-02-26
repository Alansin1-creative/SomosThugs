# Somos Thugs

server: cd server && npm i && npm start (puerto 4000). .env con MONGODB_URI y JWT_SECRET.
app: npm i && npx expo start. BASE_URL en src/config/api.js.

Google (web): En Google Cloud Console crea un cliente OAuth "Aplicación web". En "Orígenes autorizados" y "URIs de redirección" añade la URL de la app (ej. http://localhost:8081). Usa el ID de ese cliente como GOOGLE_WEB_CLIENT_ID en Login.js. En Expo Go Google no funciona; usa navegador o un development build.
