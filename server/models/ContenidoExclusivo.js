const mongoose = require('mongoose');


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
  tipoContenido: { type: String, default: 'articulo' },
  nivelRequerido: { type: String, default: 'thug' },
  categoria: String,
  etiquetas: [String],
  visible: { type: Boolean, default: true },
  destacado: { type: Boolean, default: false },
  numeroVistas: { type: Number, default: 0 },
  numeroLikes: { type: Number, default: 0 },

  comentarios: [
  {
    usuarioId: String,
    usuario: String,
    rol: String,
    nivelAcceso: String,
    texto: String,
    fecha: { type: Date, default: Date.now }
  }],


  vistasUsuarios: [String],
  creadoPor: String,
  fechaPublicacion: { type: Date, default: Date.now },
  fechaActualizacion: { type: Date, default: Date.now }
}, { timestamps: true });

contenidoExclusivoSchema.index({ fechaPublicacion: -1 });
contenidoExclusivoSchema.index({ categoria: 1, visible: 1 });

module.exports = mongoose.model('ContenidoExclusivo', contenidoExclusivoSchema);