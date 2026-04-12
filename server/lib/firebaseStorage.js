/**
 * Subida a Firebase Storage (Admin SDK). Sobrevive a redeploys: los bytes viven en GCS, no en el disco del dyno.
 *
 * Configuración (server/.env):
 *   FIREBASE_STORAGE_BUCKET=somosthugs.firebasestorage.app   (opcional; este es el default)
 *   FIREBASE_SERVICE_ACCOUNT_BASE64=<JSON de cuenta de servicio en base64>
 *   o FIREBASE_SERVICE_ACCOUNT_JSON=<JSON en una línea>
 *
 * Si no hay credenciales, las rutas pueden seguir usando disco (p. ej. flyers.js).
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let admin;
try {
  admin = require('firebase-admin');
} catch {
  admin = null;
}

function getServiceAccount() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (b64 && String(b64).trim()) {
    try {
      return JSON.parse(Buffer.from(String(b64).trim(), 'base64').toString('utf8'));
    } catch (e) {
      console.warn('[firebaseStorage] FIREBASE_SERVICE_ACCOUNT_BASE64 inválido:', e.message);
      return null;
    }
  }
  if (raw && String(raw).trim().startsWith('{')) {
    try {
      return JSON.parse(String(raw).trim());
    } catch (e) {
      console.warn('[firebaseStorage] FIREBASE_SERVICE_ACCOUNT_JSON inválido:', e.message);
      return null;
    }
  }
  return null;
}

function defaultBucketId() {
  return (process.env.FIREBASE_STORAGE_BUCKET || 'somosthugs.firebasestorage.app').replace(/^gs:\/\//, '');
}

/** Solo rutas que este backend sube (evita borrar objetos arbitrarios si alguien manipula la BD). */
const ALLOWED_STORAGE_PREFIXES = ['contenido/', 'eventos/', 'flyers/', 'avatars/'];

function isAllowedStorageObjectPath(objectPath) {
  const p = String(objectPath || '').replace(/^\/+/, '');
  return ALLOWED_STORAGE_PREFIXES.some((pre) => p.startsWith(pre));
}

function isFirebaseStorageDownloadUrl(url) {
  return String(url || '').toLowerCase().includes('firebasestorage.googleapis.com');
}

/**
 * URL tipo https://firebasestorage.googleapis.com/v0/b/BUCKET/o/ENCODED?alt=media&token=...
 * @returns {string} ruta del objeto en el bucket (p. ej. contenido/preview/x.mp3) o ''
 */
function storageObjectPathFromFirebaseUrl(url) {
  const s = String(url || '').trim();
  if (!isFirebaseStorageDownloadUrl(s)) return '';
  try {
    const u = new URL(s);
    const segs = u.pathname.split('/').filter(Boolean);
    const bIdx = segs.indexOf('b');
    const oIdx = segs.indexOf('o');
    if (bIdx === -1 || oIdx === -1 || oIdx !== bIdx + 2) return '';
    const bucketInUrl = segs[bIdx + 1];
    const encodedObject = segs[oIdx + 1];
    if (!encodedObject) return '';
    if (bucketInUrl !== defaultBucketId()) {
      console.warn('[firebaseStorage] bucket en URL distinto al configurado; no se borra:', bucketInUrl);
      return '';
    }
    return decodeURIComponent(encodedObject);
  } catch {
    return '';
  }
}

async function deleteFirebaseObjectByUrl(url) {
  const objectPath = storageObjectPathFromFirebaseUrl(url);
  if (!objectPath) return;
  if (!isAllowedStorageObjectPath(objectPath)) {
    console.warn('[firebaseStorage] omitiendo borrado (ruta no permitida):', objectPath);
    return;
  }
  if (!ensureApp()) return;
  try {
    const bucket = admin.storage().bucket();
    await bucket.file(objectPath).delete();
  } catch (e) {
    const code = e && (e.code || e?.error?.code);
    if (code === 404) return;
    console.warn('[firebaseStorage] delete:', objectPath, e.message || e);
  }
}

function deleteLocalUploadIfApplicable(url) {
  const s = String(url || '').trim();
  if (!s.startsWith('/uploads/')) return;
  const rel = s.replace(/^\/+/, '');
  if (!ALLOWED_STORAGE_PREFIXES.some((pre) => rel.startsWith(pre))) {
    console.warn('[firebaseStorage] omitiendo unlink local (ruta no permitida):', s);
    return;
  }
  const full = path.join(__dirname, '..', rel);
  const baseUploads = path.join(__dirname, '..', 'uploads');
  const normFull = path.normalize(full);
  if (!normFull.startsWith(path.normalize(baseUploads + path.sep))) return;
  try {
    if (fs.existsSync(normFull)) fs.unlinkSync(normFull);
  } catch (e) {
    console.warn('[firebaseStorage] unlink:', normFull, e.message || e);
  }
}

/**
 * Quita un archivo de Firebase Storage o de disco local (/uploads/...) si la URL corresponde a medios subidos por esta app.
 */
async function deleteMediaUrl(url) {
  await deleteFirebaseObjectByUrl(url);
  deleteLocalUploadIfApplicable(url);
}

async function deleteMediaUrls(urls) {
  const unique = [...new Set((urls || []).map((u) => String(u || '').trim()).filter(Boolean))];
  await Promise.all(unique.map((u) => deleteMediaUrl(u)));
}

function isConfigured() {
  if (!admin) return false;
  const sa = getServiceAccount();
  return !!(sa && sa.project_id && sa.private_key && sa.client_email);
}

function ensureApp() {
  if (!admin || !isConfigured()) return false;
  if (admin.apps.length > 0) return true;
  try {
    admin.initializeApp({
      credential: admin.credential.cert(getServiceAccount()),
      storageBucket: defaultBucketId()
    });
    return true;
  } catch (e) {
    console.error('[firebaseStorage] initializeApp:', e.message);
    return false;
  }
}

function parseBase64Image(base64) {
  const s = String(base64 || '').trim();
  const match = s.match(/^data:([^;]+);base64,(.*)$/s);
  const mime = match ? String(match[1]).trim() : 'image/jpeg';
  const raw = match ? match[2] : s.replace(/^data:[^;]+;base64,/i, '');
  const data = String(raw).replace(/\s/g, '');
  const m = mime.toLowerCase();
  const ext =
    m.includes('png') ? 'png' :
    m.includes('webp') ? 'webp' :
    m.includes('gif') ? 'gif' :
    m.includes('heic') || m.includes('heif') ? 'heic' :
    'jpg';
  const buffer = Buffer.from(data, 'base64');
  return { buffer, mime, ext };
}

/**
 * @param {string} destination ruta en el bucket, ej. flyers/flyer_123.jpg
 * @param {Buffer} buffer
 * @param {string} contentType
 * @returns {Promise<string>} URL https con token de descarga
 */
async function uploadBuffer(destination, buffer, contentType) {
  if (!ensureApp()) throw new Error('Firebase Admin no inicializado');
  const bucket = admin.storage().bucket();
  const file = bucket.file(destination);
  const token = crypto.randomUUID();
  const resumable = buffer.length > 5 * 1024 * 1024;
  await file.save(buffer, {
    resumable,
    metadata: {
      contentType: contentType || 'application/octet-stream',
      metadata: {
        firebaseStorageDownloadTokens: token
      }
    }
  });
  const enc = encodeURIComponent(destination);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${enc}?alt=media&token=${token}`;
}

async function uploadFlyerImageFromBase64(base64) {
  const { buffer, mime, ext } = parseBase64Image(base64);
  const nombre = `flyers/flyer_${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
  return uploadBuffer(nombre, buffer, mime);
}

/** Misma lógica de extensión que tenía disco en contenidoExclusivo (imagen, vídeo, audio). */
function parseBase64Media(base64) {
  const s = String(base64 || '').trim();
  const match = s.match(/^data:([^;]+);base64,(.*)$/s);
  const mime = match ? String(match[1]).trim() : 'application/octet-stream';
  const raw = match ? match[2] : s.replace(/^data:[^;]+;base64,/i, '');
  const data = String(raw).replace(/\s/g, '');
  let ext = 'bin';
  if (match) {
    const m = mime.toLowerCase();
    if (m.includes('jpeg') || m === 'image/jpg') ext = 'jpg';
    else if (m === 'audio/mpeg' || m === 'audio/mp3') ext = 'mp3';
    else if (m === 'audio/mp4' || m === 'audio/x-m4a') ext = 'm4a';
    else if (m === 'audio/wav' || m === 'audio/x-wav') ext = 'wav';
    else if (m === 'audio/flac') ext = 'flac';
    else if (m === 'audio/ogg' || m === 'application/ogg') ext = 'ogg';
    else if (m === 'audio/webm') ext = 'webm';
    else if (m === 'audio/aac') ext = 'aac';
    else {
      const sub = (mime.split('/')[1] || 'bin').replace(/[^a-z0-9]/gi, '');
      ext = sub.slice(0, 12) || 'bin';
    }
  }
  const buffer = Buffer.from(data, 'base64');
  return { buffer, mime, ext };
}

async function uploadAvatarFromBase64(base64) {
  const { buffer, mime, ext } = parseBase64Image(base64);
  const nombre = `avatars/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  return uploadBuffer(nombre, buffer, mime);
}

async function uploadEventoImagenFromBase64(base64) {
  const { buffer, mime, ext } = parseBase64Image(base64);
  const nombre = `eventos/evento_${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
  return uploadBuffer(nombre, buffer, mime);
}

/**
 * @param {string} subdir '' | 'preview' | 'completa'
 */
async function uploadContenidoMediaFromBase64(base64, subdir = '') {
  const { buffer, mime, ext } = parseBase64Media(base64);
  const safeSub = subdir && /^[a-z0-9_-]+$/i.test(String(subdir)) ? String(subdir) : '';
  const base = safeSub ? `contenido/${safeSub}` : 'contenido';
  const nombre = `${base}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  return uploadBuffer(nombre, buffer, mime);
}

/** Al arrancar el server: deja claro si Storage está activo (sin imprimir secretos). */
function logFirebaseStorageBoot() {
  const b64Len = (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '').trim().length;
  const jsonLen = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim().length;
  if (!admin) {
    console.warn(
      '[firebaseStorage] Paquete firebase-admin no cargado. En la carpeta server ejecutá: npm install'
    );
    return;
  }
  if (!b64Len && !jsonLen) {
    const b64Def = Object.prototype.hasOwnProperty.call(process.env, 'FIREBASE_SERVICE_ACCOUNT_BASE64');
    const jsonDef = Object.prototype.hasOwnProperty.call(process.env, 'FIREBASE_SERVICE_ACCOUNT_JSON');
    console.warn(
      '[firebaseStorage] Sin credencial Firebase (BASE64 o JSON) → subidas van a disco (uploads/).',
      'En Render: la variable tiene que estar en **este** Web Service (el que corre este Docker), no solo en otro servicio o grupo sin enlazar.',
      { claveB64Definida: b64Def, claveJsonDefinida: jsonDef, b64Len, jsonLen }
    );
    return;
  }
  const sa = getServiceAccount();
  if (!sa) {
    console.warn('[firebaseStorage] Credencial no parseable (Base64/JSON corrupto o truncado).');
    return;
  }
  if (!sa.private_key || !sa.client_email || !sa.project_id) {
    console.warn('[firebaseStorage] JSON incompleto: falta private_key, client_email o project_id.');
    return;
  }
  try {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(sa),
        storageBucket: defaultBucketId()
      });
    }
    console.log('[firebaseStorage] Activo. Bucket:', defaultBucketId());
  } catch (e) {
    console.error('[firebaseStorage] initializeApp falló:', e.message);
  }
}

module.exports = {
  isConfigured,
  uploadBuffer,
  uploadFlyerImageFromBase64,
  uploadAvatarFromBase64,
  uploadEventoImagenFromBase64,
  uploadContenidoMediaFromBase64,
  parseBase64Image,
  parseBase64Media,
  logFirebaseStorageBoot,
  deleteMediaUrl,
  deleteMediaUrls,
  storageObjectPathFromFirebaseUrl
};
