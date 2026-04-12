const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema(
  {
    nombreCompleto: String,
    username: String,
    email: { type: String, required: true },
    telefono: String,
    proveedor: String,
    rol: { type: String, default: 'fan' },
    biografia: String,
    nota: String,
    fotoUrl: String,
    fechaRegistro: Date,
    ultimaConexion: Date,
    activo: { type: Boolean, default: true },
    aceptaNotificaciones: { type: Boolean, default: true },
    notificacionesPushActivas: Boolean,
    expoPushTokens: [String],
    /** Suscripciones estándar Web Push (navegador); formato PushSubscription.toJSON() */
    webPushSubscriptions: { type: [mongoose.Schema.Types.Mixed], default: [] },

    passwordHash: String,
    uid: String,

    nivelAcceso: { type: String, default: 'fan' },

    stripeCustomerId: String,
    stripeSubscriptionId: String,
    stripeSubscriptionStatus: String
  },
  { timestamps: true }
);

usuarioSchema.index({ uid: 1 });
usuarioSchema.index({ email: 1 });
usuarioSchema.index({ username: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Usuario', usuarioSchema);