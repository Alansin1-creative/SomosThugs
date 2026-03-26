const Usuario = require('../models/Usuario');
const Notificacion = require('../models/Notificacion');

async function crearNotificacionParaTodos({ tipo, titulo, mensaje, entidadId = '' }) {
  const usuarios = await Usuario.find({
    activo: { $ne: false },
    aceptaNotificaciones: { $ne: false },
  })
    .select('_id')
    .lean();

  if (!Array.isArray(usuarios) || usuarios.length === 0) return 0;

  const docs = usuarios.map((u) => ({
    usuarioId: u._id,
    tipo,
    titulo,
    mensaje,
    entidadId: entidadId ? String(entidadId) : '',
    leida: false,
  }));

  await Notificacion.insertMany(docs, { ordered: false });
  return docs.length;
}

module.exports = { crearNotificacionParaTodos };

