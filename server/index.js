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

const app = express();
// CORS explícito para Netlify; evita 502 en preflight y error CORS en el navegador
const corsOptions = {
  origin: [
    'https://somosthugs.netlify.app',
    /\.netlify\.app$/,
    /^http:\/\/localhost(:\d+)?$/,
    /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check: Railway y el navegador pueden comprobar que el servidor responde (evita 502)
app.get('/health', (_, res) => res.status(200).json({ ok: true }));

app.use('/auth', authRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/eventos', eventosRoutes);
app.use('/publicaciones', publicacionesRoutes);
app.use('/contenido-exclusivo', contenidoExclusivoRoutes);

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/somos-thugs';

// Arrancar el servidor primero para que Railway reciba respuesta (OPTIONS, health). Así no hay 502.
app.listen(PORT, '0.0.0.0', () => console.log('Servidor en puerto', PORT));

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB conectado'))
  .catch((e) => console.error('MongoDB error:', e.message));
