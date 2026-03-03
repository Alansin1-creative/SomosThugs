require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const eventosRoutes = require('./routes/eventos');
const publicacionesRoutes = require('./routes/publicaciones');
const contenidoExclusivoRoutes = require('./routes/contenidoExclusivo');

const app = express();
// CORS explícito para Netlify; evita 502 en preflight y error CORS en el navegador
const corsOptions = {
  origin: [
    'https://somosthugs.netlify.app',
    /\.netlify\.app$/,
    'http://localhost:8081',
    'http://localhost:19006',
    'http://127.0.0.1:8081',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' }));

app.use('/auth', authRoutes);
app.use('/eventos', eventosRoutes);
app.use('/publicaciones', publicacionesRoutes);
app.use('/contenido-exclusivo', contenidoExclusivoRoutes);

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/somos-thugs';

mongoose.connect(MONGO_URI).then(() => {
  console.log('MongoDB conectado');
  // 0.0.0.0 para que Railway/proxy pueda conectar (evita 502)
  app.listen(PORT, '0.0.0.0', () => console.log('Servidor en puerto', PORT));
}).catch((e) => {
  console.error('MongoDB error:', e.message);
  process.exit(1);
});
