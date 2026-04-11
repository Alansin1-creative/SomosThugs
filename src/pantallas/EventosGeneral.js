import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Platform,
  Image,
  Linking,
  Dimensions,
  Alert } from
'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { listarEventosPublicos } from '../servicios/api';
import { getBaseUrl } from '../config/api';
import { useAuth } from '../contexto/AuthContext';
import { esAdmin, nombreRutaHomeApp, puedeVerContenidoExclusivo } from '../constantes/nivelesAcceso';

const FONDO_THUGS = require('../../assets/fondo-thugs.png');
const LOGO_HEADER_BANNER = require('../../assets/logo-somos-thugs-banner.png');

function normalizarUrlMedia(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:')) return s;
  return getBaseUrl() + s;
}

/**
 * Teaser Thug en web: ancho 100 %, alto intrínseco de la imagen (`height: auto`) + `filter: blur`.
 */
function EventoCardImagenWebTeaserVelado({ uri, onLoadError }) {
  return React.createElement(
    'div',
    {
      style: {
        width: '100%',
        overflow: 'hidden',
        borderRadius: 10,
        backgroundColor: '#0a0a0a',
        lineHeight: 0
      }
    },
    React.createElement('img', {
      src: uri,
      alt: '',
      draggable: false,
      onError: onLoadError,
      style: {
        width: '100%',
        height: 'auto',
        display: 'block',
        verticalAlign: 'top',
        filter: 'blur(12px)',
        transform: 'scale(1.02)',
        transformOrigin: 'center center'
      }
    })
  );
}

/**
 * Web y nativo: `previewVelado` difumina el propio media (no dependemos de backdrop-filter).
 * Vista normal: RN `Image` + aspecto.
 */
function EventoCardImagen({ uri, onLoadError, previewVelado = false }) {
  const [ratio, setRatio] = useState(null);
  const resizeMode = 'contain';

  useEffect(() => {
    if (!uri || previewVelado && Platform.OS === 'web') return undefined;
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
  }, [uri, previewVelado]);

  if (previewVelado && Platform.OS === 'web') {
    return <EventoCardImagenWebTeaserVelado uri={uri} onLoadError={onLoadError} />;
  }

  const cajaRatio =
  ratio != null ?
  {
    width: '100%',
    aspectRatio: ratio,
    ...previewVelado ? {} : { minHeight: 160 }
  } :
  {
    width: '100%',
    minHeight: previewVelado ? 140 : 160,
    aspectRatio: 16 / 9
  };

  return (
    <View style={cajaRatio}>
      
      <Image
        source={{ uri }}
        style={{ width: '100%', height: '100%' }}
        resizeMode={resizeMode}
        blurRadius={previewVelado ? 14 : 0}
        onLoad={(e) => {
          const w = e?.nativeEvent?.source?.width;
          const h = e?.nativeEvent?.source?.height;
          if (w > 0 && h > 0) setRatio((prev) => prev ?? w / h);
        }}
        onError={onLoadError} />
      
    </View>);

}

export default function EventosGeneral({ navigation }) {
  const insets = useSafeAreaInsets();
  const { perfil } = useAuth();
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [ubicacion, setUbicacion] = useState(null);
  const [etaPorEvento, setEtaPorEvento] = useState({});
  const [imgIdxPorEvento, setImgIdxPorEvento] = useState({});
  const { height: ventanaAlto, width: ventanaAncho } = Dimensions.get('window');
  const esWeb = Platform.OS === 'web';
  const esWebMovil = esWeb && ventanaAncho < 820;

  const pedirUbicacion = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setUbicacion(loc.coords);
    } catch (_) {

    }
  };

  const cargar = async () => {
    try {
      const lista = await listarEventosPublicos();
      setEventos(Array.isArray(lista) ? lista : []);
    } catch (_) {
      setEventos([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    pedirUbicacion();
  }, []);

  const onRefresh = async () => {
    setRefrescando(true);
    await cargar();
    await pedirUbicacion();
    setRefrescando(false);
  };

  const formatearMin = (seg) => {
    const s = typeof seg === 'number' ? seg : 0;
    const min = Math.max(1, Math.round(s / 60));
    return `${min} min`;
  };

  const fetchEtaOSRM = async (orig, dest) => {


    const url = `https://router.project-osrm.org/route/v1/driving/${orig.longitude},${orig.latitude};${dest.longitude},${dest.latitude}?overview=false&alternatives=false&steps=false`;
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    const dur = data?.routes?.[0]?.duration;
    if (!res.ok || typeof dur !== 'number') throw new Error('No se pudo calcular ETA');
    return dur;
  };

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!ubicacion) return;
      if (!Array.isArray(eventos) || eventos.length === 0) return;


      const pendientes = [];
      for (const ev of eventos) {
        const id = String(ev.id || ev._id || '');
        if (!id) continue;
        if (etaPorEvento[id]) continue;
        const lat = ev.latitud ?? ev.coordenadas?.lat ?? ev.coordenadas?.latitude;
        const lng = ev.longitud ?? ev.coordenadas?.lng ?? ev.coordenadas?.longitude;
        if (lat == null || lng == null) continue;
        pendientes.push({ id, lat: Number(lat), lng: Number(lng) });
        if (pendientes.length >= 12) break;
      }
      if (pendientes.length === 0) return;


      const next = {};
      for (const p of pendientes) {
        try {
          const seg = await fetchEtaOSRM(ubicacion, { latitude: p.lat, longitude: p.lng });
          next[p.id] = { segundos: seg, texto: formatearMin(seg) };
        } catch (_) {
          next[p.id] = { segundos: null, texto: null };
        }
      }
      if (!cancel) {
        setEtaPorEvento((prev) => ({ ...prev, ...next }));
      }
    })();
    return () => {cancel = true;};
  }, [ubicacion, eventos]);

  const abrirMapa = (lat, lng) => {
    if (lat == null || lng == null) return;
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    Linking.openURL(url);
  };

  const abrirWhatsApp = (telefono) => {
    const raw = String(telefono || '').trim();
    if (!raw) return;
    const soloDigitos = raw.replace(/[^\d]/g, '');
    if (!soloDigitos) return;
    const url = `https://wa.me/${soloDigitos}`;
    Linking.openURL(url);
  };

  const titulo = 'Eventos';
  const rutaHomeHeader = esAdmin(perfil) ? 'ContenidoGeneral' : nombreRutaHomeApp(perfil);
  const alturaFondoNativo =
  Platform.OS !== 'web' ?
  Dimensions.get('window').height - (insets.top + 8 + 48) + insets.bottom :
  null;

  return (
    <View style={[estilos.contenedor, { paddingTop: insets.top + 8 }]}>
      <View style={estilos.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate(rutaHomeHeader)}
          style={estilos.headerBack}
          hitSlop={10}
          activeOpacity={0.8}>
          
          <Ionicons name="arrow-back" size={22} color="#fff" style={estilos.headerFlechaAtras} />
          <Image source={LOGO_HEADER_BANNER} style={estilos.headerLogoAlLado} resizeMode="contain" />
        </TouchableOpacity>
        <Text style={estilos.headerTitulo} pointerEvents="none" numberOfLines={1} ellipsizeMode="tail">
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
          style={estilos.scroll}
          contentContainerStyle={[
          estilos.scrollContenido,
          esWebMovil && estilos.scrollContenidoWebMovil]
          }
          refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor="#00dc57" />
          }
          showsVerticalScrollIndicator={false}>
          
          <View style={estilos.contenidoSobreFondo}>
            <View style={[estilos.contenidoCentrado, esWebMovil && estilos.contenidoCentradoWebMovil]}>
              {cargando ?
              <Text style={estilos.vacio}>Cargando…</Text> :
              eventos.length === 0 ?
              <View style={estilos.vacioCaja}>
                  <Text style={estilos.vacio}>Sin eventos por ahora.</Text>
                </View> :
              null}

              {eventos.map((ev) => {
                const candidatosRaw = [
                ev.imagenUrl,
                ev.imagenPromocionalUrl,
                ev.imagenPromocional,
                ev.urlImagen,
                ev.imagen].
                filter(Boolean);
                const candidatos = candidatosRaw.map((c) => normalizarUrlMedia(c)).filter(Boolean);
                const fecha = ev.fechaInicio ? new Date(ev.fechaInicio) : null;
                const fechaTexto = fecha ? fecha.toLocaleString() : '';
                const lat = ev.latitud ?? ev.coordenadas?.lat ?? ev.coordenadas?.latitude;
                const lng = ev.longitud ?? ev.coordenadas?.lng ?? ev.coordenadas?.longitude;
                const precio = ev.precio != null ? Number(ev.precio) : null;
                const cupo = ev.cupoMaximo ?? ev.capacidad ?? null;
                const telefono = ev.telefonoContacto || ev.telefono || '';
                const enlace = ev.enlaceEntradas || '';
                const id = String(ev.id || ev._id || '');
                const eta = id ? etaPorEvento[id]?.texto : null;
                const imgIdx = id ? imgIdxPorEvento[id] ?? 0 : 0;
                const img = candidatos[imgIdx] || null;
                const nivelEv = String(ev?.nivelRequerido || '').toLowerCase();
                const bloqueado =
                ev?.bloqueado === true ||
                nivelEv === 'thug' &&
                !puedeVerContenidoExclusivo(perfil?.nivelAcceso, perfil?.rol);
                const descTrim = String(ev.descripcion || '').trim();

                return (
                  <View key={ev.id || ev._id} style={estilos.cardContenedor}>
                    <View style={estilos.card}>
                      <View style={estilos.cardHeader}>
                        <Text style={estilos.cardTitulo}>{ev.titulo || '(sin título)'}</Text>
                        {ev.nivelRequerido ?
                        <Text style={estilos.badgeNivel}>{String(ev.nivelRequerido).toUpperCase()}</Text> :
                        null}
                      </View>

                      {bloqueado ?
                      <View style={estilos.eventoBloqueadoStack}>
                          {img ?
                        <View style={[estilos.cardImgWrap, estilos.eventoBloqueadoImgWrap]}>
                              <EventoCardImagen
                            key={`${id}-${imgIdx}-${img}`}
                            uri={img}
                            previewVelado
                            onLoadError={() => {
                              if (!id) return;
                              setImgIdxPorEvento((prev) => {
                                const nextIdx = (prev[id] ?? 0) + 1;
                                if (nextIdx >= candidatos.length) return { ...prev, [id]: Number.MAX_SAFE_INTEGER };
                                return { ...prev, [id]: nextIdx };
                              });
                            }} />
                            </View> :
                        null}
                          {!img && descTrim ?
                        <View style={[estilos.eventoBloqueadoTextoCaja]}>
                              <Text style={estilos.eventoBloqueadoTextoPreview}>{descTrim}</Text>
                            </View> :
                        null}
                          {!img && !descTrim ?
                        <View style={[estilos.cardImgWrap, estilos.cardImgWrapSinFoto, estilos.eventoBloqueadoImgWrap]}>
                              <Image
                            source={FONDO_THUGS}
                            style={estilos.eventoBloqueadoFondoPlaceholder}
                            resizeMode="cover" />
                              
                            </View> :
                        null}
                          <View
                          pointerEvents="none"
                          style={img ? estilos.eventoBloqueadoVeloSobreTeaserMedia : estilos.eventoBloqueadoVelo}>
                            <View style={estilos.eventoBloqueadoLeyendaCaja}>
                              <Text style={estilos.cardBloqueadoTitulo}>Para ver evento Thug</Text>
                              <Text style={estilos.cardBloqueadoSub}>Sube de nivel para verlo completo</Text>
                            </View>
                          </View>
                        </View> :

                      <>
                          <View style={[estilos.cardImgWrap, !img && estilos.cardImgWrapSinFoto]}>
                            {img ?
                          <EventoCardImagen
                            key={`${id}-${imgIdx}-${img}`}
                            uri={img}
                            onLoadError={() => {
                              if (!id) return;
                              setImgIdxPorEvento((prev) => {
                                const nextIdx = (prev[id] ?? 0) + 1;
                                if (nextIdx >= candidatos.length) return { ...prev, [id]: Number.MAX_SAFE_INTEGER };
                                return { ...prev, [id]: nextIdx };
                              });
                            }} /> :


                          <View style={estilos.cardImgPlaceholder}>
                                <Ionicons name="image-outline" size={20} color="#6b7280" />
                                <Text style={estilos.cardImgPlaceholderTexto}>Sin imagen</Text>
                              </View>
                            }
                          </View>

                          {ev.descripcion ?
                          <Text style={estilos.cardTexto}>{ev.descripcion}</Text> :
                          null}
                        </>
                      }

                      {!bloqueado ?
                      <View style={estilos.metaFila}>
                          {fechaTexto ?
                        <View style={estilos.metaItem}>
                              <Ionicons name="calendar-outline" size={16} color="#9ca3af" />
                              <Text style={estilos.metaTexto}>{fechaTexto}</Text>
                            </View> :
                        null}
                          {ev.lugar ?
                        <View style={estilos.metaItem}>
                              <Ionicons name="location-outline" size={16} color="#9ca3af" />
                              <Text style={estilos.metaTexto}>{ev.lugar}</Text>
                            </View> :
                        null}
                        </View> :
                      null}

                      {!bloqueado && (precio != null || cupo != null) ?
                      <View style={estilos.metaFila}>
                          {precio != null ?
                        <View style={estilos.metaItem}>
                              <Ionicons name="cash-outline" size={16} color="#9ca3af" />
                              <Text style={estilos.metaTexto}>${precio}</Text>
                            </View> :
                        null}
                          {cupo != null ?
                        <View style={estilos.metaItem}>
                              <Ionicons name="people-outline" size={16} color="#9ca3af" />
                              <Text style={estilos.metaTexto}>Cupo: {cupo}</Text>
                            </View> :
                        null}
                        </View> :
                      null}

                      {!bloqueado && (lat != null && lng != null || telefono || enlace) ?
                      <>
                          {lat != null && lng != null ?
                        <View
                          style={[
                          estilos.accionesPrincipalesFila,
                          esWebMovil && estilos.accionesPrincipalesFilaWebMovil]
                          }>
                          
                              {telefono ?
                          <View style={estilos.bloqueWhatsapp}>
                                  <TouchableOpacity
                              style={estilos.botonAccion}
                              onPress={() => abrirWhatsApp(telefono)}
                              activeOpacity={0.85}>
                              
                                    <Ionicons name="logo-whatsapp" size={16} color="#00dc57" />
                                    <Text style={estilos.botonAccionTexto}>{`WhatsApp: ${telefono}`}</Text>
                                  </TouchableOpacity>
                                </View> :
                          null}
                              <View
                                style={[
                                estilos.bloqueMapa,
                                !esWebMovil && estilos.bloqueMapaEscritorio,
                                esWebMovil && estilos.bloqueMapaWebMovil]
                                }>
                                <TouchableOpacity
                              style={[estilos.botonAccion, estilos.botonAccionMapa]}
                              onPress={() => abrirMapa(lat, lng)}
                              activeOpacity={0.85}>
                              
                                  <Ionicons name="map-outline" size={16} color="#00dc57" />
                                  <Text style={estilos.botonAccionTexto}>Ver mapa</Text>
                                </TouchableOpacity>
                                <View style={estilos.bloqueMapaEta}>
                                  {ubicacion ?
                            <Text style={estilos.etaTexto}>
                                      {eta ? `≈ ${eta}` : 'Calculando…'}
                                    </Text> :

                            <TouchableOpacity
                              onPress={() =>
                              Alert.alert('Ubicación', 'Activa la ubicación para ver el tiempo aproximado del trayecto.')
                              }>
                              
                                      <Text style={estilos.etaTextoMuted}>Activa ubicación</Text>
                                    </TouchableOpacity>
                            }
                                </View>
                              </View>
                            </View> :
                        null}
                          {telefono && (lat == null || lng == null) ?
                        <View style={estilos.accionesFila}>
                              <TouchableOpacity
                            style={estilos.botonAccion}
                            onPress={() => abrirWhatsApp(telefono)}
                            activeOpacity={0.85}>
                            
                                <Ionicons name="logo-whatsapp" size={16} color="#00dc57" />
                                <Text style={estilos.botonAccionTexto}>{`WhatsApp: ${telefono}`}</Text>
                              </TouchableOpacity>
                            </View> :
                        null}
                          {enlace ?
                        <View style={estilos.accionesFila}>
                              <TouchableOpacity
                            style={estilos.botonAccion}
                            onPress={() => Linking.openURL(enlace)}
                            activeOpacity={0.85}>
                            
                                <Ionicons name="open-outline" size={16} color="#00dc57" />
                                <Text style={estilos.botonAccionTexto}>Entradas</Text>
                              </TouchableOpacity>
                            </View> :
                        null}
                        </> :
                      null}

                      {ventanaAlto < 740 ? <View style={{ height: 4 }} /> : null}
                    </View>
                  </View>);

              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>);

}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#0d0d0d' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0d0d0d'
  },
  headerFlechaAtras: { marginRight: -18 },
  headerBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    padding: 4,
    flexGrow: 0,
    flexShrink: 1,
    alignSelf: 'flex-start',
    minWidth: 0,
    zIndex: 1
  },
  headerLogoAlLado: {
    height: 44,
    width: 176,
    flexShrink: 1,
    maxWidth: 200,
    marginLeft: -28
  },
  headerTitulo: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    zIndex: 0,
    pointerEvents: 'none',
    paddingHorizontal: 128
  },
  headerEspacioDer: { flex: 1, minWidth: 0, zIndex: 1 },
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
  vacioCaja: { padding: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10 },
  vacio: { color: '#888', fontSize: 14 },
  cardContenedor: { position: 'relative', marginBottom: 12 },
  card: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(26,26,26,0.88)' : 'rgba(28,28,28,0.92)',
    borderRadius: 16,
    padding: Platform.OS === 'web' ? 18 : 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden'
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitulo: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1 },
  badgeNivel: {
    color: '#00dc57',
    fontSize: 11,
    fontWeight: '800',
    backgroundColor: 'rgba(0,220,87,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,220,87,0.2)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999
  },
  cardImgWrap: {
    marginTop: 12,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  cardImgWrapSinFoto: { minHeight: 160 },
  /** Contenedor Thug: imagen + descripción nítidas, velo con blur (web) encima. */
  eventoBloqueadoStack: {
    marginTop: 12,
    position: 'relative',
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  eventoBloqueadoImgWrap: { marginTop: 0 },
  eventoBloqueadoTextoCaja: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#0a0a0a',
    minHeight: 72
  },
  eventoBloqueadoTextoPreview: { color: '#c4c4c4', fontSize: 14, lineHeight: 22 },
  eventoBloqueadoFondoPlaceholder: { width: '100%', height: 180, minHeight: 160 },
  /** Sobre imagen teaser: solo tinte (el blur va en la propia imagen / filtro CSS en web). */
  eventoBloqueadoVeloSobreTeaserMedia: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.38)'
  },
  eventoBloqueadoVelo: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
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
      backgroundColor: 'rgba(0,0,0,0.52)'
    })
  },
  eventoBloqueadoLeyendaCaja: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    maxWidth: 320,
    width: '100%'
  },
  cardBloqueadoTitulo: { color: '#00dc57', fontSize: 15, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
  cardBloqueadoSub: { color: '#d1d5db', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  cardImgPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.35)'
  },
  cardImgPlaceholderTexto: { color: '#6b7280', fontSize: 12, fontWeight: '700' },
  cardTexto: { color: '#bbb', fontSize: 14, marginTop: 10, lineHeight: 20 },
  metaFila: { marginTop: 10, gap: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaTexto: { color: '#9ca3af', fontSize: 13, flexShrink: 1 },
  accionesPrincipalesFila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 14
  },
  accionesPrincipalesFilaWebMovil: {
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start'
  },
  bloqueWhatsapp: { alignItems: 'flex-start' },
  bloqueMapa: {
    marginTop: -1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10
  },
  /** El bloque ocupa el espacio a la derecha del WhatsApp (escritorio / nativo). */
  bloqueMapaEscritorio: { flex: 1, minWidth: 0 },
  bloqueMapaWebMovil: { width: '100%', marginTop: 4 },
  /** Columna derecha: ETA alineada a la derecha, misma altura que el botón. */
  bloqueMapaEta: { flex: 1, minWidth: 0, alignItems: 'flex-end', justifyContent: 'center' },
  botonAccionMapa: { flexShrink: 0 },
  accionesFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  botonAccion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,220,87,0.35)',
    backgroundColor: 'rgba(0,0,0,0.15)'
  },
  botonAccionTexto: { color: '#00dc57', fontSize: 13, fontWeight: '700' },
  etaTexto: { color: '#c7c7c7', fontSize: 12, fontWeight: '700', flexShrink: 0, textAlign: 'right' },
  etaTextoMuted: { color: '#6b7280', fontSize: 12, fontWeight: '700', flexShrink: 0, textAlign: 'right' }
});