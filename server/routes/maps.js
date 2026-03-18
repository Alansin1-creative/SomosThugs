const express = require('express');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

function assertKey(res) {
  if (!GOOGLE_API_KEY) {
    res.status(500).json({ error: 'Falta configurar GOOGLE_MAPS_API_KEY en el server' });
    return false;
  }
  return true;
}

router.get('/places-autocomplete', authMiddleware, requireAdmin, async (req, res) => {
  try {
    if (!assertKey(res)) return;
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ predictions: [] });

    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.set('input', q);
    url.searchParams.set('key', GOOGLE_API_KEY);
    url.searchParams.set('language', 'es');

    const resp = await fetch(url.toString());
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return res.status(resp.status).json({ error: data?.error_message || 'Error Google' });
    if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return res.status(400).json({ error: data.error_message || data.status || 'Error Google' });
    }
    const predictions = Array.isArray(data.predictions)
      ? data.predictions.map((p) => ({
          placeId: p.place_id,
          description: p.description,
        }))
      : [];
    res.json({ predictions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/place-details', authMiddleware, requireAdmin, async (req, res) => {
  try {
    if (!assertKey(res)) return;
    const placeId = String(req.query.placeId || '').trim();
    if (!placeId) return res.status(400).json({ error: 'Falta placeId' });

    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('fields', 'formatted_address,geometry,name,place_id');
    url.searchParams.set('key', GOOGLE_API_KEY);
    url.searchParams.set('language', 'es');

    const resp = await fetch(url.toString());
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return res.status(resp.status).json({ error: data?.error_message || 'Error Google' });
    if (data.status && data.status !== 'OK') {
      return res.status(400).json({ error: data.error_message || data.status || 'Error Google' });
    }
    const r = data.result || {};
    const loc = r.geometry?.location || {};
    res.json({
      placeId: r.place_id || placeId,
      nombre: r.name || '',
      direccion: r.formatted_address || '',
      latitud: typeof loc.lat === 'number' ? loc.lat : null,
      longitud: typeof loc.lng === 'number' ? loc.lng : null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

