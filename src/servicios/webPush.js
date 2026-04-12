import { Platform, Alert } from 'react-native';
import { getBaseUrl } from '../config/api';
import { registrarWebPushSubscription } from './api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

async function obtenerClavePublicaVapid() {
  const desdeEnv =
    typeof process !== 'undefined' &&
    process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY &&
    String(process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY).trim();
  if (desdeEnv) return desdeEnv;
  const base = getBaseUrl();
  const res = await fetch(`${base}/auth/web-push/public-key`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const j = await res.json();
  const k = j && typeof j.publicKey === 'string' ? j.publicKey.trim() : '';
  if (!k) throw new Error('El servidor no publicó la clave VAPID.');
  return k;
}

const SW_READY_MS = 15000;

/** Registra el service worker en la raíz del sitio (archivo `public/sw.js` en el repo). */
export async function asegurarServiceWorkerNotificaciones() {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { type: 'classic', scope: '/' });
    try {
      await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('SW_READY_TIMEOUT')), SW_READY_MS)
        )
      ]);
    } catch (e) {
      if (e?.message !== 'SW_READY_TIMEOUT') throw e;
      console.warn('[web-push] Timeout esperando service worker; se sigue con el registro actual.');
    }
    return reg;
  } catch (e) {
    console.warn('[web-push] service worker:', e?.message || e);
    return null;
  }
}

/**
 * Pide permiso al navegador, suscribe Web Push y envía la suscripción al API.
 * Las notificaciones del sistema las muestra el service worker aunque la pestaña esté en segundo plano.
 */
export async function activarNotificacionesEscritorioWeb() {
  if (Platform.OS !== 'web') {
    return { ok: false, mensaje: 'Solo disponible en la versión web.' };
  }
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { ok: false, mensaje: 'Tu navegador no soporta notificaciones.' };
  }
  const reg = await asegurarServiceWorkerNotificaciones();
  if (!reg || !reg.pushManager) {
    return {
      ok: false,
      mensaje: 'No se pudo registrar el trabajador en segundo plano. Probá recargar la página (HTTPS o localhost).'
    };
  }

  let perm = Notification.permission;
  if (perm === 'default') {
    perm = await Notification.requestPermission();
  }
  if (perm !== 'granted') {
    return { ok: false, mensaje: 'Permiso denegado. Activá notificaciones en la configuración del sitio (ícono del candado).' };
  }

  let vapidKey;
  try {
    vapidKey = await obtenerClavePublicaVapid();
  } catch (e) {
    const raw = String(e?.message || '').trim();
    const corto =
      raw === 'Web push no configurado' || /^HTTP\s*503\b/i.test(raw)
        ? 'Avisos del navegador no disponibles en este sitio.'
        : '';
    return {
      ok: false,
      mensaje: corto || raw || 'No se pudo conectar con el servidor para avisos del navegador.'
    };
  }

  let sub;
  try {
    const existing = await reg.pushManager.getSubscription();
    if (existing) await existing.unsubscribe();
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey)
    });
  } catch (e) {
    return { ok: false, mensaje: e?.message || 'No se pudo suscribir a Web Push.' };
  }

  try {
    await registrarWebPushSubscription(sub.toJSON());
  } catch (e) {
    return { ok: false, mensaje: e?.message || 'No se pudo guardar la suscripción en el servidor.' };
  }

  return { ok: true, mensaje: 'Listo. Vas a recibir avisos en el sistema aunque cierres esta pestaña.' };
}

export function alertResultadoWebPush(resultado) {
  if (resultado.ok) Alert.alert('Notificaciones', resultado.mensaje);
  else Alert.alert('Notificaciones', resultado.mensaje || 'No se pudo activar.');
}
