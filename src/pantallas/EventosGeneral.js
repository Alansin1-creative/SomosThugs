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
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { listarEventosPublicos } from '../servicios/api';
import { getBaseUrl } from '../config/api';

const FONDO_THUGS = require('../../assets/fondo-thugs.png');
const LOGO_THUGS = require('../../assets/logothugs.png');

function normalizarUrlMedia(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:')) return s;
  return getBaseUrl() + s;
}

export default function EventosGeneral({ navigation }) {
  const insets = useSafeAreaInsets();
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [ubicacion, setUbicacion] = useState(null); // { latitude, longitude }
  const [etaPorEvento, setEtaPorEvento] = useState({}); // id -> { texto, segundos }
  const [imgIdxPorEvento, setImgIdxPorEvento] = useState({}); // id -> idx de candidato
  const { height: ventanaAlto } = Dimensions.get('window');

  const pedirUbicacion = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setUbicacion(loc.coords);
    } catch (_) {
      // noop
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
    // OSRM público (driving). No requiere API key.
    // Nota: el orden es lng,lat
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

      // calcular para los primeros N sin saturar
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

      // Concurrencia baja
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
    return () => { cancel = true; };
  }, [ubicacion, eventos]); // eslint-disable-line react-hooks/exhaustive-deps

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
          style={estilos.scroll}
          contentContainerStyle={estilos.scrollContenido}
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor="#00dc57" />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={estilos.contenidoSobreFondo}>
            <View style={estilos.contenidoCentrado}>
              {cargando ? (
                <Text style={estilos.vacio}>Cargando…</Text>
              ) : eventos.length === 0 ? (
                <View style={estilos.vacioCaja}>
                  <Text style={estilos.vacio}>Sin eventos por ahora.</Text>
                </View>
              ) : null}

              {eventos.map((ev) => {
                const candidatosRaw = [
                  ev.imagenUrl,
                  ev.imagenPromocionalUrl,
                  ev.imagenPromocional,
                  ev.urlImagen,
                  ev.imagen,
                ].filter(Boolean);
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
                const imgIdx = id ? (imgIdxPorEvento[id] ?? 0) : 0;
                const img = candidatos[imgIdx] || null;

                return (
                  <View key={ev.id || ev._id} style={estilos.cardContenedor}>
                    <View style={estilos.card}>
                      <View style={estilos.cardHeader}>
                        <Text style={estilos.cardTitulo}>{ev.titulo || '(sin título)'}</Text>
                        {ev.nivelRequerido ? (
                          <Text style={estilos.badgeNivel}>{String(ev.nivelRequerido).toUpperCase()}</Text>
                        ) : null}
                      </View>

                      <View style={estilos.cardImgWrap}>
                        {img ? (
                          <Image
                            source={{ uri: img }}
                            style={estilos.cardImg}
                            resizeMode="cover"
                            onError={() => {
                              if (!id) return;
                              setImgIdxPorEvento((prev) => {
                                const nextIdx = (prev[id] ?? 0) + 1;
                                if (nextIdx >= candidatos.length) return { ...prev, [id]: Number.MAX_SAFE_INTEGER };
                                return { ...prev, [id]: nextIdx };
                              });
                            }}
                          />
                        ) : (
                          <View style={estilos.cardImgPlaceholder}>
                            <Ionicons name="image-outline" size={20} color="#6b7280" />
                            <Text style={estilos.cardImgPlaceholderTexto}>Sin imagen</Text>
                          </View>
                        )}
                      </View>

                      {ev.descripcion ? (
                        <Text style={estilos.cardTexto}>{ev.descripcion}</Text>
                      ) : null}

                      <View style={estilos.metaFila}>
                        {fechaTexto ? (
                          <View style={estilos.metaItem}>
                            <Ionicons name="calendar-outline" size={16} color="#9ca3af" />
                            <Text style={estilos.metaTexto}>{fechaTexto}</Text>
                          </View>
                        ) : null}
                        {ev.lugar ? (
                          <View style={estilos.metaItem}>
                            <Ionicons name="location-outline" size={16} color="#9ca3af" />
                            <Text style={estilos.metaTexto}>{ev.lugar}</Text>
                          </View>
                        ) : null}
                      </View>

                      {(precio != null || cupo != null) ? (
                        <View style={estilos.metaFila}>
                          {precio != null ? (
                            <View style={estilos.metaItem}>
                              <Ionicons name="cash-outline" size={16} color="#9ca3af" />
                              <Text style={estilos.metaTexto}>${precio}</Text>
                            </View>
                          ) : null}
                          {cupo != null ? (
                            <View style={estilos.metaItem}>
                              <Ionicons name="people-outline" size={16} color="#9ca3af" />
                              <Text style={estilos.metaTexto}>Cupo: {cupo}</Text>
                            </View>
                          ) : null}
                        </View>
                      ) : null}

                      {(lat != null && lng != null) || telefono || enlace ? (
                        <>
                          {lat != null && lng != null ? (
                            <View style={estilos.accionesPrincipalesFila}>
                              {telefono ? (
                                <View style={estilos.bloqueWhatsapp}>
                                  <TouchableOpacity
                                    style={estilos.botonAccion}
                                    onPress={() => abrirWhatsApp(telefono)}
                                    activeOpacity={0.85}
                                  >
                                    <Ionicons name="logo-whatsapp" size={16} color="#00dc57" />
                                    <Text style={estilos.botonAccionTexto}>{`WhatsApp: ${telefono}`}</Text>
                                  </TouchableOpacity>
                                </View>
                              ) : null}
                              <View style={estilos.bloqueMapa}>
                                <TouchableOpacity
                                  style={estilos.botonAccion}
                                  onPress={() => abrirMapa(lat, lng)}
                                  activeOpacity={0.85}
                                >
                                  <Ionicons name="map-outline" size={16} color="#00dc57" />
                                  <Text style={estilos.botonAccionTexto}>Ver mapa</Text>
                                </TouchableOpacity>
                                {ubicacion ? (
                                  <Text style={estilos.etaTexto}>
                                    {eta ? `≈ ${eta}` : 'Calculando…'}
                                  </Text>
                                ) : (
                                  <TouchableOpacity
                                    onPress={() =>
                                      Alert.alert('Ubicación', 'Activa la ubicación para ver el tiempo aproximado de ruta.')
                                    }
                                  >
                                    <Text style={estilos.etaTextoMuted}>Activa ubicación</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          ) : null}
                          {telefono && (lat == null || lng == null) ? (
                            <View style={estilos.accionesFila}>
                              <TouchableOpacity
                                style={estilos.botonAccion}
                                onPress={() => abrirWhatsApp(telefono)}
                                activeOpacity={0.85}
                              >
                                <Ionicons name="logo-whatsapp" size={16} color="#00dc57" />
                                <Text style={estilos.botonAccionTexto}>{`WhatsApp: ${telefono}`}</Text>
                              </TouchableOpacity>
                            </View>
                          ) : null}
                          {enlace ? (
                            <View style={estilos.accionesFila}>
                              <TouchableOpacity
                                style={estilos.botonAccion}
                                onPress={() => Linking.openURL(enlace)}
                                activeOpacity={0.85}
                              >
                                <Ionicons name="open-outline" size={16} color="#00dc57" />
                                <Text style={estilos.botonAccionTexto}>Entradas</Text>
                              </TouchableOpacity>
                            </View>
                          ) : null}
                        </>
                      ) : null}

                      {ventanaAlto < 740 ? <View style={{ height: 4 }} /> : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
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
    maxWidth: Platform.OS === 'web' ? 700 : '100%',
    alignSelf: Platform.OS === 'web' ? 'center' : 'stretch',
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
    overflow: 'hidden',
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
    borderRadius: 999,
  },
  cardImgWrap: {
    marginTop: 12,
    width: '100%',
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardImg: { width: '100%', height: '100%' },
  cardImgPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
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
    marginTop: 14,
  },
  bloqueWhatsapp: { alignItems: 'flex-start' },
  bloqueMapa: { marginTop: -1, alignItems: 'flex-end' },
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
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  botonAccionTexto: { color: '#00dc57', fontSize: 13, fontWeight: '700' },
  etaTexto: { marginTop: 6, color: '#c7c7c7', fontSize: 12, fontWeight: '700' },
  etaTextoMuted: { marginTop: 6, color: '#6b7280', fontSize: 12, fontWeight: '700' },
});

