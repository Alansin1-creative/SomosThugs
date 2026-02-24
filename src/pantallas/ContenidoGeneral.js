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
} from 'react-native';
import * as Location from 'expo-location';
import { listarEventosPublicos, listarPublicaciones } from '../servicios/api';
import { puedeVerContenidoExclusivo } from '../constantes/nivelesAcceso';
import { useAuth } from '../contexto/AuthContext';

export default function ContenidoGeneral({ navigation }) {
  const { perfil, cerrarSesion, cargando: authCargando } = useAuth();
  const [eventos, setEventos] = useState([]);
  const [publicaciones, setPublicaciones] = useState([]);
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
      const [listaEventos, listaPublicaciones] = await Promise.all([
        listarEventosPublicos(),
        listarPublicaciones(),
      ]);
      setEventos(listaEventos);
      setPublicaciones(listaPublicaciones);
    } catch (e) {
      console.warn(e);
      setEventos([]);
      setPublicaciones([]);
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

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.header}>
        <Text style={estilos.titulo}>General</Text>
        <TouchableOpacity style={estilos.botonUbicacion} onPress={pedirUbicacion}>
          <Text style={estilos.botonUbicacionTexto}>Ubicación</Text>
        </TouchableOpacity>
        {puedeVerContenidoExclusivo(perfil?.nivelAcceso) && (
          <TouchableOpacity
            style={estilos.botonThug}
            onPress={() => navigation.navigate('ContenidoExclusivo')}
          >
            <Text style={estilos.botonThugTexto}>Zona Thug</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={estilos.botonCerrar} onPress={() => cerrarSesion().then(() => navigation.replace('Inicio'))}>
          <Text style={estilos.botonCerrarTexto}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={estilos.scrollContenido}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor="#c9a227" />
        }
      >
        {ubicacion && (
          <View style={estilos.card}>
            <Text style={estilos.cardTitulo}>Tu ubicación</Text>
            <Text style={estilos.cardTexto}>
              Lat: {ubicacion.latitude.toFixed(4)}, Lng: {ubicacion.longitude.toFixed(4)}
            </Text>
          </View>
        )}
        <Text style={estilos.seccion}>Eventos</Text>
        {eventos.length === 0 && !cargando && (
          <Text style={estilos.vacio}>Sin eventos.</Text>
        )}
        {eventos.map((ev) => (
          <View key={ev.id} style={estilos.card}>
            <Text style={estilos.cardTitulo}>{ev.titulo || ''}</Text>
            <Text style={estilos.cardTexto}>{ev.descripcion || ''}</Text>
            <Text style={estilos.cardFecha}>
              {ev.fechaInicio ? new Date(ev.fechaInicio).toLocaleDateString() : ''} — {ev.lugar || ''}
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
            <Text style={estilos.cardTexto} numberOfLines={3}>{pub.contenido || ''}</Text>
          </View>
        ))}
      </ScrollView>
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
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  titulo: { fontSize: 20, color: '#fff', fontWeight: '600' },
  botonUbicacion: { padding: 8 },
  botonUbicacionTexto: { color: '#c9a227', fontSize: 14 },
  botonThug: { padding: 8 },
  botonThugTexto: { color: '#c9a227', fontSize: 14 },
  botonCerrar: { padding: 8 },
  botonCerrarTexto: { color: '#666', fontSize: 14 },
  scroll: { flex: 1 },
  scrollContenido: { padding: 16, paddingBottom: 40 },
  seccion: { fontSize: 18, color: '#fff', marginBottom: 12, marginTop: 8 },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  cardTitulo: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  cardTexto: { color: '#aaa', fontSize: 14, marginBottom: 4 },
  cardFecha: { color: '#888', fontSize: 12 },
  enlaceMapa: { color: '#c9a227', marginTop: 6, fontSize: 14 },
  vacio: { color: '#666', fontSize: 14, marginBottom: 12 },
});
