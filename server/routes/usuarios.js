const express = require('express');
const Usuario = require('../models/Usuario');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const firebaseStorage = require('../lib/firebaseStorage');

const router = express.Router();

function toUsuarioPublico(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  const { passwordHash, uid, __v, ...rest } = o;
  return { id: o._id.toString(), ...rest, _id: undefined };
}


router.get('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const usuarios = await Usuario.find({}).sort({ createdAt: -1 });
    res.json(usuarios.map((u) => toUsuarioPublico(u)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


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
      nivelAcceso
    } = req.body;
    const update = {};
    if (typeof premium === 'boolean') update.nivelAcceso = premium ? 'thug' : 'fan';
    if (nivelAcceso !== undefined) update.nivelAcceso = nivelAcceso;
    if (rol !== undefined) {
      if (String(id) === String(req.userId) && rol !== 'admin') {
        return res.status(400).json({ error: 'No puedes quitarte el rol admin a ti mismo' });
      }
      update.rol = rol;
    }
    if (nombreCompleto !== undefined) update.nombreCompleto = nombreCompleto;
    if (username !== undefined) update.username = username;
    if (email !== undefined) update.email = email;
    if (telefono !== undefined) update.telefono = telefono;
    if (biografia !== undefined) update.biografia = biografia;
    if (nota !== undefined) update.nota = nota;
    let fotoAnterior = '';
    if (fotoUrl !== undefined) {
      const prev = await Usuario.findById(id).select('fotoUrl').lean();
      fotoAnterior = String(prev?.fotoUrl || '').trim();
      update.fotoUrl = fotoUrl;
    }
    if (typeof activo === 'boolean') update.activo = activo;
    if (typeof aceptaNotificaciones === 'boolean') update.aceptaNotificaciones = aceptaNotificaciones;
    if (typeof notificacionesPushActivas === 'boolean') update.notificacionesPushActivas = notificacionesPushActivas;
    const usuario = await Usuario.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    const nuevaFoto = String(usuario.fotoUrl || '').trim();
    if (fotoUrl !== undefined && fotoAnterior && fotoAnterior !== nuevaFoto) {
      await firebaseStorage.deleteMediaUrl(fotoAnterior);
    }
    res.json(toUsuarioPublico(usuario));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.userId) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }
    const prev = await Usuario.findById(id).select('fotoUrl').lean();
    const usuario = await Usuario.findByIdAndDelete(id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    await firebaseStorage.deleteMediaUrl(String(prev?.fotoUrl || usuario.fotoUrl || ''));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;