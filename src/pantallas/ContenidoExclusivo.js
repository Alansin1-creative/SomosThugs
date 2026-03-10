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
import * as ImagePicker from 'expo-image-picker';
import { listarContenidoExclusivo, crearContenidoExclusivo } from '../servicios/api';
import { useAuth } from '../contexto/AuthContext';
import { puedeVerContenidoExclusivo, esAdmin } from '../constantes/nivelesAcceso';

export default function ContenidoExclusivo({ navigation }) {
  const { perfil, cerrarSesion } = useAuth();
  const [lista, setLista] = useState([]);
  const [refrescando, setRefrescando] = useState(false);

  useEffect(() => {
    if (perfil && !puedeVerContenidoExclusivo(perfil.nivelAcceso, perfil.rol)) {
      navigation.replace('ContenidoGeneral');
    }
  }, [perfil, navigation]);

  const cargar = async () => {
    try {
      const datos = await listarContenidoExclusivo();
      setLista(datos);
    } catch (e) {
      console.warn(e);
      setLista([]);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const onRefresh = async () => {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  };

  const abrirCamara = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso', 'Activa la cámara.');
      return;
    }
    const resultado = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (resultado.canceled || !resultado.assets[0]) return;
    const uri = resultado.assets[0].uri;
    try {
      await crearContenidoExclusivo({
        titulo: 'Foto',
        descripcion: '',
        tipo: 'foto',
        urlArchivo: uri,
        thumbnailUrl: uri,
        subidoPor: perfil?.id || perfil?._id || '',
        duracionSegundos: 0,
        pesoBytes: 0,
        estado: 'publicado',
        visibilidad: 'thug',
        etiquetas: [],
        fechaGrabacion: new Date().toISOString(),
        version: 1,
        notas: '',
      });
      cargar();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.header}>
        <Text style={estilos.titulo}>Thug</Text>
        <View style={estilos.headerBotones}>
          {esAdmin(perfil) && (
            <TouchableOpacity style={estilos.botonCamara} onPress={abrirCamara}>
              <Text style={estilos.botonCamaraTexto}>Cámara</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => navigation.navigate('ContenidoGeneral')}
            style={estilos.botonVolver}
          >
            <Text style={estilos.botonVolverTexto}>General</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => cerrarSesion().then(() => navigation.replace('Inicio'))}
            style={estilos.botonCerrar}
          >
            <Text style={estilos.botonCerrarTexto}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={estilos.scrollContenido}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor="#00dc57" />
        }
      >
        {lista.length === 0 && (
          <Text style={estilos.vacio}>Nada aún.</Text>
        )}
        {lista.map((item) => (
          <View key={item.id} style={estilos.card}>
            <Text style={estilos.cardTitulo}>{item.titulo || item.tipo}</Text>
            <Text style={estilos.cardTexto}>{item.descripcion || ''}</Text>
            <Text style={estilos.cardTipo}>{item.tipo} — {item.fechaSubida ? new Date(item.fechaSubida).toLocaleDateString() : ''}</Text>
            {item.urlArchivo && (
              <TouchableOpacity onPress={() => Linking.openURL(item.urlArchivo)}>
                <Text style={estilos.enlace}>Ver</Text>
              </TouchableOpacity>
            )}
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
  headerBotones: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  botonCamara: { padding: 8 },
  botonCamaraTexto: { color: '#00dc57', fontSize: 14 },
  botonVolver: { padding: 8 },
  botonVolverTexto: { color: '#888', fontSize: 14 },
  botonCerrar: { padding: 8 },
  botonCerrarTexto: { color: '#666', fontSize: 14 },
  scroll: { flex: 1 },
  scrollContenido: { padding: 16, paddingBottom: 40 },
  vacio: { color: '#666', fontSize: 14 },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  cardTitulo: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  cardTexto: { color: '#aaa', fontSize: 14, marginBottom: 4 },
  cardTipo: { color: '#666', fontSize: 12 },
  enlace: { color: '#00dc57', marginTop: 6, fontSize: 14 },
});
