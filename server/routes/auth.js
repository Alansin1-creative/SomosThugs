const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const Usuario = require('../models/Usuario');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const googleClientIds = [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_WEB_CLIENT_ID].filter(Boolean);
const clientGoogle = googleClientIds.length ? new OAuth2Client(googleClientIds[0]) : null;

function toPerfil(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  const { passwordHash, __v, ...rest } = o;
  return { id: o._id.toString(), ...rest, _id: undefined };
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, nombreCompleto, fotoUrl } = req.body;
    const existente = await Usuario.findOne({ email });
    if (existente) return res.status(400).json({ error: 'Email ya registrado' });
    const passwordHash = await bcrypt.hash(password, 10);
    const usuario = new Usuario({
      email,
      passwordHash,
      nombreCompleto: nombreCompleto || '',
      fotoUrl: fotoUrl || '',
      nivelAcceso: 'registrado',
      fechaRegistro: new Date(),
      provider: 'email',
      aceptaNotificaciones: true,
      ultimaConexion: new Date(),
      activo: true,
      rol: 'fan',
      verificado: false,
    });
    await usuario.save();
    const perfil = toPerfil(usuario);
    const token = jwt.sign({ userId: usuario._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ perfil, token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const usuario = await Usuario.findOne({ email });
    if (!usuario || !usuario.passwordHash) return res.status(401).json({ error: 'Credenciales incorrectas' });
    const ok = await bcrypt.compare(password, usuario.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' });
    await Usuario.updateOne({ _id: usuario._id }, { ultimaConexion: new Date() });
    const perfil = toPerfil(usuario);
    const token = jwt.sign({ userId: usuario._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ perfil, token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/login-google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!clientGoogle || !idToken) return res.status(400).json({ error: 'Falta idToken' });
    const ticket = await clientGoogle.verifyIdToken({ idToken, audience: googleClientIds });
    const payload = ticket.getPayload();
    const email = payload.email;
    let usuario = await Usuario.findOne({ email });
    if (!usuario) {
      usuario = new Usuario({
        email,
        uid: payload.sub,
        nombreCompleto: payload.name || '',
        fotoUrl: payload.picture || '',
        nivelAcceso: 'registrado',
        fechaRegistro: new Date(),
        provider: 'google',
        aceptaNotificaciones: true,
        ultimaConexion: new Date(),
        activo: true,
        rol: 'fan',
        verificado: false,
      });
      await usuario.save();
      console.log('Usuario Google creado:', email);
    } else {
      await Usuario.updateOne({ _id: usuario._id }, { ultimaConexion: new Date() });
    }
    const perfil = toPerfil(usuario);
    const token = jwt.sign({ userId: usuario._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ perfil, token });
  } catch (e) {
    console.error('login-google error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/perfil', authMiddleware, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.userId);
    if (!usuario) return res.status(404).json({ error: 'No encontrado' });
    res.json(toPerfil(usuario));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
