const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  uid: String,
  email: { type: String, required: true },
  passwordHash: String,
  nombreCompleto: String,
  nombreArtistico: String,
  fotoUrl: String,
  nivelAcceso: { type: String, default: 'registrado' },
  fechaRegistro: Date,
  provider: String,
  telefono: String,
  pais: String,
  ciudad: String,
  aceptaNotificaciones: Boolean,
  ultimaConexion: Date,
  activo: Boolean,
  rol: String,
  fechaNacimiento: String,
  genero: String,
  biografia: String,
  verificado: Boolean,
}, { timestamps: true });

usuarioSchema.index({ uid: 1 });
usuarioSchema.index({ email: 1 });

module.exports = mongoose.model('Usuario', usuarioSchema);
