import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { iniciarSesionEmail, iniciarSesionConTokenGoogle } from '../servicios/auth';
import { puedeVerContenidoExclusivo } from '../constantes/nivelesAcceso';

WebBrowser.maybeCompleteAuthSession();

export default function Login({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [cargandoGoogle, setCargandoGoogle] = useState(false);

  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    clientId: '711635271834-r316qrd5p19oh8mcn1n1qg1o00209nav.apps.googleusercontent.com',
  });

  const enviarEmail = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('', 'Email y contraseña.');
      return;
    }
    setCargando(true);
    try {
      const perfil = await iniciarSesionEmail(email.trim(), password);
      if (!perfil) {
        Alert.alert('Error', 'Perfil no encontrado.');
        return;
      }
      if (puedeVerContenidoExclusivo(perfil.nivelAcceso)) {
        navigation.replace('ContenidoExclusivo');
      } else {
        navigation.replace('ContenidoGeneral');
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCargando(false);
    }
  };

  const enviarGoogle = async () => {
    if (!request) return;
    setCargandoGoogle(true);
    try {
      const result = await promptAsync();
      if (result?.type !== 'success' || !result.params.id_token) {
        if (result?.type !== 'cancel') {
          Alert.alert('Error', 'Inicio de sesión con Google cancelado o fallido.');
        }
        return;
      }
      const perfil = await iniciarSesionConTokenGoogle(result.params.id_token);
      if (puedeVerContenidoExclusivo(perfil.nivelAcceso)) {
        navigation.replace('ContenidoExclusivo');
      } else {
        navigation.replace('ContenidoGeneral');
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCargandoGoogle(false);
    }
  };

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.titulo}>Iniciar sesión</Text>
      <TextInput
        style={estilos.input}
        placeholder="Email"
        placeholderTextColor="#666"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={estilos.input}
        placeholder="Contraseña"
        placeholderTextColor="#666"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity
        style={[estilos.boton, cargando && estilos.botonDeshabilitado]}
        onPress={enviarEmail}
        disabled={cargando}
      >
        {cargando ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={estilos.botonTexto}>Entrar</Text>
        )}
      </TouchableOpacity>
      <Text style={estilos.separador}>o</Text>
      <TouchableOpacity
        style={[estilos.botonGoogle, cargandoGoogle && estilos.botonDeshabilitado]}
        onPress={enviarGoogle}
        disabled={!request || cargandoGoogle}
      >
        {cargandoGoogle ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={estilos.botonTexto}>Entrar con Google</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={estilos.enlace}>Atrás</Text>
      </TouchableOpacity>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#0d0d0d', padding: 24, paddingTop: 60 },
  titulo: { fontSize: 24, color: '#fff', marginBottom: 24, textAlign: 'center' },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 14,
    color: '#fff',
    marginBottom: 12,
    fontSize: 16,
  },
  boton: {
    backgroundColor: '#c9a227',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  botonGoogle: {
    backgroundColor: '#4285f4',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  botonDeshabilitado: { opacity: 0.7 },
  botonTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
  separador: { color: '#666', textAlign: 'center', marginTop: 20, fontSize: 14 },
  enlace: { color: '#c9a227', textAlign: 'center', marginTop: 24, fontSize: 14 },
});
