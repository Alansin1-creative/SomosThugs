const express = require('express');
const fs = require('fs');
const path = require('path');
const ContenidoExclusivo = require('../models/ContenidoExclusivo');
const Usuario = require('../models/Usuario');
const { authMiddleware, requireThug, requireAdmin, requireThugOrAdmin } = require('../middleware/auth');
const { crearNotificacionParaTodos } = require('../services/notificaciones');
const { enviarPush } = require('../services/push');

const router = express.Router();
const UPLOADS_CONTENIDO = path.join(__dirname, '..', 'uploads', 'contenido');

function guardarMediaBase64(base64, subdir = '') {
  if (!base64) return undefined;
  const dir = subdir ? path.join(UPLOADS_CONTENIDO, subdir) : UPLOADS_CONTENIDO;
  const match = base64.match(/^data:([^;]+);base64,(.+)$/);
  const ext = match ? (match[1].indexOf('jpeg') !== -1 || match[1].indexOf('jpg') !== -1 ? 'jpg' : match[1].split('/')[1] || 'bin') : 'bin';
  const data = match ? match[2] : base64;
  const buffer = Buffer.from(data, 'base64');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const nombre = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const ruta = path.join(dir, nombre);
  fs.writeFileSync(ruta, buffer);
  return subdir ? `/uploads/contenido/${subdir}/${nombre}` : `/uploads/contenido/${nombre}`;
}

function normalizarRutaMedia(valor) {
  const s = typeof valor === 'string' ? valor.trim() : '';
  if (!s) return '';
  if (s.startsWith('/uploads/')) return s;
  if (s.startsWith('http://') || s.startsWith('https://')) {
    try {
      const u = new URL(s);
      const p = `${u.pathname || ''}${u.search || ''}${u.hash || ''}`;
      if (p.startsWith('/uploads/')) return p;
      return s;
    } catch {
      return s;
    }
  }
  if (s.startsWith('uploads/')) return `/${s}`;
  return s;
}

function normalizarDocMedia(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  return {
    ...doc,
    urlMedia: normalizarRutaMedia(doc.urlMedia),
    urlMediaCompleta: normalizarRutaMedia(doc.urlMediaCompleta),
    urlMediaPreview: normalizarRutaMedia(doc.urlMediaPreview),
    urlImagen: normalizarRutaMedia(doc.urlImagen),
  };
}

function pareceVideo(url) {
  const s = String(url || '').toLowerCase();
  return /\.(mp4|webm|ogg|m4v|mov)(\?|#|$)/.test(s);
}

function pareceAudio(url) {
  const s = String(url || '').toLowerCase();
  return /\.(mp3|wav|aac|m4a|flac|oga)(\?|#|$)/.test(s);
}

function reconciliarUrlsMedia(tipoContenido, urlMedia, urlMediaCompleta) {
  const tipo = String(tipoContenido || '').toLowerCase().trim();
  const preview = normalizarRutaMedia(urlMedia);
  const completa = normalizarRutaMedia(urlMediaCompleta);
  if (tipo === 'video') {
    if (pareceVideo(completa)) return { urlMedia: preview, urlMediaCompleta: completa };
    if (pareceVideo(preview)) return { urlMedia: preview, urlMediaCompleta: preview };
  }
  if (tipo === 'audio') {
    if (pareceAudio(completa)) return { urlMedia: preview, urlMediaCompleta: completa };
    if (pareceAudio(preview)) return { urlMedia: preview, urlMediaCompleta: preview };
  }
  return { urlMedia: preview, urlMediaCompleta: completa };
}

function toDoc(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  const base = { id: o._id.toString(), ...o, _id: undefined };
  return normalizarDocMedia(base);
}

router.get('/', authMiddleware, requireThugOrAdmin, async (req, res) => {
  try {
    const lista = await ContenidoExclusivo.find().sort({ fechaPublicacion: -1 }).limit(50).lean();
    res.json(lista.map((d) => normalizarDocMedia({ id: d._id.toString(), ...d, _id: undefined })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Feed público: contenido con nivel requerido "fan" y visible (cualquier usuario autenticado)
router.get('/feed', authMiddleware, async (req, res) => {
  try {
    const lista = await ContenidoExclusivo.find({
      nivelRequerido: 'fan',
      visible: true,
    })
      .sort({ fechaPublicacion: -1 })
      .limit(50)
      .lean();
    res.json(lista.map((d) => normalizarDocMedia({ id: d._id.toString(), ...d, _id: undefined })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Feed unificado: fan + thug en una lista; si el usuario es fan, el contenido thug se devuelve mínimo (solo para mostrar bloqueado)
router.get('/feed-unificado', authMiddleware, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.userId).lean();
    const esThugOAdmin = usuario && (usuario.nivelAcceso === 'thug' || usuario.rol === 'admin');
    const lista = await ContenidoExclusivo.find({ visible: true })
      .sort({ fechaPublicacion: -1 })
      .limit(80)
      .lean();
    const items = lista.map((d) => {
      const id = d._id.toString();
      const nivelRequerido = d.nivelRequerido || 'thug';
      const base = normalizarDocMedia({ id, ...d, _id: undefined });
      if (!esThugOAdmin && nivelRequerido === 'thug') {
        return {
          id: base.id,
          titulo: base.titulo,
          tipoContenido: base.tipoContenido || 'articulo',
          fechaPublicacion: base.fechaPublicacion,
          nivelRequerido: 'thug',
          bloqueado: true,
        };
      }
      return { ...base, nivelRequerido, bloqueado: false };
    });
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', authMiddleware, requireThug, async (req, res) => {
  try {
    const doc = await ContenidoExclusivo.findById(req.params.id);
    res.json(doc ? toDoc(doc) : null);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Registrar una vista ÚNICA por usuario (cualquier usuario autenticado que pueda ver el contenido)
router.post('/:id/vista', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || req.user?._id?.toString?.();
    const doc = await ContenidoExclusivo.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'No encontrado' });

    // Si ya contamos la vista de este usuario, solo devolvemos el número actual
    if (userId && Array.isArray(doc.vistasUsuarios) && doc.vistasUsuarios.includes(userId)) {
      return res.json({ numeroVistas: doc.numeroVistas });
    }

    const update = {
      $inc: { numeroVistas: 1 },
    };
    if (userId) {
      update.$addToSet = { vistasUsuarios: userId };
    }

    const actualizado = await ContenidoExclusivo.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    res.json({ numeroVistas: actualizado.numeroVistas });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Dar like (incrementa numeroLikes; sin control de doble like por ahora)
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const doc = await ContenidoExclusivo.findByIdAndUpdate(
      req.params.id,
      { $inc: { numeroLikes: 1 } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'No encontrado' });
    res.json({ numeroLikes: doc.numeroLikes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Añadir comentario (cualquier usuario autenticado)
router.post('/:id/comentarios', authMiddleware, async (req, res) => {
  try {
    const texto = typeof req.body?.texto === 'string' ? req.body.texto.trim() : '';
    if (!texto) return res.status(400).json({ error: 'Falta el texto del comentario' });

    let usuarioNombre = 'Anónimo';
    try {
      const usuario = await Usuario.findById(req.userId).lean();
      if (usuario) {
        usuarioNombre = usuario.username || usuario.nombreCompleto || usuario.email || usuarioNombre;
      }
    } catch {
      // si falla, dejamos "Anónimo"
    }

    const nuevoComentario = {
      usuario: usuarioNombre,
      texto,
      fecha: new Date(),
    };

    const doc = await ContenidoExclusivo.findByIdAndUpdate(
      req.params.id,
      { $push: { comentarios: nuevoComentario } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'No encontrado' });
    res.json({
      comentarios: doc.comentarios || [],
      numeroComentarios: (doc.comentarios || []).length,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const b = req.body && typeof req.body === 'object' && req.body.data && typeof req.body.data === 'object'
      ? req.body.data
      : (req.body || {});
    const creadoPor = req.user?.id || req.user?.sub || '';
    const bodyKeys = Object.keys(b);
    console.log('[contenido-exclusivo POST] body keys:', bodyKeys.join(', '));
    const titulo = typeof b.titulo === 'string' ? b.titulo.trim() : '';
    const descripcion = typeof b.descripcion === 'string' ? b.descripcion.trim() : '';
    const previewTexto = typeof b.previewTexto === 'string' ? b.previewTexto.trim() : '';
    const contenidoCompleto = typeof b.contenidoCompleto === 'string' ? b.contenidoCompleto.trim() : '';
    const complementario = typeof b.complementario === 'string' ? b.complementario.trim() : '';
    const tipoContenido = typeof b.tipoContenido === 'string' && b.tipoContenido.trim() ? b.tipoContenido.trim() : 'articulo';
    const nivelRequerido = typeof b.nivelRequerido === 'string' && b.nivelRequerido.trim() ? b.nivelRequerido.trim() : 'thug';
    const categoria = typeof b.categoria === 'string' ? b.categoria.trim() : '';
    const etiquetas = Array.isArray(b.etiquetas) ? b.etiquetas : [];
    const visible = b.visible !== false;
    const destacado = Boolean(b.destacado);
    // Solo trabajamos con los campos nuevos:
    // - urlMedia: preview principal (imagen/video)
    // - urlMediaCompleta: archivo principal (PDF, video, etc.)
    let urlMedia = normalizarRutaMedia(typeof b.urlMedia === 'string' ? b.urlMedia : '');
    let urlMediaCompleta = normalizarRutaMedia(typeof b.urlMediaCompleta === 'string' ? b.urlMediaCompleta : '');
    if (b.mediaPreviewBase64) {
      urlMedia = guardarMediaBase64(b.mediaPreviewBase64, 'preview') || '';
    }
    if (b.mediaCompletaBase64) {
      urlMediaCompleta = guardarMediaBase64(b.mediaCompletaBase64, 'completa') || '';
    }
    const mediaFinal = reconciliarUrlsMedia(tipoContenido, urlMedia, urlMediaCompleta);
    const payload = {
      titulo,
      descripcion,
      previewTexto,
      contenidoCompleto,
      complementario,
      urlMedia: mediaFinal.urlMedia,
      urlMediaCompleta: mediaFinal.urlMediaCompleta,
      tipoContenido,
      nivelRequerido,
      categoria,
      etiquetas,
      visible,
      destacado,
      numeroVistas: 0,
      numeroLikes: 0,
      comentarios: [],
      creadoPor: b.creadoPor || creadoPor,
      fechaPublicacion: new Date(),
      fechaActualizacion: new Date(),
    };
    const [item] = await ContenidoExclusivo.create([payload]);
    console.log('[contenido-exclusivo POST] guardado keys:', Object.keys(item.toObject ? item.toObject() : item));
    try {
      await crearNotificacionParaTodos({
        tipo: 'nuevo_contenido',
        titulo: 'Nuevo contenido publicado',
        mensaje: item?.titulo ? `Se publicó: ${item.titulo}` : 'Hay nuevo contenido disponible.',
        entidadId: item?._id?.toString?.(),
      });
      const usuarios = await Usuario.find({
        activo: { $ne: false },
        aceptaNotificaciones: { $ne: false },
        expoPushTokens: { $exists: true, $ne: [] },
      })
        .select('expoPushTokens')
        .lean();
      const tokens = usuarios.flatMap((u) => (Array.isArray(u.expoPushTokens) ? u.expoPushTokens : []));
      if (tokens.length > 0) {
        await enviarPush(tokens, {
          title: 'Nuevo contenido publicado',
          body: item?.titulo ? `Se publicó: ${item.titulo}` : 'Hay nuevo contenido disponible.',
          data: { tipo: 'nuevo_contenido', entidadId: item?._id?.toString?.() || '' },
        });
      }
    } catch (notifErr) {
      console.warn('[notificaciones][contenido]', notifErr?.message || notifErr);
    }
    res.json(toDoc(item));
  } catch (e) {
    console.error('[contenido-exclusivo POST] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const b = req.body && typeof req.body === 'object' && req.body.data && typeof req.body.data === 'object'
      ? req.body.data
      : (req.body || {});
    console.log('[contenido-exclusivo PUT] body keys:', Object.keys(b).join(', '));
    const existing = await ContenidoExclusivo.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ error: 'No encontrado' });

    // Siempre partimos de los valores actuales
    let urlMedia = normalizarRutaMedia(existing.urlMedia ?? '');
    let urlMediaCompleta = normalizarRutaMedia(existing.urlMediaCompleta ?? '');

    // Si llegan nuevos archivos en base64, generamos nuevas URLs
    if (b.mediaPreviewBase64) {
      urlMedia = guardarMediaBase64(b.mediaPreviewBase64, 'preview') || urlMedia;
    }
    if (b.mediaCompletaBase64) {
      urlMediaCompleta = guardarMediaBase64(b.mediaCompletaBase64, 'completa') || urlMediaCompleta;
    }
    if (!b.mediaPreviewBase64 && typeof b.urlMedia === 'string') {
      urlMedia = normalizarRutaMedia(b.urlMedia);
    }
    if (!b.mediaCompletaBase64 && typeof b.urlMediaCompleta === 'string') {
      urlMediaCompleta = normalizarRutaMedia(b.urlMediaCompleta);
    }

    // Limpiar explícitamente cuando se pide desde el frontend
    if (b.clearPreview) {
      urlMedia = '';
    }
    if (b.clearMedia) {
      urlMediaCompleta = '';
    }

    const tipoContenidoFinal =
      typeof b.tipoContenido === 'string' && b.tipoContenido.trim()
        ? b.tipoContenido.trim()
        : existing.tipoContenido;
    const mediaFinal = reconciliarUrlsMedia(tipoContenidoFinal, urlMedia, urlMediaCompleta);
    const $set = {
      titulo: typeof b.titulo === 'string' ? b.titulo.trim() : existing.titulo,
      descripcion: typeof b.descripcion === 'string' ? b.descripcion.trim() : existing.descripcion,
      previewTexto: typeof b.previewTexto === 'string' ? b.previewTexto.trim() : existing.previewTexto,
      contenidoCompleto:
        typeof b.contenidoCompleto === 'string' ? b.contenidoCompleto.trim() : existing.contenidoCompleto,
      complementario:
        typeof b.complementario === 'string' ? b.complementario.trim() : existing.complementario,
      urlMedia: mediaFinal.urlMedia,
      urlMediaCompleta: mediaFinal.urlMediaCompleta,
      tipoContenido: tipoContenidoFinal,
      nivelRequerido:
        typeof b.nivelRequerido === 'string' && b.nivelRequerido.trim()
          ? b.nivelRequerido.trim()
          : existing.nivelRequerido,
      categoria: typeof b.categoria === 'string' ? b.categoria.trim() : existing.categoria,
      etiquetas: Array.isArray(b.etiquetas) ? b.etiquetas : existing.etiquetas,
      visible: b.visible !== undefined ? b.visible !== false : existing.visible !== false,
      destacado: b.destacado !== undefined ? Boolean(b.destacado) : Boolean(existing.destacado),
      fechaActualizacion: new Date(),
    };

    await ContenidoExclusivo.updateOne({ _id: req.params.id }, { $set });
    const doc = await ContenidoExclusivo.findById(req.params.id);
    res.json(toDoc(doc));
  } catch (e) {
    console.error('[contenido-exclusivo PUT] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const doc = await ContenidoExclusivo.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
