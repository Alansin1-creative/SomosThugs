require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const eventosRoutes = require('./routes/eventos');
const publicacionesRoutes = require('./routes/publicaciones');
const contenidoExclusivoRoutes = require('./routes/contenidoExclusivo');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/somos-thugs').catch((e) => console.error(e));

app.use('/auth', authRoutes);
app.use('/eventos', eventosRoutes);
app.use('/publicaciones', publicacionesRoutes);
app.use('/contenido-exclusivo', contenidoExclusivoRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log('Servidor en puerto', PORT));
