const express = require('express');
const fs = require('fs');
const path = require('path');
const ContenidoExclusivo = require('../models/ContenidoExclusivo');
const { authMiddleware, requireThug, requireAdmin, requireThugOrAdmin } = require('../middleware/auth');

const router = express.Router();
const UPLOADS_CONTENIDO = path.join(__dirname, '..', 'uploads', 'contenido');

function guardarMediaBase64(base64, subdir = '') {
  if (!base64) return undefined;
  const dir = subdir ? path.join(UPLOADS_CONTENIDO, subdir) : UPLOADS_CONTENIDO;
  const match = base64.match(/^data:([^;]+);base64,(.+)$/);
  const ext = match ? (match[1].indexOf('jpeg') !== -1 || match[1].indexOf('jpg') !== -1 ? 'jpg' : match[1].split('/')[1] || 'bin') : 'bin';
  const data = match ? match[2] : base64;
  const buffer = Buffer.from(data, 'base64');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const nombre = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const ruta = path.join(dir, nombre);
  fs.writeFileSync(ruta, buffer);
  return subdir ? `/uploads/contenido/${subdir}/${nombre}` : `/uploads/contenido/${nombre}`;
}

function toDoc(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return { id: o._id.toString(), ...o, _id: undefined };
}

router.get('/', authMiddleware, requireThugOrAdmin, async (req, res) => {
  try {
    const lista = await ContenidoExclusivo.find().sort({ fechaPublicacion: -1 }).limit(50).lean();
    res.json(lista.map((d) => ({ id: d._id.toString(), ...d, _id: undefined })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Feed público: contenido con nivel requerido "fan" y visible (cualquier usuario autenticado)
router.get('/feed', authMiddleware, async (req, res) => {
  try {
    const lista = await ContenidoExclusivo.find({
      nivelRequerido: 'fan',
      visible: true,
    })
      .sort({ fechaPublicacion: -1 })
      .limit(50)
      .lean();
    res.json(lista.map((d) => ({ id: d._id.toString(), ...d, _id: undefined })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', authMiddleware, requireThug, async (req, res) => {
  try {
    const doc = await ContenidoExclusivo.findById(req.params.id);
    res.json(doc ? toDoc(doc) : null);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const b = req.body && typeof req.body === 'object' && req.body.data && typeof req.body.data === 'object'
      ? req.body.data
      : (req.body || {});
    const creadoPor = req.user?.id || req.user?.sub || '';
    const bodyKeys = Object.keys(b);
    console.log('[contenido-exclusivo POST] body keys:', bodyKeys.join(', '));
    const titulo = typeof b.titulo === 'string' ? b.titulo.trim() : '';
    const descripcion = typeof b.descripcion === 'string' ? b.descripcion.trim() : '';
    const previewTexto = typeof b.previewTexto === 'string' ? b.previewTexto.trim() : '';
    const contenidoCompleto = typeof b.contenidoCompleto === 'string' ? b.contenidoCompleto.trim() : '';
    const tipoContenido = typeof b.tipoContenido === 'string' && b.tipoContenido.trim() ? b.tipoContenido.trim() : 'articulo';
    const nivelRequerido = typeof b.nivelRequerido === 'string' && b.nivelRequerido.trim() ? b.nivelRequerido.trim() : 'thug';
    const categoria = typeof b.categoria === 'string' ? b.categoria.trim() : '';
    const etiquetas = Array.isArray(b.etiquetas) ? b.etiquetas : [];
    const visible = b.visible !== false;
    const destacado = Boolean(b.destacado);
    let urlMediaPreview = '';
    let urlMediaCompleta = '';
    if (b.mediaPreviewBase64) {
      urlMediaPreview = guardarMediaBase64(b.mediaPreviewBase64, 'preview') || '';
    }
    if (b.mediaCompletaBase64) {
      urlMediaCompleta = guardarMediaBase64(b.mediaCompletaBase64, 'completa') || '';
    }
    const payload = {
      titulo,
      descripcion,
      previewTexto,
      contenidoCompleto,
      urlMediaPreview,
      urlMediaCompleta,
      tipoContenido,
      nivelRequerido,
      categoria,
      etiquetas,
      visible,
      destacado,
      numeroVistas: 0,
      numeroLikes: 0,
      comentarios: [],
      creadoPor: b.creadoPor || creadoPor,
      fechaPublicacion: new Date(),
      fechaActualizacion: new Date(),
    };
    const [item] = await ContenidoExclusivo.create([payload]);
    console.log('[contenido-exclusivo POST] guardado keys:', Object.keys(item.toObject ? item.toObject() : item));
    res.json(toDoc(item));
  } catch (e) {
    console.error('[contenido-exclusivo POST] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const b = req.body && typeof req.body === 'object' && req.body.data && typeof req.body.data === 'object'
      ? req.body.data
      : (req.body || {});
    console.log('[contenido-exclusivo PUT] body keys:', Object.keys(b).join(', '));
    const existing = await ContenidoExclusivo.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ error: 'No encontrado' });
    let urlMediaPreview = existing.urlMediaPreview ?? '';
    let urlMediaCompleta = existing.urlMediaCompleta ?? '';
    if (b.mediaPreviewBase64) {
      urlMediaPreview = guardarMediaBase64(b.mediaPreviewBase64, 'preview') || urlMediaPreview;
    }
    if (b.mediaCompletaBase64) {
      urlMediaCompleta = guardarMediaBase64(b.mediaCompletaBase64, 'completa') || urlMediaCompleta;
    }
    const titulo = typeof b.titulo === 'string' ? b.titulo.trim() : (existing.titulo ?? '');
    const descripcion = typeof b.descripcion === 'string' ? b.descripcion.trim() : (existing.descripcion ?? '');
    const previewTexto = typeof b.previewTexto === 'string' ? b.previewTexto.trim() : (existing.previewTexto ?? '');
    const contenidoCompleto = typeof b.contenidoCompleto === 'string' ? b.contenidoCompleto.trim() : (existing.contenidoCompleto ?? '');
    const tipoContenido = typeof b.tipoContenido === 'string' && b.tipoContenido.trim() ? b.tipoContenido.trim() : (existing.tipoContenido ?? 'articulo');
    const nivelRequerido = typeof b.nivelRequerido === 'string' && b.nivelRequerido.trim() ? b.nivelRequerido.trim() : (existing.nivelRequerido ?? 'thug');
    const categoria = typeof b.categoria === 'string' ? b.categoria.trim() : (existing.categoria ?? '');
    const etiquetas = Array.isArray(b.etiquetas) ? b.etiquetas : (existing.etiquetas ?? []);
    const visible = b.visible !== undefined ? (b.visible !== false) : (existing.visible !== false);
    const destacado = b.destacado !== undefined ? Boolean(b.destacado) : Boolean(existing.destacado);
    const $set = {
      titulo,
      descripcion,
      previewTexto,
      contenidoCompleto,
      urlMediaPreview,
      urlMediaCompleta,
      tipoContenido,
      nivelRequerido,
      categoria,
      etiquetas,
      visible,
      destacado,
      fechaActualizacion: new Date(),
    };
    await ContenidoExclusivo.updateOne({ _id: req.params.id }, { $set });
    const doc = await ContenidoExclusivo.findById(req.params.id);
    res.json(toDoc(doc));
  } catch (e) {
    console.error('[contenido-exclusivo PUT] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const doc = await ContenidoExclusivo.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
