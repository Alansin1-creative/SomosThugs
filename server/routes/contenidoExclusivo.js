const express = require('express');
const ContenidoExclusivo = require('../models/ContenidoExclusivo');
const { authMiddleware, requireThug } = require('../middleware/auth');

const router = express.Router();

function toDoc(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return { id: o._id.toString(), ...o, _id: undefined };
}

router.get('/', authMiddleware, requireThug, async (req, res) => {
  try {
    const lista = await ContenidoExclusivo.find().sort({ fechaSubida: -1 }).limit(50).lean();
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

router.post('/', authMiddleware, requireThug, async (req, res) => {
  try {
    const item = new ContenidoExclusivo(req.body);
    await item.save();
    res.json(toDoc(item));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', authMiddleware, requireThug, async (req, res) => {
  try {
    const doc = await ContenidoExclusivo.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: 'No encontrado' });
    res.json(toDoc(doc));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', authMiddleware, requireThug, async (req, res) => {
  try {
    const doc = await ContenidoExclusivo.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
