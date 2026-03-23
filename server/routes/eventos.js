const express = require('express');
const Evento = require('../models/Evento');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const UPLOADS_EVENTOS = path.join(__dirname, '..', 'uploads', 'eventos');

function guardarImagenBase64(base64) {
  if (!base64) return undefined;
  const s = String(base64);
  const match = s.match(/^data:([^;]+);base64,(.+)$/);
  const mime = match ? match[1] : 'image/jpeg';
  const data = match ? match[2] : s;
  const buffer = Buffer.from(data, 'base64');
  if (!fs.existsSync(UPLOADS_EVENTOS)) fs.mkdirSync(UPLOADS_EVENTOS, { recursive: true });
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  const nombre = `evento_${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
  const ruta = path.join(UPLOADS_EVENTOS, nombre);
  fs.writeFileSync(ruta, buffer);
  return `/uploads/eventos/${nombre}`;
}

function toDoc(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  const asistentesArr = Array.isArray(o.asistentes) ? o.asistentes : [];
  const capacidadNum = Number(o.capacidad);
  const capacidad = Number.isFinite(capacidadNum) ? capacidadNum : null;
  return {
    id: o._id.toString(),
    ...o,
    telefonoContacto: o.telefonoContacto || o.telefono || '',
    capacidad,
    cupoMaximo: capacidad,
    asistentes: undefined,
    totalConfirmados: asistentesArr.length,
    _id: undefined,
  };
}

router.get('/publicos', async (req, res) => {
  try {
    const lista = await Evento.find({ esPublico: true }).sort({ fechaInicio: -1 }).limit(50).lean();
    res.json(lista.map((d) => toDoc(d)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const lista = await Evento.find().sort({ fechaInicio: -1 }).limit(50).lean();
    res.json(lista.map((d) => toDoc(d)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/mis-asistencias', authMiddleware, async (req, res) => {
  try {
    const userId = String(req.userId);
    const lista = await Evento.find({ asistentes: req.userId }).select('_id').lean();
    const ids = lista.map((d) => String(d._id));
    res.json({ ids, userId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/asistencia', authMiddleware, async (req, res) => {
  try {
    const doc = await Evento.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'No encontrado' });

    const userId = String(req.userId);
    const asistentes = (Array.isArray(doc.asistentes) ? doc.asistentes : []).map((x) => String(x));
    if (asistentes.includes(userId)) {
      return res.json({ ok: true, yaConfirmado: true, evento: toDoc(doc) });
    }

    const capacidad = Number(doc.capacidad);
    const limite = Number.isFinite(capacidad) && capacidad >= 0 ? capacidad : null;
    if (limite != null && asistentes.length >= limite) {
      return res.status(409).json({ error: 'Cupo lleno', cupoLleno: true, evento: toDoc(doc) });
    }

    doc.asistentes = [...(doc.asistentes || []), req.userId];
    await doc.save();
    res.json({ ok: true, yaConfirmado: false, evento: toDoc(doc) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await Evento.findById(req.params.id);
    res.json(doc ? toDoc(doc) : null);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    const doc = { ...b };
    const tel = String(b.telefonoContacto ?? b.telefono ?? '').trim();
    if (tel) {
      doc.telefonoContacto = tel;
      doc.telefono = tel;
    }
    if (b.cupoMaximo != null && b.capacidad == null) {
      const cap = Number(b.cupoMaximo);
      doc.capacidad = Number.isFinite(cap) ? cap : undefined;
    }
    delete doc.cupoMaximo;
    // Permitir subir imagen promocional en base64 desde el admin
    if (b.imagenBase64) {
      doc.imagenUrl = guardarImagenBase64(b.imagenBase64) || doc.imagenUrl;
      delete doc.imagenBase64;
    }
    if (b.imagenPromocionalBase64) {
      doc.imagenUrl = guardarImagenBase64(b.imagenPromocionalBase64) || doc.imagenUrl;
      delete doc.imagenPromocionalBase64;
    }
    const evento = new Evento(doc);
    await evento.save();
    res.json(toDoc(evento));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    const update = { ...b };
    const tel = String(b.telefonoContacto ?? b.telefono ?? '').trim();
    if (tel) {
      update.telefonoContacto = tel;
      update.telefono = tel;
    }
    if (b.cupoMaximo != null && b.capacidad == null) {
      const cap = Number(b.cupoMaximo);
      update.capacidad = Number.isFinite(cap) ? cap : undefined;
    }
    delete update.cupoMaximo;
    if (b.imagenBase64) {
      update.imagenUrl = guardarImagenBase64(b.imagenBase64) || update.imagenUrl;
      delete update.imagenBase64;
    }
    if (b.imagenPromocionalBase64) {
      update.imagenUrl = guardarImagenBase64(b.imagenPromocionalBase64) || update.imagenUrl;
      delete update.imagenPromocionalBase64;
    }
    const doc = await Evento.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!doc) return res.status(404).json({ error: 'No encontrado' });
    res.json(toDoc(doc));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const doc = await Evento.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
