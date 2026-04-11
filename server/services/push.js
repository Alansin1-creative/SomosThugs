const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function tokenExpoValido(t) {
  return typeof t === 'string' && /^ExponentPushToken\[[^\]]+\]$/.test(t.trim());
}

async function enviarPush(tokens, { title, body, data }) {
  const limpios = Array.from(new Set((Array.isArray(tokens) ? tokens : []).map((t) => String(t || '').trim()))).
  filter(tokenExpoValido);
  if (limpios.length === 0) return { enviados: 0, tickets: [] };

  const mensajes = limpios.map((to) => ({
    to,
    sound: 'default',
    title: String(title || 'Somos Thugs'),
    body: String(body || ''),
    data: data && typeof data === 'object' ? data : {}
  }));

  const partes = chunk(mensajes, 100);
  const tickets = [];
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
  return { enviados: limpios.length, tickets };
}

module.exports = { enviarPush, tokenExpoValido };