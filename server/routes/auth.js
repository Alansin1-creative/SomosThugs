const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const Usuario = require('../models/Usuario');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const UPLOADS_AVATAR = path.join(__dirname, '..', 'uploads', 'avatars');

function guardarAvatarBase64(base64) {
  if (!base64) return undefined;
  const match = base64.match(/^data:image\/(\w+);base64,(.+)$/);
  const ext = match ? (match[1] === 'jpeg' ? 'jpg' : match[1]) : 'jpg';
  const data = match ? match[2] : base64;
  const buffer = Buffer.from(data, 'base64');
  if (!fs.existsSync(UPLOADS_AVATAR)) fs.mkdirSync(UPLOADS_AVATAR, { recursive: true });
  const nombre = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const ruta = path.join(UPLOADS_AVATAR, nombre);
  fs.writeFileSync(ruta, buffer);
  return `/uploads/avatars/${nombre}`;
}
const googleClientIds = [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_WEB_CLIENT_ID].filter(Boolean);
const clientGoogle = googleClientIds.length ? new OAuth2Client(googleClientIds[0]) : null;

function toPerfil(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  const { passwordHash, uid, __v, ...rest } = o;
  return { id: o._id.toString(), ...rest, _id: undefined };
}

router.post('/register', async (req, res) => {
  try {
    const {
      email,
      password,
      nombreCompleto,
      username,
      telefono,
      fotoBase64,
      aceptaNotificaciones,
    } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    const usernameTrim = (username || '').trim();
    if (!usernameTrim) return res.status(400).json({ error: 'Usuario es obligatorio' });
    const existenteEmail = await Usuario.findOne({ email });
    if (existenteEmail) return res.status(400).json({ error: 'Email ya registrado' });
    const existenteUsername = await Usuario.findOne({ username: usernameTrim });
    if (existenteUsername) return res.status(400).json({ error: 'Usuario ya está en uso' });
    const passwordHash = await bcrypt.hash(password, 10);
    let fotoUrl;
    if (fotoBase64) {
      try {
        fotoUrl = guardarAvatarBase64(fotoBase64);
      } catch (e) {
        console.error('Avatar base64:', e.message);
      }
    }
    const usuario = new Usuario({
      email: email.trim(),
      passwordHash,
      nombreCompleto: (nombreCompleto || '').trim(),
      username: usernameTrim,
      telefono: (telefono || '').trim() || undefined,
      fotoUrl: fotoUrl || undefined,
      nivelAcceso: 'registrado',
      fechaRegistro: new Date(),
      ultimaConexion: new Date(),
      proveedor: 'email',
      aceptaNotificaciones: aceptaNotificaciones !== false,
      activo: true,
      rol: 'fan',
    });
    await usuario.save();
    const perfil = toPerfil(usuario);
    const token = jwt.sign({ userId: usuario._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ perfil, token });
  } catch (e) {
    if (e.code === 11000 && e.keyPattern?.username) return res.status(400).json({ error: 'Usuario ya está en uso' });
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
        proveedor: 'google',
        aceptaNotificaciones: true,
        ultimaConexion: new Date(),
        activo: true,
        rol: 'fan',
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
