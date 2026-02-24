const mongoose = require('mongoose');

const publicacionSchema = new mongoose.Schema({
  titulo: String,
  contenido: String,
  tipo: String,
  imagenUrl: String,
  autorId: String,
  autorNombre: String,
  estado: String,
  vistas: Number,
  likes: Number,
  comentariosCount: Number,
  etiquetas: [String],
  enlaceExterno: String,
  destacado: Boolean,
  orden: Number,
  fechaPublicacion: { type: Date, default: Date.now },
}, { timestamps: true });

publicacionSchema.index({ fechaPublicacion: -1 });

module.exports = mongoose.model('Publicacion', publicacionSchema);
