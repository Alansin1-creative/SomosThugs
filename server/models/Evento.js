const mongoose = require('mongoose');

const eventoSchema = new mongoose.Schema({
  titulo: String,
  descripcion: String,
  fechaInicio: Date,
  fechaFin: Date,
  lugar: String,
  direccion: String,
  latitud: Number,
  longitud: Number,
  esPublico: { type: Boolean, default: true },
  imagenUrl: String,
  creadoPor: String,
  capacidad: Number,
  estado: String,
  categoria: String,
  precio: Number,
  telefonoContacto: String,
  enlaceEntradas: String,
  hashtags: [String],
  notasInternas: String,
  nivelRequerido: { type: String, enum: ['libre', 'fan', 'thug'], default: 'libre' },
  asistentes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }]
}, { timestamps: true });

eventoSchema.index({ esPublico: 1, fechaInicio: -1 });

module.exports = mongoose.model('Evento', eventoSchema);