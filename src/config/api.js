import { Platform } from 'react-native';

function clean(url) {
  return String(url || '').replace(/\/+$/, '');
}

/** URL del API en producción (Render u otro). Sobrescribir con EXPO_PUBLIC_API_PRODUCTION_URL si cambia el host. */
const API_URL_PRODUCCION = clean(
  process.env.EXPO_PUBLIC_API_PRODUCTION_URL || 'https://somosthugs-api.onrender.com'
);
const API_URL_LOCAL = 'http://localhost:4000';

function urlApuntaALocalhost(url) {
  return /localhost|127\.0\.0\.1/.test(String(url || ''));
}

/** Hostname del front en desarrollo (misma PC o LAN); si no, producción/hosting. */
function hostnameEsDesarrolloWeb(hostname) {
  const h = String(hostname || '').toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1') return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  return false;
}

/** Con el front en LAN (ej. teléfono abre http://192.168.1.5:8081), localhost:4000 apunta al dispositivo; usar la IP del PC. */
function urlApiWebLocal(hostname) {
  const override = process.env.EXPO_PUBLIC_API_URL_WEB;
  if (override) return clean(override);
  const h = String(hostname || '').toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1') {
    return API_URL_LOCAL;
  }
  return clean(`http://${hostname}:4000`);
}

function getBaseUrl() {
  // En app nativa (Expo Go/dispositivo), localhost no funciona para backend de la PC.
  // Usamos producción (Render por defecto) para evitar bloqueos de login/API.
  if (Platform.OS !== 'web') {
    return clean(process.env.EXPO_PUBLIC_API_URL_NATIVE || API_URL_PRODUCCION);
  }

  // Web en navegador: localhost/127/LAN → API local; dominio público → producción.
  if (typeof window !== 'undefined') {
    const hostname = window.location?.hostname || '';
    const esLocalWeb = hostnameEsDesarrolloWeb(hostname);
    if (esLocalWeb) {
      return urlApiWebLocal(hostname);
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
