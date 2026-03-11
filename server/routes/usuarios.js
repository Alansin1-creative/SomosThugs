const express = require('express');
const Usuario = require('../models/Usuario');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function toUsuarioPublico(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  const { passwordHash, uid, __v, ...rest } = o;
  return { id: o._id.toString(), ...rest, _id: undefined };
}

// Listar todos los usuarios (solo admin)
router.get('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const usuarios = await Usuario.find({}).sort({ createdAt: -1 });
    res.json(usuarios.map((u) => toUsuarioPublico(u)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Actualizar usuario: nivelAcceso (thug/fan), rol, o datos editables (solo admin)
router.patch('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      premium,
      rol,
      nombreCompleto,
      username,
      email,
      telefono,
      biografia,
      nota,
      fotoUrl,
      activo,
      aceptaNotificaciones,
      notificacionesPushActivas,
      nivelAcceso,
    } = req.body;
    const update = {};
    if (typeof premium === 'boolean') update.nivelAcceso = premium ? 'thug' : 'fan';
    if (nivelAcceso !== undefined) update.nivelAcceso = nivelAcceso;
    if (rol !== undefined) update.rol = rol;
    if (nombreCompleto !== undefined) update.nombreCompleto = nombreCompleto;
    if (username !== undefined) update.username = username;
    if (email !== undefined) update.email = email;
    if (telefono !== undefined) update.telefono = telefono;
    if (biografia !== undefined) update.biografia = biografia;
    if (nota !== undefined) update.nota = nota;
    if (fotoUrl !== undefined) update.fotoUrl = fotoUrl;
    if (typeof activo === 'boolean') update.activo = activo;
    if (typeof aceptaNotificaciones === 'boolean') update.aceptaNotificaciones = aceptaNotificaciones;
    if (typeof notificacionesPushActivas === 'boolean') update.notificacionesPushActivas = notificacionesPushActivas;
    const usuario = await Usuario.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(toUsuarioPublico(usuario));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Eliminar usuario (solo admin)
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.userId) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }
    const usuario = await Usuario.findByIdAndDelete(id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
