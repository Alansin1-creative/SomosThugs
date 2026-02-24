const mongoose = require('mongoose');

const contenidoExclusivoSchema = new mongoose.Schema({
  titulo: String,
  descripcion: String,
  tipo: String,
  urlArchivo: String,
  thumbnailUrl: String,
  subidoPor: String,
  duracionSegundos: Number,
  pesoBytes: Number,
  estado: String,
  visibilidad: String,
  etiquetas: [String],
  fechaGrabacion: String,
  version: Number,
  notas: String,
  fechaSubida: { type: Date, default: Date.now },
}, { timestamps: true });

contenidoExclusivoSchema.index({ fechaSubida: -1 });

module.exports = mongoose.model('ContenidoExclusivo', contenidoExclusivoSchema);
