import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { registrarEmail, iniciarSesionConTokenGoogle } from '../servicios/auth';
import { puedeVerContenidoExclusivo } from '../constantes/nivelesAcceso';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = '711635271834-r316qrd5p19oh8mcn1n1qg1o00209nav.apps.googleusercontent.com';
const GOOGLE_WEB_CLIENT_ID = '844963020835-b7pt28vp1upelsefhapf22qsksjecj3l.apps.googleusercontent.com';

export default function Registro({ navigation }) {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [fotoUri, setFotoUri] = useState(null);
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

  const elegirImagen = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso', 'Activa la galería.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!resultado.canceled && resultado.assets[0]) {
      setFotoUri(resultado.assets[0].uri);
    }
  };

  const enviar = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('', 'Email y contraseña.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('', 'Mín. 6 caracteres.');
      return;
    }
    setCargando(true);
    try {
      await registrarEmail(email.trim(), password, {
        nombreCompleto: nombreCompleto.trim(),
        fotoUrl: fotoUri || '',
      });
      navigation.replace('ContenidoGeneral');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCargando(false);
    }
  };

  const enviarGoogle = async () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.origin !== 'https://somosthugs.netlify.app') {
      Alert.alert('Google', 'Abre la app desde https://somosthugs.netlify.app para registrarte con Google.');
      return;
    }
    if (!request) {
      Alert.alert('Google', 'Google no está listo. Prueba desde el navegador.');
      return;
    }
    setCargandoGoogle(true);
    try {
      const result = await promptAsync();
      if (result?.type === 'cancel' || result?.type === 'dismiss') return;
      if (result?.type !== 'success' || !result.params?.id_token) {
        Alert.alert('Error', result?.params?.error_description || result?.params?.error || 'Google falló.');
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

      <Text style={estilos.titulo}>registro</Text>

      <TouchableOpacity style={estilos.contenedorFoto} onPress={elegirImagen}>
        {fotoUri ? (
          <Image source={{ uri: fotoUri }} style={estilos.foto} />
        ) : (
          <Text style={estilos.textoPlaceholderFoto}>+ Imagen</Text>
        )}
      </TouchableOpacity>

      <TextInput
        style={estilos.input}
        placeholder="nombre completo"
        placeholderTextColor="#9ca3af"
        value={nombreCompleto}
        onChangeText={setNombreCompleto}
        autoCapitalize="words"
      />
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
        onPress={enviar}
        disabled={cargando}
      >
        {cargando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={estilos.botonTexto}>registrarme</Text>
        )}
      </TouchableOpacity>

      <Text style={estilos.separador}>o</Text>
      <TouchableOpacity
        style={[estilos.botonGoogle, cargandoGoogle && estilos.botonDeshabilitado]}
        onPress={enviarGoogle}
        disabled={!request || cargandoGoogle}
      >
        {cargandoGoogle ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={estilos.botonTexto}>Registrarme con Google</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={estilos.enlaceContenedor} onPress={() => navigation.goBack()}>
        <Text style={estilos.enlace}>Atrás</Text>
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
  contenedorFoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    alignSelf: 'center',
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foto: { width: 100, height: 100, borderRadius: 50 },
  textoPlaceholderFoto: { color: '#6b7280', fontSize: 14 },
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
  botonDeshabilitado: { opacity: 0.7 },
  botonTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
  separador: { color: '#9ca3af', textAlign: 'center', marginTop: 20, fontSize: 14 },
  botonGoogle: {
    backgroundColor: '#4285f4',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  enlaceContenedor: { marginTop: 24, alignItems: 'center' },
  enlace: { color: '#22c55e', fontSize: 16, fontWeight: '600' },
});
