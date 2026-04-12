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
const firebaseStorage = require('../lib/firebaseStorage');

function guardarAvatarBase64Disco(base64) {
  if (!base64) return undefined;
  const { buffer, ext } = firebaseStorage.parseBase64Image(base64);
  if (!buffer || buffer.length === 0) return undefined;
  if (!fs.existsSync(UPLOADS_AVATAR)) fs.mkdirSync(UPLOADS_AVATAR, { recursive: true });
  const nombre = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const ruta = path.join(UPLOADS_AVATAR, nombre);
  fs.writeFileSync(ruta, buffer);
  return `/uploads/avatars/${nombre}`;
}

async function guardarAvatarBase64(base64) {
  if (!base64) return undefined;
  if (firebaseStorage.isConfigured()) {
    try {
      const url = await firebaseStorage.uploadAvatarFromBase64(base64);
      if (url) return url;
    } catch (e) {
      console.error('[auth] Avatar Firebase:', e.message);
    }
  }
  return guardarAvatarBase64Disco(base64);
}
const googleClientIds = [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_WEB_CLIENT_ID].filter(Boolean);
const clientGoogle = googleClientIds.length ? new OAuth2Client(googleClientIds[0]) : null;

function toPerfil(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  const { passwordHash, uid, __v, webPushSubscriptions, ...rest } = o;
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
      aceptaNotificaciones
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
        fotoUrl = await guardarAvatarBase64(fotoBase64);
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
      nivelAcceso: 'fan',
      fechaRegistro: new Date(),
      ultimaConexion: new Date(),
      proveedor: 'email',
      aceptaNotificaciones: aceptaNotificaciones !== false,
      activo: true,
      rol: 'fan'
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
    const telefonoGoogle = payload.phone_number || payload.phone || '';
    if (!usuario) {
      usuario = new Usuario({
        email,
        uid: payload.sub,
        nombreCompleto: payload.name || '',
        fotoUrl: payload.picture || '',
        telefono: telefonoGoogle || undefined,
        nivelAcceso: 'fan',
        fechaRegistro: new Date(),
        proveedor: 'google',
        aceptaNotificaciones: true,
        ultimaConexion: new Date(),
        activo: true,
        rol: 'fan'
      });
      await usuario.save();
      console.log('Usuario Google creado:', email);
    } else {
      const update = { ultimaConexion: new Date() };
      if (telefonoGoogle && !usuario.telefono) update.telefono = telefonoGoogle;
      if (payload.picture) update.fotoUrl = payload.picture;
      await Usuario.updateOne({ _id: usuario._id }, update);
      if (update.fotoUrl) usuario.fotoUrl = update.fotoUrl;
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


router.patch('/perfil', authMiddleware, async (req, res) => {
  try {
    const {
      nombreCompleto,
      username,
      telefono,
      biografia,
      aceptaNotificaciones,
      fotoBase64
    } = req.body;

    const update = {};
    let fotoUrlAnterior = '';

    if (fotoBase64) {
      try {
        const prev = await Usuario.findById(req.userId).select('fotoUrl').lean();
        fotoUrlAnterior = String(prev?.fotoUrl || '').trim();
        const nueva = await guardarAvatarBase64(fotoBase64);
        if (nueva) update.fotoUrl = nueva;
      } catch (e) {
        console.error('Avatar perfil:', e.message);
      }
    }

    if (nombreCompleto !== undefined) {
      update.nombreCompleto = (nombreCompleto || '').trim();
    }

    if (telefono !== undefined) {
      const tel = (telefono || '').trim();
      update.telefono = tel || undefined;
    }

    if (biografia !== undefined) {
      update.biografia = (biografia || '').trim();
    }

    if (typeof aceptaNotificaciones === 'boolean') {
      update.aceptaNotificaciones = aceptaNotificaciones;
    }

    if (username !== undefined) {
      const usernameTrim = (username || '').trim();
      if (!usernameTrim) {
        return res.status(400).json({ error: 'Usuario es obligatorio' });
      }
      const existenteUsername = await Usuario.findOne({
        username: usernameTrim,
        _id: { $ne: req.userId }
      });
      if (existenteUsername) {
        return res.status(400).json({ error: 'Usuario ya está en uso' });
      }
      update.username = usernameTrim;
    }

    const usuario = await Usuario.findByIdAndUpdate(
      req.userId,
      { $set: update },
      { new: true }
    );

    if (!usuario) return res.status(404).json({ error: 'No encontrado' });

    if (fotoUrlAnterior && update.fotoUrl && fotoUrlAnterior !== update.fotoUrl) {
      await firebaseStorage.deleteMediaUrl(fotoUrlAnterior);
    }

    res.json(toPerfil(usuario));
  } catch (e) {
    if (e.code === 11000 && e.keyPattern?.username) {
      return res.status(400).json({ error: 'Usuario ya está en uso' });
    }
    res.status(500).json({ error: e.message });
  }
});

router.get('/web-push/public-key', (req, res) => {
  const k = String(process.env.WEB_PUSH_PUBLIC_KEY || '').trim();
  if (!k) return res.status(503).json({ error: 'Web push no configurado' });
  res.json({ publicKey: k });
});

router.patch('/web-push/subscribe', authMiddleware, async (req, res) => {
  try {
    const sub = req.body && req.body.subscription;
    if (!sub || typeof sub.endpoint !== 'string' || !sub.keys || typeof sub.keys !== 'object') {
      return res.status(400).json({ error: 'Suscripción inválida' });
    }
    const p256dh = String(sub.keys.p256dh || '').trim();
    const auth = String(sub.keys.auth || '').trim();
    const endpoint = String(sub.endpoint || '').trim();
    if (!endpoint || !p256dh || !auth) {
      return res.status(400).json({ error: 'Suscripción incompleta' });
    }
    const clean = { endpoint, keys: { p256dh, auth } };
    await Usuario.updateOne({ _id: req.userId }, { $pull: { webPushSubscriptions: { endpoint: clean.endpoint } } });
    await Usuario.updateOne(
      { _id: req.userId },
      {
        $push: { webPushSubscriptions: clean },
        $set: { notificacionesPushActivas: true, aceptaNotificaciones: true }
      }
    );
    const u = await Usuario.findById(req.userId).select('webPushSubscriptions').lean();
    const total = Array.isArray(u?.webPushSubscriptions) ? u.webPushSubscriptions.length : 0;
    res.json({ ok: true, total });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/web-push/unsubscribe', authMiddleware, async (req, res) => {
  try {
    const ep = String(req.body?.endpoint || '').trim();
    if (!ep) return res.status(400).json({ error: 'Falta endpoint' });
    await Usuario.updateOne({ _id: req.userId }, { $pull: { webPushSubscriptions: { endpoint: ep } } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/push-token', authMiddleware, async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    if (!token) return res.status(400).json({ error: 'Falta token' });
    const usuario = await Usuario.findByIdAndUpdate(
      req.userId,
      { $addToSet: { expoPushTokens: token }, $set: { notificacionesPushActivas: true } },
      { new: true }
    );
    if (!usuario) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true, totalTokens: Array.isArray(usuario.expoPushTokens) ? usuario.expoPushTokens.length : 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;