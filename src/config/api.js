import { Platform } from 'react-native';

function clean(url) {
  return String(url || '').replace(/\/+$/, '');
}

/** URL del API en producción (Railway u otro). Sobrescribir con EXPO_PUBLIC_API_PRODUCTION_URL si cambia el host. */
const API_URL_PRODUCCION = clean(
  process.env.EXPO_PUBLIC_API_PRODUCTION_URL || 'https://somosthugs-production.up.railway.app'
);
const API_URL_LOCAL = 'http://localhost:4000';

function urlApuntaALocalhost(url) {
  return /localhost|127\.0\.0\.1/.test(String(url || ''));
}

function getBaseUrl() {
  // En app nativa (Expo Go/dispositivo), localhost no funciona para backend de la PC.
  // Usamos Railway por defecto para evitar bloqueos de login/API.
  if (Platform.OS !== 'web') {
    return clean(process.env.EXPO_PUBLIC_API_URL_NATIVE || API_URL_PRODUCCION);
  }

  // Web en navegador: solo localhost/127 usa API local; cualquier otro host (p. ej. somosthugs.com) -> producción.
  if (typeof window !== 'undefined') {
    const hostname = window.location?.hostname || '';
    const esLocalWeb = hostname === 'localhost' || hostname === '127.0.0.1';
    if (esLocalWeb) {
      return clean(process.env.EXPO_PUBLIC_API_URL_WEB || API_URL_LOCAL);
    }
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envUrl && !urlApuntaALocalhost(envUrl)) {
      return clean(envUrl);
    }
    return clean(API_URL_PRODUCCION);
  }

  // Build estático (export) sin window: no hornear localhost si .env de desarrollo apunta al PC
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && !urlApuntaALocalhost(envUrl)) {
    return clean(envUrl);
  }
  return clean(API_URL_PRODUCCION);
}

export { getBaseUrl };
