import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Modal,
  Pressable } from
'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexto/AuthContext';
import { iniciarSesionEmail, registrarEmail, iniciarSesionConTokenGoogle } from '../servicios/auth';
import { listarFlyersPublicos } from '../servicios/api';
import { getBaseUrl } from '../config/api';
import { esAdmin, nombreRutaHomeApp } from '../constantes/nivelesAcceso';
import { useFocusEffect } from '@react-navigation/native';
import { aplicarSeoWeb } from '../servicios/seoWeb';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = '711635271834-r316qrd5p19oh8mcn1n1qg1o00209nav.apps.googleusercontent.com';
const GOOGLE_WEB_CLIENT_ID = '844963020835-b7pt28vp1upelsefhapf22qsksjecj3l.apps.googleusercontent.com';

const LOGO_TEXTO = 'Somos Thugs';

const TITULO_HEADER_PRESSKIT = '¿SOMOS THUGS O QUÉ?';
const ETIQUETA_FESTIVAL_ARTIST_INFO = 'Festival Escena Desierto';
const FONDO_THUGS = require('../../assets/fondo-thugs.png');

const LOGO_HEADER_INVITADO = require('../../assets/logo-somos-thugs-banner.png');

const PORTADA_ALBUM_ROLANDO_CALLES = require('../../assets/album-rolando-calles-arte.png');
const IMAGEN_ARTIST = require('../../assets/artist.png');
const IMAGEN_TRAYECTORIA = require('../../assets/trayectoria-presentacion-en-vivo.png');


const VIDEOS_TRAYECTORIA = [
{
  titulo: 'Los Thugs — Live Rimas Y Chingazos Episodio 1',
  youtubeUrl: 'https://www.youtube.com/watch?v=QOq-kwFbOTA'
},
{
  titulo: 'One Last Time Party',
  youtubeUrl: 'https://www.youtube.com/watch?v=JCsszoogPJw'
},
{
  titulo: 'Thugs Sessionz Cap 1',
  subtitulo: 'Segunda sesión programada de consumo cannábico',
  youtubeUrl: 'https://www.youtube.com/watch?v=DqncmZCz8oQ'
}];

const REDES_SOCIALES = [
{ id: 'youtube', icon: 'logo-youtube', label: 'Los Thugs', url: 'https://www.youtube.com/@losthugs33' },
{ id: 'facebook', icon: 'logo-facebook', label: 'LosThugs', url: 'https://www.facebook.com/losthugs614' },
{ id: 'instagram', icon: 'logo-instagram', label: 'Los.Thugs', url: 'https://instagram.com/Los.Thugs' }];


const REDES_HANDLES = [
{ label: 'Fb', handle: '@losthugs614', url: 'https://www.facebook.com/losthugs614' },
{ label: 'ig', handle: '@los.thugs', url: 'https://instagram.com/los.thugs' },
{ label: 'YouTube', handle: '@losthugs33', url: 'https://www.youtube.com/@losthugs33' }];


const FOTO_INTEGRANTE_SERGIO_MARIN = require('../../assets/integrante-sergio-marin.png');
const FOTO_INTEGRANTE_OMEGA_MORALES = require('../../assets/integrante-omega-morales.png');
const FOTO_INTEGRANTE_CHARDS_RIVERA = require('../../assets/integrante-chards-rivera.png');
const FOTO_INTEGRANTE_PABLITO_TATTOOS = require('../../assets/integrante-pablito-tattoos.png');

const INTEGRANTES = [
{
  nombre: 'Chards Rivera',
  ig: '@chardsrivera',
  url: 'https://instagram.com/chardsrivera',
  foto: FOTO_INTEGRANTE_CHARDS_RIVERA
},
{
  nombre: 'Omega Morales',
  ig: '@moralesomega',
  url: 'https://instagram.com/moralesomega',
  foto: FOTO_INTEGRANTE_OMEGA_MORALES
},
{
  nombre: 'Pablito Tattos',
  ig: '@pablito.tattoos',
  url: 'https://www.instagram.com/pablito.tattoos/',
  foto: FOTO_INTEGRANTE_PABLITO_TATTOOS
},
{
  nombre: 'Sergio Marin',
  ig: '@marinzote87',
  url: 'https://www.instagram.com/marinzote87/',
  foto: FOTO_INTEGRANTE_SERGIO_MARIN
}];


const LINKS_PRENSA = [
{ titulo: 'Casa Norte', url: 'https://www.youtube.com/watch?v=X_o6TkUZT48' },
{ titulo: 'Circuito Norte - Antena 102.5 fm', url: 'https://www.facebook.com/share/x/1DcNydKnaM/' },
{ titulo: 'Ay Claudia!', url: 'https://www.youtube.com/watch?v=MDAXTgeKNII' }];



const FRASES_BLOQUES = [
{ titulo: 'SI SE SIENTE BIEN', subtitulo: 'YEAH SE SIENTE' },
{ titulo: 'EXOTICAS CARRETERAS', subtitulo: 'EFECTO LCD' },
{ titulo: 'ENERGIA POSITIVA QUE DETONE', subtitulo: 'Y QUE REVIENTE' },
{ titulo: 'LA DJ VA A MEZCLARLO', subtitulo: 'HASTA EL AMANECER' },
{ titulo: 'TINTA DE MI MENTE', subtitulo: 'DEMENTE CONCIENTE' },
{ titulo: 'DENUEVO EN EL JUEGO', subtitulo: 'LOS LOCOS DEL WEST' },
{ titulo: 'CHECK CHECK', subtitulo: 'CHEQUELE MUY BIEN' }];



const SINGLES = [
{ titulo: 'Mr Pipeins (Live)', url: 'https://open.spotify.com/album/1JnRG3WRJRNRqgNHw85gWj', cover: require('../../assets/pipeins.png'), youtubeUrl: 'https://youtu.be/0JDIv9j1FoE' },
{ titulo: 'Méjico Mágico', url: 'https://open.spotify.com/album/3IMLWcl5o6bXfME4LNoJG9', cover: require('../../assets/mijicomajico.png'), youtubeUrl: 'https://youtu.be/cYNtsn8qb_c' },
{ titulo: 'El Último Tren', url: 'https://open.spotify.com/album/16zmKIQJ1CGwfwtQlgzAJs', cover: require('../../assets/ultimotren.png'), youtubeUrl: 'https://youtu.be/INefC_h6IBo' },
{ titulo: 'El Song De La Thug Life', url: 'https://open.spotify.com/album/5up5lvNRgiNBXg1J5aOtv7', cover: require('../../assets/elsong.png'), youtubeUrl: 'https://youtu.be/wdmctl790lw' },
{ titulo: '7 Postes', url: 'https://open.spotify.com/track/01MO4fXNPRxwzTDFLvNL5K', youtubeUrl: 'https://www.youtube.com/watch?v=VHtbPIgi_1Y', cover: require('../../assets/7postes.png') },
{ titulo: 'Playeras Pa\' Detonar', url: 'https://open.spotify.com/track/19MwdytK5mpFlmetaJxn2w', youtubeUrl: 'https://www.youtube.com/watch?v=gOodHcuYgog', cover: require('../../assets/playeras.png') }];


const WHATSAPP_NUMERO = '3315873924';
const EMAIL_CONTACTO = 'info.rolandocallesent@gmail.com';
const VIDEO_HERO_YOUTUBE = 'https://www.youtube.com/watch?v=SJxBQJqo5pk';


const COMUNIDAD_TEXTO_PRINCIPAL =
'Somos una comunidad de artistas urbanos independientes en México, enfocada en rap, freestyle y cultura callejera, donde los sueños raros se convierten en realidad.';

const COMUNIDAD_TEXTO_SECUNDARIO =
'Accede a episodios completos, contenido exclusivo y conecta con una comunidad de artistas urbanos.';


const COMUNIDAD_CTA_TEXTO = '¿Somos thugs o qué?';
const REDES_FOOTER = [
{ id: 'spotify', icon: 'musical-notes', url: 'https://open.spotify.com/artist/1ZqgJzPb8hw9d5NnnvGnzk' },
{ id: 'youtube', icon: 'logo-youtube', url: 'https://www.youtube.com/@losthugs33' },
{ id: 'facebook', icon: 'logo-facebook', url: 'https://www.facebook.com/losthugs614' },
{ id: 'whatsapp', icon: 'logo-whatsapp', url: `https://wa.me/52${WHATSAPP_NUMERO.replace(/\s/g, '')}` },
{ id: 'instagram', icon: 'logo-instagram', url: 'https://instagram.com/los.thugs' },
{ id: 'email', icon: 'mail', url: `mailto:${EMAIL_CONTACTO}` }];

const BOOKING_WHATSAPP = WHATSAPP_NUMERO;


function navegarSegunPerfil(navigation, perfil) {
  navigation.replace(nombreRutaHomeApp(perfil));
}

const PRESENTACIONES_ITEMS = 6;
const CARRUSEL_GAP = 12;
const FLYERS_PRESENTACIONES = [
require('../../assets/flyers/flyer1.jpeg'),
require('../../assets/flyers/flyer2.jpeg'),
require('../../assets/flyers/flyer3.jpeg'),
require('../../assets/flyers/flyer4.jpeg'),
require('../../assets/flyers/flyer5.jpeg'),
require('../../assets/flyers/flyer6.jpeg')];


function normalizarPathFlyerLegacy(url) {
  const s = String(url || '').trim();
  if (!s) return '';
  if (s.includes('/uploads/flyer_') && !s.includes('/uploads/flyers/')) {
    return s.replace('/uploads/flyer_', '/uploads/flyers/flyer_');
  }
  return s;
}

function absolutizarFlyer(url) {
  const s = normalizarPathFlyerLegacy(url);
  if (!s) return '';
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:')) return s;
  const base = getBaseUrl();
  return `${base}${s.startsWith('/') ? s : `/${s}`}`;
}


const ALBUMS = [
{
  id: '1',
  titulo: 'Rolando Calles',
  spotifyUrl: 'https://open.spotify.com/album/6C5iPRNs1pbrZuyVkmJLBd',
  portada: PORTADA_ALBUM_ROLANDO_CALLES
}];


function extraerAlbumIdSpotify(url) {
  if (!url) return null;
  const m = url.match(/spotify\.com\/album\/([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
}

function extraerVideoIdYouTube(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

const youtubeEmbedContenedor = { width: '70%', alignSelf: 'center', aspectRatio: 16 / 9, marginTop: 12, borderRadius: 12, overflow: 'hidden' };
const youtubeEmbedBoton = { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingVertical: 14, paddingHorizontal: 20, backgroundColor: 'rgba(255,0,0,0.15)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,0,0,0.4)' };
const youtubeEmbedBotonTexto = { color: '#ff0000', fontSize: 15, fontWeight: '600' };

function YouTubeEmbed({
  videoId,
  youtubeUrl,
  startSeconds = 0,
  endSeconds = 0,
  autoplay = false,
  muted = false,
  containerStyle
}) {
  const contenedorRef = useRef(null);
  useEffect(() => {
    if (Platform.OS !== 'web' || !videoId || typeof document === 'undefined') return;
    const container = contenedorRef.current;
    if (!container || typeof container.appendChild !== 'function') return;
    const params = new URLSearchParams({
      rel: '0',
      playsinline: '1',
      autoplay: autoplay ? '1' : '0',
      mute: muted ? '1' : '0'
    });
    if (startSeconds > 0) params.set('start', String(startSeconds));
    if (endSeconds > 0) params.set('end', String(endSeconds));
    const el = document.createElement('iframe');
    el.src = `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.border = 'none';
    el.style.borderRadius = '12px';
    el.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    el.setAttribute('allowFullScreen', '');
    container.appendChild(el);
    return () => {try {container.removeChild(el);} catch (_) {}};
  }, [videoId, startSeconds, endSeconds, autoplay, muted]);
  if (Platform.OS === 'web') {
    return <View ref={contenedorRef} style={[youtubeEmbedContenedor, containerStyle]} collapsable={false} />;
  }
  return (
    <TouchableOpacity style={youtubeEmbedBoton} onPress={() => youtubeUrl && Linking.openURL(youtubeUrl)}>
      <Ionicons name="logo-youtube" size={24} color="#ff0000" />
      <Text style={youtubeEmbedBotonTexto}>Ver en YouTube</Text>
    </TouchableOpacity>);

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
    return () => {try {container.removeChild(el);} catch (_) {}};
  }, [albumId]);
  if (Platform.OS === 'web') {
    return <View ref={contenedorRef} style={spotifyEmbedContenedor} collapsable={false} />;
  }
  return (
    <TouchableOpacity style={spotifyEmbedBoton} onPress={() => spotifyUrl && Linking.openURL(spotifyUrl)}>
      <Ionicons name="musical-notes" size={24} color="#00dc57" />
      <Text style={spotifyEmbedBotonTexto}>Abrir en Spotify</Text>
    </TouchableOpacity>);

}

export default function InicioPresskit({ navigation }) {
  const insets = useSafeAreaInsets();
  const dimensions = useWindowDimensions();
  const [webSize, setWebSize] = useState(null);


  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const update = () => setWebSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const width = Platform.OS === 'web' && webSize != null ? webSize.width : dimensions.width;
  const esWebDesktop = Platform.OS === 'web' && width >= 768;

  const screenW =
  Platform.OS === 'web' && typeof window !== 'undefined' ?
  window.screen?.width || width :
  width;
  const umbralDosColsTrayectoria = Math.max(640, Math.round(screenW * 0.5));
  const esTrayectoriaGridDosColumnas =
  Platform.OS === 'web' && width >= umbralDosColsTrayectoria;
  const contentWidth = Math.max(width - 64, 320);

  const presskitHeroVideoWidth = Math.max(Math.round(contentWidth * 0.78), 272);
  const footerIconSize = Platform.OS === 'web' ? width < 360 ? 22 : width < 520 ? 24 : 28 : 28;
  const carruselItemWidth = Math.min((contentWidth - 48) * 0.52, 220);
  const carruselSnapInterval = carruselItemWidth + CARRUSEL_GAP;
  const { perfil, cerrarSesion, establecerPerfil } = useAuth();
  const estaAutenticado = !!perfil;
  const rutaHomeHeader = esAdmin(perfil) ? 'ContenidoGeneral' : nombreRutaHomeApp(perfil);

  const [modo, setModo] = useState('login');
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
  const [singleExpandidoId, setSingleExpandidoId] = useState(null);
  const [flyersDinamicos, setFlyersDinamicos] = useState([]);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [globoRegistroVisible, setGloboRegistroVisible] = useState(false);
  const scrollRef = useRef(null);
  const contenidoPresskitYRef = useRef(0);
  const linksPrensaYEnContenidoRef = useRef(0);
  const linksPrensaAbsYRef = useRef(0);
  const linksPrensaScrollMedidoRef = useRef(false);
  const globoRegistroDisparadoRef = useRef(false);
  const heroVideoId = extraerVideoIdYouTube(VIDEO_HERO_YOUTUBE);


  const abrirModalRegistro = useCallback(() => {
    setModo('registro');
    setAuthModalVisible(true);
  }, []);

  const actualizarLinksPrensaAbsY = useCallback(() => {
    linksPrensaAbsYRef.current = contenidoPresskitYRef.current + linksPrensaYEnContenidoRef.current;
  }, []);

  const onContenidoPresskitLayout = useCallback(
    (e) => {
      contenidoPresskitYRef.current = e.nativeEvent.layout.y;
      if (linksPrensaScrollMedidoRef.current) actualizarLinksPrensaAbsY();
    },
    [actualizarLinksPrensaAbsY]
  );

  const onLinksPrensaSectionLayout = useCallback(
    (e) => {
      const { y, height } = e.nativeEvent.layout;
      if (height <= 0) return;
      linksPrensaYEnContenidoRef.current = y;
      linksPrensaScrollMedidoRef.current = true;
      actualizarLinksPrensaAbsY();
    },
    [actualizarLinksPrensaAbsY]
  );

  const onPresskitScroll = useCallback(
    (e) => {
      if (estaAutenticado || globoRegistroDisparadoRef.current || !linksPrensaScrollMedidoRef.current) return;
      const { contentOffset, layoutMeasurement } = e.nativeEvent;
      const scrollY = contentOffset.y;
      const viewH = layoutMeasurement.height;
      const sectionY = linksPrensaAbsYRef.current;
      if (scrollY + viewH >= sectionY + 100) {
        globoRegistroDisparadoRef.current = true;
        setGloboRegistroVisible(true);
      }
    },
    [estaAutenticado]
  );

  useEffect(() => {
    if (estaAutenticado) {
      setGloboRegistroVisible(false);
    }
  }, [estaAutenticado]);

  useFocusEffect(
    useCallback(() => {
      aplicarSeoWeb();
    }, [])
  );

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const data = await listarFlyersPublicos();
        if (cancel) return;
        const arr = Array.isArray(data) ? data : [];
        setFlyersDinamicos(
          arr.
          map((x) => absolutizarFlyer(x?.urlImagen)).
          filter((x) => typeof x === 'string' && x.length > 0)
        );
      } catch (_) {
        if (!cancel) setFlyersDinamicos([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const webRedirectUri = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined;
  const [request,, promptAsync] = Google.useIdTokenAuthRequest(
    {
      webClientId: GOOGLE_WEB_CLIENT_ID,
      redirectUri: webRedirectUri,
      iosClientId: Platform.OS === 'ios' ? GOOGLE_CLIENT_ID : undefined,
      androidClientId: Platform.OS === 'android' ? GOOGLE_CLIENT_ID : undefined
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
      base64: true
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
      base64: true
    });
    if (!resultado.canceled && resultado.assets[0]) {
      const asset = resultado.assets[0];
      setFotoUri(asset.uri);
      setFotoBase64(asset.base64 || null);
    }
  };

  const elegirOrigenFoto = () => {
    if (Platform.OS === 'web') {
      elegirDeGaleria();
      return;
    }
    Alert.alert('Foto', 'Elige el origen', [
    { text: 'Galería', onPress: elegirDeGaleria },
    { text: 'Tomar foto', onPress: tomarFoto },
    { text: 'Cancelar', style: 'cancel' }]
    );
  };

  const onLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('', 'Email y contraseña.');
      return;
    }
    setLoginCargando(true);
    try {
      const p = await iniciarSesionEmail(email.trim(), password);
      if (!p) {Alert.alert('Error', 'Perfil no encontrado.');return;}
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
        aceptaNotificaciones
      });
      establecerPerfil(p);
      navegarSegunPerfil(navigation, p);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setRegCargando(false);
    }
  };

  const renderAuthForm = () =>
  <>
      <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={estilos.cuadroGlass}>
      
        <View style={estilos.formularioUnico}>
          <Text style={estilos.tituloMitad}>
            {modo === 'registro' ? 'Registro' : 'Iniciar sesión'}
          </Text>
          {modo === 'registro' &&
        <>
              <View style={estilos.filaFoto}>
                {fotoUri ?
            <View style={estilos.fotoPreview}>
                    <Image source={{ uri: fotoUri }} style={estilos.fotoPreviewImg} />
                    <TouchableOpacity style={estilos.quitarFoto} onPress={() => {setFotoUri(null);setFotoBase64(null);}}>
                      <Ionicons name="close-circle" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View> :
            null}
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
            autoCapitalize="words" />
          
              <TextInput
            style={estilos.input}
            placeholder="Usuario *"
            placeholderTextColor="#9ca3af"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none" />
          
            </>
        }
          <TextInput
          style={estilos.input}
          placeholder="Correo *"
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none" />
        
          {modo === 'registro' &&
        <TextInput
          style={estilos.input}
          placeholder="Teléfono (opcional)"
          placeholderTextColor="#9ca3af"
          value={telefono}
          onChangeText={setTelefono}
          keyboardType="phone-pad" />

        }
          <View style={estilos.inputContenedorPassword}>
            <TextInput
            style={estilos.input}
            placeholder={modo === 'registro' ? 'Contraseña (mín. 6) *' : 'Contraseña'}
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!mostrarPass} />
          
            <TouchableOpacity style={estilos.ojo} onPress={() => setMostrarPass((v) => !v)}>
              <Ionicons name={mostrarPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
          {modo === 'registro' &&
        <TouchableOpacity
          style={estilos.filaCheckbox}
          onPress={() => setAceptaNotificaciones((v) => !v)}
          activeOpacity={0.7}>
          
              <Ionicons
            name={aceptaNotificaciones ? 'checkbox' : 'square-outline'}
            size={22}
            color={aceptaNotificaciones ? '#00dc57' : '#6b7280'} />
          
              <Text style={estilos.checkboxTexto}>Acepto notificaciones</Text>
            </TouchableOpacity>
        }
          {modo === 'registro' ?
        <>
              <TouchableOpacity
            style={[estilos.boton, regCargando && estilos.botonDeshabilitado]}
            onPress={onRegister}
            disabled={regCargando}>
            
                {regCargando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={estilos.botonTexto}>Registrarme</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={estilos.toggle} onPress={() => setModo('login')}>
                <Text style={estilos.toggleTexto}>¿Ya tienes una cuenta?</Text>
              </TouchableOpacity>
            </> :

        <>
              <TouchableOpacity
            style={[estilos.boton, loginCargando && estilos.botonDeshabilitado]}
            onPress={onLogin}
            disabled={loginCargando}>
            
                {loginCargando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={estilos.botonTexto}>Entrar</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={estilos.toggle} onPress={() => setModo('registro')}>
                <Text style={estilos.toggleTexto}>¿Aún no tienes cuenta?</Text>
              </TouchableOpacity>
            </>
        }
        </View>
      </KeyboardAvoidingView>
      <View style={estilos.filaGoogle}>
        <TouchableOpacity
        style={[estilos.botonGoogle, cargandoGoogle && estilos.botonDeshabilitado]}
        onPress={onGoogle}
        disabled={!request || cargandoGoogle}>
        
          {cargandoGoogle ? <ActivityIndicator color="#fff" size="small" /> : <Text style={estilos.botonGoogleTexto}>Entrar con Google</Text>}
        </TouchableOpacity>
      </View>
    </>;


  const renderBloqueComunidad = () =>
  <View style={[estilos.bloqueAncho, { width: contentWidth }]}>
      <View style={[estilos.bloqueArtistInfoCard, estilos.bloqueComunidadCard]}>
        <View style={estilos.bloqueArtistInfoContenido}>
          <View style={estilos.filaArtistInfo}>
            <Text style={estilos.artistInfoTitulo}>NUESTRA COMUNIDAD</Text>
            <Text style={estilos.flechas}>&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;</Text>
          </View>
          <Text style={estilos.comunidadCuerpoPrincipal}>{COMUNIDAD_TEXTO_PRINCIPAL}</Text>
          {!estaAutenticado ?
        <TouchableOpacity
          style={estilos.comunidadBotonCta}
          onPress={abrirModalRegistro}
          activeOpacity={0.85}>
          
              <Text style={estilos.comunidadBotonCtaTexto}>{COMUNIDAD_CTA_TEXTO}</Text>
            </TouchableOpacity> :
        null}
          <Text style={estilos.comunidadCuerpoSecundario}>
            {estaAutenticado ?
          'Tu cuenta te da acceso a episodios completos, contenido exclusivo y a esta comunidad de artistas urbanos.' :
          COMUNIDAD_TEXTO_SECUNDARIO}
          </Text>
        </View>
      </View>
    </View>;


  return (
    <View style={estilos.contenedor}>
      <View
        style={[
        estilos.header,
        !estaAutenticado && estilos.headerInvitado,
        Platform.OS !== 'web' && { paddingTop: insets.top + 8 }]
        }>
        {estaAutenticado ?
        <>
            <TouchableOpacity
            onPress={() => {
              navigation.navigate(rutaHomeHeader);
            }}
            style={estilos.headerBack}
            hitSlop={10}
            activeOpacity={0.8}>
            
              <Ionicons name="arrow-back" size={22} color="#fff" style={estilos.headerFlechaAtras} />
              <Image
              source={LOGO_HEADER_INVITADO}
              style={[estilos.headerLogoAlLado, estilos.headerLogoJuntoFlecha]}
              resizeMode="contain" />
              
            </TouchableOpacity>
            <Text style={estilos.headerTituloPresskit} pointerEvents="none" numberOfLines={2}>
              {TITULO_HEADER_PRESSKIT}
            </Text>
            <View style={estilos.headerDerPresskit}>
              <View style={estilos.headerEspacioPresskit} />
            </View>
          </> :

        <>
            <TouchableOpacity
            onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
            style={estilos.headerBackInvitadoWrap}
            hitSlop={10}
            activeOpacity={0.8}>
            
              <Image source={LOGO_HEADER_INVITADO} style={estilos.headerLogoInvitado} resizeMode="contain" />
            </TouchableOpacity>
            <View style={estilos.headerTituloInvitadoCentro} pointerEvents="none">
              <Text style={estilos.headerTituloInvitado} numberOfLines={2}>
                {TITULO_HEADER_PRESSKIT}
              </Text>
            </View>
            <View style={estilos.headerDerPresskitInvitado}>
              <TouchableOpacity
              style={estilos.headerRegistrarBtn}
              onPress={abrirModalRegistro}
              activeOpacity={0.8}>
              
                <Text style={estilos.headerRegistrarBtnTexto}>Registrar</Text>
              </TouchableOpacity>
            </View>
          </>
        }
      </View>
      <ScrollView
        ref={scrollRef}
        style={estilos.scroll}
        contentContainerStyle={[estilos.scrollContenido, estilos.scrollContenidoFondo, estaAutenticado && { paddingTop: 0 }, Platform.OS === 'web' && estilos.scrollContenidoRelative]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={onPresskitScroll}
        scrollEventThrottle={32}>
        
        {Platform.OS === 'web' ?
        <View style={estilos.fondoImagenWrapperWeb} pointerEvents="none">
            <Image source={FONDO_THUGS} style={estilos.fondoImagen} resizeMode="repeat" />
          </View> :

        <Image
          source={FONDO_THUGS}
          style={estilos.fondoImagen}
          resizeMode="repeat" />

        }
        <View style={estilos.contenidoSobreFondo} onLayout={onContenidoPresskitLayout}>
        {heroVideoId ?
          <View style={[estilos.bloqueAncho, estilos.heroVideoTopBlock, { width: presskitHeroVideoWidth }]}>
            <YouTubeEmbed
              videoId={heroVideoId}
              youtubeUrl={VIDEO_HERO_YOUTUBE}
              startSeconds={0}
              endSeconds={69}
              autoplay
              muted
              containerStyle={estilos.heroVideoTopEmbed} />
            
          </View> :
          null}
        {heroVideoId ? renderBloqueComunidad() : null}
        <View style={[estilos.bloqueAncho, estilos.bloqueArtistInfoCard, { width: contentWidth }, estaAutenticado && estilos.primeraTarjetaPegadaAlLogo]}>
          <View style={estilos.bloqueArtistInfoContenido}>
            <View style={estilos.filaArtistInfo}>
              <Text style={estilos.artistInfoTitulo}>ARTIST INFO</Text>
              <Text style={estilos.flechas}>&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;</Text>
            </View>
            <Text style={[estilos.bioTexto, estilos.bioTextoBlock]}>
              <Text style={estilos.bioDestacado}>Los Thugs</Text> es un proyecto de hip hop estilero chihuahuense formado por un dueto de viejos amigos (Chards y Omega) a mediados del 2019.
            </Text>
            <Text style={[estilos.bioTexto, estilos.bioTextoBlock]}>
              Cruzando la pandemia del COVID-19 la creatividad llegó y creamos 5 canciones con las cuales comenzamos a ensayar y en el año 2021… salimos a la luz.
            </Text>

            <View style={[estilos.filaRedes, estilos.filaRedesCentrada]}>
              {REDES_SOCIALES.map((red) =>
                <TouchableOpacity
                  key={red.id}
                  style={estilos.redItem}
                  onPress={() => red.url && Linking.openURL(red.url)}
                  activeOpacity={0.7}>
                  
                  <Ionicons name={red.icon} size={34} color="#fff" />
                  <Text style={estilos.redLabel} numberOfLines={1}>{red.label}</Text>
                </TouchableOpacity>
                )}
            </View>

            <View
                style={[
                estilos.enVivoWrapper,
                esWebDesktop ?
                estilos.enVivoWrapperWebDesktop :
                Platform.OS === 'web' ?
                estilos.enVivoWrapperWebMobile :
                estilos.enVivoWrapperNative]
                }>
                
              <Text style={estilos.enVivoEtiqueta} numberOfLines={2}>
                {ETIQUETA_FESTIVAL_ARTIST_INFO}
              </Text>
              <View style={[estilos.imagenArtistInfoContenedor, esWebDesktop && estilos.imagenArtistInfoContenedorWebDesktop]}>
                <Image
                    source={IMAGEN_ARTIST}
                    style={[estilos.imagenArtistInfo, esWebDesktop && estilos.imagenArtistInfoWebDesktop]}
                    resizeMode={esWebDesktop ? 'cover' : 'contain'} />
                  
              </View>
            </View>
            <Text style={[estilos.bioTexto, estilos.bioTextoBlock]}>
              Para octubre del 2021 fuimos invitados a tocar en una fiesta de Halloween y tanto fue el gusto de la gente, que de ahí en adelante tuvimos presentaciones cada mes, por todo un año.
            </Text>

            <View style={[estilos.fraseBloque, estilos.fraseBloqueIzq]}>
              <Text style={[estilos.fraseTitulo, estilos.fraseTituloIzq]}>{FRASES_BLOQUES[0].titulo}</Text>
              <Text style={[estilos.fraseSubtitulo, estilos.fraseSubtituloIzq]}>{FRASES_BLOQUES[0].subtitulo}</Text>
            </View>
          </View>
        </View>

        <View style={[estilos.bloqueAncho, estilos.bloqueArtistInfoCard, { width: contentWidth }]}>
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
                style={estilos.carruselPresentaciones}>
                
              {(flyersDinamicos.length > 0 ? flyersDinamicos : FLYERS_PRESENTACIONES).map((flyer, idx) =>
                <View key={`flyer-${idx}`} style={[estilos.carruselPresentacionesItem, { width: carruselItemWidth }]}>
                  <View style={estilos.carruselPresentacionesPlaceholder}>
                    <Image
                      source={typeof flyer === 'string' ? { uri: flyer } : flyer}
                      style={estilos.carruselPresentacionesImagen}
                      resizeMode="cover" />
                    
                  </View>
                </View>
                )}
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
            <View style={[estilos.fraseBloque, estilos.fraseBloqueDer]}>
              <Text style={[estilos.fraseTitulo, estilos.fraseTituloDer]}>{FRASES_BLOQUES[1].titulo}</Text>
              <Text style={[estilos.fraseSubtitulo, estilos.fraseSubtituloDer]}>{FRASES_BLOQUES[1].subtitulo}</Text>
            </View>
            <View style={estilos.lineaFlechas} />
          </View>
        </View>

        <View style={[estilos.bloqueAncho, estilos.bloqueArtistInfoCard, { width: contentWidth }]}>
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
                        activeOpacity={0.7}>
                        
                      <View style={estilos.listaAlbumsFilaIzq}>
                        {album.portada ?
                          <View style={estilos.listaAlbumsPortadaMarco}>
                            <Image
                              source={album.portada}
                              style={estilos.listaAlbumsPortadaImg}
                              resizeMode="contain" />
                            
                          </View> :

                          <Ionicons name="musical-notes" size={22} color="#00dc57" />
                          }
                        <Text style={estilos.listaAlbumsTitulo}>{album.titulo}</Text>
                      </View>
                      <Ionicons name={expandido ? 'chevron-up' : 'chevron-down'} size={22} color="#00dc57" />
                    </TouchableOpacity>
                    {expandido && albumIdSpotify &&
                      <SpotifyEmbed albumId={albumIdSpotify} spotifyUrl={album.spotifyUrl} />
                      }
                  </View>);

                })}
            </View>
            <Text style={estilos.bioTexto}>
              El contenido de canciones abordan aventuras por los caminos de la república, patinando desde las calles hasta las galaxias, multiversos de graffiti y hierbas, creando negocios de los sueños que cada uno moldea con sus talentos y reviviendo las historias de este par de callejeros.
            </Text>
            <Text style={estilos.bioTexto}>
              Te sumergirás a este universo llamado: <Text style={estilos.bioDestacado}>LOS THUGS</Text>.
            </Text>
            <View style={[estilos.fraseBloque, estilos.fraseBloqueIzq]}>
              <Text style={[estilos.fraseTitulo, estilos.fraseTituloIzq]}>{FRASES_BLOQUES[2].titulo}</Text>
              <Text style={[estilos.fraseSubtitulo, estilos.fraseSubtituloIzq]}>{FRASES_BLOQUES[2].subtitulo}</Text>
            </View>
            <View style={estilos.lineaFlechas} />
          </View>
        </View>

        <View style={[estilos.bloqueAncho, estilos.bloqueArtistInfoCard, { width: contentWidth }]}>
          <View style={estilos.bloqueArtistInfoContenido}>
            <View style={estilos.filaArtistInfo}>
              <Text style={estilos.artistInfoTitulo}>SINGLES</Text>
              <Text style={estilos.flechas}>&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;</Text>
            </View>
            <View style={estilos.lineaFlechas} />
            <View style={estilos.listaLinks}>
              {SINGLES.length === 0 ?
                <Text style={estilos.listaLinksVacio}>Aún no hay singles. Agrega canciones en la constante SINGLES del código.</Text> :

                SINGLES.map((link, idx) => {
                  const tieneYoutube = !!link.youtubeUrl;
                  const expandido = singleExpandidoId === idx;
                  const videoId = tieneYoutube ? extraerVideoIdYouTube(link.youtubeUrl) : null;
                  return (
                    <View key={idx} style={estilos.listaAlbumsItem}>
                      <TouchableOpacity
                        onPress={() => {
                          if (tieneYoutube) setSingleExpandidoId(expandido ? null : idx);else
                          if (link.url) Linking.openURL(link.url);
                        }}
                        style={estilos.linkItem}
                        activeOpacity={0.7}>
                        
                        {link.cover != null &&
                        <Image source={link.cover} style={estilos.linkItemCover} resizeMode="cover" />
                        }
                        <View style={estilos.linkItemTexto}>
                          <Text style={estilos.linkTitulo}>{link.titulo}</Text>
                          {link.url ? <Text style={estilos.linkUrl} numberOfLines={1}>{link.url}</Text> : null}
                          <View style={estilos.linkAcciones}>
                            {tieneYoutube &&
                            <Text style={estilos.linkVerEn}>{expandido ? '▼ Ocultar video' : '▶ Ver video'}</Text>
                            }
                            {link.url &&
                            <TouchableOpacity onPress={() => link.url && Linking.openURL(link.url)} hitSlop={8}>
                                <Text style={estilos.linkVerEn}>Escuchar en Spotify →</Text>
                              </TouchableOpacity>
                            }
                          </View>
                        </View>
                        {tieneYoutube &&
                        <Ionicons name={expandido ? 'chevron-up' : 'chevron-down'} size={22} color="#00dc57" />
                        }
                      </TouchableOpacity>
                      {tieneYoutube && expandido && videoId &&
                      <YouTubeEmbed videoId={videoId} youtubeUrl={link.youtubeUrl} />
                      }
                    </View>);

                })
                }
            </View>
            <View style={[estilos.fraseBloque, estilos.fraseBloqueDer]}>
              <Text style={[estilos.fraseTitulo, estilos.fraseTituloDer]}>{FRASES_BLOQUES[3].titulo}</Text>
              <Text style={[estilos.fraseSubtitulo, estilos.fraseSubtituloDer]}>{FRASES_BLOQUES[3].subtitulo}</Text>
            </View>
            <View style={estilos.lineaFlechas} />
          </View>
        </View>

        <View style={[estilos.bloqueAncho, estilos.bloqueArtistInfoCard, { width: contentWidth }]}>
          <View style={estilos.bloqueArtistInfoContenido}>
            <View style={estilos.filaArtistInfo}>
              <Text style={estilos.artistInfoTitulo}>TRAYECTORIA</Text>
              <Text style={estilos.flechas}>&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;</Text>
            </View>
            <Text style={estilos.bioTexto}>
              Fuimos nominados en los Monsters Music Awards como mejor artista de rap, cuya premiación se llevó a cabo en el Teatro Metropolitan en Ciudad de México.
            </Text>
            <Text style={estilos.bioTexto}>
              Hemos compartido escenario con artistas nacionales e internacionales tales como: Desplantes Cuu, Delay Castillo Cuu, Vickingos del Norte Cuu, Koko Yamasaki Xalapa, Kion Bajosuelo de Cd. Juárez, Real Stylo de San Luis, Pedro Mo de Perú y algunos más.
            </Text>
            <Text style={estilos.bioTexto}>
              Producimos el álbum Rolando Calles, que cuenta con 11 canciones, en colaboración con Amazonas Music Group.
            </Text>
            <Text style={estilos.bioTexto}>
              Creamos 2 canciones producidas en estudio para JMAS Chihuahua, además de la coordinación y dirección del evento para su presentación.
            </Text>
            <Text style={estilos.bioTexto}>
              Participamos en el &quot;Festival Antojos&quot; de Cuu.
            </Text>
            <Text style={estilos.bioTexto}>
              Fuimos protagonistas en el Festival Musical &quot;Escena Desierto&quot; en Cd. Aldama.
            </Text>
            <Text style={estilos.bioTexto}>
              Realizamos y organizamos presentaciones de manera independiente desde Chihuahua en Tlatelolco, Ciudad de México, en Panorama 21, foro cultural y cocina artesanal, así como en la ciudad de Guadalajara, Jalisco, en el foro Philly Fritz Club.
            </Text>
            <Text style={estilos.bioTexto}>
              Actualmente nos encontramos trabajando en nuestro siguiente material discográfico.
            </Text>
            <View style={estilos.trayectoriaImagenWrap}>
              <Image
                  source={IMAGEN_TRAYECTORIA}
                  style={estilos.trayectoriaImagen}
                  resizeMode="cover"
                  accessibilityLabel="Presentación en vivo frente al público" />
                
            </View>
            <View
                style={[
                estilos.trayectoriaVideosGrid,
                esTrayectoriaGridDosColumnas && estilos.trayectoriaVideosGridDesktop]
                }>
                
              {VIDEOS_TRAYECTORIA.map((v, idx) => {
                  const vid = extraerVideoIdYouTube(v.youtubeUrl);
                  return (
                    <View
                      key={v.youtubeUrl}
                      style={[
                      estilos.trayectoriaVideoBloque,
                      esTrayectoriaGridDosColumnas && estilos.trayectoriaVideoBloqueDesktop,
                      !esTrayectoriaGridDosColumnas && idx > 0 && estilos.trayectoriaVideoBloqueMobileSep]
                      }>
                      
                    <Text style={estilos.trayectoriaVideoTitulo}>{v.titulo}</Text>
                    {v.subtitulo ?
                      <Text style={estilos.trayectoriaVideoSubtitulo}>{v.subtitulo}</Text> :
                      null}
                    <YouTubeEmbed
                        videoId={vid}
                        youtubeUrl={v.youtubeUrl}
                        containerStyle={[
                        estilos.trayectoriaYoutubeEmbed,
                        esTrayectoriaGridDosColumnas && estilos.trayectoriaYoutubeEmbedDesktop]
                        } />
                      
                  </View>);

                })}
            </View>
            <View style={[estilos.fraseBloque, estilos.fraseBloqueIzq]}>
              <Text style={[estilos.fraseTitulo, estilos.fraseTituloIzq]}>{FRASES_BLOQUES[4].titulo}</Text>
              <Text style={[estilos.fraseSubtitulo, estilos.fraseSubtituloIzq]}>{FRASES_BLOQUES[4].subtitulo}</Text>
            </View>
          </View>
        </View>

        <View style={[estilos.bloqueAncho, estilos.bloqueArtistInfoCard, { width: contentWidth }]}>
          <View style={estilos.bloqueArtistInfoContenido}>
            <View style={estilos.filaArtistInfo}>
              <Text style={estilos.artistInfoTitulo}>INTEGRANTES</Text>
              <Text style={estilos.flechas}>&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;</Text>
            </View>
            {INTEGRANTES.map((i) =>
              <View key={i.ig} style={estilos.integranteCard}>
                <View style={estilos.integranteCardBody}>
                  {i.foto ?
                  <Image
                    source={i.foto}
                    style={estilos.integranteFoto}
                    resizeMode="cover"
                    accessibilityLabel={`${i.nombre}, foto del integrante`} /> :

                  null}
                  <View style={estilos.integranteCardTexto}>
                    <Text style={estilos.integranteNombre}>{i.nombre}</Text>
                    <TouchableOpacity onPress={() => Linking.openURL(i.url)} style={estilos.integranteLink}>
                      <Text style={estilos.integranteLinkTexto}>Visitar</Text>
                      <Ionicons name="open-outline" size={16} color="#00dc57" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              )}
            <View style={[estilos.fraseBloque, estilos.fraseBloqueDer]}>
              <Text style={[estilos.fraseTitulo, estilos.fraseTituloDer]}>{FRASES_BLOQUES[5].titulo}</Text>
              <Text style={[estilos.fraseSubtitulo, estilos.fraseSubtituloDer]}>{FRASES_BLOQUES[5].subtitulo}</Text>
            </View>
          </View>
        </View>

        <View
            style={[estilos.bloqueAncho, estilos.bloqueArtistInfoCard, { width: contentWidth }]}
            onLayout={onLinksPrensaSectionLayout}>
            
          <View style={estilos.bloqueArtistInfoContenido}>
            <View style={estilos.filaArtistInfo}>
              <Text style={estilos.artistInfoTitulo}>LINKS PRENSA</Text>
              <Text style={estilos.flechas}>&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;</Text>
            </View>
            <View style={[estilos.lineaFlechas, estilos.lineaVerde]} />
            {LINKS_PRENSA.map((item, idx) =>
              <TouchableOpacity
                key={idx}
                onPress={() => item.url && Linking.openURL(item.url)}
                style={estilos.linkPrensaItem}
                activeOpacity={0.7}>
                
                <Text style={estilos.linkTitulo}>{item.titulo}</Text>
                <Text style={estilos.linkUrl} numberOfLines={1}>{item.url}</Text>
              </TouchableOpacity>
              )}
            <View style={[estilos.fraseBloque, estilos.fraseBloqueIzq]}>
              <Text style={[estilos.fraseTitulo, estilos.fraseTituloIzq]}>{FRASES_BLOQUES[6].titulo}</Text>
              <Text style={[estilos.fraseSubtitulo, estilos.fraseSubtituloIzq]}>{FRASES_BLOQUES[6].subtitulo}</Text>
            </View>
            <View style={[estilos.lineaFlechas, estilos.lineaVerde]} />
          </View>
        </View>

        <View style={[estilos.bloqueAncho, estilos.bloqueArtistInfoCard, { width: contentWidth }]}>
          <View style={estilos.bloqueArtistInfoContenido}>
            <View style={estilos.filaArtistInfo}>
              <Text style={estilos.artistInfoTitulo}>COLABORACIONES & BOOKING</Text>
              <Text style={estilos.flechas}>&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;</Text>
            </View>
            <Text style={estilos.bioTexto}>
              ¿Quieres trabajar con Los Thugs? Shows en vivo, colaboraciones, producción de eventos o proyectos
              especiales.
            </Text>
            <View style={estilos.bookingGrid}>
              <TouchableOpacity
                  style={[estilos.bookingBtn, estilos.bookingBtnPrimario]}
                  onPress={() =>
                  Linking.openURL(
                    `https://wa.me/52${String(BOOKING_WHATSAPP).replace(/\s/g, '')}?text=${encodeURIComponent(
                      `Hola, quiero colaborar con Los Thugs.

Banda/Proyecto:
Nombre de contacto:
Integrantes:
Ciudad:
Enlace de musica/redes:
Tipo de colaboracion:`
                    )}`
                  )
                  }
                  activeOpacity={0.8}>
                  
                <Ionicons name="logo-whatsapp" size={20} color="#00180b" />
                <Text style={estilos.bookingBtnPrimarioTexto}>Colaboraciones</Text>
              </TouchableOpacity>

              <TouchableOpacity
                  style={[estilos.bookingBtn, estilos.bookingBtnSecundario]}
                  onPress={() =>
                  Linking.openURL(
                    `https://wa.me/52${String(BOOKING_WHATSAPP).replace(/\s/g, '')}?text=${encodeURIComponent(
                      'Hola, quiero info para contratar a Los Thugs para un evento.'
                    )}`
                  )
                  }
                  activeOpacity={0.8}>
                  
                <Ionicons name="megaphone-outline" size={20} color="#00dc57" />
                <Text style={estilos.bookingBtnSecundarioTexto}>Booking</Text>
              </TouchableOpacity>
            </View>
            <Text style={estilos.bookingNota}>Estamos listos para llevarlo a otro nivel.</Text>
          </View>
        </View>

        <View style={estilos.barraVerdeRedes}>
          <View style={estilos.filaIconosFooter}>
            {REDES_FOOTER.map((red) =>
              <TouchableOpacity
                key={red.id}
                onPress={() => red.url && Linking.openURL(red.url)}
                style={estilos.iconoFooter}
                activeOpacity={0.8}>
                
                <Ionicons name={red.icon} size={footerIconSize} color="#fff" />
              </TouchableOpacity>
              )}
          </View>
        </View>

        <View style={estilos.footerContacto}>
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
      {!estaAutenticado && globoRegistroVisible ?
      <View style={[estilos.registroGloboWrap, { bottom: insets.bottom + 14 }]} pointerEvents="box-none">
          <View style={estilos.registroGlobo}>
            <TouchableOpacity
            style={estilos.registroGloboCerrar}
            onPress={() => setGloboRegistroVisible(false)}
            hitSlop={12}
            accessibilityLabel="Cerrar aviso">
            
              <Ionicons name="close" size={22} color="#9ca3af" />
            </TouchableOpacity>
            <Text style={estilos.registroGloboTitulo}>¿Te identificas con lo que ves?</Text>
            <Text style={estilos.registroGloboTexto}>
              Regístrate en la comunidad Somos Thugs y sé parte de esta aventura llamada Mi vida loca.
            </Text>
            <TouchableOpacity
            style={estilos.registroGloboBtn}
            onPress={() => {
              setGloboRegistroVisible(false);
              abrirModalRegistro();
            }}
            activeOpacity={0.85}>
            
              <Text style={estilos.registroGloboBtnTexto}>Registrarme</Text>
            </TouchableOpacity>
          </View>
        </View> :
      null}
      {!estaAutenticado &&
      <Modal
        visible={authModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAuthModalVisible(false)}>
        
          <Pressable style={estilos.authModalOverlay} onPress={() => setAuthModalVisible(false)}>
            <Pressable style={estilos.authModalCaja} onPress={(e) => e.stopPropagation()}>
              {renderAuthForm()}
            </Pressable>
          </Pressable>
        </Modal>
      }
    </View>);

}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    ...(Platform.OS === 'web' && { position: 'relative' })
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 6,
    paddingTop: Platform.OS === 'web' ? 10 : 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    backgroundColor: '#0d0d0d'
  },
  /** Invitado: pegado al borde izquierdo (el scroll ya lleva su propio padding). */
  headerInvitado: {
    paddingHorizontal: 0,
    ...(Platform.OS === 'web' && { paddingLeft: 4, paddingRight: 8 }),
    ...(Platform.OS !== 'web' && { paddingLeft: 6, paddingRight: 10 })
  },
  headerBackInvitadoWrap: {
    flexShrink: 0,
    alignSelf: 'center',
    paddingVertical: 2,
    marginLeft: Platform.OS === 'web' ? -2 : 0
  },
  headerLogoInvitado: {
    height: 40,
    width: 118,
    flexShrink: 0
  },
  /** Título centrado en el hueco entre logo y «Registrar». */
  headerTituloInvitadoCentro: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6
  },
  headerTituloInvitado: {
    width: '100%',
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
    ...(Platform.OS === 'web' && { maxWidth: '100%', boxSizing: 'border-box' })
  },
  headerDerPresskitInvitado: {
    flexShrink: 0,
    justifyContent: 'center',
    marginLeft: 4
  },
  headerFlechaAtras: { marginRight: -18 },
  headerLogoJuntoFlecha: { marginLeft: -28 },
  headerBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    paddingVertical: 4,
    paddingRight: 4,
    paddingLeft: 0,
    flexGrow: 0,
    flexShrink: 1,
    alignSelf: 'flex-start',
    zIndex: 1,
    minWidth: 0
  },

  headerLogoAlLado: {
    height: 44,
    width: 176,
    flexShrink: 1,
    maxWidth: 200
  },
  headerTituloPresskit: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    zIndex: 0,
    paddingHorizontal: 108,
    alignSelf: 'center',
    ...(Platform.OS === 'web' && { maxWidth: '100%', boxSizing: 'border-box' })
  },
  headerEspacioPresskit: { width: 80, zIndex: 1 },
  headerDerPresskit: { width: 120, zIndex: 1, alignItems: 'flex-end' },
  headerRegistrarBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00dc57',
    backgroundColor: 'rgba(0,220,87,0.14)'
  },
  headerRegistrarBtnTexto: { color: '#00dc57', fontSize: 13, fontWeight: '700' },
  logoTexto: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  botonesHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerLink: { paddingVertical: 4, paddingHorizontal: 2 },
  headerLinkTexto: { color: '#fff', fontSize: 14, fontWeight: '600' },
  botonSecundario: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#888'
  },
  botonSecundarioTexto: { color: '#ccc', fontSize: 14 },
  botonPrimario: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#00dc57'
  },
  botonPrimarioTexto: { color: '#000', fontSize: 14, fontWeight: '600' },
  botonCerrar: { padding: 8 },
  botonCerrarTexto: { color: '#666', fontSize: 14 },
  headerDerecha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    justifyContent: 'flex-end',
    minWidth: 0
  },
  headerUsuario: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    maxWidth: 140
  },
  headerAvatarWrap: { position: 'relative' },
  headerAvatarTouchable: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a'
  },
  headerAvatarImg: { width: '100%', height: '100%', borderRadius: 12 },
  headerAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#1f1f1f',
    borderWidth: 2,
    borderColor: '#00dc57',
    justifyContent: 'center',
    alignItems: 'center'
  },
  menuHamburgerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  menuHamburgerCaja: {
    position: 'absolute',
    top: 56,
    right: 14
  },
  menuHamburger: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    minWidth: 160,
    paddingVertical: 8,
    ...(Platform.OS === 'web' && { boxShadow: '0 8px 24px rgba(0,0,0,0.5)' })
  },
  menuHamburgerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  menuHamburgerItemFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  menuHamburgerCandado: { marginLeft: 4 },
  menuHamburgerItemTexto: { color: '#fff', fontSize: 15, fontWeight: '500' },
  menuHamburgerItemCerrar: { borderTopWidth: 1, borderTopColor: '#333' },
  registroGloboWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 95,
    alignItems: 'flex-end',
    pointerEvents: 'box-none'
  },
  registroGlobo: {
    position: 'relative',
    maxWidth: 304,
    width: '100%',
    padding: 16,
    paddingTop: 38,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#00dc57',
    backgroundColor: 'rgba(12,12,12,0.97)',
    ...(Platform.OS === 'web' && { boxShadow: '0 14px 42px rgba(0,0,0,0.55)' })
  },
  registroGloboCerrar: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    padding: 4
  },
  registroGloboTitulo: {
    color: '#00dc57',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 0.3,
    textAlign: 'center'
  },
  registroGloboTexto: {
    color: '#e5e5e5',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 14,
    textAlign: 'center'
  },
  registroGloboBtn: {
    alignSelf: 'center',
    backgroundColor: '#00dc57',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10
  },
  registroGloboBtnTexto: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700'
  },
  scroll: { flex: 1, ...(Platform.OS === 'web' && { maxWidth: '100%' }) },
  scrollContenido: {
    padding: 32,
    paddingBottom: 40,
    ...(Platform.OS === 'web' && { maxWidth: '100%', boxSizing: 'border-box' }),
    ...(Platform.OS !== 'web' && { paddingTop: 12, paddingHorizontal: 0 })
  },
  scrollContenidoFondo: { minHeight: 5800 },
  scrollContenidoRelative: { position: 'relative' },
  fondoImagenWrapperWeb: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    zIndex: 0,
    overflow: 'hidden'
  },
  fondoImagen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 11000,
    width: '100%',
    zIndex: 0
  },
  contenidoSobreFondo: {
    flex: 1,
    zIndex: 1,
    ...(Platform.OS === 'web' && { maxWidth: '100%', alignSelf: 'center' }),
    ...(Platform.OS !== 'web' && { paddingHorizontal: 32 })
  },
  heroVideoTopBlock: {
    alignSelf: 'center',
    marginTop: Platform.OS === 'web' ? 20 : 16,
    marginBottom: 12
  },
  bloqueComunidadCard: {
    width: '100%'
  },
  comunidadCuerpoPrincipal: {
    color: '#e8e8e8',
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 16,
    fontWeight: '500'
  },
  comunidadCuerpoSecundario: {
    color: '#b0b0b0',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 4,
    marginTop: 0
  },
  comunidadBotonCta: {
    alignSelf: 'stretch',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00dc57',
    backgroundColor: 'rgba(0,220,87,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  comunidadBotonCtaTexto: {
    color: '#00dc57',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center'
  },
  heroVideoTopEmbed: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    marginTop: 0,
    ...(Platform.OS === 'web' ? { borderRadius: 14, overflow: 'hidden' } : null)
  },
  tituloSeccion: { fontSize: 18, color: '#fff', marginBottom: 16 },
  bloqueAncho: { marginBottom: 28 },
  primeraTarjetaPegadaAlLogo: { marginTop: 16 },
  bloqueArtistInfoCard: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(18,18,18,0.92)' : 'rgba(22,22,22,0.95)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
    overflow: 'hidden',
    ...(Platform.OS === 'web' && {
      boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,197,94,0.1)'
    })
  },
  bloqueArtistInfoContenido: { padding: 24 },
  filaArtistInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 8 },
  artistInfoTitulo: { fontSize: 20, fontWeight: '700', color: '#22c55e' },
  flechas: { fontSize: 15, color: '#fff', letterSpacing: 1 },
  bioTexto: { color: '#e5e5e5', fontSize: 15, lineHeight: 24, marginBottom: 14 },
  trayectoriaImagenWrap: {
    width: '100%',
    aspectRatio: 2.35,
    marginBottom: 18,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#00dc57',
    overflow: 'hidden',
    backgroundColor: '#0a0a0a'
  },
  trayectoriaImagen: {
    width: '100%',
    height: '100%',
    ...(Platform.OS === 'web' && { objectFit: 'cover' })
  },

  trayectoriaVideosGrid: {
    width: '100%',
    marginTop: 4
  },
  trayectoriaVideosGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignContent: 'flex-start',
    rowGap: 14,
    columnGap: 12
  },
  trayectoriaVideoBloque: {
    marginTop: 0,
    marginBottom: 0
  },

  trayectoriaVideoBloqueDesktop: {
    flexGrow: 0,
    flexShrink: 0,
    width: 'calc(50% - 6px)',
    maxWidth: 'calc(50% - 6px)',
    ...(Platform.OS === 'web' && { boxSizing: 'border-box' })
  },
  trayectoriaVideoBloqueMobileSep: {
    marginTop: 16
  },
  trayectoriaVideoTitulo: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 20
  },
  trayectoriaVideoSubtitulo: {
    color: '#a3a3a3',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8
  },

  trayectoriaYoutubeEmbed: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    marginTop: 2
  },
  trayectoriaYoutubeEmbedDesktop: {
    maxWidth: '100%',
    width: '100%'
  },
  bioTextoBlock: { fontSize: 16, lineHeight: 26, marginBottom: 16 },
  bioDestacado: { color: '#fff', fontWeight: '600' },
  filaRedes: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginVertical: 24, gap: 16 },
  filaRedesCentrada: { justifyContent: 'center', gap: 28 },
  redItem: { alignItems: 'center', minWidth: 80 },
  redLabel: { color: '#fff', fontSize: 14, marginTop: 8 },
  enVivoWrapper: {
    width: '50%',
    alignSelf: 'center',
    marginTop: 0,
    marginBottom: 14
  },
  enVivoWrapperWebDesktop: {
    width: 'auto',
    alignSelf: 'stretch',
    marginHorizontal: 50
  },
  enVivoWrapperWebMobile: {
    width: 'auto',
    alignSelf: 'stretch',
    marginHorizontal: 8
  },
  enVivoWrapperNative: {
    width: 'auto',
    alignSelf: 'stretch',
    marginHorizontal: -8
  },
  enVivoEtiqueta: {
    alignSelf: 'stretch',
    textAlign: 'center',
    marginBottom: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: '#00dc57',
    backgroundColor: 'rgba(0,220,87,0.12)',
    color: '#00dc57',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  imagenArtistInfoContenedor: {
    width: '100%',
    aspectRatio: 1013 / 810,
    marginTop: 0,
    marginBottom: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 2,
    borderColor: '#00dc57',
    overflow: 'hidden'
  },
  imagenArtistInfoContenedorWebDesktop: {
    alignSelf: 'stretch',
    width: '100%',
    marginHorizontal: 0
  },
  imagenArtistInfo: {
    width: '100%',
    height: '100%',
    ...(Platform.OS === 'web' && { objectFit: 'contain' })
  },
  imagenArtistInfoWebDesktop: {
    ...(Platform.OS === 'web' && { objectFit: 'cover' })
  },
  placeholderConcierto: {
    minHeight: 220,
    backgroundColor: 'rgba(26,26,26,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(34,197,94,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  placeholderConciertoInner: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(34,197,94,0.35)',
    borderStyle: 'dashed',
    minWidth: '100%'
  },
  placeholderConciertoTexto: { color: '#22c55e', fontSize: 17, fontWeight: '600', marginTop: 12 },
  placeholderConciertoSub: { color: '#9ca3af', fontSize: 14, marginTop: 4 },
  ctaSection: { marginTop: 28, marginBottom: 16 },
  ctaTitulo: { fontSize: 20, fontWeight: '800', color: '#22c55e', marginBottom: 4 },
  ctaTituloBlock: { fontSize: 22 },
  ctaSubtitulo: { fontSize: 16, color: '#fff', fontWeight: '500' },
  ctaSubtituloBlock: { fontSize: 17 },

  fraseBloque: { marginTop: 24, marginBottom: 12 },
  fraseBloqueIzq: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  fraseBloqueDer: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  fraseTitulo: {
    fontSize: 22,
    fontWeight: '800',
    color: '#00dc57',
    marginBottom: 4,
    ...(Platform.OS === 'web' && { textShadow: '0 0 14px rgba(0,220,87,0.5)' })
  },
  fraseTituloDer: { textAlign: 'right' },
  fraseTituloIzq: { textAlign: 'left' },
  fraseSubtitulo: { fontSize: 17, color: '#fff', fontWeight: '600' },
  fraseSubtituloDer: { textAlign: 'right' },
  fraseSubtituloIzq: { textAlign: 'left' },
  tituloSeccionVerde: {
    fontSize: 20,
    fontWeight: '800',
    color: '#22c55e',
    marginBottom: 4,
    ...(Platform.OS === 'web' && {
      textShadow: '0 0 1px #fff, 0 0 2px #fff'
    })
  },
  lineaFlechas: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: 16,
    width: '100%'
  },
  filaPosters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20
  },
  posterPlaceholder: {
    width: '30%',
    aspectRatio: 0.7,
    backgroundColor: 'rgba(42,42,42,0.9)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)'
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
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
    })
  },
  carruselPresentacionesLabel: {
    color: 'rgba(34,197,94,0.8)',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12
  },
  carruselPresentacionesImagen: {
    width: '100%',
    height: '100%'
  },
  bioTextoVerde: { color: '#22c55e', fontSize: 15, lineHeight: 24, marginBottom: 14, fontWeight: '500' },
  bioTextoVerdeDestacado: {
    color: '#00dc57',
    fontSize: 17,
    lineHeight: 26,
    marginBottom: 20,
    marginTop: 4,
    fontWeight: '700',
    ...(Platform.OS === 'web' && { textShadow: '0 0 12px rgba(0,220,87,0.4)' })
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
    ...(Platform.OS === 'web' && { textShadow: '0 0 14px rgba(0,220,87,0.5)' })
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
    alignItems: 'center'
  },
  albumPlaceholderTexto: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  albumPlaceholderPeq: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(42,42,42,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.4)'
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
    borderColor: 'rgba(0,220,87,0.3)'
  },
  listaAlbumsFilaIzq: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  listaAlbumsPortadaMarco: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,220,87,0.45)',
    backgroundColor: '#0a0a0a',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center'
  },
  listaAlbumsPortadaImg: {
    width: '100%',
    height: '100%',
    ...(Platform.OS === 'web' && { objectFit: 'contain' })
  },
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
    ...(Platform.OS === 'web' && { boxShadow: '0 4px 16px rgba(0,0,0,0.4)' })
  },
  carruselAlbumsPortadaTexto: { color: '#fff', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  carruselAlbumsTitulo: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 10, textAlign: 'center' },
  carruselAlbumsSpotify: { color: '#00dc57', fontSize: 12, marginTop: 4 },
  socialSectionTitulo: { fontSize: 18, color: '#fff', marginBottom: 12 },
  socialSectionSubtitulo: { color: '#888', fontSize: 14, marginBottom: 16 },
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
    marginBottom: 4
  },
  integrantesTitulo: { fontSize: 16, color: '#fff', marginTop: 20, marginBottom: 12 },
  integranteCard: {
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(42,42,42,0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,220,87,0.2)'
  },
  integranteCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },
  integranteFoto: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(0,220,87,0.45)',
    backgroundColor: '#1a1a1a',
    ...(Platform.OS === 'web' && { objectFit: 'cover' })
  },
  integranteCardTexto: { flex: 1, minWidth: 0 },
  integranteNombre: { color: '#fff', fontSize: 17, fontWeight: '600', marginBottom: 8 },
  integranteLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  integranteLinkTexto: { color: '#00dc57', fontSize: 14, fontWeight: '600' },
  integranteRow: { marginBottom: 4 },
  redCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(42,42,42,0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,220,87,0.2)',
    gap: 16
  },
  redCardIcono: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(34,197,94,0.4)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  redCardContenido: { flex: 1 },
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
    alignItems: 'center'
  },
  qrPlaceholderTexto: { color: '#22c55e', fontSize: 10, marginTop: 4 },
  qrDerecha: { marginLeft: 'auto' },
  listaLinks: { marginTop: 8 },
  listaLinksVacio: { color: '#888', fontSize: 14, fontStyle: 'italic', marginVertical: 12 },
  linkItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingVertical: 8, gap: 12 },
  linkItemCover: { width: 56, height: 56, borderRadius: 8 },
  linkItemTexto: { flex: 1 },
  linkAcciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
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
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 16,
    ...(Platform.OS === 'web' ?
    { width: '100%', maxWidth: '100%', alignSelf: 'stretch', boxSizing: 'border-box' } :
    null)
  },
  filaIconosFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignContent: 'center',
    justifyContent: 'center',
    gap: 12,
    maxWidth: '100%',
    paddingHorizontal: 4
  },
  iconoFooter: { padding: 6, minWidth: 40, alignItems: 'center', justifyContent: 'center' },
  footerContacto: {
    backgroundColor: '#22c55e',
    paddingTop: 10,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    ...(Platform.OS === 'web' ?
    { width: '100%', maxWidth: '100%', alignSelf: 'stretch', boxSizing: 'border-box' } :
    null)
  },
  footerContactoTexto: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginBottom: 6 },
  footerContactoLink: { color: 'rgba(255,255,255,0.95)', fontSize: 14, fontWeight: '600' },
  filaTerminos: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 4 },
  footerContactoTagline: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 8 },
  bookingGrid: {
    marginTop: 8,
    marginBottom: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  bookingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1
  },
  bookingBtnPrimario: {
    backgroundColor: '#00dc57',
    borderColor: '#00dc57'
  },
  bookingBtnPrimarioTexto: {
    color: '#00180b',
    fontSize: 14,
    fontWeight: '800'
  },
  bookingBtnSecundario: {
    backgroundColor: 'rgba(0,220,87,0.08)',
    borderColor: 'rgba(0,220,87,0.4)'
  },
  bookingBtnSecundarioTexto: {
    color: '#00dc57',
    fontSize: 14,
    fontWeight: '700'
  },
  bookingNota: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 4
  },
  cardPresskit: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a'
  },
  imagenPresskit: { width: '100%', height: 200 },
  placeholderImagen: {
    width: '100%',
    height: 200,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center'
  },
  placeholderTexto: { color: '#666', fontSize: 14 },
  cuadroGlass: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'web' ? 'rgba(26,26,26,0.7)' : 'rgba(26,26,26,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    ...(Platform.OS === 'web' && { backdropFilter: 'blur(12px)' })
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
    marginBottom: 10
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
    borderColor: 'rgba(201,162,39,0.4)'
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
    marginTop: 4
  },
  botonDeshabilitado: { opacity: 0.7 },
  botonTexto: { color: '#000', fontWeight: '600', fontSize: 14 },
  filaGoogle: { marginBottom: 24 },
  botonGoogle: {
    backgroundColor: '#4285f4',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  botonGoogleTexto: { color: '#fff', fontWeight: '600', fontSize: 14 },
  authModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20
  },
  authModalCaja: {
    maxHeight: '92%'
  }
});