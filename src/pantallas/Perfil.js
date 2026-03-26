import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  Image,
  KeyboardAvoidingView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexto/AuthContext';
import { actualizarPerfil } from '../servicios/api';
import { getBaseUrl } from '../config/api';
import { esAdmin, nombreRutaHomeApp } from '../constantes/nivelesAcceso';

const FONDO_THUGS = require('../../assets/fondo-thugs.png');
const LOGO_THUGS = require('../../assets/logothugs.png');

export default function Perfil({ navigation }) {
  const insets = useSafeAreaInsets();
  const { perfil, establecerPerfil } = useAuth();
  const rutaHomeHeader = esAdmin(perfil) ? 'ContenidoGeneral' : nombreRutaHomeApp(perfil);

  const [nombreCompleto, setNombreCompleto] = useState('');
  const [username, setUsername] = useState('');
  const [telefono, setTelefono] = useState('');
  const [biografia, setBiografia] = useState('');
  const [aceptaNotificaciones, setAceptaNotificaciones] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [fotoPreviewUri, setFotoPreviewUri] = useState(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const avatarUri = fotoPreviewUri
    ? fotoPreviewUri
    : perfil?.fotoUrl
      ? (perfil.fotoUrl.startsWith('http') ? perfil.fotoUrl : getBaseUrl() + perfil.fotoUrl)
      : null;
  // Igual que en el header: si es foto de Google, usar la URL directa en web/app.
  const avatarUriDisplay = avatarUri;

  useEffect(() => {
    if (!perfil) return;
    setNombreCompleto(perfil.nombreCompleto || '');
    setUsername(perfil.username || '');
    setTelefono(perfil.telefono || '');
    setBiografia(perfil.biografia || '');
    setAceptaNotificaciones(
      typeof perfil.aceptaNotificaciones === 'boolean'
        ? perfil.aceptaNotificaciones
        : true
    );
  }, [perfil]);

  const onGuardar = async () => {
    if (!perfil) return;
    if (!username.trim()) {
      Alert.alert('Perfil', 'El usuario es obligatorio.');
      return;
    }
    setGuardando(true);
    try {
      const body = {
        nombreCompleto: nombreCompleto,
        username,
        telefono,
        biografia,
        aceptaNotificaciones,
      };
      const nuevoPerfil = await actualizarPerfil(body);
      establecerPerfil(nuevoPerfil);
      Alert.alert('Perfil', 'Cambios guardados.');
      navigation.navigate(rutaHomeHeader);
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const elegirOrigenFoto = () => {
    // En web el Alert nativo no soporta bien múltiples botones, así que vamos directo a la galería.
    if (Platform.OS === 'web') {
      elegirDeGaleria();
      return;
    }
    Alert.alert('Foto de perfil', 'Elige el origen', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Galería', onPress: elegirDeGaleria },
      { text: 'Tomar foto', onPress: tomarFoto },
    ]);
  };

  const elegirDeGaleria = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso', 'Activa el acceso a la galería.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (!resultado.canceled && resultado.assets[0]) {
      const base64 = resultado.assets[0].base64;
      const uri = resultado.assets[0].uri;
      if (base64 && uri) {
        setFotoPreviewUri(uri);
        setSubiendoFoto(true);
        try {
          const nuevoPerfil = await actualizarPerfil({ fotoBase64: `data:image/jpeg;base64,${base64}` });
          establecerPerfil(nuevoPerfil);
          setFotoPreviewUri(null);
        } catch (e) {
          Alert.alert('Error', e?.message || 'No se pudo subir la foto.');
        } finally {
          setSubiendoFoto(false);
        }
      }
    }
  };

  const tomarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso', 'Activa la cámara.');
      return;
    }
    const resultado = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (!resultado.canceled && resultado.assets[0]) {
      const base64 = resultado.assets[0].base64;
      const uri = resultado.assets[0].uri;
      if (base64 && uri) {
        setFotoPreviewUri(uri);
        setSubiendoFoto(true);
        try {
          const nuevoPerfil = await actualizarPerfil({ fotoBase64: `data:image/jpeg;base64,${base64}` });
          establecerPerfil(nuevoPerfil);
          setFotoPreviewUri(null);
        } catch (e) {
          Alert.alert('Error', e?.message || 'No se pudo subir la foto.');
        } finally {
          setSubiendoFoto(false);
        }
      }
    }
  };

  const titulo = 'Perfil';
  const alturaFondoNativo =
    Platform.OS !== 'web'
      ? Dimensions.get('window').height -
        (insets.top + 8 + 48) +
        insets.bottom
      : null;

  return (
    <View style={[estilos.contenedor, { paddingTop: insets.top + 8 }]}>
      <View style={estilos.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate(rutaHomeHeader)}
          style={estilos.headerBack}
          hitSlop={10}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Image source={LOGO_THUGS} style={estilos.headerLogoImg} resizeMode="contain" />
        </TouchableOpacity>
        <Text style={estilos.headerTitulo} pointerEvents="none">{titulo}</Text>
        <View style={estilos.headerEspacioDer} />
      </View>
      <View style={estilos.areaContenido}>
        <View
          style={[
            estilos.fondoAbsoluto,
            alturaFondoNativo != null && {
              top: 0,
              bottom: undefined,
              height: alturaFondoNativo,
            },
          ]}
          pointerEvents="none"
        >
          <Image
            source={FONDO_THUGS}
            style={[
              estilos.fondoImagen,
              alturaFondoNativo != null && {
                bottom: undefined,
                height: alturaFondoNativo,
              },
            ]}
            resizeMode="repeat"
          />
        </View>
        <View style={estilos.scrollContenidoConPadding}>
        <View style={estilos.contenidoSobreFondo}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={estilos.cuadroGlass}
          >
            <View style={estilos.formularioUnico}>
              <Text style={estilos.tituloMitad}>Editar perfil</Text>
              <TouchableOpacity
                style={estilos.filaFoto}
                onPress={subiendoFoto ? undefined : elegirOrigenFoto}
                disabled={subiendoFoto}
                activeOpacity={0.8}
              >
                <View style={estilos.avatarContenedor}>
                  {avatarUriDisplay ? (
                    <Image source={{ uri: avatarUriDisplay }} style={estilos.avatarImg} />
                  ) : (
                    <View style={estilos.avatarPlaceholder}>
                      <Ionicons name="person" size={40} color="#00dc57" />
                    </View>
                  )}
                  <View style={estilos.avatarLapiz}>
                    {subiendoFoto ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Ionicons name="pencil" size={18} color="#fff" />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
              <TextInput
                style={estilos.input}
                placeholder="Nombre completo"
                placeholderTextColor="#9ca3af"
                value={nombreCompleto}
                onChangeText={setNombreCompleto}
                autoCapitalize="words"
              />
              <TextInput
                style={estilos.input}
                placeholder="Usuario *"
                placeholderTextColor="#9ca3af"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
              <TextInput
                style={estilos.input}
                placeholder="Teléfono (opcional)"
                placeholderTextColor="#9ca3af"
                value={telefono}
                onChangeText={setTelefono}
                keyboardType="phone-pad"
              />
              <TextInput
                style={[estilos.input, estilos.inputMultiline]}
                placeholder="Biografía"
                placeholderTextColor="#9ca3af"
                value={biografia}
                onChangeText={setBiografia}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={estilos.filaCheckbox}
                onPress={() => setAceptaNotificaciones((v) => !v)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={aceptaNotificaciones ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={aceptaNotificaciones ? '#00dc57' : '#6b7280'}
                />
                <Text style={estilos.checkboxTexto}>Acepto notificaciones</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[estilos.boton, guardando && estilos.botonDeshabilitado]}
                onPress={onGuardar}
                disabled={guardando}
              >
                {guardando ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={estilos.botonTexto}>Guardar cambios</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
        </View>
      </View>
    </View>
  );
}


const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    ...(Platform.OS !== 'web' && { overflow: 'visible' }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0d0d0d',
  },
  headerBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 4,
    width: 80,
    zIndex: 1,
  },
  headerLogoImg: { width: 36, height: 36 },
  headerTitulo: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    zIndex: 0,
  },
  headerEspacioDer: { width: 80, zIndex: 1 },
  areaContenido: {
    flex: 1,
  },
  fondoAbsoluto: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  scroll: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollSinScroll: {
    overflow: 'hidden',
  },
  scrollContenidoConPadding: {
    flex: 1,
    padding: 32,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  scrollContenido: {
    // sin uso ahora; se mantiene por compatibilidad si se reutiliza
  },
  fondoImagen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    zIndex: 0,
  },
  contenidoSobreFondo: {
    zIndex: 1,
    alignSelf: 'center',
    maxWidth: 420,
    width: '100%',
  },
  cuadroGlass: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'web' ? 'rgba(26,26,26,0.7)' : 'rgba(26,26,26,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    ...(Platform.OS === 'web' && { backdropFilter: 'blur(12px)' }),
  },
  formularioUnico: { padding: 20 },
  tituloMitad: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 12 },
  filaFoto: { marginBottom: 16, alignItems: 'center' },
  avatarContenedor: {
    position: 'relative',
    width: 88,
    height: 88,
    borderRadius: 16,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLapiz: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00dc57',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    marginBottom: 10,
  },
  inputMultiline: {
    minHeight: 96,
  },
  filaCheckbox: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  checkboxTexto: { color: '#ccc', fontSize: 14 },
  boton: {
    backgroundColor: '#00dc57',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  botonDeshabilitado: { opacity: 0.7 },
  botonTexto: { color: '#000', fontWeight: '600', fontSize: 14 },
});

