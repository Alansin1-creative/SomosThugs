import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';

const LOGO_TEXTO = 'Somos Thugs';
const IMAGENES_PRESSKIT = [
  { id: '1', uri: null, titulo: '' },
  { id: '2', uri: null, titulo: '' },
  { id: '3', uri: null, titulo: '' },
];

export default function InicioPresskit({ navigation }) {
  const [imagenes] = useState(IMAGENES_PRESSKIT);
  const { width } = useWindowDimensions();

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Inicio')} style={estilos.logo}>
          <Text style={estilos.logoTexto}>{LOGO_TEXTO}</Text>
        </TouchableOpacity>
        <View style={estilos.botonesHeader}>
          <TouchableOpacity
            style={estilos.botonSecundario}
            onPress={() => navigation.navigate('Registro')}
          >
            <Text style={estilos.botonSecundarioTexto}>Registro</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={estilos.botonPrimario}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={estilos.botonPrimarioTexto}>Iniciar sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={estilos.scrollContenido}
        showsVerticalScrollIndicator={false}
      >
        <Text style={estilos.tituloSeccion}>@LosThugs</Text>
        {imagenes.map((item) => (
          <View key={item.id} style={[estilos.cardPresskit, { width: width - 32 }]}>
            {item.uri ? (
              <Image source={{ uri: item.uri }} style={estilos.imagenPresskit} resizeMode="cover" />
            ) : (
              <View style={estilos.placeholderImagen}>
                <Text style={estilos.placeholderTexto}>{item.titulo || item.id}</Text>
              </View>
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
  logo: { flex: 1 },
  logoTexto: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  botonesHeader: { flexDirection: 'row', gap: 8 },
  botonSecundario: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#888',
  },
  botonSecundarioTexto: { color: '#ccc', fontSize: 14 },
  botonPrimario: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#c9a227',
  },
  botonPrimarioTexto: { color: '#000', fontSize: 14, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContenido: { padding: 16, paddingBottom: 40 },
  tituloSeccion: { fontSize: 18, color: '#fff', marginBottom: 16 },
  cardPresskit: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  imagenPresskit: { width: '100%', height: 200 },
  placeholderImagen: {
    width: '100%',
    height: 200,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderTexto: { color: '#666', fontSize: 14 },
});
