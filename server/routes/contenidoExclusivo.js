const express = require('express');
const fs = require('fs');
const path = require('path');
const ContenidoExclusivo = require('../models/ContenidoExclusivo');
const Usuario = require('../models/Usuario');
const { authMiddleware, requireAdmin, requireThugOrAdmin } = require('../middleware/auth');
const { crearNotificacionParaTodos } = require('../services/notificaciones');
const { enviarPush } = require('../services/push');

const router = express.Router();
const UPLOADS_CONTENIDO = path.join(__dirname, '..', 'uploads', 'contenido');
const firebaseStorage = require('../lib/firebaseStorage');

function guardarMediaBase64Disco(base64, subdir = '') {
  if (!base64) return undefined;
  const dir = subdir ? path.join(UPLOADS_CONTENIDO, subdir) : UPLOADS_CONTENIDO;
  const { buffer, ext } = firebaseStorage.parseBase64Media(base64);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const nombre = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const ruta = path.join(dir, nombre);
  fs.writeFileSync(ruta, buffer);
  return subdir ? `/uploads/contenido/${subdir}/${nombre}` : `/uploads/contenido/${nombre}`;
}

async function guardarMediaBase64(base64, subdir = '') {
  if (!base64) return undefined;
  if (firebaseStorage.isConfigured()) {
    try {
      const url = await firebaseStorage.uploadContenidoMediaFromBase64(base64, subdir);
      if (url) return url;
    } catch (e) {
      console.error('[contenido-exclusivo] Media Firebase:', e.message);
    }
  }
  return guardarMediaBase64Disco(base64, subdir);
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
  const tipo = doc.tipoContenido || doc.tipo || 'articulo';
  const rec = reconciliarUrlsMedia(tipo, doc.urlMedia, doc.urlMediaCompleta);
  return {
    ...doc,
    urlMedia: rec.urlMedia,
    urlMediaCompleta: rec.urlMediaCompleta,
    urlMediaPreview: normalizarRutaMedia(doc.urlMediaPreview),
    urlImagen: normalizarRutaMedia(doc.urlImagen)
  };
}

function pareceVideo(url) {
  const s = String(url || '').toLowerCase();
  return /\.(mp4|webm|ogg|m4v|mov)(\?|#|$)/.test(s);
}

function pareceAudio(url) {
  const s = String(url || '').toLowerCase();
  return /\.(mp3|mpeg|wav|aac|m4a|flac|oga|ogg|webm)(\?|#|$)/.test(s);
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
    if (pareceAudio(completa)) return { urlMedia: preview || completa, urlMediaCompleta: completa };
    if (pareceAudio(preview)) return { urlMedia: preview, urlMediaCompleta: completa || preview };
    const unico = String(completa || preview || '').trim();
    if (unico) return { urlMedia: preview || unico, urlMediaCompleta: completa || preview || unico };
  }
  return { urlMedia: preview, urlMediaCompleta: completa };
}

function toDoc(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  const base = { id: o._id.toString(), ...o, _id: undefined };
  return normalizarDocMedia(base);
}

function normalizarClaveUsuario(valor) {
  return String(valor || '').trim().toLowerCase();
}

async function enriquecerComentariosAcceso(items) {
  if (!Array.isArray(items) || items.length === 0) return items;
  const ids = new Set();
  const nombresRaw = new Set();

  items.forEach((it) => {
    const comentarios = Array.isArray(it?.comentarios) ? it.comentarios : [];
    comentarios.forEach((c) => {
      if (!c || typeof c !== 'object') return;
      const id = c.usuarioId || c.userId || c.uid || '';
      const nombre = c.usuario || c.username || '';
      if (id) ids.add(String(id));
      if (nombre) nombresRaw.add(String(nombre).trim());
    });
  });

  if (ids.size === 0 && nombresRaw.size === 0) return items;

  const usuarios = await Usuario.find({
    $or: [
    ...(ids.size > 0 ? [{ _id: { $in: Array.from(ids) } }] : []),
    ...(nombresRaw.size > 0 ?
    [{
      $or: Array.from(nombresRaw).map((nombre) => ({
        username: { $regex: `^${nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
      }))
    }] :
    [])]

  }).
  select('_id username rol nivelAcceso').
  lean();

  const porId = new Map();
  const porUsername = new Map();
  usuarios.forEach((u) => {
    const id = String(u?._id || '');
    const username = normalizarClaveUsuario(u?.username);
    if (id) porId.set(id, u);
    if (username) porUsername.set(username, u);
  });

  return items.map((it) => {
    const comentarios = Array.isArray(it?.comentarios) ? it.comentarios : null;
    if (!comentarios) return it;
    const nuevos = comentarios.map((c) => {
      if (!c || typeof c !== 'object') return c;
      const id = String(c.usuarioId || c.userId || c.uid || '');
      const username = normalizarClaveUsuario(c.usuario || c.username);
      const usuario = id && porId.get(id) || username && porUsername.get(username);
      if (!usuario) return c;
      return {
        ...c,

        rol: usuario.rol || c.rol || 'fan',
        nivelAcceso: usuario.nivelAcceso || c.nivelAcceso || 'fan'
      };
    });
    return { ...it, comentarios: nuevos };
  });
}

router.get('/', authMiddleware, requireThugOrAdmin, async (req, res) => {
  try {
    const lista = await ContenidoExclusivo.find().sort({ fechaPublicacion: -1 }).limit(50).lean();
    const items = lista.map((d) => normalizarDocMedia({ id: d._id.toString(), ...d, _id: undefined }));
    res.json(await enriquecerComentariosAcceso(items));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


router.get('/feed', authMiddleware, async (req, res) => {
  try {
    const lista = await ContenidoExclusivo.find({
      nivelRequerido: 'fan',
      visible: true
    }).
    sort({ fechaPublicacion: -1 }).
    limit(50).
    lean();
    const items = lista.map((d) => normalizarDocMedia({ id: d._id.toString(), ...d, _id: undefined }));
    res.json(await enriquecerComentariosAcceso(items));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


router.get('/feed-unificado', authMiddleware, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.userId).lean();
    const esThugOAdmin = usuario && (usuario.nivelAcceso === 'thug' || usuario.rol === 'admin');
    const lista = await ContenidoExclusivo.find({ visible: true }).
    sort({ fechaPublicacion: -1 }).
    limit(80).
    lean();
    const items = lista.map((d) => {
      const id = d._id.toString();
      const nivelRequerido = d.nivelRequerido || 'thug';
      const base = normalizarDocMedia({ id, ...d, _id: undefined });
      if (!esThugOAdmin && nivelRequerido === 'thug') {
        const numeroComentarios = Array.isArray(base.comentarios) ?
        base.comentarios.length :
        base.numeroComentarios ?? 0;
        const urlImagen = normalizarRutaMedia(base.urlImagen || '');
        const urlMedia = normalizarRutaMedia(base.urlMedia || '');
        return {
          id: base.id,
          titulo: base.titulo,
          tipoContenido: base.tipoContenido || 'articulo',
          fechaPublicacion: base.fechaPublicacion,
          fechaActualizacion: base.fechaActualizacion,
          numeroVistas: base.numeroVistas ?? 0,
          numeroLikes: base.numeroLikes ?? 0,
          numeroComentarios,
          nivelRequerido: 'thug',
          bloqueado: true,
          /** Preview en feed (velado en cliente). Sin URL completa para no exponer el archivo principal. */
          urlMedia,
          urlImagen,
          imagenUrl: urlImagen,
          previewTexto: base.previewTexto || '',
          descripcion: base.descripcion || '',
          complementario: base.complementario || '',
          destacado: Boolean(base.destacado),
          categoria: base.categoria || '',
          etiquetas: Array.isArray(base.etiquetas) ? base.etiquetas : []
        };
      }
      return { ...base, nivelRequerido, bloqueado: false };
    });
    res.json(await enriquecerComentariosAcceso(items));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', authMiddleware, requireThugOrAdmin, async (req, res) => {
  try {
    const doc = await ContenidoExclusivo.findById(req.params.id);
    if (!doc) return res.json(null);
    const [item] = await enriquecerComentariosAcceso([toDoc(doc)]);
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


router.post('/:id/vista', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || req.user?._id?.toString?.();
    const desdeAperturaModal = req.body?.desdeAperturaModal === true;
    const doc = await ContenidoExclusivo.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'No encontrado' });

    if (!desdeAperturaModal && userId && Array.isArray(doc.vistasUsuarios) && doc.vistasUsuarios.includes(userId)) {
      return res.json({ numeroVistas: doc.numeroVistas });
    }

    const update = { $inc: { numeroVistas: 1 } };
    if (userId && !desdeAperturaModal) {
      update.$addToSet = { vistasUsuarios: userId };
    }

    const actualizado = await ContenidoExclusivo.findByIdAndUpdate(req.params.id, update, {
      new: true
    });
    res.json({ numeroVistas: actualizado.numeroVistas });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


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


router.post('/:id/comentarios', authMiddleware, async (req, res) => {
  try {
    const texto = typeof req.body?.texto === 'string' ? req.body.texto.trim() : '';
    if (!texto) return res.status(400).json({ error: 'Falta el texto del comentario' });

    const docPrevio = await ContenidoExclusivo.findById(req.params.id).lean();
    if (!docPrevio) return res.status(404).json({ error: 'No encontrado' });
    const usuarioComenta = await Usuario.findById(req.userId).lean();
    const puedeComentarThug =
    usuarioComenta &&
    (usuarioComenta.nivelAcceso === 'thug' || usuarioComenta.rol === 'admin');
    if ((docPrevio.nivelRequerido || 'thug') === 'thug' && !puedeComentarThug) {
      return res.status(403).json({ error: 'Solo usuarios Thug pueden comentar este contenido' });
    }

    let usuarioNombre = 'Anónimo';
    let usuarioRol = 'fan';
    let usuarioNivelAcceso = 'fan';
    try {
      const usuario = await Usuario.findById(req.userId).lean();
      if (usuario) {
        usuarioNombre = usuario.username || usuario.nombreCompleto || usuario.email || usuarioNombre;
        usuarioRol = usuario.rol || 'fan';
        usuarioNivelAcceso = usuario.nivelAcceso || 'fan';
      }
    } catch {

    }

    const nuevoComentario = {
      usuarioId: req.userId,
      usuario: usuarioNombre,
      rol: usuarioRol,
      nivelAcceso: usuarioNivelAcceso,
      texto,
      fecha: new Date()
    };

    const doc = await ContenidoExclusivo.findByIdAndUpdate(
      req.params.id,
      { $push: { comentarios: nuevoComentario } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'No encontrado' });
    res.json({
      comentarios: doc.comentarios || [],
      numeroComentarios: (doc.comentarios || []).length
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const b = req.body && typeof req.body === 'object' && req.body.data && typeof req.body.data === 'object' ?
    req.body.data :
    req.body || {};
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



    let urlMedia = normalizarRutaMedia(typeof b.urlMedia === 'string' ? b.urlMedia : '');
    let urlMediaCompleta = normalizarRutaMedia(typeof b.urlMediaCompleta === 'string' ? b.urlMediaCompleta : '');
    if (b.mediaPreviewBase64) {
      urlMedia = (await guardarMediaBase64(b.mediaPreviewBase64, 'preview')) || '';
    }
    if (b.mediaCompletaBase64) {
      urlMediaCompleta = (await guardarMediaBase64(b.mediaCompletaBase64, 'completa')) || '';
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
      fechaActualizacion: new Date()
    };
    const [item] = await ContenidoExclusivo.create([payload]);
    console.log('[contenido-exclusivo POST] guardado keys:', Object.keys(item.toObject ? item.toObject() : item));
    try {
      await crearNotificacionParaTodos({
        tipo: 'nuevo_contenido',
        titulo: 'Nuevo contenido publicado',
        mensaje: item?.titulo ? `Se publicó: ${item.titulo}` : 'Hay nuevo contenido disponible.',
        entidadId: item?._id?.toString?.()
      });
      const usuarios = await Usuario.find({
        activo: { $ne: false },
        aceptaNotificaciones: { $ne: false },
        expoPushTokens: { $exists: true, $ne: [] }
      }).
      select('expoPushTokens').
      lean();
      const tokens = usuarios.flatMap((u) => Array.isArray(u.expoPushTokens) ? u.expoPushTokens : []);
      if (tokens.length > 0) {
        await enviarPush(tokens, {
          title: 'Nuevo contenido publicado',
          body: item?.titulo ? `Se publicó: ${item.titulo}` : 'Hay nuevo contenido disponible.',
          data: { tipo: 'nuevo_contenido', entidadId: item?._id?.toString?.() || '' }
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
    const b = req.body && typeof req.body === 'object' && req.body.data && typeof req.body.data === 'object' ?
    req.body.data :
    req.body || {};
    console.log('[contenido-exclusivo PUT] body keys:', Object.keys(b).join(', '));
    const existing = await ContenidoExclusivo.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ error: 'No encontrado' });


    let urlMedia = normalizarRutaMedia(existing.urlMedia ?? '');
    let urlMediaCompleta = normalizarRutaMedia(existing.urlMediaCompleta ?? '');


    if (b.mediaPreviewBase64) {
      urlMedia = (await guardarMediaBase64(b.mediaPreviewBase64, 'preview')) || urlMedia;
    }
    if (b.mediaCompletaBase64) {
      urlMediaCompleta = (await guardarMediaBase64(b.mediaCompletaBase64, 'completa')) || urlMediaCompleta;
    }
    if (!b.mediaPreviewBase64 && typeof b.urlMedia === 'string') {
      urlMedia = normalizarRutaMedia(b.urlMedia);
    }
    if (!b.mediaCompletaBase64 && typeof b.urlMediaCompleta === 'string') {
      urlMediaCompleta = normalizarRutaMedia(b.urlMediaCompleta);
    }


    if (b.clearPreview) {
      urlMedia = '';
    }
    if (b.clearMedia) {
      urlMediaCompleta = '';
    }

    const oldMedia = normalizarRutaMedia(existing.urlMedia ?? '');
    const oldCompleta = normalizarRutaMedia(existing.urlMediaCompleta ?? '');

    const tipoContenidoFinal =
    typeof b.tipoContenido === 'string' && b.tipoContenido.trim() ?
    b.tipoContenido.trim() :
    existing.tipoContenido;
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
      typeof b.nivelRequerido === 'string' && b.nivelRequerido.trim() ?
      b.nivelRequerido.trim() :
      existing.nivelRequerido,
      categoria: typeof b.categoria === 'string' ? b.categoria.trim() : existing.categoria,
      etiquetas: Array.isArray(b.etiquetas) ? b.etiquetas : existing.etiquetas,
      visible: b.visible !== undefined ? b.visible !== false : existing.visible !== false,
      destacado: b.destacado !== undefined ? Boolean(b.destacado) : Boolean(existing.destacado),
      fechaActualizacion: new Date()
    };

    const newMedia = normalizarRutaMedia(mediaFinal.urlMedia);
    const newCompleta = normalizarRutaMedia(mediaFinal.urlMediaCompleta);
    const urlsObsoletas = [];
    if (oldMedia && oldMedia !== newMedia) urlsObsoletas.push(oldMedia);
    if (oldCompleta && oldCompleta !== newCompleta) urlsObsoletas.push(oldCompleta);

    await ContenidoExclusivo.updateOne({ _id: req.params.id }, { $set });
    if (urlsObsoletas.length > 0) {
      await firebaseStorage.deleteMediaUrls(urlsObsoletas);
    }
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
    const o = doc.toObject ? doc.toObject() : doc;
    await firebaseStorage.deleteMediaUrls([
      o.urlMedia,
      o.urlMediaCompleta,
      o.urlMediaPreview,
      o.urlImagen
    ]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;