import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { listarEventosPublicos, listarPublicaciones, listarContenidoExclusivoFeed } from '../servicios/api';
import { puedeVerContenidoExclusivo } from '../constantes/nivelesAcceso';
import { useAuth } from '../contexto/AuthContext';
import { getBaseUrl } from '../config/api';

const FONDO_THUGS = require('../../assets/fondo-thugs.png');
const LOGO_THUGS = require('../../assets/logothugs.png');

export default function ContenidoGeneral({ navigation }) {
  const insets = useSafeAreaInsets();
  const { perfil, cerrarSesion, cargando: authCargando } = useAuth();
  const [eventos, setEventos] = useState([]);
  const [publicaciones, setPublicaciones] = useState([]);
  const [contenidoFan, setContenidoFan] = useState([]);
  const [ubicacion, setUbicacion] = useState(null);
  const [refrescando, setRefrescando] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!authCargando && !perfil) {
      navigation.replace('Inicio');
    }
  }, [perfil, authCargando, navigation]);

  const cargarDatos = async () => {
    try {
      const [resEventos, resPublicaciones, resFeed] = await Promise.allSettled([
        listarEventosPublicos(),
        listarPublicaciones(),
        listarContenidoExclusivoFeed(),
      ]);
      setEventos(
        resEventos.status === 'fulfilled' && Array.isArray(resEventos.value) ? resEventos.value : []
      );
      setPublicaciones(
        resPublicaciones.status === 'fulfilled' && Array.isArray(resPublicaciones.value)
          ? resPublicaciones.value
          : []
      );
      setContenidoFan(
        resFeed.status === 'fulfilled' && Array.isArray(resFeed.value) ? resFeed.value : []
      );
      if (resFeed.status === 'rejected') {
        console.warn('Feed contenido fan:', resFeed.reason);
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
        <View style={estilos.headerDerecha}>
          <TouchableOpacity style={estilos.headerBoton} onPress={pedirUbicacion}>
            <Text style={estilos.headerBotonTexto}>Ubicación</Text>
          </TouchableOpacity>
          {puedeVerContenidoExclusivo(perfil?.nivelAcceso) && (
            <TouchableOpacity
              style={estilos.headerBoton}
              onPress={() => navigation.navigate('ContenidoExclusivo')}
            >
              <Text style={estilos.headerBotonTexto}>Zona Thug</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={estilos.headerBoton}
            onPress={() => cerrarSesion().then(() => navigation.replace('Inicio'))}
          >
            <Text style={estilos.headerBotonCerrar}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
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
            resizeMode="repeat"
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
            {ubicacion && (
              <View style={estilos.card}>
                <Text style={estilos.cardTitulo}>Tu ubicación</Text>
                <Text style={estilos.cardTexto}>
                  Lat: {ubicacion.latitude.toFixed(4)}, Lng: {ubicacion.longitude.toFixed(4)}
                </Text>
              </View>
            )}

            <Text style={estilos.seccion}>Contenido</Text>
            {contenidoFan.length === 0 && !cargando && (
              <View style={estilos.vacioCaja}>
                <Text style={estilos.vacio}>Sin contenido con nivel «fan».</Text>
                <Text style={estilos.vacioHint}>
                  En Subir contenido Thug, crea una publicación y elige «Nivel requerido: fan» para que aparezca aquí. Desliza hacia abajo para actualizar.
                </Text>
              </View>
            )}
            {contenidoFan.map((item) => {
              const previewUrl = item.urlMediaPreview || item.urlArchivo;
              const mediaUrl = item.urlMediaCompleta || item.urlMediaPreview || item.urlArchivo;
              const urlCompleta =
                previewUrl && (previewUrl.startsWith('http') || previewUrl.startsWith('data:'))
                  ? previewUrl
                  : previewUrl
                    ? getBaseUrl() + previewUrl
                    : null;
              return (
                <View key={item.id} style={estilos.card}>
                  <Text style={estilos.cardTitulo}>{item.titulo || 'Sin título'}</Text>
                  {(item.previewTexto || item.descripcion) && (
                    <Text style={estilos.cardTexto} numberOfLines={4}>
                      {item.previewTexto || item.descripcion}
                    </Text>
                  )}
                  {urlCompleta && (
                    <TouchableOpacity
                      style={estilos.cardPreviewImg}
                      onPress={() =>
                        mediaUrl &&
                        Linking.openURL(
                          mediaUrl.startsWith('http') ? mediaUrl : getBaseUrl() + mediaUrl
                        )
                      }
                    >
                      <Image
                        source={{ uri: urlCompleta }}
                        style={estilos.cardPreviewImgInner}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  )}
                  <Text style={estilos.cardMeta}>
                    {item.tipoContenido || item.tipo || 'articulo'} •{' '}
                    {item.fechaPublicacion
                      ? new Date(item.fechaPublicacion).toLocaleDateString()
                      : ''}
                  </Text>
                </View>
              );
            })}

            <Text style={estilos.seccion}>Eventos</Text>
            {eventos.length === 0 && !cargando && (
              <Text style={estilos.vacio}>Sin eventos.</Text>
            )}
            {eventos.map((ev) => (
              <View key={ev.id} style={estilos.card}>
                <Text style={estilos.cardTitulo}>{ev.titulo || ''}</Text>
                <Text style={estilos.cardTexto}>{ev.descripcion || ''}</Text>
                <Text style={estilos.cardFecha}>
                  {ev.fechaInicio ? new Date(ev.fechaInicio).toLocaleDateString() : ''} —{' '}
                  {ev.lugar || ''}
                </Text>
                {ev.latitud != null && ev.longitud != null && (
                  <TouchableOpacity onPress={() => abrirMapa(ev.latitud, ev.longitud)}>
                    <Text style={estilos.enlaceMapa}>Mapa</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <Text style={estilos.seccion}>Publicaciones</Text>
            {publicaciones.length === 0 && !cargando && (
              <Text style={estilos.vacio}>Sin publicaciones.</Text>
            )}
            {publicaciones.map((pub) => (
              <View key={pub.id} style={estilos.card}>
                <Text style={estilos.cardTitulo}>{pub.titulo || ''}</Text>
                <Text style={estilos.cardTexto} numberOfLines={3}>
                  {pub.contenido || ''}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
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
  headerDerecha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 1,
  },
  headerBoton: { padding: 6 },
  headerBotonTexto: { color: '#00dc57', fontSize: 13 },
  headerBotonCerrar: { color: '#888', fontSize: 13 },
  areaContenido: { flex: 1 },
  fondoAbsoluto: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  fondoImagen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    zIndex: 0,
  },
  scroll: { flex: 1 },
  scrollContenido: {
    padding: 20,
    paddingBottom: 48,
    zIndex: 1,
  },
  contenidoSobreFondo: { zIndex: 1 },
  seccion: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 16,
  },
  card: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(26,26,26,0.85)' : 'rgba(26,26,26,0.9)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  cardTitulo: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  cardTexto: { color: '#bbb', fontSize: 14, marginBottom: 6, lineHeight: 20 },
  cardFecha: { color: '#888', fontSize: 12, marginBottom: 4 },
  cardMeta: { color: '#666', fontSize: 12 },
  cardPreviewImg: {
    width: '100%',
    maxHeight: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 8,
    backgroundColor: '#1a1a1a',
  },
  cardPreviewImgInner: { width: '100%', height: 200 },
  enlaceMapa: { color: '#00dc57', marginTop: 6, fontSize: 14 },
  vacioCaja: { marginBottom: 16, padding: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8 },
  vacio: { color: '#888', fontSize: 14, marginBottom: 4 },
  vacioHint: { color: '#666', fontSize: 12 },
});
