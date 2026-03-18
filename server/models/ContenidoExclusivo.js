const mongoose = require('mongoose');

// Estructura de publicaciones para contenido exclusivo (admin)
const contenidoExclusivoSchema = new mongoose.Schema({
  titulo: String,
  descripcion: String,
  previewTexto: String,
  contenidoCompleto: String,
  complementario: String,
  urlImagen: String,
  urlMediaPreview: String,
  urlMediaCompleta: String,
  urlMedia: String,
  tipoContenido: { type: String, default: 'articulo' }, // ej: video, articulo, imagen, audio
  nivelRequerido: { type: String, default: 'thug' },
  categoria: String,
  etiquetas: [String],
  visible: { type: Boolean, default: true },
  destacado: { type: Boolean, default: false },
  numeroVistas: { type: Number, default: 0 },
  numeroLikes: { type: Number, default: 0 },
  // Comentarios: guardamos usuario y texto; soporta también strings antiguos
  comentarios: [
    {
      usuario: String,
      texto: String,
      fecha: { type: Date, default: Date.now },
    },
  ],
  // Para contar vistas únicas por usuario
  vistasUsuarios: [String],
  creadoPor: String,
  fechaPublicacion: { type: Date, default: Date.now },
  fechaActualizacion: { type: Date, default: Date.now },
}, { timestamps: true });

contenidoExclusivoSchema.index({ fechaPublicacion: -1 });
contenidoExclusivoSchema.index({ categoria: 1, visible: 1 });

module.exports = mongoose.model('ContenidoExclusivo', contenidoExclusivoSchema);
