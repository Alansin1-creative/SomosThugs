import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { esAdmin, nombreRutaHomeApp } from '../constantes/nivelesAcceso';
import { useAuth } from '../contexto/AuthContext';

export default function MenuAdmin({ navigation }) {
  const { perfil } = useAuth();

  useEffect(() => {
    if (perfil && !esAdmin(perfil)) {
      navigation.replace(nombreRutaHomeApp(perfil));
    }
  }, [perfil, navigation]);

  const irALaApp = () => {
    navigation.replace('ContenidoGeneral');
  };

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.titulo}>Admin</Text>
      <Text style={estilos.subtitulo}>Elige una opción</Text>
      <TouchableOpacity style={estilos.boton} onPress={irALaApp}>
        <Text style={estilos.botonTexto}>Desplegar la app</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[estilos.boton, estilos.botonSecundario]}
        onPress={() => navigation.navigate('ModoAdmin')}
      >
        <Text style={estilos.botonSecundarioTexto}>Entrar al modo admin</Text>
      </TouchableOpacity>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    padding: 24,
    paddingTop: 80,
  },
  titulo: { fontSize: 28, color: '#fff', fontWeight: '700', marginBottom: 8 },
  subtitulo: { fontSize: 16, color: '#888', marginBottom: 32 },
  boton: {
    backgroundColor: '#00dc57',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  botonSecundario: { backgroundColor: '#2a2a2a', borderWidth: 1, borderColor: '#00dc57' },
  botonTexto: { color: '#000', fontSize: 18, fontWeight: '600' },
  botonSecundarioTexto: { color: '#00dc57', fontSize: 18, fontWeight: '600' },
});
