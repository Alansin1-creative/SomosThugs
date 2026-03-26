require('dotenv').config();
const dns = require('dns');
const path = require('path');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios');
const eventosRoutes = require('./routes/eventos');
const publicacionesRoutes = require('./routes/publicaciones');
const contenidoExclusivoRoutes = require('./routes/contenidoExclusivo');
const mapsRoutes = require('./routes/maps');
const notificacionesRoutes = require('./routes/notificaciones');

const app = express();

const ORIGEN_CORS_FIJOS = [
  'https://somosthugs.com',
  'https://www.somosthugs.com',
  'https://rolandocalles.com',
  'https://www.rolandocalles.com',
];

const ORIGEN_CORS_REGEX = [
  /^https:\/\/.*\.github\.io$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^http:\/\/\[::1\](:\d+)?$/,
  // Expo web / Vite en red local (http://192.168.x.x:8081, etc.)
  /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,
  /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/,
  /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}(:\d+)?$/,
];

function origenCorsPermitido(origin) {
  if (!origin) return true;
  if (ORIGEN_CORS_FIJOS.includes(origin)) return true;
  return ORIGEN_CORS_REGEX.some((re) => re.test(origin));
}

// CORS: producción + dev local y LAN (mismo equipo o móvil en la WiFi)
const corsOptions = {
  origin(origin, callback) {
    callback(null, origenCorsPermitido(origin));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check: Railway y el navegador pueden comprobar que el servidor responde (evita 502)
app.get('/health', (_, res) => res.status(200).json({ ok: true }));

// Caché en memoria para avatares de Google (evita 429 y reduce peticiones)
const avatarProxyCache = new Map();
const AVATAR_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

// Proxy de avatar para fotos de Google (evita bloqueo por CORS/referrer en web)
app.get('/avatar-proxy', async (req, res) => {
  const url = req.query.url;
  if (!url || typeof url !== 'string') return res.status(400).send('Falta url');
  try {
    const parsed = new URL(url);
    const allowed = parsed.hostname === 'lh3.googleusercontent.com' || parsed.hostname.endsWith('.googleusercontent.com');
    if (!allowed) return res.status(403).send('Origen no permitido');

    const cached = avatarProxyCache.get(url);
    if (cached && Date.now() < cached.expiresAt) {
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      return res.send(cached.buffer);
    }

    const resp = await fetch(url, { headers: { 'User-Agent': 'SomosThugs-Avatar/1' } });
    if (!resp.ok) {
      if (resp.status === 404) return res.status(204).end();
      if (resp.status === 429) return res.status(204).end(); // Too Many Requests → placeholder
      return res.status(resp.status).send('Error al obtener imagen');
    }
    const contentType = resp.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await resp.arrayBuffer());
    avatarProxyCache.set(url, { buffer: buf, contentType, expiresAt: Date.now() + AVATAR_CACHE_TTL_MS });
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(buf);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.use('/auth', authRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/eventos', eventosRoutes);
app.use('/publicaciones', publicacionesRoutes);
app.use('/contenido-exclusivo', contenidoExclusivoRoutes);
app.use('/maps', mapsRoutes);
app.use('/notificaciones', notificacionesRoutes);

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/somos-thugs';

// Arrancar el servidor primero para que Railway reciba respuesta (OPTIONS, health). Así no hay 502.
app.listen(PORT, '0.0.0.0', () => console.log('Servidor en puerto', PORT));

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB conectado'))
  .catch((e) => console.error('MongoDB error:', e.message));
