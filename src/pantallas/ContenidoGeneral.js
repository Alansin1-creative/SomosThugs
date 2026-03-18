import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Linking,
  Platform,
  Image,
  Dimensions,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Video } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { listarEventosPublicos, listarPublicaciones, listarFeedUnificado, registrarVistaContenido, darLikeContenido, agregarComentarioContenido } from '../servicios/api';
import { puedeVerContenidoExclusivo } from '../constantes/nivelesAcceso';
import { useAuth } from '../contexto/AuthContext';
import { getBaseUrl } from '../config/api';

const FONDO_THUGS = require('../../assets/fondo-thugs.png');
const LOGO_THUGS = require('../../assets/logothugs.png');

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

export default function ContenidoGeneral({ navigation }) {
  const insets = useSafeAreaInsets();
  const { perfil, cerrarSesion, cargando: authCargando } = useAuth();
  const ventanaAlto = Dimensions.get('window').height;
  const scrollRef = useRef(null);
  const [eventos, setEventos] = useState([]);
  const [publicaciones, setPublicaciones] = useState([]);
  const [contenidoUnificado, setContenidoUnificado] = useState([]);
  const [ubicacion, setUbicacion] = useState(null);
  const [refrescando, setRefrescando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [comentarioItem, setComentarioItem] = useState(null);
  const [comentarioTexto, setComentarioTexto] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [mediaItem, setMediaItem] = useState(null);
  const [mediaUrlSeleccionada, setMediaUrlSeleccionada] = useState(null);
  const [mediaAspectRatio, setMediaAspectRatio] = useState(null);
  const [videoTerminado, setVideoTerminado] = useState(false);
  const videoRef = useRef(null);
  const [likesHechos, setLikesHechos] = useState(() => new Set());
  const cardLayoutsRef = useRef(new Map()); // id -> { y, height }
  const vistasHechasRef = useRef(new Set()); // ids ya contados (persistido por usuario)
  const vistasGuardandoRef = useRef(new Set()); // ids en proceso
  const rafScrollRef = useRef(null);
  const regresarAMediaRef = useRef(null); // item a reabrir tras comentar (solo si venía de la modal)

  const getId = (obj) => obj?.id ?? obj?._id?.toString?.() ?? obj?._id;
  const getUsuarioKey = () => String(getId(perfil) ?? perfil?.email ?? perfil?.nombreUsuario ?? 'anon');
  const getLikesStorageKey = () => `somos_thugs_likes_${getUsuarioKey()}`;
  const getVistasStorageKey = () => `somos_thugs_vistas_${getUsuarioKey()}`;

  const normalizarLink = (raw) => {
    const s = String(raw || '').trim();
    if (!s) return null;
    // ya viene con esquema
    if (s.startsWith('http://') || s.startsWith('https://')) return s;
    // rutas locales o data-uri: no tratarlas como enlace externo
    if (s.startsWith('/') || s.startsWith('data:')) return null;
    // dominio simple sin espacios (ej: www.google.com, google.com)
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
    return () => { cancel = true; };
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
    return () => { cancel = true; };
  }, [perfil]);

  const cargarDatos = async () => {
    try {
      const [resEventos, resPublicaciones, resFeed] = await Promise.allSettled([
        listarEventosPublicos(),
        listarPublicaciones(),
        listarFeedUnificado(),
      ]);
      setEventos(
        resEventos.status === 'fulfilled' && Array.isArray(resEventos.value) ? resEventos.value : []
      );
      setPublicaciones(
        resPublicaciones.status === 'fulfilled' && Array.isArray(resPublicaciones.value)
          ? resPublicaciones.value
          : []
      );
      setContenidoUnificado(
        resFeed.status === 'fulfilled' && Array.isArray(resFeed.value) ? resFeed.value : []
      );
      if (resFeed.status === 'rejected') {
        console.warn('Feed unificado:', resFeed.reason);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

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

  const abrirContenido = (item) => {
    // Solo abre el archivo principal (urlMediaCompleta), no la imagen/video de preview
    const mediaUrl = item.urlMediaCompleta;
    if (!mediaUrl) return;
    Linking.openURL(mediaUrl.startsWith('http') ? mediaUrl : getBaseUrl() + mediaUrl);
  };

  const abrirMediaEnModal = async (item) => {
    const previewUrl = item.urlMedia || null;
    const mediaUrl = item.urlMediaCompleta || item.urlMedia || null;
    if (!mediaUrl && !previewUrl) return;
    // La vista se registra al entrar al viewport. Evitar doble conteo si abren el modal.
    setMediaItem(item);
    let urlVisual = previewUrl || mediaUrl;
    if (urlVisual && !urlVisual.startsWith('http') && !urlVisual.startsWith('data:')) {
      urlVisual = getBaseUrl() + urlVisual;
    }
    setMediaUrlSeleccionada(urlVisual);
  };

  const cerrarMediaModal = () => {
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
      prev && (prev.id === id || prev._id === id)
        ? { ...prev, numeroLikes: valorNuevo }
        : prev
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
          prev && (prev.id === id || prev._id === id)
            ? { ...prev, numeroLikes: totalServidor }
            : prev
        );
      }
      try {
        const key = getLikesStorageKey();
        await AsyncStorage.setItem(key, JSON.stringify(Array.from(new Set([...likesHechos, String(id)]))));
      } catch (_) {
        // noop
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
        prev && (prev.id === id || prev._id === id)
          ? { ...prev, numeroLikes: valorAnterior }
          : prev
      );
    }
  };

  const abrirComentarios = (item) => {
    const id = getId(item);
    if (!id) return;
    // En algunas plataformas (especialmente web) dos Modals transparentes no se apilan bien.
    // Si la modal de media está abierta, cerrarla antes de abrir la de comentario.
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
      setContenidoUnificado((prev) =>
        prev.map((it) =>
          it.id === comentarioItem.id ? { ...it, comentarios: nuevaLista, numeroComentarios: total } : it
        )
      );
      setMediaItem((prev) =>
        prev && prev.id === comentarioItem.id
          ? { ...prev, comentarios: nuevaLista, numeroComentarios: total }
          : prev
      );
      const volverItem = regresarAMediaRef.current;
      cerrarComentarioModal();
      if (volverItem) {
        regresarAMediaRef.current = null;
        setTimeout(() => {
          abrirMediaEnModal(volverItem);
        }, 50);
      }
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo enviar el comentario.');
    } finally {
      setEnviandoComentario(false);
    }
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
      setContenidoUnificado((prev) =>
        prev.map((it) => {
          const itId = String(getId(it) ?? '');
          if (itId !== idStr) return it;
          const actual = it.numeroVistas ?? 0;
          const nuevo = typeof totalServidor === 'number' ? totalServidor : actual + 1;
          return { ...it, numeroVistas: nuevo };
        })
      );
      try {
        const key = getVistasStorageKey();
        const raw = await AsyncStorage.getItem(key);
        const arr = raw ? JSON.parse(raw) : [];
        const next = Array.isArray(arr) ? new Set(arr.map((x) => String(x))) : new Set();
        next.add(idStr);
        await AsyncStorage.setItem(key, JSON.stringify(Array.from(next)));
      } catch (_) {
        // noop
      }
    } catch (e) {
      console.warn('Vista no registrada:', e);
      vistasHechasRef.current.delete(idStr);
    } finally {
      vistasGuardandoRef.current.delete(idStr);
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

  const titulo = 'Contenido general';
  const alturaFondoNativo =
    Platform.OS !== 'web'
      ? Dimensions.get('window').height - (insets.top + 8 + 48) + insets.bottom
      : null;

  return (
    <View style={[estilos.contenedor, { paddingTop: insets.top + 8 }]}>
      <View style={estilos.header}>
          <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={estilos.headerBack}
          hitSlop={10}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Image source={LOGO_THUGS} style={estilos.headerLogoImg} resizeMode="contain" />
        </TouchableOpacity>
        <Text style={estilos.headerTitulo} pointerEvents="none">
          {titulo}
        </Text>
        <View style={estilos.headerEspacioDer} />
      </View>
      <View style={estilos.areaContenido}>
        <View
          style={[
            estilos.fondoAbsoluto,
            alturaFondoNativo != null && {
              top: 0,
              bottom: undefined,
              height: alturaFondoNativo,
            },
          ]}
          pointerEvents="none"
        >
          <Image
            source={FONDO_THUGS}
            style={[
              estilos.fondoImagen,
              alturaFondoNativo != null && {
                bottom: undefined,
                height: alturaFondoNativo,
              },
            ]}
            resizeMode={Platform.OS === 'web' ? 'cover' : 'repeat'}
          />
      </View>
      <ScrollView
        ref={scrollRef}
        style={estilos.scroll}
        contentContainerStyle={estilos.scrollContenido}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor="#00dc57" />
        }
        onScroll={onScroll}
        scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
      >
          <View style={estilos.contenidoSobreFondo}>
            <View style={estilos.contenidoCentrado}>
        {ubicacion && (
          <View style={estilos.card}>
            <Text style={estilos.cardTitulo}>Tu ubicación</Text>
            <Text style={estilos.cardTexto}>
              Lat: {ubicacion.latitude.toFixed(4)}, Lng: {ubicacion.longitude.toFixed(4)}
            </Text>
          </View>
        )}

            <Text style={estilos.seccion}>Contenido</Text>
            {contenidoUnificado.length === 0 && !cargando && (
              <View style={estilos.vacioCaja}>
                <Text style={estilos.vacio}>Sin contenido aún.</Text>
                <Text style={estilos.vacioHint}>
                  Desliza hacia abajo para actualizar.
                </Text>
              </View>
            )}
            {contenidoUnificado.map((item) => {
              const bloqueado =
                item.bloqueado === true ||
                (item.nivelRequerido === 'thug' &&
                  !puedeVerContenidoExclusivo(perfil?.nivelAcceso, perfil?.rol));
              const previewUrl = item.urlMedia || null;
              const mediaUrl = item.urlMediaCompleta || item.urlMedia || null;
              const urlCompleta =
                previewUrl && (previewUrl.startsWith('http') || previewUrl.startsWith('data:'))
                  ? previewUrl
                  : previewUrl
                    ? getBaseUrl() + previewUrl
                    : null;
              const mostrarPreview = !!urlCompleta || bloqueado;
              const previewSource = urlCompleta ? { uri: urlCompleta } : FONDO_THUGS;
              const vistas = item.numeroVistas ?? 0;
              const likes = item.numeroLikes ?? 0;
              const numComentarios = item.numeroComentarios ?? (Array.isArray(item.comentarios) ? item.comentarios.length : 0);
              const tipo = item.tipoContenido || item.tipo || 'articulo';
              const esVideo = tipo === 'video';
              const textoPrincipal = item.previewTexto || item.descripcion || '';
              const complementario = item.complementario || '';
              const etiquetasArr = Array.isArray(item.etiquetas) ? item.etiquetas : [];
              const categoria = item.categoria || '';
              const fechaPub = item.fechaPublicacion ? new Date(item.fechaPublicacion) : null;
              const textoFecha = fechaPub ? tiempoRelativo(fechaPub) : '';
              return (
                <View
                  key={item.id}
                  style={estilos.cardContenedor}
                  onLayout={(ev) => {
                    const id = getId(item);
                    if (!id) return;
                    const { y, height } = ev?.nativeEvent?.layout ?? {};
                    if (typeof y !== 'number' || typeof height !== 'number') return;
                    cardLayoutsRef.current.set(String(id), { y, height });
                    // Registrar vista si ya entró visible al pintar (por ejemplo al cargar arriba)
                    if (height > 0 && y >= 0) {
                      // el cálculo exacto lo hará el onScroll; aquí evitamos peticiones extra
                    }
                  }}
                >
                  <View style={estilos.card}>
                    <View style={estilos.cardHeader}>
                      <View style={estilos.cardTipoBadge}>
                        <Ionicons
                          name={
                            esVideo ? 'videocam'
                              : tipo === 'audio' ? 'musical-notes'
                              : tipo === 'imagen' ? 'image'
                              : 'document-text'
                          }
                          size={14}
                          color="#00dc57"
                        />
                        <Text style={estilos.cardTipoTexto}>
                          {tipo}
                        </Text>
                      </View>
                      <View style={estilos.cardHeaderRight}>
                        {item.destacado && (
                          <Text style={estilos.cardDestacadoBadge}>Destacado</Text>
                        )}
                        {item.nivelRequerido === 'thug' && (
                          <Text style={estilos.cardThugBadge}>Zona Thug</Text>
                        )}
                      </View>
                    </View>
                    <Text style={estilos.cardTitulo}>{item.titulo || 'Sin título'}</Text>
                    <View style={estilos.cardCuerpo}>
                      {textoPrincipal ? (
                        <Text style={estilos.cardTexto}>{textoPrincipal}</Text>
                      ) : null}
                      {complementario ? (
                        normalizarLink(complementario) ? (
                          <Text
                            style={[estilos.cardComplementario, estilos.cardEnlace]}
                            onPress={() => Linking.openURL(normalizarLink(complementario))}
                          >
                            {complementario}
                          </Text>
                        ) : (
                          <Text style={estilos.cardComplementario}>{complementario}</Text>
                        )
                      ) : null}
                      {(item.urlMediaCompleta || item.urlMedia) ? (
                        (() => {
                          const raw = String(item.urlMediaCompleta || item.urlMedia || '').trim();
                          if (!raw) return null;
                          const esHttp = raw.startsWith('http://') || raw.startsWith('https://');
                          const esDominio = !raw.includes(' ') && raw.includes('.') && !raw.startsWith('/');
                          const link = esHttp ? raw : esDominio ? `https://${raw}` : null;
                          if (!link) return null;
                          return (
                            <Text
                              style={[estilos.cardComplementario, estilos.cardEnlace]}
                              onPress={() => Linking.openURL(link)}
                            >
                              {raw}
                            </Text>
                          );
                        })()
                      ) : null}
                      {categoria && (
                        <View style={estilos.cardMetaRow}>
                          <Text style={estilos.cardCategoria}>Categoría: {categoria}</Text>
                        </View>
                      )}
                      {mostrarPreview && (
                        <TouchableOpacity
                          style={estilos.cardPreviewImgCard}
                          onPress={() => (bloqueado ? null : abrirMediaEnModal(item))}
                          activeOpacity={bloqueado ? 1 : 0.9}
                          disabled={bloqueado}
                        >
                          <Image
                            source={previewSource}
                            style={[estilos.cardPreviewImgInner, bloqueado && estilos.cardPreviewImgBlurWeb]}
                            resizeMode="cover"
                            blurRadius={bloqueado ? 18 : 0}
                          />
                          {bloqueado ? (
                            <View pointerEvents="none" style={estilos.cardPreviewObfuscador}>
                              <View style={estilos.cardPreviewLeyendaCaja}>
                                <Text style={estilos.cardPreviewLeyendaTitulo}>Para ver contenido Thug</Text>
                                <Text style={estilos.cardPreviewLeyendaSub}>
                                  Primero debes de subir de nivel
                                </Text>
                              </View>
                            </View>
                          ) : null}
                          {esVideo && !bloqueado ? (
                            <View style={estilos.cardPlayOverlay}>
                              <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      )}
                      {(textoFecha || etiquetasArr.length > 0) && (
                        <View style={estilos.cardFechaEtiquetas}>
                          {textoFecha ? <Text style={estilos.cardMeta}>{textoFecha}</Text> : <View />}
                          {etiquetasArr.length > 0 ? (
                            <Text style={estilos.cardEtiquetasLinea}>
                              Etiquetas: {etiquetasArr.join(', ')}
                            </Text>
                          ) : null}
                        </View>
                      )}
                      <View style={estilos.cardAcciones}>
                        <View style={estilos.cardAccionItem}>
                          <Ionicons name="eye-outline" size={18} color="#888" />
                          <Text style={estilos.cardAccionNumero}>{vistas}</Text>
                        </View>
                        <TouchableOpacity
                          style={estilos.cardAccionItem}
                          onPress={() => onLike(item)}
                          activeOpacity={0.7}
                          disabled={bloqueado || likesHechos.has(String(item?.id ?? item?._id?.toString?.() ?? item?._id))}
                        >
                          <Ionicons name="heart-outline" size={20} color="#888" />
                          <Text style={estilos.cardAccionNumero}>{likes}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={estilos.cardAccionItem}
                          onPress={() => abrirComentarios(item)}
                          activeOpacity={0.7}
                          disabled={bloqueado}
                        >
                          <Ionicons name="chatbubble-outline" size={18} color="#888" />
                          <Text style={estilos.cardAccionNumero}>{numComentarios}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
            </View>
          </View>
        </ScrollView>
      </View>

      <Modal
        visible={!!mediaItem}
        transparent
        animationType="fade"
        onRequestClose={cerrarMediaModal}
      >
        <View style={estilos.modalMediaFondo}>
          <Pressable style={estilos.modalBackdrop} onPress={cerrarMediaModal} />
          <View style={estilos.modalMediaCaja}>
            {mediaItem && (
              <>
                <View style={estilos.modalMediaHeader}>
                  <View style={estilos.cardTipoBadge}>
                    <Ionicons
                      name={
                        (mediaItem.tipoContenido || mediaItem.tipo) === 'video'
                          ? 'videocam'
                          : (mediaItem.tipoContenido || mediaItem.tipo) === 'audio'
                            ? 'musical-notes'
                            : (mediaItem.tipoContenido || mediaItem.tipo) === 'imagen'
                              ? 'image'
                              : 'document-text'
                      }
                      size={14}
                      color="#00dc57"
                    />
                    <Text style={estilos.cardTipoTexto}>
                      {mediaItem.tipoContenido || mediaItem.tipo || 'articulo'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={cerrarMediaModal} style={estilos.modalMediaCerrar}>
                    <Ionicons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
                <View style={estilos.modalMediaCuerpoRow}>
                  <View style={estilos.modalMediaColMedia}>
                    {mediaUrlSeleccionada && (
                      <View
                        style={[
                          estilos.cardPreviewImgModal,
                          {
                            height: Platform.OS === 'web' ? ventanaAlto * 0.78 : ventanaAlto * 0.45,
                          },
                        ]}
                      >
                        <View style={estilos.mediaCenterBox}>
                          {(mediaItem.tipoContenido || mediaItem.tipo) === 'video' ? (
                            <Video
                              source={{ uri: mediaUrlSeleccionada }}
                              style={[
                                estilos.cardPreviewVideo,
                                {
                                  maxHeight: '100%',
                                  maxWidth: '100%',
                                  aspectRatio: mediaAspectRatio || 16 / 9,
                                  ...(Platform.OS === 'web'
                                    ? {
                                        display: 'block',
                                        marginLeft: 'auto',
                                        marginRight: 'auto',
                                        position: 'absolute',
                                        top: 0,
                                        right: 0,
                                        bottom: 0,
                                        left: 0,
                                        objectFit: 'contain',
                                        objectPosition: 'center center',
                                      }
                                    : null),
                                },
                              ]}
                              resizeMode="contain"
                              useNativeControls={Platform.OS !== 'web'}
                              shouldPlay
                              ref={videoRef}
                              onLoad={({ naturalSize }) => {
                                if (naturalSize?.width && naturalSize?.height) {
                                  setMediaAspectRatio(
                                    naturalSize.width / naturalSize.height || 16 / 9
                                  );
                                }
                              }}
                              onPlaybackStatusUpdate={(status) => {
                                if (!status || !status.isLoaded) return;
                                if (status.didJustFinish) {
                                  setVideoTerminado(true);
                                } else if (status.isPlaying) {
                                  setVideoTerminado(false);
                                }
                              }}
                            />
                          ) : (
                            <Image
                              source={{ uri: mediaUrlSeleccionada }}
                              style={[
                                estilos.cardPreviewImgInner,
                                {
                                  maxHeight: '100%',
                                  maxWidth: '100%',
                                  aspectRatio: mediaAspectRatio || 16 / 9,
                                  ...(Platform.OS === 'web'
                                    ? {
                                        display: 'block',
                                        marginLeft: 'auto',
                                        marginRight: 'auto',
                                        position: 'absolute',
                                        top: 0,
                                        right: 0,
                                        bottom: 0,
                                        left: 0,
                                        objectFit: 'contain',
                                        objectPosition: 'center center',
                                      }
                                    : null),
                                },
                              ]}
                              resizeMode="contain"
                              onLoad={(e) => {
                                const w = e?.nativeEvent?.source?.width;
                                const h = e?.nativeEvent?.source?.height;
                                if (w && h) {
                                  setMediaAspectRatio(w / h);
                                }
                              }}
                            />
                          )}
                        </View>
                        {videoTerminado ? (
                          <Pressable
                            style={estilos.videoReplayOverlay}
                            onPress={async () => {
                              setVideoTerminado(false);
                              try {
                                await videoRef.current?.replayAsync?.();
                              } catch (e) {
                                // noop
                              }
                            }}
                          >
                            <View style={estilos.videoReplayBoton}>
                              <Ionicons name="refresh" size={22} color="#000" />
                              <Text style={estilos.videoReplayTexto}>Reproducir</Text>
                            </View>
                          </Pressable>
                        ) : null}
                      </View>
                    )}
                  </View>
                  {Platform.OS === 'web' ? (
                    <View style={estilos.modalMediaColDer}>
                      <Text style={estilos.modalMediaTitulo}>{mediaItem.titulo || 'Sin título'}</Text>
                      {mediaItem.previewTexto || mediaItem.descripcion ? (
                        <Text style={estilos.cardTexto}>
                          {mediaItem.previewTexto || mediaItem.descripcion}
                        </Text>
                      ) : null}
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
                            disabled={likesHechos.has(String(mediaItem?.id ?? mediaItem?._id?.toString?.() ?? mediaItem?._id))}
                          >
                            <Ionicons name="heart-outline" size={20} color="#888" />
                            <Text style={estilos.cardAccionNumero}>
                              {mediaItem.numeroLikes ?? 0}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={estilos.cardAccionItem}
                            onPress={() => abrirComentarios(mediaItem)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="chatbubble-outline" size={18} color="#888" />
                            <Text style={estilos.cardAccionNumero}>
                              {Array.isArray(mediaItem.comentarios) ? mediaItem.comentarios.length : mediaItem.numeroComentarios ?? 0}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        {mediaItem.urlMediaCompleta ? (
                          <TouchableOpacity
                            style={estilos.modalAbrirArchivo}
                            onPress={() => abrirContenido(mediaItem)}
                          >
                            <Ionicons name="open-outline" size={16} color="#00dc57" />
                            <Text style={estilos.modalAbrirArchivoTexto}>Abrir archivo</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                      <View style={estilos.modalComentarios}>
                        <Text style={estilos.modalComentariosTitulo}>Comentarios</Text>
                        <ScrollView
                          style={estilos.modalComentariosScroll}
                          contentContainerStyle={estilos.modalComentariosScrollContenido}
                          showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        >
                          {Array.isArray(mediaItem.comentarios) && mediaItem.comentarios.length > 0 ? (
                            mediaItem.comentarios.map((c, idx) => {
                              const esObjeto = c && typeof c === 'object';
                              const texto = esObjeto ? c.texto || '' : String(c || '');
                              const usuario = esObjeto ? c.usuario || '' : '';
                              if (!texto) return null;
                              return (
                                <View key={idx} style={estilos.modalComentarioCaja}>
                                  {usuario ? (
                                    <Text style={estilos.modalComentarioUsuario}>{usuario}</Text>
                                  ) : null}
                                  <Text style={estilos.modalComentarioItem}>{texto}</Text>
                                </View>
                              );
                            })
                          ) : (
                            <Text style={estilos.modalComentarioVacio}>Sé el primero en comentar.</Text>
                          )}
                        </ScrollView>
                      </View>
                    </View>
                  ) : (
                    <View style={estilos.modalMediaColDerMobile}>
                      <Text style={estilos.modalMediaTitulo}>{mediaItem.titulo || 'Sin título'}</Text>
                      {mediaItem.previewTexto || mediaItem.descripcion ? (
                        <Text style={estilos.cardTexto} numberOfLines={3}>
                          {mediaItem.previewTexto || mediaItem.descripcion}
                        </Text>
                      ) : null}
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
                            disabled={likesHechos.has(String(mediaItem?.id ?? mediaItem?._id?.toString?.() ?? mediaItem?._id))}
                          >
                            <Ionicons name="heart-outline" size={20} color="#888" />
                            <Text style={estilos.cardAccionNumero}>
                              {mediaItem.numeroLikes ?? 0}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={estilos.cardAccionItem}
                            onPress={() => abrirComentarios(mediaItem)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="chatbubble-outline" size={18} color="#888" />
                            <Text style={estilos.cardAccionNumero}>
                              {Array.isArray(mediaItem.comentarios) ? mediaItem.comentarios.length : mediaItem.numeroComentarios ?? 0}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        {mediaItem.urlMediaCompleta ? (
                          <TouchableOpacity
                            style={estilos.modalAbrirArchivo}
                            onPress={() => abrirContenido(mediaItem)}
                          >
                            <Ionicons name="open-outline" size={16} color="#00dc57" />
                            <Text style={estilos.modalAbrirArchivoTexto}>Abrir archivo</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                      <View style={estilos.modalComentariosMobile}>
                        <Text style={estilos.modalComentariosTitulo}>Comentarios</Text>
                        {Array.isArray(mediaItem.comentarios) && mediaItem.comentarios.length > 0 ? (
                          <ScrollView
                            style={estilos.modalComentariosScrollMobile}
                            contentContainerStyle={estilos.modalComentariosScrollContenido}
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                          >
                            {mediaItem.comentarios.map((c, idx) => {
                              const esObjeto = c && typeof c === 'object';
                              const texto = esObjeto ? c.texto || '' : String(c || '');
                              const usuario = esObjeto ? c.usuario || '' : '';
                              if (!texto) return null;
                              return (
                                <View key={idx} style={estilos.modalComentarioCaja}>
                                  {usuario ? (
                                    <Text style={estilos.modalComentarioUsuario}>{usuario}</Text>
                                  ) : null}
                                  <Text style={estilos.modalComentarioItem}>{texto}</Text>
                                </View>
                              );
                            })}
                          </ScrollView>
                        ) : (
                          <View style={estilos.modalComentariosVacioMobile}>
                            <Text style={estilos.modalComentarioVacio}>Sé el primero en comentar.</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!comentarioItem}
        transparent
        animationType="fade"
        onRequestClose={cerrarComentarioModal}
      >
        <Pressable style={estilos.modalFondo} onPress={cerrarComentarioModal}>
          <Pressable style={estilos.modalCaja} onPress={(e) => e.stopPropagation()}>
            <Text style={estilos.modalTitulo}>Nuevo comentario</Text>
            <TextInput
              style={estilos.modalInput}
              placeholder="Escribe tu comentario..."
              placeholderTextColor="#666"
              value={comentarioTexto}
              onChangeText={setComentarioTexto}
              multiline
              maxLength={500}
              editable={!enviandoComentario}
            />
            <View style={estilos.modalBotones}>
              <TouchableOpacity style={estilos.modalBotonCancelar} onPress={cerrarComentarioModal}>
                <Text style={estilos.modalBotonTextoCancelar}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[estilos.modalBotonEnviar, (!comentarioTexto.trim() || enviandoComentario) && estilos.modalBotonDisabled]}
                onPress={enviarComentario}
                disabled={!comentarioTexto.trim() || enviandoComentario}
              >
                <Text style={estilos.modalBotonTextoEnviar}>{enviandoComentario ? 'Enviando…' : 'Enviar'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    ...(Platform.OS !== 'web' && { overflow: 'visible' }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0d0d0d',
  },
  headerBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 4,
    width: 80,
    zIndex: 1,
  },
  headerLogoImg: { width: 36, height: 36 },
  headerTitulo: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    zIndex: 0,
  },
  headerEspacioDer: { width: 80, zIndex: 1 },
  areaContenido: { flex: 1 },
  fondoAbsoluto: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    backgroundColor: '#0d0d0d',
  },
  fondoImagen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    zIndex: 0,
    backgroundColor: '#0d0d0d',
  },
  scroll: { flex: 1 },
  scrollContenido: {
    padding: Platform.OS === 'web' ? 20 : 14,
    paddingBottom: 48,
    zIndex: 1,
    ...(Platform.OS === 'web' ? { alignItems: 'center' } : null),
  },
  contenidoSobreFondo: { zIndex: 1, alignItems: 'center', width: '100%' },
  contenidoCentrado: {
    width: Platform.OS === 'web' ? '50%' : '100%',
    maxWidth: Platform.OS === 'web' ? 600 : '100%',
    alignSelf: Platform.OS === 'web' ? 'center' : 'stretch',
  },
  seccion: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 16,
  },
  cardContenedor: { position: 'relative', marginBottom: 12 },
  card: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(26,26,26,0.88)' : 'rgba(28,28,28,0.92)',
    borderRadius: 16,
    padding: Platform.OS === 'web' ? 18 : 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTipoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0,220,87,0.12)',
  },
  cardTipoTexto: { color: '#00dc57', fontSize: 12, textTransform: 'capitalize' },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardDestacadoBadge: { color: '#ffc107', fontSize: 11, fontWeight: '600' },
  cardThugBadge: { color: '#00dc57', fontSize: 12, fontWeight: '600' },
  cardTexto: { color: '#bbb', fontSize: 14, marginBottom: 6, lineHeight: 20 },
  cardComplementario: { color: '#888', fontSize: 12, marginBottom: 8, lineHeight: 18, fontStyle: 'italic' },
  cardEnlace: { color: '#00dc57', textDecorationLine: 'underline' },
  cardMetaRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  cardCategoria: { color: '#00dc57', fontSize: 12 },
  cardEtiquetas: { color: '#888', fontSize: 11 },
  cardFechaEtiquetas: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardEtiquetasLinea: { color: '#888', fontSize: 11, textAlign: 'right', flexShrink: 1 },
  modalMediaFondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
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
  },
  modalMediaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalMediaCerrar: { padding: 4 },
  modalMediaTitulo: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: Platform.OS === 'web' ? 12 : 6,
    marginBottom: Platform.OS === 'web' ? 6 : 4,
  },
  modalMediaCuerpoRow: {
    flex: 1,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: Platform.OS === 'web' ? 16 : 10,
    alignItems: 'stretch',
  },
  modalMediaColMedia: {
    flex: Platform.OS === 'web' ? 5 : 0,
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-start',
    alignItems: 'center',
    width: '100%',
  },
  modalMediaColDer: {
    flex: Platform.OS === 'web' ? 2 : 5,
    minHeight: Platform.OS === 'web' ? undefined : 260,
    ...(Platform.OS === 'web'
      ? {
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
        }
      : null),
  },
  modalMediaColDerMobile: {
    flex: 1,
    minHeight: 0,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  modalMediaColDerScroll: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  modalMediaColDerScrollContenido: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 16,
  },
  modalComentarios: {
    marginTop: Platform.OS === 'web' ? 12 : 10,
    flex: 1,
    minHeight: 0,
  },
  modalComentariosMobile: { marginTop: 10, flex: 1, minHeight: 0 },
  modalComentariosTitulo: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  modalComentariosScroll: { flex: 1, minHeight: 0 },
  modalComentariosScrollMobile: { flex: 1, minHeight: 0 },
  modalComentariosScrollContenido: { paddingBottom: 12 },
  modalComentariosVacioMobile: {
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  modalComentarioCaja: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 6,
  },
  modalComentarioUsuario: { color: '#00dc57', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  modalComentarioItem: { color: '#ccc', fontSize: 13 },
  modalComentarioVacio: { color: '#666', fontSize: 12 },
  modalAccionesFila: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  modalAccionesFilaMobile: {
    marginTop: 12,
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  modalAbrirArchivo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00dc57',
    gap: 6,
  },
  modalAbrirArchivoTexto: { color: '#00dc57', fontSize: 13, fontWeight: '500' },
  cardMeta: { color: '#666', fontSize: 12 },
  cardPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  cardAcciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  cardAccionesSinBorde: {
    marginTop: 0,
    paddingTop: 0,
    borderTopWidth: 0,
  },
  cardAccionItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardAccionNumero: { color: '#aaa', fontSize: 14 },
  cardCuerpo: { position: 'relative' },
  cardMetaThug: { color: '#00dc57' },
  cardTitulo: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  cardFecha: { color: '#888', fontSize: 12, marginBottom: 4 },
  cardPreviewImgCard: {
    width: '100%',
    height: Platform.OS === 'web' ? 220 : 240,
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 12,
    backgroundColor: '#000',
    position: 'relative',
  },
  cardPreviewImgModal: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: Platform.OS === 'web' ? 12 : 6,
    backgroundColor: '#000',
    position: 'relative',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaCenterBox: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardPreviewImgInner: { width: '100%', height: '100%' },
  cardPreviewImgBlurWeb: {
    ...(Platform.OS === 'web' ? { filter: 'blur(12px)' } : null),
  },
  cardPreviewObfuscador: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(12px)' } : null),
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  cardPreviewLeyendaCaja: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    maxWidth: 320,
    width: '100%',
  },
  cardPreviewLeyendaTitulo: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardPreviewLeyendaSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  cardPreviewVideo: {
    width: '100%',
    height: '100%',
  },
  videoReplayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  videoReplayBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#00dc57',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  videoReplayTexto: { color: '#000', fontWeight: '700' },
  enlaceMapa: { color: '#00dc57', marginTop: 6, fontSize: 14 },
  vacioCaja: { marginBottom: 16, padding: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8 },
  vacio: { color: '#888', fontSize: 14, marginBottom: 4 },
  vacioHint: { color: '#666', fontSize: 12 },
  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCaja: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
    marginBottom: 16,
  },
  modalBotones: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalBotonCancelar: { paddingVertical: 10, paddingHorizontal: 16 },
  modalBotonTextoCancelar: { color: '#888', fontSize: 15 },
  modalBotonEnviar: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#00dc57',
    borderRadius: 8,
  },
  modalBotonTextoEnviar: { color: '#000', fontWeight: '600', fontSize: 15 },
  modalBotonDisabled: { opacity: 0.5 },
});
