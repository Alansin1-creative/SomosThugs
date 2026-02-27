import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { iniciarSesionEmail, iniciarSesionConTokenGoogle } from '../servicios/auth';
import { puedeVerContenidoExclusivo } from '../constantes/nivelesAcceso';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = '711635271834-r316qrd5p19oh8mcn1n1qg1o00209nav.apps.googleusercontent.com';
const GOOGLE_WEB_CLIENT_ID = '844963020835-b7pt28vp1upelsefhapf22qsksjecj3l.apps.googleusercontent.com';

export default function Login({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [cargandoGoogle, setCargandoGoogle] = useState(false);
  const webRedirectUri = Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin
    : undefined;

  const [request, , promptAsync] = Google.useIdTokenAuthRequest(
    {
      webClientId: Platform.OS === 'web' ? GOOGLE_WEB_CLIENT_ID : undefined,
      redirectUri: webRedirectUri,
      iosClientId: Platform.OS === 'ios' ? GOOGLE_CLIENT_ID : undefined,
      androidClientId: Platform.OS === 'android' ? GOOGLE_CLIENT_ID : undefined,
    },
    { useProxy: false }
  );

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
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.origin !== 'https://somosthugs.netlify.app') {
      Alert.alert('Google', 'Abre la app desde https://somosthugs.netlify.app para iniciar con Google.');
      return;
    }
    if (!request) {
      Alert.alert(
        'Google',
        'Google no está listo. En web: entra desde el navegador (no Expo Go) y en Google Cloud Console añade esta URL en "Orígenes autorizados" y "URIs de redirección": ' +
          (typeof window !== 'undefined' ? window.location.origin : 'tu origen')
      );
      return;
    }
    setCargandoGoogle(true);
    try {
      const result = await promptAsync();
      if (result?.type === 'cancel' || result?.type === 'dismiss') return;
      if (result?.type !== 'success' || !result.params?.id_token) {
        const err = result?.params?.error_description || result?.params?.error || 'Google falló.';
        Alert.alert('Error', err);
        return;
      }
      const perfil = await iniciarSesionConTokenGoogle(result.params.id_token);
      if (puedeVerContenidoExclusivo(perfil.nivelAcceso)) {
        navigation.replace('ContenidoExclusivo');
      } else {
        navigation.replace('ContenidoGeneral');
      }
    } catch (e) {
      Alert.alert('Error', e?.message || String(e));
    } finally {
      setCargandoGoogle(false);
    }
  };

  return (
    <ScrollView
      style={estilos.contenedor}
      contentContainerStyle={estilos.scrollContenido}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={estilos.logoContenedor}>
        <Text style={estilos.logoPequeño}>LOS</Text>
        <Text style={estilos.logoGrande}>THUGS</Text>
      </View>

      <Text style={estilos.titulo}>iniciar sesión</Text>

      <TextInput
        style={estilos.input}
        placeholder="correo"
        placeholderTextColor="#9ca3af"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <View style={estilos.inputContenedorPassword}>
        <TextInput
          style={estilos.inputPassword}
          placeholder="contraseña"
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!mostrarPassword}
        />
        <TouchableOpacity
          style={estilos.ojo}
          onPress={() => setMostrarPassword((v) => !v)}
        >
          <Ionicons
            name={mostrarPassword ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color="#6b7280"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[estilos.boton, cargando && estilos.botonDeshabilitado]}
        onPress={enviarEmail}
        disabled={cargando}
      >
        {cargando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={estilos.botonTexto}>iniciar sesión</Text>
        )}
      </TouchableOpacity>

      <Text style={estilos.legal}>
        Al iniciar sesión y usar SomosThugs, aceptas nuestros{' '}
        <Text style={estilos.enlaceLegal} onPress={() => Linking.openURL('https://example.com/terminos')}>
          Términos de servicio
        </Text>
        {' '}y{' '}
        <Text style={estilos.enlaceLegal} onPress={() => Linking.openURL('https://example.com/privacidad')}>
          Política de privacidad
        </Text>
        .
      </Text>

      <TouchableOpacity onPress={() => {}}>
        <Text style={estilos.olvidaste}>¿Has olvidado tu contraseña?</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[estilos.botonGoogle, cargandoGoogle && estilos.botonDeshabilitado]}
        onPress={enviarGoogle}
        disabled={!request || cargandoGoogle}
      >
        {cargandoGoogle ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={estilos.botonTexto}>Entrar con Google</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={estilos.registro} onPress={() => navigation.navigate('Registro')}>
        <Text style={estilos.registroTexto}>Regístrate</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#000' },
  scrollContenido: { padding: 24, paddingTop: 48, paddingBottom: 48 },
  logoContenedor: { marginBottom: 32, alignItems: 'flex-start' },
  logoPequeño: { fontSize: 18, color: '#fff', letterSpacing: 2, marginBottom: -4 },
  logoGrande: { fontSize: 42, color: '#fff', fontWeight: '800', letterSpacing: 2 },
  titulo: { fontSize: 20, color: '#fff', marginBottom: 20, textAlign: 'left' },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    color: '#111',
    marginBottom: 14,
    fontSize: 16,
  },
  inputContenedorPassword: { position: 'relative', marginBottom: 14 },
  inputPassword: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    paddingRight: 48,
    color: '#111',
    fontSize: 16,
  },
  ojo: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  boton: {
    backgroundColor: '#22c55e',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  botonGoogle: {
    backgroundColor: '#4285f4',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  botonDeshabilitado: { opacity: 0.7 },
  botonTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
  legal: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 20,
    lineHeight: 18,
  },
  enlaceLegal: { color: '#3b82f6', textDecorationLine: 'underline' },
  olvidaste: { color: '#9ca3af', fontSize: 14, marginTop: 16, textAlign: 'center' },
  registro: { marginTop: 28, alignItems: 'center' },
  registroTexto: { color: '#22c55e', fontSize: 16, fontWeight: '600' },
});
