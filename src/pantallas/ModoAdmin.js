import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../contexto/AuthContext';
import { esAdmin, nombreRutaHomeApp } from '../constantes/nivelesAcceso';

const OPCIONES = [
  { id: 'usuarios', titulo: 'Usuarios', descripcion: 'Lista de usuarios, premium, admin, editar y borrar' },
  { id: 'contenido-exclusivo', titulo: 'Subir contenido Thug', descripcion: 'Crear y editar publicaciones exclusivas (texto, media, métricas)' },
  { id: 'eventos', titulo: 'Eventos', descripcion: 'Agregar y editar eventos' },
  { id: 'flyers', titulo: 'Flyers Presskit', descripcion: 'Agregar o quitar imágenes del carrusel' },
];

export default function ModoAdmin({ navigation }) {
  const { perfil } = useAuth();

  useEffect(() => {
    if (perfil && !esAdmin(perfil)) {
      navigation.replace(nombreRutaHomeApp(perfil));
    }
  }, [perfil, navigation]);

  const abrir = (id) => {
    if (id === 'usuarios') navigation.navigate('AdminUsuarios');
    if (id === 'contenido-exclusivo') navigation.navigate('AdminContenidoExclusivo');
    if (id === 'eventos') navigation.navigate('AdminEventos');
    if (id === 'flyers') navigation.navigate('AdminFlyers');
  };

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.header}>
        <Text style={estilos.titulo}>Modo admin</Text>
        <TouchableOpacity
          style={estilos.botonApp}
          onPress={() => navigation.replace('ContenidoGeneral')}
        >
          <Text style={estilos.botonAppTexto}>Ir a la app</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={estilos.scroll} contentContainerStyle={estilos.contenido}>
        <Text style={estilos.mensaje}>Panel de administración</Text>
        <Text style={estilos.hint}>Elige una opción:</Text>
        {OPCIONES.map((op) => (
          <TouchableOpacity
            key={op.id}
            style={estilos.opcion}
            onPress={() => abrir(op.id)}
            activeOpacity={0.7}
          >
            <Text style={estilos.opcionTitulo}>{op.titulo}</Text>
            <Text style={estilos.opcionDesc}>{op.descripcion}</Text>
          </TouchableOpacity>
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
  botonApp: { padding: 8 },
  botonAppTexto: { color: '#00dc57', fontSize: 14, fontWeight: '600' },
  scroll: { flex: 1 },
  contenido: { padding: 24, paddingTop: 16, paddingBottom: 40 },
  mensaje: { fontSize: 18, color: '#fff', marginBottom: 4 },
  hint: { fontSize: 14, color: '#666', marginBottom: 20 },
  opcion: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  opcionTitulo: { fontSize: 18, color: '#fff', fontWeight: '600', marginBottom: 4 },
  opcionDesc: { fontSize: 13, color: '#888' },
});
