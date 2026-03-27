const express = require('express');
const fs = require('fs');
const path = require('path');
const Flyer = require('../models/Flyer');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const UPLOADS_FLYERS = path.join(__dirname, '..', 'uploads', 'flyers');

function guardarImagenBase64(base64) {
  if (!base64) return '';
  const s = String(base64);
  const match = s.match(/^data:([^;]+);base64,(.+)$/);
  const mime = match ? match[1] : 'image/jpeg';
  const data = match ? match[2] : s;
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : mime.includes('gif') ? 'gif' : 'jpg';
  const buffer = Buffer.from(data, 'base64');
  if (!fs.existsSync(UPLOADS_FLYERS)) fs.mkdirSync(UPLOADS_FLYERS, { recursive: true });
  const nombre = `flyer_${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
  const ruta = path.join(UPLOADS_FLYERS, nombre);
  fs.writeFileSync(ruta, buffer);
  return `/uploads/flyers/${nombre}`;
}

function toDoc(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(o._id),
    titulo: o.titulo || '',
    urlImagen: o.urlImagen || '',
    activo: o.activo !== false,
    orden: Number.isFinite(Number(o.orden)) ? Number(o.orden) : 0,
    creadoPor: o.creadoPor || '',
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

// Público: carrusel presskit
router.get('/', async (_req, res) => {
  try {
    const lista = await Flyer.find({ activo: true }).sort({ orden: 1, createdAt: -1 }).lean();
    res.json(lista.map((x) => toDoc(x)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: listado completo
router.get('/admin', authMiddleware, requireAdmin, async (_req, res) => {
  try {
    const lista = await Flyer.find().sort({ createdAt: -1 }).lean();
    res.json(lista.map((x) => toDoc(x)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    const titulo = typeof b.titulo === 'string' ? b.titulo.trim() : '';
    const imagenBase64 = typeof b.imagenBase64 === 'string' ? b.imagenBase64 : '';
    if (!imagenBase64) return res.status(400).json({ error: 'Falta la imagen del flyer' });
    const urlImagen = guardarImagenBase64(imagenBase64);
    if (!urlImagen) return res.status(400).json({ error: 'No se pudo guardar la imagen' });
    const maxOrden = await Flyer.findOne().sort({ orden: -1 }).select('orden').lean();
    const orden = Number(maxOrden?.orden || 0) + 1;
    const [doc] = await Flyer.create([
      {
        titulo,
        urlImagen,
        activo: true,
        orden,
        creadoPor: req.userId || '',
      },
    ]);
    res.json(toDoc(doc));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const doc = await Flyer.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
