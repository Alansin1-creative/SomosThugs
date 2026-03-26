const mongoose = require('mongoose');

const notificacionSchema = new mongoose.Schema(
  {
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
    tipo: {
      type: String,
      enum: ['nuevo_contenido', 'nuevo_evento'],
      required: true,
      index: true,
    },
    titulo: { type: String, required: true },
    mensaje: { type: String, required: true },
    leida: { type: Boolean, default: false, index: true },
    entidadId: { type: String, default: '' },
  },
  { timestamps: true }
);

notificacionSchema.index({ usuarioId: 1, createdAt: -1 });

module.exports = mongoose.model('Notificacion', notificacionSchema);

