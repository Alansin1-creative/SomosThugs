const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const Usuario = require('../models/Usuario');

let webpush;
try {
  webpush = require('web-push');
} catch (_) {
  webpush = null;
}

const WEB_PUSH_PUBLIC_KEY = String(process.env.WEB_PUSH_PUBLIC_KEY || '').trim();
const WEB_PUSH_PRIVATE_KEY = String(process.env.WEB_PUSH_PRIVATE_KEY || '').trim();
const WEB_PUSH_SUBJECT = String(process.env.WEB_PUSH_SUBJECT || 'mailto:contacto@somosthugs.com').trim();

function debeLoguearPush() {
  return process.env.NODE_ENV !== 'production' || String(process.env.LOG_PUSH || '').trim() === '1';
}

let webPushConfigured = false;
function ensureWebPushVapid() {
  if (webPushConfigured) return true;
  if (!webpush || !WEB_PUSH_PUBLIC_KEY || !WEB_PUSH_PRIVATE_KEY) return false;
  try {
    webpush.setVapidDetails(WEB_PUSH_SUBJECT, WEB_PUSH_PUBLIC_KEY, WEB_PUSH_PRIVATE_KEY);
    webPushConfigured = true;
    return true;
  } catch (e) {
    console.warn('[push] VAPID:', e.message);
    return false;
  }
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function tokenExpoValido(t) {
  return typeof t === 'string' && /^ExponentPushToken\[[^\]]+\]$/.test(t.trim());
}

function suscripcionWebValida(s) {
  if (!s || typeof s !== 'object') return false;
  const ep = String(s.endpoint || '').trim();
  const p256 = s.keys && String(s.keys.p256dh || '').trim();
  const auth = s.keys && String(s.keys.auth || '').trim();
  return !!(ep && p256 && auth);
}

function flattenWebPushSubscriptions(usuarios) {
  const out = [];
  for (const u of usuarios || []) {
    const arr = u.webPushSubscriptions;
    if (!Array.isArray(arr)) continue;
    for (const s of arr) {
      if (suscripcionWebValida(s)) out.push(s);
    }
  }
  return out;
}

async function eliminarSuscripcionWebPorEndpoint(endpoint) {
  const ep = String(endpoint || '').trim();
  if (!ep) return;
  try {
    await Usuario.updateMany({}, { $pull: { webPushSubscriptions: { endpoint: ep } } });
  } catch (e) {
    console.warn('[push] limpiar suscripción web:', e.message);
  }
}

/**
 * Envía notificaciones Web Push (Chrome/Edge/Firefox en escritorio o móvil).
 * Requiere WEB_PUSH_PUBLIC_KEY / WEB_PUSH_PRIVATE_KEY en el servidor.
 */
async function enviarWebPushSubscriptions(subs, { title, body, data }) {
  if (!ensureWebPushVapid() || !Array.isArray(subs) || subs.length === 0) {
    return { enviados: 0, tickets: [] };
  }
  const payload = JSON.stringify({
    title: String(title || 'Somos Thugs'),
    body: String(body || ''),
    data: data && typeof data === 'object' ? data : {},
    url: '/',
    tag: `st-${Date.now()}`
  });
  let enviados = 0;
  const tickets = [];
  for (const sub of subs) {
    if (!suscripcionWebValida(sub)) continue;
    try {
      await webpush.sendNotification(sub, payload, {
        TTL: 60 * 60 * 12,
        urgency: 'normal'
      });
      enviados += 1;
      tickets.push({ status: 'ok', endpoint: sub.endpoint });
    } catch (err) {
      const sc = Number(err?.statusCode);
      if (sc === 410 || sc === 404) {
        await eliminarSuscripcionWebPorEndpoint(sub.endpoint);
      }
      tickets.push({ status: 'error', endpoint: sub.endpoint, message: err.message, code: sc });
    }
  }
  if (debeLoguearPush()) {
    const fallos = tickets.filter((t) => t.status === 'error');
    console.log('[push][web]', { solicitados: subs.length, ok: enviados, fallos: fallos.length });
    if (fallos.length > 0) {
      console.warn(
        '[push][web] errores:',
        fallos.map((f) => ({
          code: f.code,
          msg: String(f.message || '').slice(0, 160)
        }))
      );
    }
  }
  return { enviados, tickets };
}

/**
 * @param {string[]} tokens Expo Push
 * @param {{ title?: string, body?: string, data?: object }} opts
 * @param {object[]} [webSubscriptions] objetos PushSubscription JSON
 */
async function enviarPush(tokens, opts, webSubscriptions) {
  const limpios = Array.from(new Set((Array.isArray(tokens) ? tokens : []).map((t) => String(t || '').trim()))).
  filter(tokenExpoValido);
  let expoEnviados = 0;
  const tickets = [];
  if (limpios.length > 0) {
    const mensajes = limpios.map((to) => ({
      to,
      sound: 'default',
      title: String(opts?.title || 'Somos Thugs'),
      body: String(opts?.body || ''),
      data: opts?.data && typeof opts.data === 'object' ? opts.data : {}
    }));

    const partes = chunk(mensajes, 100);
    for (const parte of partes) {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(parte)
      });
      const json = await res.json().catch(() => ({}));
      if (Array.isArray(json?.data)) tickets.push(...json.data);
    }
    expoEnviados = limpios.length;
  }

  const webRes = await enviarWebPushSubscriptions(
    Array.isArray(webSubscriptions) ? webSubscriptions : [],
    opts || {}
  );

  return { enviados: expoEnviados, webEnviados: webRes.enviados, tickets: [...tickets, ...webRes.tickets] };
}

module.exports = {
  enviarPush,
  tokenExpoValido,
  flattenWebPushSubscriptions,
  enviarWebPushSubscriptions,
  debeLoguearPush
};
