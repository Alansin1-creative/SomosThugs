import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../contexto/AuthContext';
import { iniciarSesionEmail, registrarEmail, iniciarSesionConTokenGoogle } from '../servicios/auth';
import { puedeVerContenidoExclusivo, esAdmin } from '../constantes/nivelesAcceso';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = '711635271834-r316qrd5p19oh8mcn1n1qg1o00209nav.apps.googleusercontent.com';
const GOOGLE_WEB_CLIENT_ID = '844963020835-b7pt28vp1upelsefhapf22qsksjecj3l.apps.googleusercontent.com';

const LOGO_TEXTO = 'Somos Thugs';
const FONDO_THUGS = require('../../assets/fondo-thugs.png');
const REDES_SOCIALES = [
  { id: 'youtube', icon: 'logo-youtube', label: 'Los Thugs', url: 'https://youtube.com/@LosThugs' },
  { id: 'facebook', icon: 'logo-facebook', label: 'LosThugs', url: 'https://facebook.com/LosThugs' },
  { id: 'instagram', icon: 'logo-instagram', label: 'Los.Thugs', url: 'https://instagram.com/Los.Thugs' },
  { id: 'spotify', icon: 'musical-notes', label: 'Los Thugs', url: 'https://open.spotify.com/artist/LosThugs' },
];

const REDES_HANDLES = [
  { label: 'Fb', handle: '@losthugs614', url: 'https://facebook.com/losthugs614' },
  { label: 'ig', handle: '@los.thugs', url: 'https://instagram.com/los.thugs' },
  { label: 'YouTube', handle: '@Los Thugs', url: 'https://youtube.com/@LosThugs' },
];

const INTEGRANTES = [
  { nombre: 'Chards Rivera', ig: '@chardsrivera', url: 'https://instagram.com/chardsrivera' },
  { nombre: 'Omega Morales', ig: '@moralesomega', url: 'https://instagram.com/moralesomega' },
];

const LINKS_PRENSA = [
  { titulo: 'Casa Norte', url: 'https://www.youtube.com/watch?v=X_06TkUZT48' },
  { titulo: 'Circuito Norte - Antena 102.5 fm', url: 'https://www.facebook.com/share/x/1DcNydKnaM/' },
  { titulo: 'Ay Claudia!', url: 'https://www.youtube.com/watch?v=MDAXTpsKNE' },
];

// Singles: agrega uno por uno { titulo, url, cover? }. cover = require('../../assets/nombre.png') si añades imagen en assets/
const SINGLES = [
  { titulo: 'Mr Pipeins (Live)', url: 'https://open.spotify.com/album/1JnRG3WRJRNRqgNHw85gWj', cover: require('../../assets/pipeins.png') },
  { titulo: 'Méjico Mágico', url: 'https://open.spotify.com/album/3IMLWcl5o6bXfME4LNoJG9', cover: require('../../assets/mijicomajico.png') },
  { titulo: 'El Último Tren', url: 'https://open.spotify.com/album/16zmKIQJ1CGwfwtQlgzAJs', cover: require('../../assets/ultimotren.png') },
  { titulo: 'El Song De La Thug Life', url: 'https://open.spotify.com/album/5up5lvNRgiNBXg1J5aOtv7', cover: require('../../assets/elsong.png') },
];

const WHATSAPP_NUMERO = '3315873924';
const EMAIL_CONTACTO = 'info.rolandocallesent@gmail.com';
const REDES_FOOTER = [
  { id: 'spotify', icon: 'musical-notes', url: 'https://open.spotify.com' },
  { id: 'youtube', icon: 'logo-youtube', url: 'https://youtube.com/@LosThugs' },
  { id: 'facebook', icon: 'logo-facebook', url: 'https://facebook.com/losthugs614' },
  { id: 'whatsapp', icon: 'logo-whatsapp', url: `https://wa.me/52${WHATSAPP_NUMERO.replace(/\s/g, '')}` },
  { id: 'instagram', icon: 'logo-instagram', url: 'https://instagram.com/los.thugs' },
];

function navegarSegunPerfil(navigation, perfil) {
  if (esAdmin(perfil)) navigation.replace('ModoAdmin');
  else if (puedeVerContenidoExclusivo(perfil.nivelAcceso, perfil.rol)) navigation.replace('ContenidoExclusivo');
  else navigation.replace('ContenidoGeneral');
}

const PRESENTACIONES_ITEMS = 6;
const CARRUSEL_GAP = 12;

// Añade álbumes: id único, titulo, spotifyUrl (ej: https://open.spotify.com/album/xxxxx)
const ALBUMS = [
  { id: '1', titulo: 'Rolando Calles', spotifyUrl: 'https://open.spotify.com/album/6C5iPRNs1pbrZuyVkmJLBd' },
];

function extraerAlbumIdSpotify(url) {
  if (!url) return null;
  const m = url.match(/spotify\.com\/album\/([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
}

const spotifyEmbedContenedor = { width: '100%', height: 352, marginTop: 12, borderRadius: 12, overflow: 'hidden' };
const spotifyEmbedBoton = { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingVertical: 14, paddingHorizontal: 20, backgroundColor: 'rgba(0,220,87,0.15)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,220,87,0.4)' };
const spotifyEmbedBotonTexto = { color: '#00dc57', fontSize: 15, fontWeight: '600' };

function SpotifyEmbed({ albumId, spotifyUrl }) {
  const contenedorRef = useRef(null);
  useEffect(() => {
    if (Platform.OS !== 'web' || !albumId || typeof document === 'undefined') return;
    const container = contenedorRef.current;
    if (!container || typeof container.appendChild !== 'function') return;
    const el = document.createElement('iframe');
    el.src = `https://open.spotify.com/embed/album/${albumId}?utm_source=generator`;
    el.style.width = '100%';
    el.style.height = '352px';
    el.style.border = 'none';
    el.style.borderRadius = '12px';
    el.setAttribute('allow', 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture');
    el.setAttribute('loading', 'lazy');
    container.appendChild(el);
    return () => { try { container.removeChild(el); } catch (_) {} };
  }, [albumId]);
  if (Platform.OS === 'web') {
    return <View ref={contenedorRef} style={spotifyEmbedContenedor} collapsable={false} />;
  }
  return (
    <TouchableOpacity style={spotifyEmbedBoton} onPress={() => spotifyUrl && Linking.openURL(spotifyUrl)}>
      <Ionicons name="musical-notes" size={24} color="#00dc57" />
      <Text style={spotifyEmbedBotonTexto}>Abrir en Spotify</Text>
    </TouchableOpacity>
  );
}

export default function InicioPresskit({ navigation }) {
  const { width } = useWindowDimensions();
  const carruselItemWidth = Math.min((width - 32 - 48) * 0.52, 220);
  const carruselSnapInterval = carruselItemWidth + CARRUSEL_GAP;
  const { perfil, cerrarSesion, establecerPerfil } = useAuth();
  const estaAutenticado = !!perfil;

  const [modo, setModo] = useState('registro'); // 'login' | 'registro'
  const [nombre, setNombre] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [fotoUri, setFotoUri] = useState(null);
  const [fotoBase64, setFotoBase64] = useState(null);
  const [aceptaNotificaciones, setAceptaNotificaciones] = useState(true);
  const [mostrarPass, setMostrarPass] = useState(false);
  const [loginCargando, setLoginCargando] = useState(false);
  const [regCargando, setRegCargando] = useState(false);
  const [cargandoGoogle, setCargandoGoogle] = useState(false);
  const [albumExpandidoId, setAlbumExpandidoId] = useState(null);
  const webRedirectUri = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined;
  const [request, , promptAsync] = Google.useIdTokenAuthRequest(
    {
      webClientId: Platform.OS === 'web' ? GOOGLE_WEB_CLIENT_ID : undefined,
      redirectUri: webRedirectUri,
      iosClientId: Platform.OS === 'ios' ? GOOGLE_CLIENT_ID : undefined,
      androidClientId: Platform.OS === 'android' ? GOOGLE_CLIENT_ID : undefined,
    },
    { useProxy: false }
  );

  const onGoogle = async () => {
    if (!request) {
      Alert.alert('Google', 'Google no está listo. En web añade esta URL en Google Cloud Console.');
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
      const p = await iniciarSesionConTokenGoogle(result.params.id_token);
      establecerPerfil(p);
      navegarSegunPerfil(navigation, p);
    } catch (e) {
      Alert.alert('Error', e?.message || String(e));
    } finally {
      setCargandoGoogle(false);
    }
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
      const asset = resultado.assets[0];
      setFotoUri(asset.uri);
      setFotoBase64(asset.base64 || null);
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
      const asset = resultado.assets[0];
      setFotoUri(asset.uri);
      setFotoBase64(asset.base64 || null);
    }
  };

  const elegirOrigenFoto = () => {
    Alert.alert('Foto', 'Elige el origen', [
      { text: 'Galería', onPress: elegirDeGaleria },
      { text: 'Tomar foto', onPress: tomarFoto },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const onLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('', 'Email y contraseña.');
      return;
    }
    setLoginCargando(true);
    try {
      const p = await iniciarSesionEmail(email.trim(), password);
      if (!p) { Alert.alert('Error', 'Perfil no encontrado.'); return; }
      establecerPerfil(p);
      navegarSegunPerfil(navigation, p);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoginCargando(false);
    }
  };

  const onRegister = async () => {
    if (!username.trim()) {
      Alert.alert('', 'Usuario es obligatorio.');
      return;
    }
    if (!email.trim() || !password.trim()) {
      Alert.alert('', 'Email y contraseña.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('', 'Mín. 6 caracteres.');
      return;
    }
    setRegCargando(true);
    try {
      const p = await registrarEmail(email.trim(), password, {
        nombreCompleto: nombre.trim(),
        username: username.trim(),
        telefono: telefono.trim(),
        fotoBase64: fotoBase64 || undefined,
        aceptaNotificaciones,
      });
      establecerPerfil(p);
      navegarSegunPerfil(navigation, p);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setRegCargando(false);
    }
  };

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Inicio')} style={estilos.logo}>
          <Text style={estilos.logoTexto}>{LOGO_TEXTO}</Text>
        </TouchableOpacity>
        <View style={estilos.botonesHeader}>
          {estaAutenticado && (
            <TouchableOpacity
              style={estilos.botonCerrar}
              onPress={() => cerrarSesion().then(() => navigation.replace('Inicio'))}
            >
              <Text style={estilos.botonCerrarTexto}>Cerrar sesión</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={[estilos.scrollContenido, estilos.scrollContenidoFondo]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Image
          source={FONDO_THUGS}
          style={estilos.fondoImagen}
          resizeMode="repeat"
        />
        <View style={estilos.contenidoSobreFondo}>
        {!estaAutenticado && (
          <View style={[estilos.mitades, { width: width - 32 }]}>
            <View style={[estilos.mitadIzquierda, { width: (width - 32) / 2 }]} />
            <View style={[estilos.mitadDerecha, { width: (width - 32) / 2 }]}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={estilos.cuadroGlass}
              >
            <View style={estilos.formularioUnico}>
              <Text style={estilos.tituloMitad}>
                {modo === 'registro' ? 'Registro' : 'Iniciar sesión'}
              </Text>
              {modo === 'registro' && (
                <>
                  <View style={estilos.filaFoto}>
                    {fotoUri ? (
                      <View style={estilos.fotoPreview}>
                        <Image source={{ uri: fotoUri }} style={estilos.fotoPreviewImg} />
                        <TouchableOpacity style={estilos.quitarFoto} onPress={() => { setFotoUri(null); setFotoBase64(null); }}>
                          <Ionicons name="close-circle" size={24} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ) : null}
                    <TouchableOpacity style={estilos.botonFotoUnico} onPress={elegirOrigenFoto}>
                      <Ionicons name="camera-outline" size={28} color="#00dc57" />
                      <Text style={estilos.botonFotoTexto}>Agregar foto</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={estilos.input}
                    placeholder="Nombre completo"
                    placeholderTextColor="#9ca3af"
                    value={nombre}
                    onChangeText={setNombre}
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
                </>
              )}
              <TextInput
                style={estilos.input}
                placeholder="Correo *"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {modo === 'registro' && (
                <TextInput
                  style={estilos.input}
                  placeholder="Teléfono (opcional)"
                  placeholderTextColor="#9ca3af"
                  value={telefono}
                  onChangeText={setTelefono}
                  keyboardType="phone-pad"
                />
              )}
              <View style={estilos.inputContenedorPassword}>
                <TextInput
                  style={estilos.input}
                  placeholder={modo === 'registro' ? 'Contraseña (mín. 6) *' : 'Contraseña'}
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!mostrarPass}
                />
                <TouchableOpacity style={estilos.ojo} onPress={() => setMostrarPass((v) => !v)}>
                  <Ionicons name={mostrarPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>
              {modo === 'registro' && (
                <>
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
                </>
              )}
              {modo === 'registro' ? (
                <>
                  <TouchableOpacity
                    style={[estilos.boton, regCargando && estilos.botonDeshabilitado]}
                    onPress={onRegister}
                    disabled={regCargando}
                  >
                    {regCargando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={estilos.botonTexto}>Registrarme</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={estilos.toggle} onPress={() => setModo('login')}>
                    <Text style={estilos.toggleTexto}>¿Ya tienes una cuenta?</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={[estilos.boton, loginCargando && estilos.botonDeshabilitado]}
                    onPress={onLogin}
                    disabled={loginCargando}
                  >
                    {loginCargando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={estilos.botonTexto}>Entrar</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={estilos.toggle} onPress={() => setModo('registro')}>
                    <Text style={estilos.toggleTexto}>¿Aún no tienes cuenta?</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
              </KeyboardAvoidingView>
              <View style={estilos.filaGoogle}>
                <TouchableOpacity
                  style={[estilos.botonGoogle, cargandoGoogle && estilos.botonDeshabilitado]}
                  onPress={onGoogle}
                  disabled={!request || cargandoGoogle}
                >
                  {cargandoGoogle ? <ActivityIndicator color="#fff" size="small" /> : <Text style={estilos.botonGoogleTexto}>Entrar con Google</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <Text style={estilos.tituloSeccion}>@LosThugs</Text>

        <View style={[estilos.bloqueAncho, estilos.bloqueArtistInfoCard, { width: width - 32 }]}>
          <View style={estilos.bloqueArtistInfoContenido}>
            <View style={estilos.filaArtistInfo}>
              <Text style={estilos.artistInfoTitulo}>ARTIST INFO</Text>
              <Text style={estilos.flechas}>&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;</Text>
            </View>
            <Text style={[estilos.bioTexto, estilos.bioTextoBlock]}>
              <Text style={estilos.bioDestacado}>Los Thugs</Text> es un proyecto de HipHop estilero Chihuahuense formado por un Dueto de viejos amigos (Chards y Omega) a mediados del 2019.
            </Text>
            <Text style={[estilos.bioTexto, estilos.bioTextoBlock]}>
              Cruzando la pandemia del Covid19 la creatividad llegó y creamos 5 canciones con las cuales comenzamos a ensayar y en el año 2021... salimos a la luz.
            </Text>

            <View style={[estilos.filaRedes, estilos.filaRedesCentrada]}>
              {REDES_SOCIALES.map((red) => (
                <TouchableOpacity
                  key={red.id}
                  style={estilos.redItem}
                  onPress={() => red.url && Linking.openURL(red.url)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={red.icon} size={34} color="#fff" />
                  <Text style={estilos.redLabel} numberOfLines={1}>{red.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={estilos.fotoConcierto}>
              <Text style={estilos.fotoConciertoLabel}>En vivo</Text>
              <View style={estilos.placeholderConcierto}>
                <View style={estilos.placeholderConciertoInner}>
                  <Ionicons name="videocam-outline" size={56} color="#22c55e" />
                  <Text style={estilos.placeholderConciertoTexto}>Foto en vivo</Text>
                  <Text style={estilos.placeholderConciertoSub}>Añade una imagen de presentación</Text>
                </View>
              </View>
            </View>
            <Text style={[estilos.bioTexto, estilos.bioTextoBlock]}>
              Para octubre del 2021 fuimos invitados a tocar en una fiesta de Halloween y tanto fue el gusto de la gente, que de ahí en adelante tuvimos presentaciones cada mes, por todo un año.
            </Text>

            <View style={estilos.ctaSection}>
              <Text style={[estilos.ctaTitulo, estilos.ctaTituloBlock]}>ANDAMOS ROLANDO CALLES</Text>
              <Text style={[estilos.ctaSubtitulo, estilos.ctaSubtituloBlock]}>¡NOMÁS A VER QUE SE VE!</Text>
            </View>
          </View>
        </View>

        <View style={[estilos.bloqueAncho, estilos.bloqueArtistInfoCard, { width: width - 32 }]}>
          <View style={estilos.bloqueArtistInfoContenido}>
            <View style={estilos.filaArtistInfo}>
              <Text style={estilos.artistInfoTitulo}>PRESENTACIONES</Text>
              <Text style={estilos.flechas}>&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={carruselSnapInterval}
              snapToAlignment="start"
              contentContainerStyle={estilos.carruselPresentacionesContenido}
              style={estilos.carruselPresentaciones}
            >
              {Array.from({ length: PRESENTACIONES_ITEMS }, (_, i) => i + 1).map((i) => (
                <View key={i} style={[estilos.carruselPresentacionesItem, { width: carruselItemWidth }]}>
                  <View style={estilos.carruselPresentacionesPlaceholder}>
                    <Ionicons name="images-outline" size={40} color="rgba(34,197,94,0.5)" />
                    <Text style={estilos.carruselPresentacionesLabel}>Presentación {i}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <Text style={estilos.bioTexto}>
              Hemos tenido presentaciones en el foro cultural más importante de Chihuahua "Don Burro", también estuvimos en el Bazar Libertad en la Plaza del Ángel, colaboraciones con el "Movimiento Cannábico de Chihuahua." Tuvimos la oportunidad de tocar fuera de nuestra ciudad. Visitamos Meoqui, Cd. Aldama, Cd. Delicias y Cd. Juárez.
            </Text>
            <Text style={estilos.bioTextoVerde}>
              Hicimos un evento en la ciudad de Zapopan y fuimos artistas invitados en la Cd. de Guadalajara Jalisco en Marzo del 2022.
            </Text>
            <Text style={estilos.bioTextoVerdeDestacado}>
              Además hemos tenido intervenciones en la Radio local Chihuahuense. En "Métrica Radio" y "Radio Universidad Chihuahua".
            </Text>
            <View style={[estilos.filaTituloLogo, estilos.filaTituloLogoDerecha]}>
              <View>
                <Text style={estilos.tituloSeccionVerdeGrande}>CREANDO COSAS GRANDES</Text>
                <Text style={estilos.subtituloSeccionDestacado}>SUEÑOS RAROS</Text>
              </View>
            </View>
            <View style={estilos.lineaFlechas} />
          </View>
        </View>

        <View style={[estilos.bloqueAncho, estilos.bloqueArtistInfoCard, { width: width - 32 }]}>
          <View style={estilos.bloqueArtistInfoContenido}>
            <View style={estilos.filaArtistInfo}>
              <Text style={estilos.artistInfoTitulo}>ALBUMS</Text>
              <Text style={estilos.flechas}>&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;</Text>
            </View>
            <Text style={estilos.bioTexto}>
              En Abril del 2023 presentamos nuestro primer álbum llamado "Rolando Calles" en un show privado monitoreado en circuito cerrado y show de fuegos artificiales.
            </Text>
            <View style={estilos.listaAlbums}>
              {ALBUMS.map((album) => {
                const expandido = albumExpandidoId === album.id;
                const albumIdSpotify = extraerAlbumIdSpotify(album.spotifyUrl);
                return (
                  <View key={album.id} style={estilos.listaAlbumsItem}>
                    <TouchableOpacity
                      style={estilos.listaAlbumsFila}
                      onPress={() => setAlbumExpandidoId(expandido ? null : album.id)}
                      activeOpacity={0.7}
                    >
                      <View style={estilos.listaAlbumsFilaIzq}>
                        <Ionicons name="musical-notes" size={22} color="#00dc57" />
                        <Text style={estilos.listaAlbumsTitulo}>{album.titulo}</Text>
                      </View>
                      <Ionicons name={expandido ? 'chevron-up' : 'chevron-down'} size={22} color="#00dc57" />
                    </TouchableOpacity>
                    {expandido && albumIdSpotify && (
                      <SpotifyEmbed albumId={albumIdSpotify} spotifyUrl={album.spotifyUrl} />
                    )}
                  </View>
                );
              })}
            </View>
            <Text style={estilos.bioTexto}>
              El contenido de canciones abordan aventuras por los caminos de la república, patinando desde las calles hasta las galaxias, multiversos de graffiti y hierbas, creando negocios de los sueños que cada uno moldea con sus talentos y reviviendo las historias de este par de callejeros.
            </Text>
            <Text style={estilos.bioTexto}>
              Te sumergirás a este universo llamado: <Text style={estilos.bioDestacado}>LOS THUGS</Text>.
            </Text>
            <View style={estilos.filaTituloLogo}>
              <View>
                <Text style={estilos.tituloSeccionVerde}>PODER NORTEÑO</Text>
                <Text style={estilos.subtituloSeccion}>DEL MÉJICO MÁGICO</Text>
              </View>
            </View>
            <View style={estilos.lineaFlechas} />
          </View>
        </View>

        <View style={[estilos.bloqueAncho, estilos.bloqueArtistInfoCard, { width: width - 32 }]}>
          <View style={estilos.bloqueArtistInfoContenido}>
            <View style={estilos.filaLinksHeader}>
              <View style={estilos.filaArtistInfo}>
                <Text style={estilos.artistInfoTitulo}>SINGLES</Text>
                <Text style={estilos.flechas}>&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;</Text>
              </View>
              <View style={estilos.qrPlaceholder}>
                <Ionicons name="qr-code-outline" size={56} color="#22c55e" />
                <Text style={estilos.qrPlaceholderTexto}>SCAN ME</Text>
              </View>
            </View>
            <View style={estilos.lineaFlechas} />
            <View style={estilos.listaLinks}>
              {SINGLES.length === 0 ? (
                <Text style={estilos.listaLinksVacio}>Aún no hay singles. Agrega canciones en la constante SINGLES del código.</Text>
              ) : (
                SINGLES.map((link, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => link.url && Linking.openURL(link.url)}
                    style={estilos.linkItem}
                    activeOpacity={0.7}
                  >
                    {link.cover != null && (
                      <Image source={link.cover} style={estilos.linkItemCover} resizeMode="cover" />
                    )}
                    <View style={estilos.linkItemTexto}>
                      <Text style={estilos.linkTitulo}>{link.titulo}</Text>
                      <Text style={estilos.linkUrl} numberOfLines={1}>{link.url}</Text>
                      <Text style={estilos.linkVerEn}>Escuchar en Spotify →</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
            <View style={estilos.ctaSection}>
              <Text style={estilos.ctaTitulo}>ANDAMOS ROLANDO CALLES</Text>
              <Text style={estilos.ctaSubtitulo}>¡NOMÁS A VER QUE SE VE!</Text>
            </View>
            <View style={estilos.lineaFlechas} />
          </View>
        </View>

        <View style={[estilos.bloqueAncho, { width: width - 32 }]}>
          <View style={estilos.filaArtistInfo}>
            <Text style={estilos.tituloSeccionVerde}>TRAYECTORIA</Text>
            <Text style={estilos.flechas}>&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;</Text>
          </View>
          <Text style={estilos.bioTexto}>
            Creamos 2 canciones producidas en estudio para JMAS Chihuahua, coordinación y dirección del evento para su presentación en Marzo año 2025.
          </Text>
          <Text style={estilos.bioTexto}>
            En el año 2024 participamos en "Festival Antojos" de Cuu.
          </Text>
          <Text style={estilos.bioTexto}>
            Fuimos protagonistas en el Festival Musical "Escena Desierto 2023" en Cd. Aldama.
          </Text>
          <Text style={estilos.bioTexto}>
            Hemos compartido escenario con artistas nacionales e internacionales tales como: Desplantes Cuu, Delay Castillo Cuu, Vickingos del Norte Cuu, Koko Yamasaki Xalapa, Kion Bajosuelo de Cd. Juárez, Real Stylo de San Luis, Pedro Mo de Perú y algunos más.
          </Text>
        </View>

        <View style={[estilos.bloqueAncho, { width: width - 32 }]}>
          <Text style={estilos.socialSectionTitulo}>Social Media "Los Thugs"</Text>
          <View style={estilos.handlesLista}>
            {REDES_HANDLES.map((r) => (
              <TouchableOpacity key={r.label} onPress={() => r.url && Linking.openURL(r.url)} style={estilos.handleRow}>
                <Text style={estilos.handleLabel}>{r.label} </Text>
                <Text style={estilos.handleTexto}>{r.handle}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={estilos.filaRedes}>
            {REDES_SOCIALES.filter((r) => r.id !== 'spotify').map((red) => (
              <TouchableOpacity
                key={red.id}
                style={estilos.redItem}
                onPress={() => red.url && Linking.openURL(red.url)}
                activeOpacity={0.7}
              >
                <View style={estilos.iconoRedCircle}>
                  <Ionicons name={red.icon} size={24} color="#fff" />
                </View>
                <Text style={estilos.redLabel} numberOfLines={1}>{red.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={estilos.integrantesTitulo}>Integrantes</Text>
          {INTEGRANTES.map((i) => (
            <TouchableOpacity key={i.ig} onPress={() => Linking.openURL(i.url)} style={estilos.integranteRow}>
              <Text style={estilos.bioTexto}>
                <Text style={estilos.bioDestacado}>{i.nombre}</Text> (ig {i.ig})
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[estilos.bloqueAncho, estilos.bloqueLinksPrensa, { width: width - 32 }]}>
          <View style={estilos.filaLinksPrensaHeader}>
            <Text style={estilos.tituloSeccionVerde}>LINKS PRENSA</Text>
            <Text style={estilos.flechas}>&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;</Text>
            <View style={[estilos.qrPlaceholder, estilos.qrDerecha]}>
              <Ionicons name="qr-code-outline" size={56} color="#22c55e" />
              <Text style={estilos.qrPlaceholderTexto}>SCAN ME</Text>
            </View>
          </View>
          <View style={[estilos.lineaFlechas, estilos.lineaVerde]} />
          {LINKS_PRENSA.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => item.url && Linking.openURL(item.url)}
              style={estilos.linkPrensaItem}
              activeOpacity={0.7}
            >
              <Text style={estilos.linkTitulo}>{item.titulo}</Text>
              <Text style={estilos.linkUrl} numberOfLines={1}>{item.url}</Text>
            </TouchableOpacity>
          ))}
          <View style={[estilos.lineaFlechas, estilos.lineaVerde]} />
        </View>

        <View style={estilos.barraVerdeRedes}>
          <Text style={estilos.barraVerdeFlechas}>&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;</Text>
          <View style={estilos.filaIconosFooter}>
            {REDES_FOOTER.map((red) => (
              <TouchableOpacity
                key={red.id}
                onPress={() => red.url && Linking.openURL(red.url)}
                style={estilos.iconoFooter}
                activeOpacity={0.8}
              >
                <Ionicons name={red.icon} size={28} color="#fff" />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={estilos.barraVerdeFlechas}>&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;</Text>
        </View>

        <View style={estilos.footerNav}>
          <TouchableOpacity onPress={() => navigation.navigate('Inicio')}>
            <Text style={estilos.footerNavLink}>Inicio</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Inicio')}>
            <Text style={estilos.footerNavLink}>Presskit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Inicio')}>
            <Text style={estilos.footerNavLink}>Eventos</Text>
          </TouchableOpacity>
        </View>

        <View style={estilos.footerContacto}>
          <Text style={estilos.footerContactoTitulo}>Registro</Text>
          <TouchableOpacity onPress={() => Linking.openURL(`https://wa.me/52${WHATSAPP_NUMERO.replace(/\s/g, '')}`)}>
            <Text style={estilos.footerContactoTexto}>Whatsapp: 3315 87 3924</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL(`mailto:${EMAIL_CONTACTO}`)}>
            <Text style={estilos.footerContactoTexto}>{EMAIL_CONTACTO}</Text>
          </TouchableOpacity>
          <View style={estilos.filaTerminos}>
            <TouchableOpacity onPress={() => Linking.openURL('https://example.com/terminos')}>
              <Text style={estilos.footerContactoLink}>Términos</Text>
            </TouchableOpacity>
            <Text style={estilos.footerContactoTexto}> | </Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://example.com/privacidad')}>
              <Text style={estilos.footerContactoLink}>Privacidad</Text>
            </TouchableOpacity>
          </View>
          <Text style={estilos.footerContactoTexto}>© 2026 SomosThugs</Text>
          <Text style={estilos.footerContactoTagline}>"SomosThugs es una plataforma exclusiva para la comunidad que apoya el movimiento."</Text>
        </View>
        </View>
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1 },
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
    backgroundColor: '#00dc57',
  },
  botonPrimarioTexto: { color: '#000', fontSize: 14, fontWeight: '600' },
  botonCerrar: { padding: 8 },
  botonCerrarTexto: { color: '#666', fontSize: 14 },
  scroll: { flex: 1 },
  scrollContenido: { padding: 16, paddingBottom: 40 },
  scrollContenidoFondo: { minHeight: 2000 },
  fondoImagen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2000,
    width: '100%',
  },
  contenidoSobreFondo: { flex: 1 },
  mitades: { flexDirection: 'row', marginBottom: 24 },
  mitadIzquierda: {},
  mitadDerecha: { overflow: 'hidden', paddingRight: 24 },
  tituloSeccion: { fontSize: 18, color: '#fff', marginBottom: 16 },
  bloqueAncho: { marginBottom: 28 },
  bloqueArtistInfoCard: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(18,18,18,0.92)' : 'rgba(22,22,22,0.95)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
    overflow: 'hidden',
    ...(Platform.OS === 'web' && {
      boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,197,94,0.1)',
    }),
  },
  bloqueArtistInfoContenido: { padding: 24 },
  filaArtistInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 8 },
  artistInfoTitulo: { fontSize: 20, fontWeight: '700', color: '#22c55e' },
  flechas: { fontSize: 15, color: '#fff', letterSpacing: 1 },
  bioTexto: { color: '#e5e5e5', fontSize: 15, lineHeight: 24, marginBottom: 14 },
  bioTextoBlock: { fontSize: 16, lineHeight: 26, marginBottom: 16 },
  bioDestacado: { color: '#fff', fontWeight: '600' },
  filaRedes: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginVertical: 24, gap: 16 },
  filaRedesCentrada: { justifyContent: 'center', gap: 28 },
  redItem: { alignItems: 'center', minWidth: 80 },
  redLabel: { color: '#fff', fontSize: 14, marginTop: 8 },
  fotoConcierto: {
    marginVertical: 24,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.4)',
    ...(Platform.OS === 'web' && {
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    }),
  },
  fotoConciertoLabel: {
    backgroundColor: 'rgba(34,197,94,0.2)',
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  placeholderConcierto: {
    minHeight: 220,
    backgroundColor: 'rgba(26,26,26,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(34,197,94,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  placeholderConciertoInner: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(34,197,94,0.35)',
    borderStyle: 'dashed',
    minWidth: '100%',
  },
  placeholderConciertoTexto: { color: '#22c55e', fontSize: 17, fontWeight: '600', marginTop: 12 },
  placeholderConciertoSub: { color: '#9ca3af', fontSize: 14, marginTop: 4 },
  ctaSection: { marginTop: 28, marginBottom: 16 },
  ctaTitulo: { fontSize: 20, fontWeight: '800', color: '#22c55e', marginBottom: 4 },
  ctaTituloBlock: { fontSize: 22 },
  ctaSubtitulo: { fontSize: 16, color: '#fff', fontWeight: '500' },
  ctaSubtituloBlock: { fontSize: 17 },
  tituloSeccionVerde: {
    fontSize: 20,
    fontWeight: '800',
    color: '#22c55e',
    marginBottom: 4,
    ...(Platform.OS === 'web' && {
      textShadow: '0 0 1px #fff, 0 0 2px #fff',
    }),
  },
  lineaFlechas: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: 16,
    width: '100%',
  },
  filaPosters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  posterPlaceholder: {
    width: '30%',
    aspectRatio: 0.7,
    backgroundColor: 'rgba(42,42,42,0.9)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  carruselPresentaciones: { marginBottom: 24 },
  carruselPresentacionesContenido: { paddingRight: 24, paddingVertical: 4 },
  carruselPresentacionesItem: { marginRight: 12 },
  carruselPresentacionesPlaceholder: {
    aspectRatio: 0.72,
    backgroundColor: 'rgba(26,26,26,0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    ...(Platform.OS === 'web' && {
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    }),
  },
  carruselPresentacionesLabel: {
    color: 'rgba(34,197,94,0.8)',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  bioTextoVerde: { color: '#22c55e', fontSize: 15, lineHeight: 24, marginBottom: 14, fontWeight: '500' },
  bioTextoVerdeDestacado: {
    color: '#00dc57',
    fontSize: 17,
    lineHeight: 26,
    marginBottom: 20,
    marginTop: 4,
    fontWeight: '700',
    ...(Platform.OS === 'web' && { textShadow: '0 0 12px rgba(0,220,87,0.4)' }),
  },
  filaTituloLogo: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  filaTituloLogoDerecha: { justifyContent: 'flex-end' },
  subtituloSeccion: { fontSize: 16, color: '#fff', fontWeight: '400', marginTop: 2 },
  tituloSeccionVerdeGrande: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00dc57',
    marginBottom: 4,
    textAlign: 'right',
    ...(Platform.OS === 'web' && { textShadow: '0 0 14px rgba(0,220,87,0.5)' }),
  },
  subtituloSeccionDestacado: { fontSize: 15, color: '#00dc57', fontWeight: '700', marginTop: 4, textAlign: 'right' },
  filaAlbum: { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 20 },
  albumPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderWidth: 2,
    borderColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumPlaceholderTexto: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  albumPlaceholderPeq: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(42,42,42,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.4)',
  },
  listaAlbums: { marginBottom: 20 },
  listaAlbumsItem: { marginBottom: 8 },
  listaAlbumsFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(42,42,42,0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,220,87,0.3)',
  },
  listaAlbumsFilaIzq: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  listaAlbumsTitulo: { color: '#fff', fontSize: 16, fontWeight: '600', flex: 1 },
  carruselAlbums: { marginBottom: 20 },
  carruselAlbumsContenido: { paddingRight: 24, paddingVertical: 4 },
  carruselAlbumsItem: { marginRight: CARRUSEL_GAP, width: 140, alignItems: 'center' },
  carruselAlbumsPortada: {
    width: 140,
    height: 140,
    borderRadius: 12,
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(34,197,94,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    ...(Platform.OS === 'web' && { boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }),
  },
  carruselAlbumsPortadaTexto: { color: '#fff', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  carruselAlbumsTitulo: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 10, textAlign: 'center' },
  carruselAlbumsSpotify: { color: '#00dc57', fontSize: 12, marginTop: 4 },
  socialSectionTitulo: { fontSize: 18, color: '#fff', marginBottom: 12 },
  handlesLista: { marginBottom: 16 },
  handleRow: { flexDirection: 'row', marginBottom: 6, alignItems: 'baseline' },
  handleLabel: { color: '#22c55e', fontSize: 14, fontWeight: '600' },
  handleTexto: { color: '#fff', fontSize: 14 },
  iconoRedCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(34,197,94,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  integrantesTitulo: { fontSize: 16, color: '#fff', marginTop: 20, marginBottom: 8 },
  integranteRow: { marginBottom: 4 },
  filaLinksHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  qrPlaceholder: {
    marginLeft: 'auto',
    width: 80,
    height: 80,
    backgroundColor: 'rgba(42,42,42,0.9)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrPlaceholderTexto: { color: '#22c55e', fontSize: 10, marginTop: 4 },
  qrDerecha: { marginLeft: 'auto' },
  listaLinks: { marginTop: 8 },
  listaLinksVacio: { color: '#888', fontSize: 14, fontStyle: 'italic', marginVertical: 12 },
  linkItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingVertical: 8, gap: 12 },
  linkItemCover: { width: 56, height: 56, borderRadius: 8 },
  linkItemTexto: { flex: 1 },
  linkTitulo: { color: '#fff', fontSize: 14, marginBottom: 2 },
  linkUrl: { color: '#9ca3af', fontSize: 12 },
  linkVerEn: { color: '#00dc57', fontSize: 12, marginTop: 4, fontWeight: '600' },
  bloqueLinksPrensa: { paddingRight: 24 },
  filaLinksPrensaHeader: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  linkPrensaItem: { marginBottom: 14, paddingVertical: 4 },
  lineaVerde: { backgroundColor: 'rgba(34,197,94,0.5)' },
  barraVerdeRedes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 0,
    gap: 12,
  },
  barraVerdeFlechas: { color: '#fff', fontSize: 14, letterSpacing: 1 },
  filaIconosFooter: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  iconoFooter: { padding: 4 },
  footerNav: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  footerNavLink: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footerContacto: {
    backgroundColor: '#22c55e',
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  footerContactoTitulo: { color: 'rgba(255,255,255,0.95)', fontSize: 18, marginBottom: 10 },
  footerContactoTexto: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginBottom: 6 },
  footerContactoLink: { color: 'rgba(255,255,255,0.95)', fontSize: 14, fontWeight: '600' },
  filaTerminos: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 4 },
  footerContactoTagline: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 8 },
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
  toggle: { marginTop: 12, alignItems: 'center' },
  toggleTexto: { color: '#00dc57', fontSize: 14, fontWeight: '500' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    marginBottom: 10,
  },
  filaFoto: { marginBottom: 12, alignItems: 'center' },
  fotoPreview: { position: 'relative', alignSelf: 'center', marginBottom: 8 },
  fotoPreviewImg: { width: 72, height: 72, borderRadius: 36 },
  quitarFoto: { position: 'absolute', top: -4, right: -4 },
  botonFotoUnico: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.4)',
  },
  botonFotoTexto: { color: '#00dc57', fontSize: 14 },
  filaCheckbox: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  checkboxTexto: { color: '#ccc', fontSize: 14 },
  inputContenedorPassword: { position: 'relative', marginBottom: 10 },
  ojo: { position: 'absolute', right: 12, top: 10 },
  boton: {
    backgroundColor: '#00dc57',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  botonDeshabilitado: { opacity: 0.7 },
  botonTexto: { color: '#000', fontWeight: '600', fontSize: 14 },
  filaGoogle: { marginBottom: 24 },
  botonGoogle: {
    backgroundColor: '#4285f4',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  botonGoogleTexto: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
