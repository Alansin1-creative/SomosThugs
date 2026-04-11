import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, Platform, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexto/AuthContext';
import { esAdmin } from '../constantes/nivelesAcceso';
import { crearFlyer, eliminarFlyer, listarFlyersAdmin } from '../servicios/api';
import { getBaseUrl } from '../config/api';

const isWeb = Platform.OS === 'web';

function absolutizar(url) {
  let s = String(url || '').trim();
  if (s.includes('/uploads/flyer_') && !s.includes('/uploads/flyers/')) {
    s = s.replace('/uploads/flyer_', '/uploads/flyers/flyer_');
  }
  if (!s) return '';
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:')) return s;
  const base = getBaseUrl();
  return `${base}${s.startsWith('/') ? s : `/${s}`}`;
}

export default function AdminFlyers({ navigation }) {
  const { perfil } = useAuth();
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);

  useEffect(() => {
    if (perfil && !esAdmin(perfil)) {
      navigation.replace('ContenidoGeneral');
    }
  }, [perfil, navigation]);

  const cargar = async () => {
    setCargando(true);
    try {
      const data = await listarFlyersAdmin();
      setLista(Array.isArray(data) ? data : []);
    } catch (e) {
      setLista([]);
      Alert.alert('Flyers', e?.message || 'No se pudieron cargar.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const subirFlyer = async () => {
    if (subiendo) return;
    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        input.onchange = async (ev) => {
          const file = ev?.target?.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async () => {
            try {
              setSubiendo(true);
              await crearFlyer({ imagenBase64: reader.result });
              await cargar();
            } catch (e) {
              Alert.alert('Flyers', e?.message || 'No se pudo subir el flyer.');
            } finally {
              setSubiendo(false);
            }
          };
          reader.readAsDataURL(file);
          input.remove();
        };
        document.body.appendChild(input);
        input.click();
        return;
      }

      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        base64: true
      });
      if (r.canceled || !r.assets?.[0]) return;
      const asset = r.assets[0];
      const mime = asset.mimeType || 'image/jpeg';
      const imagenBase64 = asset.base64 ? `data:${mime};base64,${asset.base64}` : '';
      if (!imagenBase64) return Alert.alert('Flyers', 'No se pudo leer la imagen.');
      setSubiendo(true);
      await crearFlyer({ imagenBase64 });
      await cargar();
    } catch (e) {
      Alert.alert('Flyers', e?.message || 'No se pudo subir el flyer.');
    } finally {
      setSubiendo(false);
    }
  };

  const borrar = (item) => {
    const id = String(item?.id || item?._id || '').trim();
    if (!id) {
      Alert.alert('Flyers', 'No se encontró el identificador del flyer.');
      return;
    }
    const ejecutar = async () => {
      try {
        await eliminarFlyer(id);
        setLista((prev) => prev.filter((x) => String(x?.id || x?._id || '') !== id));
      } catch (e) {
        Alert.alert('Flyers', e?.message || 'No se pudo eliminar.');
      }
    };

    if (isWeb && typeof window !== 'undefined') {
      if (window.confirm('¿Seguro que quieres eliminar esta imagen?')) {
        ejecutar();
      }
      return;
    }

    Alert.alert('Eliminar flyer', '¿Seguro que quieres eliminar esta imagen?', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: ejecutar }]
    );
  };

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.header}>
        <TouchableOpacity style={estilos.botonAtras} onPress={() => navigation.goBack()}>
          <Text style={estilos.botonAtrasTexto}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={estilos.titulo}>Flyers</Text>
      </View>

      <View style={estilos.acciones}>
        <TouchableOpacity style={[estilos.botonSubir, subiendo && estilos.botonSubirDisabled]} onPress={subirFlyer} disabled={subiendo}>
          {subiendo ? <ActivityIndicator color="#000" /> : <Ionicons name="cloud-upload-outline" size={18} color="#000" />}
          <Text style={estilos.botonSubirTxt}>{subiendo ? 'Subiendo...' : 'Agregar flyer'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={estilos.lista}>
        {cargando ? <ActivityIndicator color="#00dc57" /> : null}
        {!cargando && lista.length === 0 ?
        <Text style={estilos.vacio}>Sin flyers todavía.</Text> :
        null}
        {lista.map((item) =>
        <View key={item.id} style={estilos.card}>
            <Image source={{ uri: absolutizar(item.urlImagen) }} style={estilos.imagen} resizeMode="cover" />
            <TouchableOpacity style={estilos.borrar} onPress={() => borrar(item)}>
              <Ionicons name="trash-outline" size={16} color="#ff5f5f" />
              <Text style={estilos.borrarTxt}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>);

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
    borderBottomColor: '#2a2a2a'
  },
  botonAtras: { padding: 8, marginRight: 8 },
  botonAtrasTexto: { color: '#00dc57', fontSize: 14 },
  titulo: { color: '#fff', fontSize: 20, fontWeight: '600' },
  acciones: { padding: 16 },
  botonSubir: {
    backgroundColor: '#00dc57',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8
  },
  botonSubirDisabled: { opacity: 0.6 },
  botonSubirTxt: { color: '#000', fontWeight: '700' },
  lista: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  vacio: { color: '#888', fontSize: 14 },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2b2b2b',
    backgroundColor: '#141414'
  },
  imagen: { width: '100%', height: 180, backgroundColor: '#111' },
  borrar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#242424',
    alignSelf: 'flex-end'
  },
  borrarTxt: { color: '#ff5f5f', fontWeight: '600' }
});