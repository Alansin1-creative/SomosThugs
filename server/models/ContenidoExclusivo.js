const mongoose = require('mongoose');

// Estructura de publicaciones para contenido exclusivo (admin)
const contenidoExclusivoSchema = new mongoose.Schema({
  titulo: String,
  descripcion: String,
  previewTexto: String,
  contenidoCompleto: String,
  urlMediaPreview: String,
  urlMediaCompleta: String,
  tipoContenido: { type: String, default: 'articulo' }, // ej: video, articulo, imagen, audio
  nivelRequerido: { type: String, default: 'thug' },
  categoria: String,
  etiquetas: [String],
  visible: { type: Boolean, default: true },
  destacado: { type: Boolean, default: false },
  numeroVistas: { type: Number, default: 0 },
  numeroLikes: { type: Number, default: 0 },
  comentarios: [String],
  creadoPor: String,
  fechaPublicacion: { type: Date, default: Date.now },
  fechaActualizacion: { type: Date, default: Date.now },
}, { timestamps: true });

contenidoExclusivoSchema.index({ fechaPublicacion: -1 });
contenidoExclusivoSchema.index({ categoria: 1, visible: 1 });

module.exports = mongoose.model('ContenidoExclusivo', contenidoExclusivoSchema);
