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
  Image,
  ImageBackground } from
'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../contexto/AuthContext';
import { iniciarSesionEmail, iniciarSesionConTokenGoogle } from '../servicios/auth';
import { nombreRutaHomeApp } from '../constantes/nivelesAcceso';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '711635271834-r316qrd5p19oh8mcn1n1qg1o00209nav.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '711635271834-r316qrd5p19oh8mcn1n1qg1o00209nav.apps.googleusercontent.com';
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '844963020835-b7pt28vp1upelsefhapf22qsksjecj3l.apps.googleusercontent.com';


const FONDO_IMAGEN = require('../../assets/fondo-thugs.png');

export default function Login({ navigation }) {
  const { establecerPerfil } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [cargandoGoogle, setCargandoGoogle] = useState(false);
  const webRedirectUri = Platform.OS === 'web' && typeof window !== 'undefined' ?
  window.location.origin :
  undefined;

  const [request,, promptAsync] = Google.useIdTokenAuthRequest(
    {
      // En nativo NO usar cliente WEB con redirect custom-scheme (Google devuelve 400 invalid_request).
      webClientId: Platform.OS === 'web' ? GOOGLE_WEB_CLIENT_ID : undefined,
      redirectUri: webRedirectUri,
      iosClientId: Platform.OS === 'ios' ? GOOGLE_IOS_CLIENT_ID : undefined,
      androidClientId: Platform.OS === 'android' ? GOOGLE_ANDROID_CLIENT_ID : undefined
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
      establecerPerfil(perfil);
      navigation.replace(nombreRutaHomeApp(perfil));
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCargando(false);
    }
  };

  const enviarGoogle = async () => {
    if (!request) {
      Alert.alert(
        'Google',
        'Google no está listo. En web: entra desde el navegador (no Expo Go) y en Google Cloud Console añade esta URL en "Orígenes autorizados" y "URIs de redirección": ' + (
        typeof window !== 'undefined' ? window.location.origin : 'tu origen')
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
      establecerPerfil(perfil);
      navigation.replace(nombreRutaHomeApp(perfil));
    } catch (e) {
      Alert.alert('Error', e?.message || String(e));
    } finally {
      setCargandoGoogle(false);
    }
  };

  return (
    <ImageBackground
      source={FONDO_IMAGEN}
      style={estilos.fondo}
      resizeMode="cover">
      
      <View style={estilos.mitades}>
        <View style={estilos.mitadIzquierda} />
        <View style={estilos.mitadDerecha}>
          <ScrollView
            style={estilos.contenedor}
            contentContainerStyle={estilos.scrollContenido}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            
            <View style={estilos.logoContenedor}>
              <Image
                source={require('../../assets/logo.png')}
                style={estilos.logoImagen}
                resizeMode="contain"
                accessibilityLabel="Logo Somos Thugs" />
              
              <Text style={estilos.logoPequeño}>LOS</Text>
              <Text style={estilos.logoGrande}>THUGS</Text>
            </View>

            <View style={estilos.cuadroGlass}>
              <Text style={estilos.titulo}>iniciar sesión</Text>

              <TextInput
                style={estilos.input}
                placeholder="correo"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none" />
              
              <View style={estilos.inputContenedorPassword}>
                <TextInput
                  style={estilos.inputPassword}
                  placeholder="contraseña"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!mostrarPassword} />
                
                <TouchableOpacity
                  style={estilos.ojo}
                  onPress={() => setMostrarPassword((v) => !v)}>
                  
                  <Ionicons
                    name={mostrarPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#6b7280" />
                  
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[estilos.boton, cargando && estilos.botonDeshabilitado]}
                onPress={enviarEmail}
                disabled={cargando}>
                
                {cargando ?
                <ActivityIndicator color="#fff" /> :

                <Text style={estilos.botonTexto}>iniciar sesión</Text>
                }
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
                disabled={!request || cargandoGoogle}>
                
                {cargandoGoogle ?
                <ActivityIndicator color="#fff" /> :

                <Text style={estilos.botonTexto}>Entrar con Google</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity style={estilos.registro} onPress={() => navigation.navigate('Registro')}>
                <Text style={estilos.registroTexto}>Regístrate</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </ImageBackground>);

}

const estilos = StyleSheet.create({
  fondo: { flex: 1, width: '100%' },
  mitades: { flex: 1, flexDirection: 'row', width: '100%' },
  mitadIzquierda: { width: '50%', minWidth: '50%', overflow: 'hidden' },
  mitadDerecha: { width: '50%', minWidth: '50%', maxWidth: '50%', overflow: 'hidden' },
  contenedor: { flex: 1, backgroundColor: 'transparent', maxWidth: '100%' },
  scrollContenido: { padding: 24, paddingTop: 48, paddingBottom: 48 },
  logoContenedor: { marginBottom: 32, alignItems: 'flex-start' },
  logoImagen: { width: 120, height: 80, marginBottom: 12 },
  logoPequeño: { fontSize: 18, color: '#fff', letterSpacing: 2, marginBottom: -4 },
  logoGrande: { fontSize: 42, color: '#fff', fontWeight: '800', letterSpacing: 2 },
  cuadroGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    overflow: 'hidden',
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)'
    })
  },
  titulo: { fontSize: 20, color: '#fff', marginBottom: 20, textAlign: 'left' },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    color: '#111',
    marginBottom: 14,
    fontSize: 16
  },
  inputContenedorPassword: { position: 'relative', marginBottom: 14 },
  inputPassword: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    paddingRight: 48,
    color: '#111',
    fontSize: 16
  },
  ojo: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  boton: {
    backgroundColor: '#22c55e',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8
  },
  botonGoogle: {
    backgroundColor: '#4285f4',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24
  },
  botonDeshabilitado: { opacity: 0.7 },
  botonTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
  legal: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 20,
    lineHeight: 18
  },
  enlaceLegal: { color: '#3b82f6', textDecorationLine: 'underline' },
  olvidaste: { color: '#9ca3af', fontSize: 14, marginTop: 16, textAlign: 'center' },
  registro: { marginTop: 28, alignItems: 'center' },
  registroTexto: { color: '#22c55e', fontSize: 16, fontWeight: '600' }
});