import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
  Image,
  Dimensions,
  Modal,
  TextInput,
  Pressable,
  useWindowDimensions } from
'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEventListener } from 'expo';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useVideoPlayer, VideoView } from 'expo-video';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import {
  listarEventosPublicos,
  listarPublicaciones,
  listarFeedUnificado,
  listarContenidoExclusivoFeed,
  leerContenidoExclusivo,
  registrarVistaContenido,
  darLikeContenido,
  agregarComentarioContenido } from
'../servicios/api';
import { puedeVerContenidoExclusivo } from '../constantes/nivelesAcceso';
import { useAuth } from '../contexto/AuthContext';
import { getBaseUrl } from '../config/api';
import HeaderAppConMenu from '../componentes/HeaderAppConMenu';
import { AdSenseFeedCard, puedeMostrarAnunciosFeedEnWeb } from '../componentes/AdSenseWeb';

const FONDO_THUGS = require('../../assets/fondo-thugs.png');

if (typeof document !== 'undefined' && Platform.OS === 'web') {
  const id = 'st-modal-media-scrollbar-none';
  if (!document.getElementById(id)) {
    const s = document.createElement('style');
    s.id = id;
    s.textContent =
    '[data-st-modal-media-scroll="1"]{scrollbar-width:none;-ms-overflow-style:none;}' +
    '[data-st-modal-media-scroll="1"]::-webkit-scrollbar{width:0!important;height:0!important;display:none!important;}';
    document.head.appendChild(s);
  }
}

function absolutizarRutaMedia(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (s.startsWith('data:')) return s;

  const base = getBaseUrl();

  if (s.startsWith('http://') || s.startsWith('https://')) {
    try {
      const u = new URL(s);
      const path = `${u.pathname || ''}${u.search || ''}${u.hash || ''}`;

      if (path.startsWith('/uploads')) {
        return `${base}${path}`;
      }
      return s;
    } catch {
      return s;
    }
  }

  return base + (s.startsWith('/') ? s : `/${s}`);
}

function itemMediaUrlPrincipal(item) {
  return (
    item?.urlMediaCompleta ||
    item?.urlMedia ||
    item?.urlMediaPreview ||
    item?.imagenUrl ||
    item?.urlImagen ||
    null
  );
}

function itemMediaUrlVistaPrevia(item) {
  return item?.urlMedia || item?.urlMediaPreview || item?.imagenUrl || item?.urlImagen || null;
}

/** Ruta de objeto decodificada en URLs de Firebase Storage (`.../o/<encoded>`). */
function firebaseStorageDecodedObjectPath(url) {
  const s = String(url || '').trim();
  if (!s.toLowerCase().includes('firebasestorage.googleapis.com')) return '';
  try {
    const u = new URL(s);
    const parts = u.pathname.split('/o/');
    if (!parts[1]) return '';
    return decodeURIComponent(parts[1]);
  } catch {
    return '';
  }
}

function urlPareceArchivoVideo(url) {
  const s = String(url || '').toLowerCase();
  if (!s) return false;
  if (/\.(mp4|webm|ogg|m4v|mov)(\?|#|$)/i.test(s)) return true;
  if (s.startsWith('data:video/')) return true;
  const dec = firebaseStorageDecodedObjectPath(url).toLowerCase();
  if (dec && /\.(mp4|webm|ogg|m4v|mov)(\?|#|$)/i.test(dec)) return true;
  return false;
}

function urlPareceArchivoAudio(url) {
  const s = String(url || '').toLowerCase();
  if (!s) return false;
  if (/\.(mp3|mpeg|wav|aac|m4a|flac|oga|ogg|webm|opus)(\?|#|$)/.test(s)) return true;
  if (s.startsWith('data:audio/')) return true;
  const dec = firebaseStorageDecodedObjectPath(url).toLowerCase();
  if (dec && /\.(mp3|mpeg|wav|aac|m4a|flac|oga|ogg|webm|opus)(\?|#|$)/i.test(dec)) return true;
  return false;
}

function urlPareceArchivoImagen(url) {
  const s = String(url || '').toLowerCase();
  if (!s) return false;
  if (/\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?|#|$)/i.test(s)) return true;
  if (s.startsWith('data:image/')) return true;
  const dec = firebaseStorageDecodedObjectPath(url).toLowerCase();
  if (dec && /\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?|#|$)/i.test(dec)) return true;
  return false;
}

function elegirUrlReproducible(item, tipoDetectado) {
  const urlCompleta = String(item?.urlMediaCompleta || '').trim();
  const urlPreview = String(
    item?.urlMedia || item?.urlMediaPreview || item?.imagenUrl || item?.urlImagen || ''
  ).trim();
  if (tipoDetectado === 'video') {
    if (urlPareceArchivoVideo(urlCompleta)) return urlCompleta;
    if (urlPareceArchivoVideo(urlPreview)) return urlPreview;
    return urlCompleta || urlPreview || '';
  }
  if (tipoDetectado === 'audio') {
    if (urlPareceArchivoAudio(urlCompleta)) return urlCompleta;
    if (urlPareceArchivoAudio(urlPreview)) return urlPreview;
    return urlCompleta || urlPreview || '';
  }
  return urlPreview || urlCompleta || '';
}

/** True si hay URL resuelta para abrir el modal (p. ej. solo `urlMediaCompleta` sin preview en tarjeta). */
function itemTieneUrlParaModal(item) {
  const previewUrl = itemMediaUrlVistaPrevia(item);
  const mediaUrl = itemMediaUrlPrincipal(item);
  if (!mediaUrl && !previewUrl) return false;
  const tipo = clasificarMedia(item, mediaUrl);
  const urlCruda = elegirUrlReproducible(item, tipo);
  return !!absolutizarRutaMedia(urlCruda);
}

/** Artículo con título o cuerpo, aunque no haya archivo (solo texto en el feed). */
function itemPuedeAbrirModalLecturaArticulo(item) {
  const mediaUrl = itemMediaUrlPrincipal(item);
  if (clasificarMedia(item, mediaUrl) !== 'articulo') return false;
  const tit = String(item?.titulo || '').trim();
  const cuerpo = String(item?.previewTexto || item?.descripcion || '').trim();
  return !!(tit || cuerpo);
}

function itemPuedeAbrirModalDesdeTituloODesc(item) {
  return itemTieneUrlParaModal(item) || itemPuedeAbrirModalLecturaArticulo(item);
}

function clasificarMedia(item, urlAValidar) {
  const tipo = String(item?.tipoContenido || item?.tipo || '').toLowerCase().trim();
  const src = String(
    urlAValidar ||
    item?.urlMediaCompleta ||
    item?.urlMedia ||
    item?.urlMediaPreview ||
    item?.imagenUrl ||
    item?.urlImagen ||
    ''
  ).toLowerCase();

  if (tipo === 'video' && urlPareceArchivoImagen(src)) {
    return 'imagen';
  }
  if (tipo === 'video' || tipo === 'audio' || tipo === 'imagen') return tipo;
  if (urlPareceArchivoVideo(src)) return 'video';
  if (urlPareceArchivoAudio(src)) return 'audio';
  if (urlPareceArchivoImagen(src)) return 'imagen';
  return 'articulo';
}

/** Texto en tarjeta del feed: primer párrafo + "…" si sigue más cuerpo (párrafo o lista). */
function textoVistaPreviaFeed(textoCompleto) {
  const raw = String(textoCompleto || '').replace(/\r\n/g, '\n');
  const s = raw.trim();
  if (!s) return '';

  const partes = s.split(/\n\s*\n/);
  if (partes.length > 1) {
    const primero = partes[0].trim();
    return primero ? `${primero}…` : s;
  }

  const lineas = s.split('\n');
  if (lineas.length >= 2) {
    const segunda = lineas[1] ?? '';
    if (/^\s*(?:[-*•]|\d+[\.)])\s/.test(segunda)) {
      const primero = lineas[0].trim();
      return primero ? `${primero}…` : s;
    }
  }

  return s;
}

function tiempoRelativo(fecha) {
  if (!fecha || !(fecha instanceof Date)) return '';
  const now = new Date();
  const seg = Math.floor((now - fecha) / 1000);
  if (seg < 60) return 'Hace un momento';
  const min = Math.floor(seg / 60);
  if (min < 60) return min === 1 ? 'Hace 1 min' : `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return h === 1 ? 'Hace 1 hora' : `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return d === 1 ? 'Hace 1 día' : `Hace ${d} días`;
  const m = Math.floor(d / 30);
  if (m < 12) return m === 1 ? 'Hace 1 mes' : `Hace ${m} meses`;
  const y = Math.floor(d / 365);
  return y === 1 ? 'Hace 1 año' : `Hace ${y} años`;
}

function etiquetaNivelComentario(comentario) {
  if (!comentario || typeof comentario !== 'object') return '';
  const rol = String(
    comentario.rol ??
    comentario.rolUsuario ??
    comentario.tipoUsuario ??
    ''
  ).toLowerCase().trim();
  const nivel = String(
    comentario.nivelAcceso ??
    comentario.nivel ??
    comentario.accessLevel ??
    ''
  ).toLowerCase().trim();
  if (rol === 'admin') return 'Admin';
  if (nivel === 'thug' || rol === 'thug') return 'Thug';
  return '';
}





function VideoModalPlayerWeb({ src, poster, videoRef, onAspectKnown, onEnded, onVideoError }) {
  const setRef = (el) => {
    if (videoRef && typeof videoRef === 'object' && 'current' in videoRef) {
      videoRef.current = el;
    }

    if (el && typeof el.style !== 'undefined') {
      el.style.display = 'block';
      el.style.flex = '1 1 auto';
      el.style.alignSelf = 'stretch';
      el.style.width = '100%';
      el.style.height = '100%';
      el.style.minWidth = '0';
      el.style.minHeight = '0';
      el.style.maxWidth = '100%';
      el.style.maxHeight = '100%';
      el.style.objectFit = 'contain';
      el.style.objectPosition = 'center center';
      el.style.backgroundColor = '#000';
    }
  };
  return React.createElement('video', {
    ref: setRef,
    src,
    poster: poster || undefined,
    controls: true,
    playsInline: true,
    muted: true,
    autoPlay: true,
    preload: 'auto',
    style: {
      display: 'block',
      flex: 1,
      alignSelf: 'stretch',
      width: '100%',
      height: '100%',
      minWidth: 0,
      minHeight: 0,
      maxWidth: '100%',
      maxHeight: '100%',
      objectFit: 'contain',
      objectPosition: 'center center',
      backgroundColor: '#000'
    },
    onLoadedMetadata: (e) => {
      const v = e?.currentTarget;
      if (v?.videoWidth && v?.videoHeight) {
        onAspectKnown(v.videoWidth / v.videoHeight);
      }
    },
    onError: (e) => {
      const err = e?.currentTarget?.error;
      const code = err?.code;
      const msg =
      code === 1 ? 'Carga interrumpida' :
      code === 2 ? 'Error de red' :
      code === 3 ? 'No se pudo decodificar el vídeo' :
      code === 4 ? 'Formato no soportado o URL inválida' :
      'No se pudo cargar el vídeo';
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[VideoModal]', msg, src, err);
      }
      onVideoError?.(msg);
    },
    onEnded: onEnded
  });
}


function VideoModalPlayerNative({ uri, style, playerRef, onAspectKnown, onEnded, onVideoError }) {
  const player = useVideoPlayer(uri, (p) => {
    p.play();
  });

  useEffect(() => {
    if (playerRef && typeof playerRef === 'object' && 'current' in playerRef) {
      playerRef.current = player;
    }
    return () => {
      if (playerRef && typeof playerRef === 'object' && 'current' in playerRef) {
        playerRef.current = null;
      }
    };
  }, [player, playerRef]);

  useEventListener(player, 'sourceLoad', (payload) => {
    const tracks = payload?.availableVideoTracks;
    const t = Array.isArray(tracks) ? tracks[0] : null;
    const w = t?.size?.width;
    const h = t?.size?.height;
    if (w && h) onAspectKnown?.(w / h);
  });

  useEventListener(player, 'playToEnd', () => {
    onEnded?.();
  });

  useEventListener(player, 'statusChange', ({ status, error }) => {
    if (status === 'error' && error?.message) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[VideoModal native]', error.message, uri);
      }
      onVideoError?.(error.message);
    }
  });

  return (
    <VideoView
      player={player}
      style={style}
      nativeControls
      contentFit="contain"
      {...Platform.OS === 'android' ? { surfaceType: 'textureView' } : {}}
    />
  );
}

function formatTiempoAudio(segundos) {
  if (segundos == null || !Number.isFinite(segundos) || segundos < 0) return '0:00';
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Reproductor de audio en el modal (misma zona que imagen/vídeo; expo-audio en todas las plataformas). */
function ModalAudioPlayer({ uri }) {
  const url = String(uri || '').trim();
  if (!url) return null;
  const player = useAudioPlayer(url, { updateInterval: 400, downloadFirst: true });
  const status = useAudioPlayerStatus(player);
  const playing = Boolean(status?.playing);

  return (
    <View style={modalAudioEstilos.caja}>
      <View style={modalAudioEstilos.fila}>
        <TouchableOpacity
          onPress={() => {
            if (playing) player.pause();
            else player.play();
          }}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Pausar' : 'Reproducir'}>
          
          <Ionicons name={playing ? 'pause-circle' : 'play-circle'} size={56} color="#00dc57" />
        </TouchableOpacity>
        <View style={modalAudioEstilos.meta}>
          <Ionicons name="musical-notes" size={22} color="#888" style={{ marginBottom: 6 }} />
          <Text style={modalAudioEstilos.tiempo}>
            {formatTiempoAudio(status?.currentTime)} / {formatTiempoAudio(status?.duration)}
          </Text>
        </View>
      </View>
    </View>);

}

const modalAudioEstilos = StyleSheet.create({
  caja: {
    width: '100%',
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    maxWidth: 420
  },
  meta: { flex: 1, minWidth: 0, justifyContent: 'center' },
  tiempo: { color: '#aaa', fontSize: 13, fontVariant: ['tabular-nums'] }
});

/** Tarjeta del feed: vídeo en silencio; altura según el vídeo (web: height auto). */
function CardFeedVideoPreviewWeb({ uri, velado }) {
  return React.createElement('video', {
    src: uri,
    muted: true,
    playsInline: true,
    autoPlay: true,
    loop: true,
    controls: false,
    disablePictureInPicture: true,
    style: {
      width: '100%',
      height: 'auto',
      display: 'block',
      verticalAlign: 'top',
      objectFit: 'contain',
      backgroundColor: '#000',
      pointerEvents: 'none',
      borderRadius: 10,
      ...(velado ? { filter: 'blur(14px)', transform: 'scale(1.04)' } : null)
    }
  });
}

function CardFeedVideoPreviewNative({ uri, velado }) {
  const [ar, setAr] = useState(16 / 9);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  useEventListener(player, 'sourceLoad', (payload) => {
    const tracks = payload?.availableVideoTracks;
    const t = Array.isArray(tracks) ? tracks[0] : null;
    const w = t?.size?.width;
    const h = t?.size?.height;
    if (w && h && w > 0 && h > 0) setAr(w / h);
  });

  return (
    <View style={{ width: '100%', aspectRatio: ar }}>
      <VideoView
        player={player}
        style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
        nativeControls={false}
        contentFit="cover"
        {...Platform.OS === 'android' ? { surfaceType: 'textureView' } : {}}
      />
      {velado ?
      <BlurView
        intensity={100}
        tint="dark"
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        pointerEvents="none"
        style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' }} /> :
      null}
    </View>
  );
}

/** Imagen del feed: ancho completo, alto intrínseco (sin caja fija 220). */
function ContenidoFeedImgWeb({ uri, velado }) {
  return React.createElement('img', {
    src: uri,
    alt: '',
    draggable: false,
    style: {
      width: '100%',
      height: 'auto',
      display: 'block',
      verticalAlign: 'top',
      borderRadius: 10,
      ...(velado ? { filter: 'blur(14px)', transform: 'scale(1.04)' } : null)
    }
  });
}

function ContenidoFeedImgNative({ uri, velado }) {
  const [ratio, setRatio] = useState(null);

  useEffect(() => {
    if (!uri) return undefined;
    let cancel = false;
    setRatio(null);
    Image.getSize(
      uri,
      (w, h) => {
        if (!cancel && w > 0 && h > 0) setRatio(w / h);
      },
      () => {}
    );
    return () => {
      cancel = true;
    };
  }, [uri]);

  const blur = velado ? (Platform.OS === 'ios' ? 20 : 28) : 0;

  return (
    <View
      style={
      ratio != null ?
      { width: '100%', aspectRatio: ratio } :
      { width: '100%', minHeight: 140, aspectRatio: 16 / 9 }
      }>
      
      <Image
        source={{ uri }}
        style={{ width: '100%', height: '100%' }}
        resizeMode={velado ? 'cover' : 'contain'}
        blurRadius={blur} />
      
    </View>
  );
}

/** Feed: audio siempre con icono de nota; no se usa imagen en `urlMedia` aunque sea JPG/PNG. */
function CardFeedAudioPreviewTarjeta() {
  return (
    <View style={feedAudioPreviewEstilos.caja}>
      <Ionicons name="musical-notes" size={52} color="#00dc57" />
    </View>);

}

const feedAudioPreviewEstilos = StyleSheet.create({
  /** Interior sin borde: el marco verde va en `cardPreviewImgCardAudioFeed` (mismo radio que el preview). */
  caja: {
    width: '100%',
    minHeight: 200,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center'
  }
});

export default function ContenidoGeneral({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { perfil, cerrarSesion, cargando: authCargando } = useAuth();
  const { height: ventanaAlto, width: ventanaAncho } = useWindowDimensions();
  const esWeb = Platform.OS === 'web';
  const esNavegadorMovilWeb = (() => {
    if (!esWeb || typeof navigator === 'undefined') return false;
    return /android|iphone|ipad|ipod|iemobile|mobile|opera mini/i.test(
      String(navigator.userAgent || '')
    );
  })();

  const esWebMovil = esWeb && (esNavegadorMovilWeb || ventanaAncho < 820);
  const esWebDesktop = esWeb && !esWebMovil;

  const esModalWebApilado = esWeb && (esNavegadorMovilWeb || ventanaAncho < 980);
  const scrollRef = useRef(null);
  const [eventos, setEventos] = useState([]);
  const [publicaciones, setPublicaciones] = useState([]);
  const [contenidoUnificado, setContenidoUnificado] = useState([]);
  const [ubicacion, setUbicacion] = useState(null);
  const [refrescando, setRefrescando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [detalleErrorDev, setDetalleErrorDev] = useState('');
  const [comentarioItem, setComentarioItem] = useState(null);
  const [comentarioTexto, setComentarioTexto] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [mediaItem, setMediaItem] = useState(null);
  const [mediaUrlSeleccionada, setMediaUrlSeleccionada] = useState(null);
  const [mediaAspectRatio, setMediaAspectRatio] = useState(null);
  const [videoTerminado, setVideoTerminado] = useState(false);
  const videoRef = useRef(null);
  const webVideoRef = useRef(null);
  const [likesHechos, setLikesHechos] = useState(() => new Set());
  const cardLayoutsRef = useRef(new Map());
  const vistasHechasRef = useRef(new Set());
  const vistasGuardandoRef = useRef(new Set());
  const rafScrollRef = useRef(null);
  const regresarAMediaRef = useRef(null);
  const abrirMediaEnModalRef = useRef(null);

  const getId = (obj) => obj?.id ?? obj?._id?.toString?.() ?? obj?._id;

  const firmaIdsFeed = useMemo(
    () => contenidoUnificado.map((x) => String(getId(x) ?? '')).join(','),
    [contenidoUnificado]
  );

  const indicesAnuncioTrasTarjeta = useMemo(() => {
    const set = new Set();
    if (!puedeMostrarAnunciosFeedEnWeb()) return set;
    const n = contenidoUnificado.length;
    if (n < 2) return set;
    let i = -1;
    while (i < n - 1) {
      const gap = 3 + Math.floor(Math.random() * 6);
      i += gap;
      if (i < n - 1) set.add(i);
    }
    return set;
  }, [firmaIdsFeed]);

  const getUsuarioKey = () => String(getId(perfil) ?? perfil?.email ?? perfil?.nombreUsuario ?? 'anon');
  const getLikesStorageKey = () => `somos_thugs_likes_${getUsuarioKey()}`;
  const getVistasStorageKey = () => `somos_thugs_vistas_${getUsuarioKey()}`;

  const normalizarLink = (raw) => {
    const s = String(raw || '').trim();
    if (!s) return null;

    if (s.startsWith('http://') || s.startsWith('https://')) return s;

    if (s.startsWith('/') || s.startsWith('data:')) return null;

    if (!s.includes(' ') && s.includes('.')) return `https://${s}`;
    return null;
  };

  useEffect(() => {
    if (!authCargando && !perfil) {
      navigation.replace('Inicio');
    }
  }, [perfil, authCargando, navigation]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        if (!perfil) return;
        const raw = await AsyncStorage.getItem(getLikesStorageKey());
        const arr = raw ? JSON.parse(raw) : [];
        if (!cancel && Array.isArray(arr)) {
          setLikesHechos(new Set(arr.map((x) => String(x))));
        }
      } catch (_) {
        if (!cancel) setLikesHechos(new Set());
      }
    })();
    return () => {cancel = true;};
  }, [perfil]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        if (!perfil) return;
        const raw = await AsyncStorage.getItem(getVistasStorageKey());
        const arr = raw ? JSON.parse(raw) : [];
        if (!cancel && Array.isArray(arr)) {
          vistasHechasRef.current = new Set(arr.map((x) => String(x)));
        } else if (!cancel) {
          vistasHechasRef.current = new Set();
        }
      } catch (_) {
        if (!cancel) vistasHechasRef.current = new Set();
      }
    })();
    return () => {cancel = true;};
  }, [perfil]);

  const withTimeout = (promise, ms = 12000) =>
  Promise.race([
  promise,
  new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Tiempo de espera agotado.')), ms)
  )]
  );

  const cargarDatos = async () => {
    setErrorCarga('');
    setDetalleErrorDev('');
    setCargando(true);
    try {
      const [resEventos, resPublicaciones, resFeed, resFeedFan] = await Promise.allSettled([
      withTimeout(listarEventosPublicos()),
      withTimeout(listarPublicaciones()),
      withTimeout(listarFeedUnificado()),
      withTimeout(listarContenidoExclusivoFeed())]
      );
      setEventos(
        resEventos.status === 'fulfilled' && Array.isArray(resEventos.value) ? resEventos.value : []
      );
      setPublicaciones(
        resPublicaciones.status === 'fulfilled' && Array.isArray(resPublicaciones.value) ?
        resPublicaciones.value :
        []
      );
      const feedUnificado =
      resFeed.status === 'fulfilled' && Array.isArray(resFeed.value) ? resFeed.value : [];
      const feedFan =
      resFeedFan.status === 'fulfilled' && Array.isArray(resFeedFan.value) ? resFeedFan.value : [];
      const fallbackPublicaciones =
      resPublicaciones.status === 'fulfilled' && Array.isArray(resPublicaciones.value) ?
      resPublicaciones.value :
      [];
      const fallbackEventos =
      resEventos.status === 'fulfilled' && Array.isArray(resEventos.value) ? resEventos.value : [];
      const contenidoFinal =
      feedUnificado.length > 0 ?
      feedUnificado :
      feedFan.length > 0 ?
      feedFan :
      [...fallbackPublicaciones, ...fallbackEventos];
      const listaNormalizada = Array.isArray(contenidoFinal) ?
      contenidoFinal.filter((x) => x && typeof x === 'object') :
      [];
      setContenidoUnificado((prev) => {
        if (listaNormalizada.length > 0) return listaNormalizada;

        return Array.isArray(prev) ? prev : [];
      });
      if (resFeed.status === 'rejected') {
        console.warn('Feed unificado:', resFeed.reason);
      }
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        const partes = [];
        partes.push(
          `items feed-unificado: ${
          resFeed.status === 'fulfilled' && Array.isArray(resFeed.value) ? resFeed.value.length : 0}`

        );
        partes.push(
          `items feed-fan: ${
          resFeedFan.status === 'fulfilled' && Array.isArray(resFeedFan.value) ? resFeedFan.value.length : 0}`

        );
        if (resEventos.status === 'rejected') partes.push(`eventos: ${resEventos.reason?.message || 'error'}`);
        if (resPublicaciones.status === 'rejected') partes.push(`publicaciones: ${resPublicaciones.reason?.message || 'error'}`);
        if (resFeed.status === 'rejected') partes.push(`feed: ${resFeed.reason?.message || 'error'}`);
        if (resFeedFan.status === 'rejected') partes.push(`feed-fan: ${resFeedFan.reason?.message || 'error'}`);
        setDetalleErrorDev(partes.join(' | '));
      }
      const todasFallaron =
      resEventos.status === 'rejected' &&
      resPublicaciones.status === 'rejected' &&
      resFeed.status === 'rejected' &&
      resFeedFan.status === 'rejected';
      if (todasFallaron) {
        setErrorCarga('No se pudo cargar el contenido. Revisa servidor/API y vuelve a intentar.');
      }
    } catch (e) {
      console.warn(e);
      setErrorCarga('No se pudo cargar el contenido.');
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        setDetalleErrorDev(e?.message || 'error desconocido');
      }
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (authCargando || !perfil) return;
    cargarDatos();
  }, [perfil, authCargando]);

  const pedirUbicacion = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso', 'Activa la ubicación.');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    setUbicacion(loc.coords);
  };

  const abrirMapa = (lat, lng) => {
    if (!lat || !lng) return;
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    Linking.openURL(url);
  };

  const onRefresh = async () => {
    setRefrescando(true);
    await cargarDatos();
    setRefrescando(false);
  };

  const abrirContenido = async (item) => {
    const mediaUrl = itemMediaUrlPrincipal(item);
    if (!mediaUrl) {
      Alert.alert('Archivo', 'No hay enlace disponible.');
      return;
    }
    const url = absolutizarRutaMedia(mediaUrl);
    if (!url) {
      Alert.alert('Archivo', 'No hay enlace disponible.');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Archivo', e?.message || 'No se pudo abrir el archivo.');
    }
  };

  const abrirMediaEnModal = async (item) => {
    if (itemTieneUrlParaModal(item)) {
      const mediaUrl = itemMediaUrlPrincipal(item);
      const tipo = clasificarMedia(item, mediaUrl);
      const urlCruda = elegirUrlReproducible(item, tipo);
      const urlVisual = absolutizarRutaMedia(urlCruda);
      if (!urlVisual) return;
      const id = getId(item);
      if (id) {
        registrarVistaPorClickModal(id);
      }
      setMediaItem(
        id ?
        { ...(item || {}), numeroVistas: (item?.numeroVistas ?? 0) + 1 } :
        item
      );
      setMediaUrlSeleccionada(urlVisual);
      return;
    }
    if (!itemPuedeAbrirModalLecturaArticulo(item)) return;
    const idSoloTexto = getId(item);
    if (idSoloTexto) {
      registrarVistaPorClickModal(idSoloTexto);
    }
    setMediaItem(
      idSoloTexto ?
      { ...(item || {}), numeroVistas: (item?.numeroVistas ?? 0) + 1 } :
      item
    );
    setMediaUrlSeleccionada(null);
  };

  abrirMediaEnModalRef.current = abrirMediaEnModal;

  useEffect(() => {
    const raw = route.params?.contenidoId;
    if (!raw || authCargando || cargando) return undefined;
    const idStr = String(raw).trim();
    if (!idStr) return undefined;
    navigation.setParams({ contenidoId: undefined });
    let cancelled = false;
    (async () => {
      try {
        const inFeed = contenidoUnificado.find((x) => String(getId(x)) === idStr);
        let item = inFeed || null;
        if (!item) {
          item = await leerContenidoExclusivo(idStr);
        }
        if (cancelled || !item) return;
        await abrirMediaEnModalRef.current?.(item);
      } catch (_) {

      }
    })();
    return () => {cancelled = true;};
  }, [route.params?.contenidoId, authCargando, cargando, navigation, contenidoUnificado]);

  const cerrarMediaModal = () => {
    if (Platform.OS === 'web' && webVideoRef.current) {
      try {
        webVideoRef.current.pause();
      } catch (_) {

      }
    }
    if (Platform.OS !== 'web' && videoRef.current) {
      try {
        videoRef.current.pause();
      } catch (_) {

      }
    }
    setMediaItem(null);
    setMediaUrlSeleccionada(null);
    setMediaAspectRatio(null);
    setVideoTerminado(false);
  };

  useEffect(() => {
    setVideoTerminado(false);
  }, [mediaUrlSeleccionada]);

  const onLike = async (item) => {
    const id = getId(item);
    if (!id) return;
    if (likesHechos.has(String(id))) return;
    const valorAnterior = item.numeroLikes ?? 0;
    const valorNuevo = valorAnterior + 1;
    setLikesHechos((prev) => {
      const next = new Set(prev);
      next.add(String(id));
      return next;
    });
    setContenidoUnificado((prev) =>
    prev.map((it) => {
      const itId = getId(it);
      return itId === id ? { ...it, numeroLikes: valorNuevo } : it;
    })
    );
    setMediaItem((prev) =>
    prev && (prev.id === id || prev._id === id) ?
    { ...prev, numeroLikes: valorNuevo } :
    prev
    );
    try {
      const res = await darLikeContenido(id);
      const totalServidor = res?.numeroLikes;
      if (typeof totalServidor === 'number' && totalServidor >= valorNuevo) {
        setContenidoUnificado((prev) =>
        prev.map((it) => {
          const itId = getId(it);
          return itId === id ? { ...it, numeroLikes: totalServidor } : it;
        })
        );
        setMediaItem((prev) =>
        prev && (prev.id === id || prev._id === id) ?
        { ...prev, numeroLikes: totalServidor } :
        prev
        );
      }
      try {
        const key = getLikesStorageKey();
        await AsyncStorage.setItem(key, JSON.stringify(Array.from(new Set([...likesHechos, String(id)]))));
      } catch (_) {

      }
    } catch (e) {
      console.warn('Like:', e);
      setLikesHechos((prev) => {
        const next = new Set(prev);
        next.delete(String(id));
        return next;
      });
      setContenidoUnificado((prev) =>
      prev.map((it) => {
        const itId = getId(it);
        return itId === id ? { ...it, numeroLikes: valorAnterior } : it;
      })
      );
      setMediaItem((prev) =>
      prev && (prev.id === id || prev._id === id) ?
      { ...prev, numeroLikes: valorAnterior } :
      prev
      );
    }
  };

  const likeVisualContenido = (item) => {
    const id = String(getId(item) ?? '');
    const yaLike = Boolean(id && likesHechos.has(id));
    return {
      yaLike,
      icon: yaLike ? 'heart' : 'heart-outline',
      color: yaLike ? '#00dc57' : '#888'
    };
  };

  const likeMediaModal = mediaItem ?
  likeVisualContenido(mediaItem) :
  { yaLike: false, icon: 'heart-outline', color: '#888' };

  const abrirComentarios = (item) => {
    const id = getId(item);
    if (!id) return;


    const payload = { ...(item || {}), id: String(id) };
    setComentarioTexto('');
    if (mediaItem) {
      regresarAMediaRef.current = payload;
      cerrarMediaModal();
      setTimeout(() => {
        setComentarioItem(payload);
      }, 50);
      return;
    }
    regresarAMediaRef.current = null;
    setComentarioItem(payload);
  };

  const cerrarComentarioModal = () => {
    setComentarioItem(null);
    setComentarioTexto('');
  };

  const enviarComentario = async () => {
    if (!comentarioItem || !comentarioTexto.trim()) return;
    setEnviandoComentario(true);
    try {
      const res = await agregarComentarioContenido(comentarioItem.id, comentarioTexto.trim());
      const nuevaLista = Array.isArray(res?.comentarios) ? res.comentarios : [];
      const total = res?.numeroComentarios ?? nuevaLista.length;
      const idCom = String(comentarioItem.id);
      setContenidoUnificado((prev) =>
      prev.map((it) => {
        const itId = String(getId(it) ?? '');
        return itId === idCom ? { ...it, comentarios: nuevaLista, numeroComentarios: total } : it;
      })
      );
      setMediaItem((prev) => {
        if (!prev) return prev;
        const prevId = String(getId(prev) ?? '');
        return prevId === idCom ?
        { ...prev, comentarios: nuevaLista, numeroComentarios: total } :
        prev;
      });
      const volverItem = regresarAMediaRef.current;
      const baseItem = volverItem || comentarioItem;
      const mergedForModal = {
        ...baseItem,
        id: idCom,
        comentarios: nuevaLista,
        numeroComentarios: total
      };
      cerrarComentarioModal();
      regresarAMediaRef.current = null;
      setTimeout(() => {
        abrirMediaEnModal(mergedForModal);
      }, 50);
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo enviar el comentario.');
    } finally {
      setEnviandoComentario(false);
    }
  };

  const actualizarVistasLocal = (itemId, { sumar = false, totalServidor } = {}) => {
    if (!itemId) return;
    const idStr = String(itemId);
    setContenidoUnificado((prev) =>
    prev.map((it) => {
      const itId = String(getId(it) ?? '');
      if (itId !== idStr) return it;
      const actual = it.numeroVistas ?? 0;
      const nuevo = typeof totalServidor === 'number' ? totalServidor : sumar ? actual + 1 : actual;
      return nuevo === actual ? it : { ...it, numeroVistas: nuevo };
    })
    );
    setMediaItem((prev) => {
      if (!prev) return prev;
      const prevId = String(getId(prev) ?? '');
      if (prevId !== idStr) return prev;
      const actual = prev.numeroVistas ?? 0;
      const nuevo = typeof totalServidor === 'number' ? totalServidor : sumar ? actual + 1 : actual;
      return nuevo === actual ? prev : { ...prev, numeroVistas: nuevo };
    });
  };

  const registrarVistaSiAplica = async (itemId) => {
    if (!itemId) return;
    const idStr = String(itemId);
    if (vistasHechasRef.current.has(idStr)) return;
    if (vistasGuardandoRef.current.has(idStr)) return;
    vistasGuardandoRef.current.add(idStr);
    vistasHechasRef.current.add(idStr);
    try {
      const res = await registrarVistaContenido(idStr);
      const totalServidor = res?.numeroVistas;
      if (typeof totalServidor === 'number') {
        actualizarVistasLocal(idStr, { totalServidor });
      } else {
        actualizarVistasLocal(idStr, { sumar: true });
      }
      try {
        const key = getVistasStorageKey();
        const raw = await AsyncStorage.getItem(key);
        const arr = raw ? JSON.parse(raw) : [];
        const next = Array.isArray(arr) ? new Set(arr.map((x) => String(x))) : new Set();
        next.add(idStr);
        await AsyncStorage.setItem(key, JSON.stringify(Array.from(next)));
      } catch (_) {

      }
    } catch (e) {
      console.warn('Vista no registrada:', e);
      vistasHechasRef.current.delete(idStr);
    } finally {
      vistasGuardandoRef.current.delete(idStr);
    }
  };


  const registrarVistaPorClickModal = async (itemId) => {
    if (!itemId) return;
    const idStr = String(itemId);
    actualizarVistasLocal(idStr, { sumar: true });
    try {
      const res = await registrarVistaContenido(idStr, { desdeAperturaModal: true });
      const totalServidor = res?.numeroVistas;
      if (typeof totalServidor === 'number') {
        actualizarVistasLocal(idStr, { totalServidor });
      }
    } catch (e) {
      console.warn('Vista por clic modal no registrada:', e);
      setMediaItem((prev) => {
        if (!prev || String(getId(prev) ?? '') !== idStr) return prev;
        const actual = prev.numeroVistas ?? 0;
        return actual > 0 ? { ...prev, numeroVistas: actual - 1 } : prev;
      });
      setContenidoUnificado((prev) =>
      prev.map((it) => {
        const itId = String(getId(it) ?? '');
        if (itId !== idStr) return it;
        const v = it.numeroVistas ?? 0;
        return v > 0 ? { ...it, numeroVistas: v - 1 } : it;
      })
      );
    }
  };

  const onScroll = (e) => {
    const y = e?.nativeEvent?.contentOffset?.y ?? 0;
    const h = e?.nativeEvent?.layoutMeasurement?.height ?? 0;
    if (!h) return;
    if (rafScrollRef.current) return;
    rafScrollRef.current = requestAnimationFrame(() => {
      rafScrollRef.current = null;
      const top = y;
      const bottom = y + h;
      cardLayoutsRef.current.forEach((pos, id) => {
        if (!pos) return;
        const itemTop = pos.y ?? 0;
        const itemBottom = itemTop + (pos.height ?? 0);
        const interTop = Math.max(top, itemTop);
        const interBottom = Math.min(bottom, itemBottom);
        const visible = Math.max(0, interBottom - interTop);
        const ratio = pos.height ? visible / pos.height : 0;
        if (ratio >= 0.55) {
          registrarVistaSiAplica(id);
        }
      });
    });
  };

  const alturaFondoNativo =
  !esWeb ?
  Dimensions.get('window').height - (insets.top + 8 + 48) + insets.bottom :
  null;

  const tipoModalAbierto = mediaItem ?
  clasificarMedia(mediaItem, mediaUrlSeleccionada) :
  '';
  const usarVideoEnModal =
  tipoModalAbierto === 'video' && urlPareceArchivoVideo(mediaUrlSeleccionada);
  const usarAudioEnModal = tipoModalAbierto === 'audio' && !!String(mediaUrlSeleccionada || '').trim();
  const mostrarZonaMediaVisualEnModal =
  !!mediaUrlSeleccionada &&
  (tipoModalAbierto === 'imagen' ||
  tipoModalAbierto === 'video' && urlPareceArchivoVideo(mediaUrlSeleccionada) ||
  usarAudioEnModal);
  /** Recuadro de media: el audio no necesita la misma altura que imagen/vídeo. */
  const modalAudioAltoCajaApilado = Math.min(ventanaAlto * 0.15, 124);
  const modalAudioAltoCajaFila =
  esWebDesktop ? Math.min(ventanaAlto * 0.15, 148) : Math.min(ventanaAlto * 0.17, 132);
  const modalAudioAltoCajaEscritorioDer = Math.min(ventanaAlto * 0.15, 136);
  /** Aire entre la caja negra del reproductor y el panel gris (acciones / comentarios). */
  const modalAudioMargenInferiorCaja = Platform.OS === 'web' ? 22 : 18;
  const modalLayoutArticuloLectura =
  !!mediaItem &&
  tipoModalAbierto === 'articulo' &&
  !mostrarZonaMediaVisualEnModal;
  /** Escritorio web: imagen/vídeo en columna derecha (como artículo), no a pantalla completa a la izquierda. */
  const modalEscritorioWebMediaEnColumnaDer =
  esWeb && !esModalWebApilado && mostrarZonaMediaVisualEnModal;
  const modalOcultarTituloDescCabecera =
  modalLayoutArticuloLectura || modalEscritorioWebMediaEnColumnaDer;
  const modalColDerAnchoPlenoCondicion =
  !mostrarZonaMediaVisualEnModal &&
  !(modalLayoutArticuloLectura && esWeb && !esModalWebApilado);
  const posterModalVideoAbs = esWeb && mediaItem && usarVideoEnModal && mediaItem.urlMedia ?
  absolutizarRutaMedia(mediaItem.urlMedia) :
  null;
  const posterModalVideoWeb =
  posterModalVideoAbs && mediaUrlSeleccionada && posterModalVideoAbs !== mediaUrlSeleccionada ?
  posterModalVideoAbs :
  undefined;

  return (
    <View style={estilos.contenedor}>
      <HeaderAppConMenu
        navigation={navigation}
        scrollRef={scrollRef}
        esVistaContenidoFeed
        tituloCentro="Contenido"
      />
      <View style={estilos.areaContenido}>
        <View
          style={[
          estilos.fondoAbsoluto,
          alturaFondoNativo != null && {
            top: 0,
            bottom: undefined,
            height: alturaFondoNativo
          }]
          }
          pointerEvents="none">
          
          <Image
            source={FONDO_THUGS}
            style={[
            estilos.fondoImagen,
            alturaFondoNativo != null && {
              bottom: undefined,
              height: alturaFondoNativo
            }]
            }
            resizeMode={Platform.OS === 'web' ? 'cover' : 'repeat'} />
          
      </View>
      <ScrollView
          ref={scrollRef}
          style={estilos.scroll}
          contentContainerStyle={[
          estilos.scrollContenido,
          esWebMovil && estilos.scrollContenidoWebMovil]
          }
          refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor="#00dc57" />
          }
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}>
          
          <View style={estilos.contenidoSobreFondo}>
            <View style={[estilos.contenidoCentrado, esWebMovil && estilos.contenidoCentradoWebMovil]}>
        {ubicacion &&
              <View style={estilos.card}>
            <Text style={estilos.cardTitulo}>Tu ubicación</Text>
            <Text style={estilos.cardTexto}>
              Lat: {ubicacion.latitude.toFixed(4)}, Lng: {ubicacion.longitude.toFixed(4)}
            </Text>
          </View>
              }

            {cargando &&
              <View style={estilos.estadoCargaCaja}>
                <ActivityIndicator color="#00dc57" />
                <Text style={estilos.estadoCargaTexto}>Cargando contenido...</Text>
              </View>
              }
            {!cargando && !!errorCarga &&
              <View style={estilos.estadoErrorCaja}>
                <Text style={estilos.estadoErrorTexto}>{errorCarga}</Text>
                {typeof __DEV__ !== 'undefined' && __DEV__ && !!detalleErrorDev ?
                <Text style={estilos.estadoErrorDetalleDev}>{detalleErrorDev}</Text> :
                null}
                <TouchableOpacity style={estilos.estadoErrorBoton} onPress={cargarDatos}>
                  <Text style={estilos.estadoErrorBotonTexto}>Reintentar</Text>
                </TouchableOpacity>
              </View>
              }
            {contenidoUnificado.length === 0 && !cargando &&
              <View style={estilos.vacioCaja}>
                <Text style={estilos.vacio}>Sin contenido aún.</Text>
                <Text style={estilos.vacioHint}>
                  Desliza hacia abajo para actualizar.
                </Text>
              </View>
              }
            {contenidoUnificado.flatMap((item, idx) => {
                const itemId = getId(item) || `${item?.titulo || 'item'}-${idx}`;
                const bloqueado =
                item.bloqueado === true ||
                item.nivelRequerido === 'thug' &&
                !puedeVerContenidoExclusivo(perfil?.nivelAcceso, perfil?.rol);
                const previewUrl = itemMediaUrlVistaPrevia(item);
                const mediaUrl = itemMediaUrlPrincipal(item);
                const urlPrimera = previewUrl || mediaUrl;
                const urlCompleta = urlPrimera ? absolutizarRutaMedia(urlPrimera) : null;
                const mostrarPreview = !!urlCompleta || bloqueado;
                const vistas = item.numeroVistas ?? 0;
                const likes = item.numeroLikes ?? 0;
                const likeV = likeVisualContenido(item);
                const numComentarios = item.numeroComentarios ?? (Array.isArray(item.comentarios) ? item.comentarios.length : 0);
                const tipo = clasificarMedia(item, mediaUrl);
                const esVideo = tipo === 'video';
                const videoPreviewAbs =
                esVideo ?
                (() => {
                  if (previewUrl && urlPareceArchivoImagen(previewUrl)) return null;
                  const candidates = [
                  previewUrl,
                  String(item.urlMediaCompleta || '').trim(),
                  String(item.urlMedia || '').trim(),
                  String(item.urlMediaPreview || '').trim(),
                  String(item.imagenUrl || item.urlImagen || '').trim()].
                  filter(Boolean);
                  for (const c of candidates) {
                    if (urlPareceArchivoVideo(c)) {
                      const abs = absolutizarRutaMedia(c);
                      if (abs) return abs;
                    }
                  }
                  return null;
                })() :
                null;
                const textoPrincipal = item.previewTexto || item.descripcion || '';
                const textoPrincipalFeed = textoVistaPreviaFeed(textoPrincipal);
                const previewUrlStr = String(previewUrl || '').trim();
                const thumbImagenFeed =
                tipo !== 'audio' &&
                !!urlCompleta &&
                urlPareceArchivoImagen(previewUrlStr);
                const imagenPreviewBloqueadaAbs =
                bloqueado ?
                (() => {
                  const candidates = [
                  previewUrl,
                  String(item.imagenUrl || item.urlImagen || '').trim(),
                  String(item.urlMediaPreview || '').trim(),
                  String(item.urlMedia || '').trim()].
                  filter(Boolean);
                  for (const c of candidates) {
                    if (urlPareceArchivoImagen(c)) {
                      const abs = absolutizarRutaMedia(c);
                      if (abs) return abs;
                    }
                  }
                  return null;
                })() :
                null;
                const usarImagenTarjetaFeed = thumbImagenFeed || bloqueado && !!imagenPreviewBloqueadaAbs;
                const uriImagenTarjetaFeed = thumbImagenFeed ? urlCompleta : imagenPreviewBloqueadaAbs;
                const ocultarDescripcionFeedContenidoThug =
                bloqueado && (tipo === 'articulo' || tipo === 'audio');
                const complementario = item.complementario || '';
                const etiquetasArr = Array.isArray(item.etiquetas) ? item.etiquetas : [];
                const categoria = item.categoria || '';
                const fechaPub = item.fechaPublicacion ? new Date(item.fechaPublicacion) : null;
                const textoFecha = fechaPub ? tiempoRelativo(fechaPub) : '';
                const abrirModalDesdeTexto =
                !bloqueado && itemPuedeAbrirModalDesdeTituloODesc(item);
                const tarjeta = (
                  <View
                    key={itemId}
                    style={estilos.cardContenedor}
                    onLayout={(ev) => {
                      const id = getId(item);
                      if (!id) return;
                      const { y, height } = ev?.nativeEvent?.layout ?? {};
                      if (typeof y !== 'number' || typeof height !== 'number') return;
                      cardLayoutsRef.current.set(String(id), { y, height });

                      if (height > 0 && y >= 0) {

                      }
                    }}>
                    
                  <View style={estilos.card}>
                    {}
                    <View style={estilos.cardHeader}>
                      <View style={estilos.cardTipoBadge}>
                        <Ionicons
                            name={
                            esVideo ? 'videocam' :
                            tipo === 'audio' ? 'musical-notes' :
                            tipo === 'imagen' ? 'image' :
                            'document-text'
                            }
                            size={14}
                            color="#00dc57" />
                          
                        <Text style={estilos.cardTipoTexto}>
                          {tipo}
                        </Text>
                      </View>
                      <View style={estilos.cardHeaderRight}>
                        {item.destacado &&
                          <Text style={estilos.cardDestacadoBadge}>Destacado</Text>
                          }
                        {item.nivelRequerido === 'thug' &&
                          <Text style={estilos.cardThugBadge}>Zona Thug</Text>
                          }
                      </View>
                    </View>
                    {abrirModalDesdeTexto ?
                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => abrirMediaEnModal(item)}
                        style={estilos.cardTituloTouchable}>
                        
                        <Text style={estilos.cardTitulo}>{item.titulo || 'Sin título'}</Text>
                      </TouchableOpacity> :
                      <Text style={estilos.cardTitulo}>{item.titulo || 'Sin título'}</Text>}
                    <View style={estilos.cardCuerpo}>
                      {!ocultarDescripcionFeedContenidoThug && textoPrincipalFeed ?
                      abrirModalDesdeTexto ?
                        <TouchableOpacity
                          activeOpacity={0.75}
                          onPress={() => abrirMediaEnModal(item)}
                          style={estilos.cardTextoTouchable}>
                          
                          <Text style={estilos.cardTexto}>{String(textoPrincipalFeed)}</Text>
                        </TouchableOpacity> :
                        <Text style={estilos.cardTexto}>{String(textoPrincipalFeed)}</Text> :
                      null}

                      {(() => {
                        if (ocultarDescripcionFeedContenidoThug) return null;
                        const comp = String(complementario || '').trim();
                        const compLink = comp ? normalizarLink(comp) : null;

                        if (!comp) return null;

                        return compLink ?
                        <Text
                          style={estilos.cardComplementarioEnlace}
                          onPress={() => Linking.openURL(compLink)}>
                          {comp}
                        </Text> :
                        <Text style={estilos.cardComplementario}>{comp}</Text>;
                      })()}

                      {categoria ?
                        <View style={estilos.cardMetaRow}>
                          <Text style={estilos.cardCategoria}>Categoría: {String(categoria)}</Text>
                        </View> :
                        null}

                      {mostrarPreview ?
                        <TouchableOpacity
                          style={[
                          estilos.cardPreviewImgCard,
                          tipo === 'audio' && !bloqueado && estilos.cardPreviewImgCardAudioFeed]
                          }
                          onPress={() => bloqueado ? null : abrirMediaEnModal(item)}
                          activeOpacity={bloqueado ? 1 : 0.9}
                          disabled={bloqueado}>
                          
                          {videoPreviewAbs ?
                          Platform.OS === 'web' ?
                          <CardFeedVideoPreviewWeb uri={videoPreviewAbs} velado={bloqueado} /> :
                          <CardFeedVideoPreviewNative uri={videoPreviewAbs} velado={bloqueado} /> :
                          tipo === 'audio' && !bloqueado ?
                          <CardFeedAudioPreviewTarjeta /> :
                          usarImagenTarjetaFeed && !!uriImagenTarjetaFeed ?
                          Platform.OS === 'web' ?
                          <ContenidoFeedImgWeb uri={uriImagenTarjetaFeed} velado={bloqueado} /> :
                          <ContenidoFeedImgNative uri={uriImagenTarjetaFeed} velado={bloqueado} /> :

                          <Image
                            source={FONDO_THUGS}
                            style={[
                            estilos.cardPreviewPlaceholderFondo,
                            bloqueado && estilos.cardPreviewPlaceholderFondoBlurWeb]
                            }
                            resizeMode="cover"
                            blurRadius={bloqueado ? Platform.OS === 'ios' ? 20 : 28 : 0} />
                          }
                          
                          {bloqueado ?
                          <View pointerEvents="none" style={estilos.cardPreviewObfuscador}>
                              <View style={estilos.cardPreviewLeyendaCaja}>
                                <Text style={estilos.cardPreviewLeyendaTitulo}>Para ver contenido Thug</Text>
                                <Text style={estilos.cardPreviewLeyendaSub}>
                                  Primero debes subir de nivel
                                </Text>
                              </View>
                            </View> :
                          null}
                          {esVideo && !bloqueado ?
                          <View style={estilos.cardPlayOverlay}>
                              <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
                            </View> :
                          null}
                        </TouchableOpacity> :
                        null}

                      {textoFecha || etiquetasArr.length > 0 ?
                        <View style={estilos.cardFechaEtiquetas}>
                          {textoFecha ? <Text style={estilos.cardMeta}>{String(textoFecha)}</Text> : null}
                          {etiquetasArr.length > 0 ?
                          <Text style={estilos.cardEtiquetasLinea}>
                              Etiquetas: {etiquetasArr.join(', ')}
                            </Text> :
                          null}
                        </View> :
                        null}

                      <View style={estilos.cardAcciones}>
                        <View style={estilos.cardAccionItem}>
                          <Ionicons name="eye-outline" size={18} color="#888" />
                          <Text style={estilos.cardAccionNumero}>{vistas}</Text>
                        </View>
                        <TouchableOpacity
                            style={estilos.cardAccionItem}
                            onPress={() => onLike(item)}
                            activeOpacity={0.7}
                            disabled={likeV.yaLike}>
                            
                          <Ionicons name={likeV.icon} size={20} color={likeV.color} />
                          <Text style={estilos.cardAccionNumero}>{likes}</Text>
                        </TouchableOpacity>
                        {bloqueado ?
                        <View style={[estilos.cardAccionItem, estilos.cardAccionItemInactiva]}>
                            <Ionicons name="chatbubble-outline" size={18} color="#555" />
                            <Text style={estilos.cardAccionNumero}>{numComentarios}</Text>
                          </View> :

                        <TouchableOpacity
                            style={estilos.cardAccionItem}
                            onPress={() => abrirComentarios(item)}
                            activeOpacity={0.7}>
                            
                          <Ionicons name="chatbubble-outline" size={18} color="#888" />
                          <Text style={estilos.cardAccionNumero}>{numComentarios}</Text>
                        </TouchableOpacity>
                        }
                      </View>
                    </View>
                  </View>
                </View>);

                if (!indicesAnuncioTrasTarjeta.has(idx)) return [tarjeta];
                return [
                tarjeta,
                <View key={`ad-${itemId}-${idx}`} style={estilos.cardContenedor}>
                    <AdSenseFeedCard instanceKey={`feed-${String(itemId)}-${idx}`} />
                  </View>];

              })}
            </View>
          </View>
        </ScrollView>
      </View>

      <Modal
        visible={!!mediaItem}
        transparent
        animationType="fade"
        onRequestClose={cerrarMediaModal}>
        
        <View style={estilos.modalMediaFondo}>
          <Pressable style={estilos.modalBackdrop} onPress={cerrarMediaModal} />
          <View style={estilos.modalMediaCaja}>
            {mediaItem &&
            <>
                <View
                  style={[
                  estilos.modalMediaCabecera,
                  Platform.OS === 'web' && !esModalWebApilado && estilos.modalMediaCabeceraWebEscritorio,
                  Platform.OS === 'web' && esModalWebApilado && estilos.modalMediaCabeceraWebApilado]}>
                  <View style={estilos.modalMediaHeader}>
                    <View style={estilos.cardTipoBadge}>
                      <Ionicons
                      name={
                      usarVideoEnModal ?
                      'videocam' :
                      tipoModalAbierto === 'audio' ?
                      'musical-notes' :
                      tipoModalAbierto === 'imagen' ?
                      'image' :
                      'document-text'
                      }
                      size={14}
                      color="#00dc57" />
                    
                      <Text style={estilos.cardTipoTexto}>
                        {mediaItem.tipoContenido || mediaItem.tipo || 'articulo'}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={cerrarMediaModal} style={estilos.modalMediaCerrar}>
                      <Ionicons name="close" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  {!modalOcultarTituloDescCabecera ?
                  <>
                      <Text style={estilos.modalMediaTituloTop}>{mediaItem.titulo || 'Sin título'}</Text>
                      {mediaItem.previewTexto || mediaItem.descripcion ?
                    <Text style={estilos.modalMediaDescripcionTop}>
                          {mediaItem.previewTexto || mediaItem.descripcion}
                        </Text> :
                    null}
                    </> :
                  null}
                </View>
                <ScrollView
                  style={estilos.modalMediaCuerpoScroll}
                  contentContainerStyle={[
                  estilos.modalMediaCuerpoScrollContenido,
                  Platform.OS === 'web' && !esModalWebApilado && estilos.modalMediaCuerpoScrollContenidoWebEscritorio,
                  Platform.OS === 'web' && esModalWebApilado && estilos.modalMediaCuerpoScrollContenidoWebApilado,
                  Platform.OS !== 'web' && estilos.modalMediaCuerpoScrollContenidoNativoModal]}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  ref={(r) => {
                    if (Platform.OS !== 'web' || !r || typeof r.getScrollableNode !== 'function') return;
                    try {
                      const node = r.getScrollableNode();
                      if (node && node.setAttribute) node.setAttribute('data-st-modal-media-scroll', '1');
                    } catch (_) {

                    }
                  }}>
                {esModalWebApilado ?
              <View style={estilos.modalMediaFlujoApilado}>
                    {modalLayoutArticuloLectura ?
                  <View style={estilos.modalArticuloColTextoApilado}>
                      <Text style={estilos.modalArticuloTituloEnCuerpo}>
                          {mediaItem.titulo || 'Sin título'}
                        </Text>
                      {mediaItem.previewTexto || mediaItem.descripcion ?
                    <Text style={estilos.modalArticuloDescripcionEnCuerpo}>
                          {mediaItem.previewTexto || mediaItem.descripcion}
                        </Text> :
                    null}
                    </View> :
                  null}
                    {mostrarZonaMediaVisualEnModal ?
                  <View style={estilos.modalMediaZonaVideoApilada}>
                  <View
                    style={[
                    estilos.cardPreviewImgModal,
                    estilos.cardPreviewImgModalWebMovil,
                    {
                      height: usarAudioEnModal ?
                      modalAudioAltoCajaApilado :
                      Math.min(ventanaAlto * 0.4, 340),
                      ...(usarAudioEnModal ? { marginBottom: modalAudioMargenInferiorCaja } : null)
                    }]
                    }>
                    
                          <View style={estilos.mediaCenterBox}>
                            {usarVideoEnModal ?
                      Platform.OS === 'web' ?
                      <VideoModalPlayerWeb
                        key={mediaUrlSeleccionada}
                        src={mediaUrlSeleccionada}
                        poster={posterModalVideoWeb}
                        videoRef={webVideoRef}
                        onAspectKnown={(ar) => setMediaAspectRatio(ar)}
                        onEnded={() => setVideoTerminado(true)}
                        onVideoError={(msg) =>
                        Alert.alert(
                          'Vídeo',
                          `${msg}\n\nPrueba reproducir de nuevo o usa «Abrir archivo».`
                        )
                        } /> :


                      <VideoModalPlayerNative
                        key={mediaUrlSeleccionada}
                        uri={mediaUrlSeleccionada}
                        playerRef={videoRef}
                        style={[
                        estilos.cardPreviewVideo,
                        {
                          maxHeight: '100%',
                          maxWidth: '100%',
                          aspectRatio: mediaAspectRatio || 16 / 9
                        }]
                        }
                        onAspectKnown={(ar) => setMediaAspectRatio(ar)}
                        onEnded={() => setVideoTerminado(true)}
                        onVideoError={(msg) =>
                        Alert.alert(
                          'Vídeo',
                          `${msg}\n\nPrueba reproducir de nuevo o usa «Abrir archivo».`
                        )
                        } /> :
                      usarAudioEnModal ?
                      <ModalAudioPlayer key={`${mediaUrlSeleccionada}-audio`} uri={mediaUrlSeleccionada} /> :


                      <Image
                        source={{ uri: mediaUrlSeleccionada }}
                        style={[
                        estilos.cardPreviewImgInner,
                        Platform.OS === 'web' ?
                        {
                          display: 'block',
                          alignSelf: 'center',
                          width: '100%',
                          height: '100%',
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                          objectPosition: 'center center'
                        } :
                        {
                          maxHeight: '100%',
                          maxWidth: '100%',
                          aspectRatio: mediaAspectRatio || 16 / 9
                        }]
                        }
                        resizeMode="contain"
                        onLoad={(e) => {
                          const w = e?.nativeEvent?.source?.width;
                          const h = e?.nativeEvent?.source?.height;
                          if (w && h) {
                            setMediaAspectRatio(w / h);
                          }
                        }} />

                      }
                          </View>
                          {videoTerminado && usarVideoEnModal ?
                    <Pressable
                      style={estilos.videoReplayOverlay}
                      onPress={async () => {
                        setVideoTerminado(false);
                        if (Platform.OS === 'web') {
                          const el = webVideoRef.current;
                          if (el) {
                            el.currentTime = 0;
                            try {
                              await el.play();
                            } catch (_) {

                            }
                          }
                          return;
                        }
                        try {
                          const p = videoRef.current;
                          if (p) {
                            p.replay();
                            p.play();
                          }
                        } catch (_) {

                        }
                      }}>
                      
                              <View style={estilos.videoReplayBoton}>
                                <Ionicons name="refresh" size={22} color="#000" />
                                <Text style={estilos.videoReplayTexto}>Reproducir</Text>
                              </View>
                            </Pressable> :
                    null}
                        </View>
                  </View> :
                  null}
                    <View
                      style={[
                      estilos.modalMediaColDerMobile,
                      esWeb && estilos.modalMediaColDerMobileWebApilado,
                      modalColDerAnchoPlenoCondicion && estilos.modalMediaColDerAnchoPleno]}>
                      <View style={estilos.modalAccionesFilaMobile}>
                        <View style={[estilos.cardAcciones, estilos.cardAccionesSinBorde]}>
                          <View style={estilos.cardAccionItem}>
                            <Ionicons name="eye-outline" size={18} color="#888" />
                            <Text style={estilos.cardAccionNumero}>
                              {mediaItem.numeroVistas ?? 0}
                            </Text>
                          </View>
                          <TouchableOpacity
                        style={estilos.cardAccionItem}
                        onPress={() => onLike(mediaItem)}
                        activeOpacity={0.7}
                        disabled={likeMediaModal.yaLike}>
                        
                            <Ionicons name={likeMediaModal.icon} size={20} color={likeMediaModal.color} />
                            <Text style={estilos.cardAccionNumero}>
                              {mediaItem.numeroLikes ?? 0}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                        style={estilos.cardAccionItem}
                        onPress={() => abrirComentarios(mediaItem)}
                        activeOpacity={0.7}>
                        
                            <Ionicons name="chatbubble-outline" size={18} color="#888" />
                            <Text style={estilos.cardAccionNumero}>
                              {Array.isArray(mediaItem.comentarios) ? mediaItem.comentarios.length : mediaItem.numeroComentarios ?? 0}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        {itemMediaUrlPrincipal(mediaItem) ?
                    <TouchableOpacity
                      style={estilos.modalAbrirArchivo}
                      onPress={() => abrirContenido(mediaItem)}>
                      
                            <Ionicons name="open-outline" size={16} color="#00dc57" />
                            <Text style={estilos.modalAbrirArchivoTexto}>Abrir archivo</Text>
                          </TouchableOpacity> :
                    null}
                      </View>
                      <View
                        style={[
                        estilos.modalComentariosMobile,
                        mostrarZonaMediaVisualEnModal && estilos.modalComentariosTrasMedia]}>
                        <Text style={estilos.modalComentariosTitulo}>Comentarios</Text>
                        {Array.isArray(mediaItem.comentarios) && mediaItem.comentarios.length > 0 ?
                    <View style={estilos.modalComentariosLista}>
                            {mediaItem.comentarios.map((c, idx) => {
                        const esObjeto = c && typeof c === 'object';
                        const texto = esObjeto ? c.texto || '' : String(c || '');
                        const usuario = esObjeto ? c.usuario || '' : '';
                        if (!texto) return null;
                        return (
                          <View key={idx} style={estilos.modalComentarioCaja}>
                                  {usuario ?
                            <View style={estilos.modalComentarioUsuarioFila}>
                                      <Text style={estilos.modalComentarioUsuario}>{usuario}</Text>
                                      {etiquetaNivelComentario(c) ?
                              <Text style={estilos.modalComentarioNivel}>
                                          {etiquetaNivelComentario(c)}
                                        </Text> :
                              null}
                                    </View> :
                            null}
                                  <Text style={estilos.modalComentarioItem}>{texto}</Text>
                                </View>);

                      })}
                          </View> :

                    <View style={estilos.modalComentariosVacioMobile}>
                            <Text style={estilos.modalComentarioVacio}>Sé el primero en comentar.</Text>
                          </View>
                    }
                      </View>
                    </View>
                  </View> :

              <View style={estilos.modalMediaCuerpoRow}>
                  {modalLayoutArticuloLectura || modalEscritorioWebMediaEnColumnaDer ?
                  <View style={estilos.modalArticuloColTexto}>
                      <Text style={estilos.modalArticuloTituloEnCuerpo}>
                          {mediaItem.titulo || 'Sin título'}
                        </Text>
                      {mediaItem.previewTexto || mediaItem.descripcion ?
                    <Text style={estilos.modalArticuloDescripcionEnCuerpo}>
                          {mediaItem.previewTexto || mediaItem.descripcion}
                        </Text> :
                    null}
                    </View> :
                  null}
                  {mostrarZonaMediaVisualEnModal && !modalEscritorioWebMediaEnColumnaDer ?
                  <View style={estilos.modalMediaColMedia}>
                  <View
                    style={[
                    estilos.cardPreviewImgModal,
                    {
                      height: usarAudioEnModal ?
                      modalAudioAltoCajaFila :
                      esWebDesktop ?
                      ventanaAlto * 0.78 :
                      ventanaAlto * 0.45,
                      ...(usarAudioEnModal ? { marginBottom: modalAudioMargenInferiorCaja } : null)
                    }]
                    }>
                    
                        <View style={estilos.mediaCenterBox}>
                          {usarVideoEnModal ?
                      Platform.OS === 'web' ?
                      <VideoModalPlayerWeb
                        key={mediaUrlSeleccionada}
                        src={mediaUrlSeleccionada}
                        poster={posterModalVideoWeb}
                        videoRef={webVideoRef}
                        onAspectKnown={(ar) => setMediaAspectRatio(ar)}
                        onEnded={() => setVideoTerminado(true)}
                        onVideoError={(msg) =>
                        Alert.alert(
                          'Vídeo',
                          `${msg}\n\nPrueba reproducir de nuevo o usa «Abrir archivo».`
                        )
                        } /> :


                      <VideoModalPlayerNative
                        key={mediaUrlSeleccionada}
                        uri={mediaUrlSeleccionada}
                        playerRef={videoRef}
                        style={[
                        estilos.cardPreviewVideo,
                        {
                          maxHeight: '100%',
                          maxWidth: '100%',
                          aspectRatio: mediaAspectRatio || 16 / 9
                        }]
                        }
                        onAspectKnown={(ar) => setMediaAspectRatio(ar)}
                        onEnded={() => setVideoTerminado(true)}
                        onVideoError={(msg) =>
                        Alert.alert(
                          'Vídeo',
                          `${msg}\n\nPrueba reproducir de nuevo o usa «Abrir archivo».`
                        )
                        } /> :
                      usarAudioEnModal ?
                      <ModalAudioPlayer key={`${mediaUrlSeleccionada}-audio`} uri={mediaUrlSeleccionada} /> :


                      <Image
                        source={{ uri: mediaUrlSeleccionada }}
                        style={[
                        estilos.cardPreviewImgInner,
                        Platform.OS === 'web' ?
                        {
                          display: 'block',
                          alignSelf: 'center',
                          width: '100%',
                          height: '100%',
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                          objectPosition: 'center center'
                        } :
                        {
                          maxHeight: '100%',
                          maxWidth: '100%',
                          aspectRatio: mediaAspectRatio || 16 / 9
                        }]
                        }
                        resizeMode="contain"
                        onLoad={(e) => {
                          const w = e?.nativeEvent?.source?.width;
                          const h = e?.nativeEvent?.source?.height;
                          if (w && h) {
                            setMediaAspectRatio(w / h);
                          }
                        }} />

                      }
                        </View>
                        {videoTerminado && usarVideoEnModal ?
                    <Pressable
                      style={estilos.videoReplayOverlay}
                      onPress={async () => {
                        setVideoTerminado(false);
                        if (Platform.OS === 'web') {
                          const el = webVideoRef.current;
                          if (el) {
                            el.currentTime = 0;
                            try {
                              await el.play();
                            } catch (_) {

                            }
                          }
                          return;
                        }
                        try {
                          const p = videoRef.current;
                          if (p) {
                            p.replay();
                            p.play();
                          }
                        } catch (_) {

                        }
                      }}>
                      
                            <View style={estilos.videoReplayBoton}>
                              <Ionicons name="refresh" size={22} color="#000" />
                              <Text style={estilos.videoReplayTexto}>Reproducir</Text>
                            </View>
                          </Pressable> :
                    null}
                      </View>
                  </View> :
                  null}
                  {esWeb ?
                <View
                  style={[
                  estilos.modalMediaColDer,
                  modalColDerAnchoPlenoCondicion && estilos.modalMediaColDerAnchoPleno]}>
                      {modalEscritorioWebMediaEnColumnaDer ?
                  <View style={estilos.modalDerMediaEscritorioEnv}>
                    <View
                        style={[
                        estilos.cardPreviewImgModal,
                        {
                          marginVertical: 0,
                          ...(usarAudioEnModal ?
                          {
                            height: modalAudioAltoCajaEscritorioDer,
                            maxHeight: modalAudioAltoCajaEscritorioDer + 8,
                            marginBottom: modalAudioMargenInferiorCaja
                          } :
                          {
                            height: Math.min(ventanaAlto * 0.44, 420),
                            maxHeight: Math.min(ventanaAlto * 0.48, 460)
                          })
                        }]
                        }>
                      
                          <View style={estilos.mediaCenterBox}>
                            {usarVideoEnModal ?
                      <VideoModalPlayerWeb
                        key={mediaUrlSeleccionada}
                        src={mediaUrlSeleccionada}
                        poster={posterModalVideoWeb}
                        videoRef={webVideoRef}
                        onAspectKnown={(ar) => setMediaAspectRatio(ar)}
                        onEnded={() => setVideoTerminado(true)}
                        onVideoError={(msg) =>
                        Alert.alert(
                          'Vídeo',
                          `${msg}\n\nPrueba reproducir de nuevo o usa «Abrir archivo».`
                        )
                        } /> :
                      usarAudioEnModal ?
                      <ModalAudioPlayer key={`${mediaUrlSeleccionada}-audio-webder`} uri={mediaUrlSeleccionada} /> :


                      <Image
                        source={{ uri: mediaUrlSeleccionada }}
                        style={[
                        estilos.cardPreviewImgInner,
                        {
                          display: 'block',
                          alignSelf: 'center',
                          width: '100%',
                          height: '100%',
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                          objectPosition: 'center center'
                        }]
                        }
                        resizeMode="contain"
                        onLoad={(e) => {
                          const w = e?.nativeEvent?.source?.width;
                          const h = e?.nativeEvent?.source?.height;
                          if (w && h) {
                            setMediaAspectRatio(w / h);
                          }
                        }} />

                      }
                          </View>
                          {videoTerminado && usarVideoEnModal ?
                    <Pressable
                      style={estilos.videoReplayOverlay}
                      onPress={async () => {
                        setVideoTerminado(false);
                        const el = webVideoRef.current;
                        if (el) {
                          el.currentTime = 0;
                          try {
                            await el.play();
                          } catch (_) {

                          }
                        }
                      }}>
                      
                            <View style={estilos.videoReplayBoton}>
                              <Ionicons name="refresh" size={22} color="#000" />
                              <Text style={estilos.videoReplayTexto}>Reproducir</Text>
                            </View>
                          </Pressable> :
                    null}
                        </View>
                  </View> :
                  null}
                      <View style={estilos.modalAccionesFila}>
                        <View style={[estilos.cardAcciones, estilos.cardAccionesSinBorde]}>
                          <View style={estilos.cardAccionItem}>
                            <Ionicons name="eye-outline" size={18} color="#888" />
                            <Text style={estilos.cardAccionNumero}>
                              {mediaItem.numeroVistas ?? 0}
                            </Text>
                          </View>
                          <TouchableOpacity
                        style={estilos.cardAccionItem}
                        onPress={() => onLike(mediaItem)}
                        activeOpacity={0.7}
                        disabled={likeMediaModal.yaLike}>
                        
                            <Ionicons name={likeMediaModal.icon} size={20} color={likeMediaModal.color} />
                            <Text style={estilos.cardAccionNumero}>
                              {mediaItem.numeroLikes ?? 0}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                        style={estilos.cardAccionItem}
                        onPress={() => abrirComentarios(mediaItem)}
                        activeOpacity={0.7}>
                        
                            <Ionicons name="chatbubble-outline" size={18} color="#888" />
                            <Text style={estilos.cardAccionNumero}>
                              {Array.isArray(mediaItem.comentarios) ? mediaItem.comentarios.length : mediaItem.numeroComentarios ?? 0}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        {itemMediaUrlPrincipal(mediaItem) ?
                    <TouchableOpacity
                      style={estilos.modalAbrirArchivo}
                      onPress={() => abrirContenido(mediaItem)}>
                      
                            <Ionicons name="open-outline" size={16} color="#00dc57" />
                            <Text style={estilos.modalAbrirArchivoTexto}>Abrir archivo</Text>
                          </TouchableOpacity> :
                    null}
                      </View>
                      <View
                        style={[
                        estilos.modalComentarios,
                        mostrarZonaMediaVisualEnModal && estilos.modalComentariosTrasMedia]}>
                        <Text style={estilos.modalComentariosTitulo}>Comentarios</Text>
                        {Array.isArray(mediaItem.comentarios) && mediaItem.comentarios.length > 0 ?
                    <View style={estilos.modalComentariosLista}>
                          {mediaItem.comentarios.map((c, idx) => {
                        const esObjeto = c && typeof c === 'object';
                        const texto = esObjeto ? c.texto || '' : String(c || '');
                        const usuario = esObjeto ? c.usuario || '' : '';
                        if (!texto) return null;
                        return (
                          <View key={idx} style={estilos.modalComentarioCaja}>
                                  {usuario ?
                            <View style={estilos.modalComentarioUsuarioFila}>
                                      <Text style={estilos.modalComentarioUsuario}>{usuario}</Text>
                                      {etiquetaNivelComentario(c) ?
                              <Text style={estilos.modalComentarioNivel}>
                                          {etiquetaNivelComentario(c)}
                                        </Text> :
                              null}
                                    </View> :
                            null}
                                  <Text style={estilos.modalComentarioItem}>{texto}</Text>
                                </View>);

                      })}
                        </View> :

                      <Text style={estilos.modalComentarioVacio}>Sé el primero en comentar.</Text>
                      }
                      </View>
                    </View> :

                <View
                  style={[
                  estilos.modalMediaColDerMobile,
                  esWeb && estilos.modalMediaColDerMobileWeb,
                  modalColDerAnchoPlenoCondicion && estilos.modalMediaColDerAnchoPleno]}>
                      <View style={estilos.modalAccionesFilaMobile}>
                        <View style={[estilos.cardAcciones, estilos.cardAccionesSinBorde]}>
                          <View style={estilos.cardAccionItem}>
                            <Ionicons name="eye-outline" size={18} color="#888" />
                            <Text style={estilos.cardAccionNumero}>
                              {mediaItem.numeroVistas ?? 0}
                            </Text>
                          </View>
                          <TouchableOpacity
                        style={estilos.cardAccionItem}
                        onPress={() => onLike(mediaItem)}
                        activeOpacity={0.7}
                        disabled={likeMediaModal.yaLike}>
                        
                            <Ionicons name={likeMediaModal.icon} size={20} color={likeMediaModal.color} />
                            <Text style={estilos.cardAccionNumero}>
                              {mediaItem.numeroLikes ?? 0}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                        style={estilos.cardAccionItem}
                        onPress={() => abrirComentarios(mediaItem)}
                        activeOpacity={0.7}>
                        
                            <Ionicons name="chatbubble-outline" size={18} color="#888" />
                            <Text style={estilos.cardAccionNumero}>
                              {Array.isArray(mediaItem.comentarios) ? mediaItem.comentarios.length : mediaItem.numeroComentarios ?? 0}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        {itemMediaUrlPrincipal(mediaItem) ?
                    <TouchableOpacity
                      style={estilos.modalAbrirArchivo}
                      onPress={() => abrirContenido(mediaItem)}>
                      
                            <Ionicons name="open-outline" size={16} color="#00dc57" />
                            <Text style={estilos.modalAbrirArchivoTexto}>Abrir archivo</Text>
                          </TouchableOpacity> :
                    null}
                      </View>
                      <View
                        style={[
                        estilos.modalComentariosMobile,
                        mostrarZonaMediaVisualEnModal && estilos.modalComentariosTrasMedia]}>
                        <Text style={estilos.modalComentariosTitulo}>Comentarios</Text>
                        {Array.isArray(mediaItem.comentarios) && mediaItem.comentarios.length > 0 ?
                    <View style={estilos.modalComentariosLista}>
                            {mediaItem.comentarios.map((c, idx) => {
                        const esObjeto = c && typeof c === 'object';
                        const texto = esObjeto ? c.texto || '' : String(c || '');
                        const usuario = esObjeto ? c.usuario || '' : '';
                        if (!texto) return null;
                        return (
                          <View key={idx} style={estilos.modalComentarioCaja}>
                                  {usuario ?
                            <View style={estilos.modalComentarioUsuarioFila}>
                                      <Text style={estilos.modalComentarioUsuario}>{usuario}</Text>
                                      {etiquetaNivelComentario(c) ?
                              <Text style={estilos.modalComentarioNivel}>
                                          {etiquetaNivelComentario(c)}
                                        </Text> :
                              null}
                                    </View> :
                            null}
                                  <Text style={estilos.modalComentarioItem}>{texto}</Text>
                                </View>);

                      })}
                          </View> :

                    <View style={estilos.modalComentariosVacioMobile}>
                            <Text style={estilos.modalComentarioVacio}>Sé el primero en comentar.</Text>
                          </View>
                    }
                      </View>
                    </View>
                }
                </View>
              }
                </ScrollView>
              </>
            }
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!comentarioItem}
        transparent
        animationType="fade"
        onRequestClose={cerrarComentarioModal}>
        
        <Pressable style={estilos.modalFondo} onPress={cerrarComentarioModal}>
          <Pressable style={estilos.modalCaja} onPress={(e) => e.stopPropagation()}>
            <Text style={estilos.modalTitulo}>Nuevo comentario</Text>
            <TextInput
              style={estilos.modalInput}
              placeholder="Escribe tu comentario…"
              placeholderTextColor="#666"
              value={comentarioTexto}
              onChangeText={setComentarioTexto}
              multiline
              maxLength={500}
              editable={!enviandoComentario} />
            
            <View style={estilos.modalBotones}>
              <TouchableOpacity style={estilos.modalBotonCancelar} onPress={cerrarComentarioModal}>
                <Text style={estilos.modalBotonTextoCancelar}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[estilos.modalBotonEnviar, (!comentarioTexto.trim() || enviandoComentario) && estilos.modalBotonDisabled]}
                onPress={enviarComentario}
                disabled={!comentarioTexto.trim() || enviandoComentario}>
                
                <Text style={estilos.modalBotonTextoEnviar}>{enviandoComentario ? 'Enviando…' : 'Enviar'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>);

}


const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    ...(Platform.OS !== 'web' && { overflow: 'visible' })
  },
  areaContenido: { flex: 1 },
  fondoAbsoluto: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    backgroundColor: '#0d0d0d'
  },
  fondoImagen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    zIndex: 0,
    backgroundColor: '#0d0d0d'
  },
  scroll: { flex: 1 },
  scrollContenido: {
    padding: Platform.OS === 'web' ? 20 : 14,
    paddingBottom: 48,
    zIndex: 1,
    ...(Platform.OS === 'web' ? { alignItems: 'center' } : null)
  },
  scrollContenidoWebMovil: {
    padding: 14,
    alignItems: 'stretch'
  },
  contenidoSobreFondo: { zIndex: 1, alignItems: 'center', width: '100%' },
  contenidoCentrado: {
    width: Platform.OS === 'web' ? '50%' : '100%',
    maxWidth: Platform.OS === 'web' ? 700 : '100%',
    alignSelf: Platform.OS === 'web' ? 'center' : 'stretch'
  },
  contenidoCentradoWebMovil: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch'
  },
  cardContenedor: { position: 'relative', marginBottom: 12 },
  card: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(26,26,26,0.88)' : 'rgba(28,28,28,0.92)',
    borderRadius: 16,
    padding: Platform.OS === 'web' ? 18 : 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  cardTipoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0,220,87,0.12)'
  },
  cardTipoTexto: { color: '#00dc57', fontSize: 12, textTransform: 'capitalize' },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardDestacadoBadge: { color: '#ffc107', fontSize: 11, fontWeight: '600' },
  cardThugBadge: { color: '#00dc57', fontSize: 12, fontWeight: '600' },
  cardTexto: { color: '#bbb', fontSize: 14, marginBottom: 6, lineHeight: 20 },
  /** Complementario en texto plano: solo cursiva, sin enlace. */
  cardComplementario: { color: '#888', fontSize: 12, marginBottom: 8, lineHeight: 18, fontStyle: 'italic' },
  /** URL en complementario o enlace al archivo media: verde y subrayado, sin cursiva. */
  cardComplementarioEnlace: {
    color: '#00dc57',
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 18,
    fontStyle: 'normal',
    textDecorationLine: 'underline'
  },
  cardEnlace: { color: '#00dc57', textDecorationLine: 'underline' },
  cardMetaRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  cardCategoria: { color: '#00dc57', fontSize: 12 },
  cardEtiquetas: { color: '#888', fontSize: 11 },
  cardFechaEtiquetas: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  cardEtiquetasLinea: { color: '#888', fontSize: 11, textAlign: 'right', flexShrink: 1 },
  modalMediaFondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject
  },
  modalMediaCaja: {
    width: '96%',
    maxWidth: 1400,
    height: '94%',
    backgroundColor: Platform.OS === 'web' ? 'rgba(18,18,18,0.96)' : 'rgba(18,18,18,0.98)',
    borderRadius: 18,
    padding: Platform.OS === 'web' ? 14 : 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    flexDirection: 'column',
    alignItems: 'stretch',
    zIndex: 1,
    ...(Platform.OS === 'web' ? { position: 'relative' } : null)
  },
  modalMediaCabecera: {
    width: '100%',
    flexShrink: 0,
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    zIndex: 20,
    elevation: 20,
    backgroundColor: Platform.OS === 'web' ? '#121212' : 'rgba(18,18,18,0.99)'
  },
  modalMediaCabeceraWebEscritorio: {
    paddingHorizontal: 12
  },
  modalMediaCabeceraWebApilado: {
    paddingHorizontal: 12
  },
  modalMediaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  modalMediaTituloTop: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2
  },
  modalMediaDescripcionTop: {
    color: '#bbb',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 0,
    paddingBottom: 0
  },
  modalMediaCerrar: { padding: 4 },
  modalMediaTitulo: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: Platform.OS === 'web' ? 12 : 6,
    marginBottom: Platform.OS === 'web' ? 6 : 4
  },
  modalMediaCuerpoRow: {
    width: '100%',
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: Platform.OS === 'web' ? 16 : 10,
    alignItems: Platform.OS === 'web' ? 'flex-start' : 'stretch'
  },
  modalMediaCuerpoRowWebMovil: {
    flexDirection: 'column',
    gap: 0,
    minHeight: 0
  },

  modalMediaCuerpoScroll: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    ...(Platform.OS === 'web' ?
    {
      scrollbarWidth: 'none',
      msOverflowStyle: 'none'
    } :
    {})
  },
  modalMediaCuerpoScrollContenido: {
    paddingBottom: 24,
    width: '100%'
  },
  /** Web escritorio (dos columnas): mismo respiro horizontal que el bloque de título en cabecera. */
  modalMediaCuerpoScrollContenidoWebEscritorio: {
    paddingHorizontal: 12,
    paddingTop: 6
  },
  /** Web apilado (móvil / estrecho): título, vídeo/imagen/audio y panel inferior alineados. */
  modalMediaCuerpoScrollContenidoWebApilado: {
    paddingHorizontal: 12,
    paddingTop: 12
  },
  /** Nativo: mismo margen lateral para media y texto del modal. */
  modalMediaCuerpoScrollContenidoNativoModal: {
    paddingHorizontal: 12,
    paddingTop: 10
  },
  modalMediaFlujoApilado: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
    ...(Platform.OS === 'web' ? { position: 'relative' } : null)
  },
  modalMediaZonaVideoApilada: {
    width: '100%',
    flexShrink: 0,
    overflow: 'hidden',
    position: 'relative',
    zIndex: 0,
    marginTop: 0
  },
  modalMediaColDerMobileWebApilado: {
    width: '100%',
    marginTop: 14,
    position: 'relative',
    zIndex: 1
  },

  modalMediaBloqueTextoWebMovil: {
    width: '100%',
    flexShrink: 0,
    marginBottom: 10,
    paddingBottom: 4,
    zIndex: 1,
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.24)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingTop: 4
  },
  modalMediaTituloEncimaVideoWebMovil: {
    marginTop: 0,
    marginBottom: 4
  },
  modalMediaDescripcionEncimaVideoWebMovil: {
    marginBottom: 0
  },
  modalMediaColMedia: {
    flex: Platform.OS === 'web' ? 5 : 0,
    minHeight: Platform.OS === 'web' ? 0 : undefined,
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-start',
    alignItems: 'center',
    width: '100%'
  },

  modalMediaColMediaWebMovil: {
    flex: 0,
    flexGrow: 0,
    alignSelf: 'stretch',
    marginTop: 0,
    marginBottom: 12,
    position: 'relative',
    zIndex: 1
  },
  modalMediaColDerAnchoPleno: {
    flex: 1,
    flexGrow: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    ...(Platform.OS === 'web' ? { width: '100%', maxWidth: '100%' } : null)
  },
  modalArticuloColTexto: {
    flex: Platform.OS === 'web' ? 3 : 0,
    flexGrow: Platform.OS === 'web' ? 1 : 0,
    alignSelf: 'stretch',
    minWidth: 0,
    width: '100%',
    marginBottom: Platform.OS === 'web' ? 0 : 10
  },
  modalArticuloColTextoApilado: {
    width: '100%',
    flexShrink: 0,
    marginBottom: 14,
    paddingHorizontal: 0,
    paddingTop: 4
  },
  modalArticuloTituloEnCuerpo: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 12
  },
  modalArticuloDescripcionEnCuerpo: {
    color: '#ccc',
    fontSize: 15,
    lineHeight: 24
  },
  /** Contenedor del reproductor en columna derecha (escritorio web, vídeo/imagen). */
  modalDerMediaEscritorioEnv: {
    width: '100%',
    alignSelf: 'stretch',
    flexShrink: 0,
    marginBottom: 6
  },
  modalMediaColDer: {
    flex: Platform.OS === 'web' ? 2 : 5,
    minWidth: Platform.OS === 'web' ? 0 : undefined,
    minHeight: Platform.OS === 'web' ? undefined : 260,
    ...(Platform.OS === 'web' ?
    {
      display: 'flex',
      flexDirection: 'column'
    } :
    null)
  },
  modalMediaColDerMobile: {
    alignSelf: 'stretch',
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderColor: 'rgba(255,255,255,0.06)',
    borderTopWidth: 0,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12
  },
  modalMediaColDerMobileWeb: {
    width: '100%',
    position: 'relative',
    zIndex: 2,
    marginTop: 16
  },
  modalMediaColDerScroll: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)'
  },
  modalMediaColDerScrollContenido: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 16
  },
  modalComentarios: {
    marginTop: Platform.OS === 'web' ? 12 : 10,
    width: '100%'
  },
  /** Más aire entre acciones y comentarios cuando hay imagen/vídeo (columna derecha). */
  modalComentariosTrasMedia: {
    marginTop: Platform.OS === 'web' ? 28 : 24,
    paddingTop: Platform.OS === 'web' ? 4 : 2
  },
  modalComentariosMobile: { marginTop: 10, width: '100%' },
  modalComentariosTitulo: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  modalComentariosLista: { width: '100%', paddingBottom: 4 },
  modalComentariosVacioMobile: {
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12
  },
  modalComentarioCaja: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 6
  },
  modalComentarioUsuarioFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2
  },
  modalComentarioUsuario: { color: '#00dc57', fontSize: 12, fontWeight: '600' },
  modalComentarioNivel: {
    color: '#9ea3a9',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },
  modalComentarioItem: { color: '#ccc', fontSize: 13 },
  modalComentarioVacio: { color: '#666', fontSize: 12 },
  modalAccionesFila: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 8
  },
  modalAccionesFilaMobile: {
    marginTop: 0,
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
    paddingTop: 8
  },
  modalAbrirArchivo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00dc57',
    gap: 6
  },
  modalAbrirArchivoTexto: { color: '#00dc57', fontSize: 13, fontWeight: '500' },
  cardMeta: { color: '#666', fontSize: 12 },
  cardPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)'
  },
  cardAcciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)'
  },
  cardAccionesSinBorde: {
    marginTop: 0,
    paddingTop: 0,
    borderTopWidth: 0
  },
  cardAccionItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardAccionItemInactiva: { opacity: 0.55 },
  cardAccionNumero: { color: '#aaa', fontSize: 14 },
  cardCuerpo: { position: 'relative' },
  cardMetaThug: { color: '#00dc57' },
  cardTitulo: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  cardTituloTouchable: {
    alignSelf: 'stretch',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : null)
  },
  cardTextoTouchable: {
    alignSelf: 'stretch',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : null)
  },
  cardFecha: { color: '#888', fontSize: 12, marginBottom: 4 },
  cardPreviewImgCard: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 12,
    backgroundColor: '#000',
    position: 'relative'
  },
  /** Audio: un solo recuadro (fondo + borde) alineado al radio del preview, sin doble marco. */
  cardPreviewImgCardAudioFeed: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: 'rgba(0,220,87,0.55)',
    ...(Platform.OS === 'web' ?
    {
      outlineStyle: 'none',
      boxSizing: 'border-box'
    } :
    {})
  },
  cardPreviewPlaceholderFondo: { width: '100%', height: 200, borderRadius: 10 },
  cardPreviewPlaceholderFondoBlurWeb: {
    ...(Platform.OS === 'web' ? { filter: 'blur(14px)', transform: 'scale(1.04)' } : null)
  },
  cardPreviewImgModal: {
    width: '100%',
    maxWidth: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: Platform.OS === 'web' ? 12 : 6,
    backgroundColor: '#000',
    position: 'relative',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 0
  },
  cardPreviewImgModalWebMovil: {
    marginTop: 0,
    marginBottom: 0,
    position: 'relative',
    zIndex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0
  },
  mediaCenterBox: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: 0,
    justifyContent: 'center',

    alignItems: Platform.OS === 'web' ? 'stretch' : 'center'
  },
  cardPreviewImgInner: { width: '100%', height: '100%' },
  cardPreviewImgBlurWeb: {
    ...(Platform.OS === 'web' ? { filter: 'blur(12px)' } : null)
  },
  cardPreviewObfuscador: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    ...(Platform.OS === 'web' ?
    {
      backgroundColor: 'rgba(0,0,0,0.24)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)'
    } :
    {
      backgroundColor: 'rgba(0,0,0,0.34)'
    })
  },
  cardPreviewLeyendaCaja: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    maxWidth: 320,
    width: '100%'
  },
  cardPreviewLeyendaTitulo: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4
  },
  cardPreviewLeyendaSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18
  },
  cardPreviewVideo: {
    width: '100%',
    height: '100%'
  },
  videoReplayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)'
  },
  videoReplayBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#00dc57',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999
  },
  videoReplayTexto: { color: '#000', fontWeight: '700' },
  enlaceMapa: { color: '#00dc57', marginTop: 6, fontSize: 14 },
  vacioCaja: { marginBottom: 16, padding: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8 },
  vacio: { color: '#888', fontSize: 14, marginBottom: 4 },
  vacioHint: { color: '#666', fontSize: 12 },
  estadoCargaCaja: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  estadoCargaTexto: { color: '#aaa', fontSize: 13 },
  estadoErrorCaja: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: 'rgba(244,67,54,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244,67,54,0.35)',
    borderRadius: 10
  },
  estadoErrorTexto: { color: '#ffd3d3', fontSize: 13, marginBottom: 10 },
  estadoErrorDetalleDev: {
    color: '#ffd3d3',
    fontSize: 11,
    marginBottom: 10,
    opacity: 0.85
  },
  estadoErrorBoton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#00dc57',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  estadoErrorBotonTexto: { color: '#00dc57', fontSize: 12, fontWeight: '600' },
  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalCaja: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  modalTitulo: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 14 },
  modalInput: {
    backgroundColor: '#0d0d0d',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16
  },
  modalBotones: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalBotonCancelar: { paddingVertical: 10, paddingHorizontal: 16 },
  modalBotonTextoCancelar: { color: '#888', fontSize: 15 },
  modalBotonEnviar: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#00dc57',
    borderRadius: 8
  },
  modalBotonTextoEnviar: { color: '#000', fontWeight: '600', fontSize: 15 },
  modalBotonDisabled: { opacity: 0.5 }
});