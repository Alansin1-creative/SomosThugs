const express = require('express');
const Publicacion = require('../models/Publicacion');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

function toDoc(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return { id: o._id.toString(), ...o, _id: undefined };
}

router.get('/', async (req, res) => {
  try {
    const lista = await Publicacion.find().sort({ fechaPublicacion: -1 }).limit(50).lean();
    res.json(lista.map((d) => ({ id: d._id.toString(), ...d, _id: undefined })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await Publicacion.findById(req.params.id);
    res.json(doc ? toDoc(doc) : null);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const pub = new Publicacion(req.body);
    await pub.save();
    res.json(toDoc(pub));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await Publicacion.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: 'No encontrado' });
    res.json(toDoc(doc));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await Publicacion.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
