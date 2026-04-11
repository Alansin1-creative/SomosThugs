import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getBaseUrl } from '../config/api';

const TOKEN_KEY = 'somos_thugs_token';

async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = await getToken();
  const method = (options.method || 'GET').toUpperCase();
  const hasBody =
  options.body != null &&
  options.body !== '' &&
  !(typeof options.body === 'string' && options.body.length === 0);
  const headers = { ...options.headers };
  if (hasBody || method !== 'GET' && method !== 'HEAD') {
    if (headers['Content-Type'] == null) headers['Content-Type'] = 'application/json';
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  const base = getBaseUrl();
  const res = await fetch(`${base}${path}`, { ...options, method, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export async function apiRegister(body) {
  return request('/auth/register', { method: 'POST', body: JSON.stringify(body) });
}

export async function apiLogin(body) {
  return request('/auth/login', { method: 'POST', body: JSON.stringify(body) });
}

export async function apiLoginGoogle(idToken) {
  return request('/auth/login-google', { method: 'POST', body: JSON.stringify({ idToken }) });
}

export async function apiPerfil() {
  return request('/auth/perfil');
}

export async function registrarPushToken(token) {
  return request('/auth/push-token', { method: 'PATCH', body: JSON.stringify({ token }) });
}

export async function actualizarPerfil(body) {
  return request('/auth/perfil', { method: 'PATCH', body: JSON.stringify(body) });
}

export async function listarUsuarios() {
  return request('/usuarios');
}

export async function actualizarUsuario(id, body) {
  return request(`/usuarios/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function eliminarUsuario(id) {
  return request(`/usuarios/${id}`, { method: 'DELETE' });
}

export async function setToken(token) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function removeToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function listarEventosPublicos() {
  return request('/eventos/publicos');
}

export async function listarMisAsistenciasEventos() {
  return request('/eventos/mis-asistencias');
}

export async function confirmarAsistenciaEvento(id) {
  const idStr = id != null ? String(id) : '';
  return request(`/eventos/${idStr}/asistencia`, { method: 'POST', body: JSON.stringify({}) });
}


export async function listarEventos() {
  return request('/eventos');
}

export async function listarPublicaciones() {
  return request('/publicaciones');
}

export async function listarContenidoExclusivo() {
  return request('/contenido-exclusivo');
}


export async function listarContenidoExclusivoFeed() {
  return request('/contenido-exclusivo/feed');
}


export async function listarFeedUnificado() {
  return request('/contenido-exclusivo/feed-unificado');
}


export async function registrarVistaContenido(id, opts = {}) {
  const idStr = id != null ? String(id) : '';
  const body = opts.desdeAperturaModal ? { desdeAperturaModal: true } : {};
  return request(`/contenido-exclusivo/${idStr}/vista`, { method: 'POST', body: JSON.stringify(body) });
}


export async function darLikeContenido(id) {
  const idStr = id != null ? String(id) : '';
  return request(`/contenido-exclusivo/${idStr}/like`, { method: 'POST', body: JSON.stringify({}) });
}


export async function agregarComentarioContenido(id, texto) {
  return request(`/contenido-exclusivo/${id}/comentarios`, {
    method: 'POST',
    body: JSON.stringify({ texto })
  });
}

export async function crearContenidoExclusivo(body) {
  if (__DEV__ && body && typeof body === 'object') {
    console.log('[API] crearContenidoExclusivo body keys:', Object.keys(body).join(', '));
  }
  return request('/contenido-exclusivo', { method: 'POST', body: JSON.stringify(body) });
}

export async function leerEvento(id) {
  return request(`/eventos/${id}`);
}

export async function crearEvento(body) {
  return request('/eventos', { method: 'POST', body: JSON.stringify(body) });
}

export async function placesAutocomplete(q) {
  const qq = String(q ?? '').trim();
  if (!qq) return { predictions: [] };
  const googleKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  if (Platform.OS === 'web' && googleKey) {
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.set('input', qq);
    url.searchParams.set('key', googleKey);
    url.searchParams.set('language', 'es');
    const res = await fetch(url.toString());
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error_message || res.statusText);
    const status = data?.status;
    if (status && status !== 'OK' && status !== 'ZERO_RESULTS') {
      throw new Error(data?.error_message || status);
    }
    const predictions = Array.isArray(data?.predictions) ?
    data.predictions.map((p) => ({ placeId: p.place_id, description: p.description })) :
    [];
    return { predictions };
  }

  const qs = new URLSearchParams({ q: qq }).toString();
  return request(`/maps/places-autocomplete?${qs}`);
}

export async function placeDetails(placeId) {
  const pid = String(placeId ?? '').trim();
  if (!pid) throw new Error('Falta placeId');
  const googleKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  if (Platform.OS === 'web' && googleKey) {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', pid);
    url.searchParams.set('fields', 'formatted_address,geometry,name,place_id');
    url.searchParams.set('key', googleKey);
    url.searchParams.set('language', 'es');
    const res = await fetch(url.toString());
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error_message || res.statusText);
    const status = data?.status;
    if (status && status !== 'OK') throw new Error(data?.error_message || status);
    const r = data?.result || {};
    const loc = r?.geometry?.location || {};
    return {
      placeId: r.place_id || pid,
      nombre: r.name || '',
      direccion: r.formatted_address || '',
      latitud: typeof loc.lat === 'number' ? loc.lat : null,
      longitud: typeof loc.lng === 'number' ? loc.lng : null
    };
  }

  const qs = new URLSearchParams({ placeId: pid }).toString();
  return request(`/maps/place-details?${qs}`);
}

export async function actualizarEvento(id, body) {
  return request(`/eventos/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function eliminarEvento(id) {
  return request(`/eventos/${id}`, { method: 'DELETE' });
}

export async function leerPublicacion(id) {
  return request(`/publicaciones/${id}`);
}

export async function crearPublicacion(body) {
  return request('/publicaciones', { method: 'POST', body: JSON.stringify(body) });
}

export async function actualizarPublicacion(id, body) {
  return request(`/publicaciones/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function eliminarPublicacion(id) {
  return request(`/publicaciones/${id}`, { method: 'DELETE' });
}

export async function leerContenidoExclusivo(id) {
  return request(`/contenido-exclusivo/${id}`);
}

export async function actualizarContenidoExclusivo(id, body) {
  if (__DEV__ && body && typeof body === 'object') {
    console.log('[API] actualizarContenidoExclusivo body keys:', Object.keys(body).join(', '));
  }
  return request(`/contenido-exclusivo/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function eliminarContenidoExclusivo(id) {
  return request(`/contenido-exclusivo/${id}`, { method: 'DELETE' });
}

export async function listarNotificaciones(limit = 50) {
  const n = Number(limit);
  const safe = Number.isFinite(n) ? Math.min(Math.max(n, 1), 100) : 50;
  return request(`/notificaciones?limit=${safe}`);
}

export async function contarNotificacionesNoLeidas() {
  return request('/notificaciones/no-leidas/count');
}

export async function marcarNotificacionLeida(id) {
  const idStr = id != null ? String(id) : '';
  return request(`/notificaciones/${idStr}/leida`, { method: 'PATCH', body: JSON.stringify({}) });
}

export async function marcarTodasNotificacionesLeidas() {
  return request('/notificaciones/marcar-todas/leidas', { method: 'PATCH', body: JSON.stringify({}) });
}

export async function listarFlyersPublicos() {
  const base = getBaseUrl();
  const res = await fetch(`${base}/flyers`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export async function listarFlyersAdmin() {
  return request('/flyers/admin');
}

export async function crearFlyer(body) {
  return request('/flyers', { method: 'POST', body: JSON.stringify(body || {}) });
}

export async function eliminarFlyer(id) {
  const idStr = id != null ? String(id) : '';
  return request(`/flyers/${idStr}`, { method: 'DELETE' });
}


export async function stripeCrearSesionSuscripcionThug() {
  return request('/stripe/create-checkout-subscription', { method: 'POST', body: JSON.stringify({}) });
}


export async function stripeCrearSesionBoletoEvento(eventoId) {
  return request('/stripe/create-checkout-event', {
    method: 'POST',
    body: JSON.stringify({ eventoId: String(eventoId) })
  });
}


export async function stripeCrearSesionPortalFacturacion() {
  return request('/stripe/create-billing-portal-session', { method: 'POST', body: JSON.stringify({}) });
}