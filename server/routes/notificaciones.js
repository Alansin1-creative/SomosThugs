const express = require('express');
const Notificacion = require('../models/Notificacion');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

function toDoc(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return { id: String(o._id), ...o, _id: undefined };
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const limiteRaw = Number(req.query?.limit);
    const limit = Number.isFinite(limiteRaw) ? Math.min(Math.max(limiteRaw, 1), 100) : 50;
    const lista = await Notificacion.find({ usuarioId: req.userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json(lista.map((d) => toDoc(d)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/no-leidas/count', authMiddleware, async (req, res) => {
  try {
    const total = await Notificacion.countDocuments({ usuarioId: req.userId, leida: false });
    res.json({ total });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/marcar-todas/leidas', authMiddleware, async (req, res) => {
  try {
    const r = await Notificacion.updateMany(
      { usuarioId: req.userId, leida: false },
      { $set: { leida: true } }
    );
    res.json({ actualizadas: r.modifiedCount || 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id/leida', authMiddleware, async (req, res) => {
  try {
    const doc = await Notificacion.findOneAndUpdate(
      { _id: req.params.id, usuarioId: req.userId },
      { $set: { leida: true } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'No encontrado' });
    res.json(toDoc(doc));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

