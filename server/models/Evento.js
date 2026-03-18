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
  enlaceEntradas: String,
  hashtags: [String],
  notasInternas: String,
}, { timestamps: true });

eventoSchema.index({ esPublico: 1, fechaInicio: -1 });

module.exports = mongoose.model('Evento', eventoSchema);
