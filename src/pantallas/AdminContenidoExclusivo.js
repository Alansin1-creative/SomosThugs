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
import { esAdmin } from '../constantes/nivelesAcceso';

export default function AdminContenidoExclusivo({ navigation }) {
  const { perfil } = useAuth();
  const [lista, setLista] = useState([]);
  const [refrescando, setRefrescando] = useState(false);

  useEffect(() => {
    if (perfil && !esAdmin(perfil)) {
      navigation.replace('ContenidoGeneral');
    }
  }, [perfil, navigation]);

  const cargar = async () => {
    try {
      const datos = await listarContenidoExclusivo();
      setLista(Array.isArray(datos) ? datos : []);
    } catch (e) {
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

  const subirDesdeCamara = async () => {
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
        subidoPor: perfil?.id || '',
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

  const subirDesdeGaleria = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso', 'Activa la galería.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
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
        subidoPor: perfil?.id || '',
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

  const elegirSubir = () => {
    Alert.alert('Subir contenido', 'Elige el origen', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cámara', onPress: subirDesdeCamara },
      { text: 'Galería', onPress: subirDesdeGaleria },
    ]);
  };

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={estilos.botonAtras}>
          <Text style={estilos.botonAtrasTexto}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={estilos.titulo}>Contenido exclusivo</Text>
      </View>
      <TouchableOpacity style={estilos.botonSubir} onPress={elegirSubir}>
        <Text style={estilos.botonSubirTexto}>+ Subir (cámara o galería)</Text>
      </TouchableOpacity>
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={estilos.scrollContenido}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor="#c9a227" />
        }
      >
        {lista.length === 0 && (
          <Text style={estilos.vacio}>Aún no hay contenido. Usa el botón de arriba para subir.</Text>
        )}
        {lista.map((item) => (
          <View key={item.id} style={estilos.card}>
            <Text style={estilos.cardTitulo}>{item.titulo || item.tipo}</Text>
            <Text style={estilos.cardTexto}>{item.descripcion || ''}</Text>
            <Text style={estilos.cardMeta}>
              {item.tipo} — {item.fechaSubida ? new Date(item.fechaSubida).toLocaleDateString() : ''}
            </Text>
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
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  botonAtras: { padding: 8, marginRight: 8 },
  botonAtrasTexto: { color: '#c9a227', fontSize: 14 },
  titulo: { fontSize: 20, color: '#fff', fontWeight: '600' },
  botonSubir: {
    backgroundColor: '#c9a227',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  botonSubirTexto: { color: '#000', fontWeight: '600', fontSize: 16 },
  scroll: { flex: 1 },
  scrollContenido: { padding: 16, paddingBottom: 40 },
  vacio: { color: '#666', fontSize: 14, marginTop: 16 },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  cardTitulo: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  cardTexto: { color: '#aaa', fontSize: 14, marginBottom: 4 },
  cardMeta: { color: '#666', fontSize: 12 },
  enlace: { color: '#c9a227', marginTop: 6, fontSize: 14 },
});
