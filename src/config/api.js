// URL del backend. En web se calcula en runtime para que Netlify use siempre Railway.
const API_URL_PRODUCCION = 'https://somosthugs-production.up.railway.app';

function getBaseUrl() {
  if (typeof window !== 'undefined') {
    const origin = window.location?.origin || '';
    if (origin === 'https://somosthugs.netlify.app' || origin.endsWith('.netlify.app'))
      return API_URL_PRODUCCION.replace(/\/+$/, '');
  }
  const env = process.env.EXPO_PUBLIC_API_URL || '';
  if (env) return env.replace(/\/+$/, '');
  return 'http://localhost:4000';
}

export { getBaseUrl };
export const BASE_URL = getBaseUrl();
