// Local: usa EXPO_PUBLIC_API_URL o http://localhost:4000
// Netlify (otras personas): la app debe apuntar a tu backend en internet. Opciones:
// 1) En Netlify → Site settings → Build & deploy → Environment: EXPO_PUBLIC_API_URL = https://tu-api.onrender.com
// 2) O pon abajo la URL de tu backend desplegado en API_URL_PRODUCCION
const API_URL_PRODUCCION = 'https://somosthugs-production.up.railway.app';

const isWebProduction =
  typeof window !== 'undefined' &&
  (window.location?.origin === 'https://somosthugs.netlify.app' || window.location?.hostname?.endsWith('.netlify.app'));

const raw =
  process.env.EXPO_PUBLIC_API_URL ||
  (isWebProduction && API_URL_PRODUCCION ? API_URL_PRODUCCION : 'http://localhost:4000');
// Sin barra final para que BASE_URL + '/auth/register' no quede con doble barra
export const BASE_URL = raw.replace(/\/+$/, '');
