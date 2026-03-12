import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from '../config/api';

const TOKEN_KEY = 'somos_thugs_token';

async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = await getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const base = getBaseUrl();
  const res = await fetch(`${base}${path}`, { ...options, headers });
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

/** Lista todos los eventos (solo admin) */
export async function listarEventos() {
  return request('/eventos');
}

export async function listarPublicaciones() {
  return request('/publicaciones');
}

export async function listarContenidoExclusivo() {
  return request('/contenido-exclusivo');
}

/** Feed de contenido con nivel requerido fan (para vista Contenido general) */
export async function listarContenidoExclusivoFeed() {
  return request('/contenido-exclusivo/feed');
}

/** Feed unificado: fan + thug en una lista; thug viene bloqueado si el usuario es fan */
export async function listarFeedUnificado() {
  return request('/contenido-exclusivo/feed-unificado');
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
