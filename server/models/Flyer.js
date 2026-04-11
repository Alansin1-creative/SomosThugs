const mongoose = require('mongoose');

const flyerSchema = new mongoose.Schema(
  {
    titulo: { type: String, default: '' },
    urlImagen: { type: String, required: true },
    activo: { type: Boolean, default: true },
    orden: { type: Number, default: 0 },
    creadoPor: { type: String, default: '' }
  },
  { timestamps: true }
);

flyerSchema.index({ activo: 1, orden: 1, createdAt: -1 });

module.exports = mongoose.model('Flyer', flyerSchema);