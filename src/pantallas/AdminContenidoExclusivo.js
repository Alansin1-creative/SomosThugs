import React, { useState, useEffect } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Linking,
  Platform,
  Image,
  ActivityIndicator,
  Switch,
  Modal,
  Pressable } from
'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { listarContenidoExclusivo, crearContenidoExclusivo, actualizarContenidoExclusivo, leerContenidoExclusivo, eliminarContenidoExclusivo } from '../servicios/api';
import { getBaseUrl } from '../config/api';
import { useAuth } from '../contexto/AuthContext';
import { esAdmin } from '../constantes/nivelesAcceso';

const TIPOS_CONTENIDO = ['articulo', 'video', 'imagen', 'audio'];
const NIVELES = ['fan', 'thug'];

/** Nombre legible del archivo (Firebase Storage u otras URLs). */
function nombreArchivoDesdeUrlMedia(url) {
  const s = String(url || '').trim();
  if (!s) return null;
  if (s.includes('firebasestorage.googleapis.com')) {
    try {
      const u = new URL(s);
      const parts = u.pathname.split('/o/');
      if (parts[1]) {
        const decoded = decodeURIComponent(parts[1]);
        const tail = decoded.split('/').filter(Boolean).pop();
        if (tail) return tail.split('?')[0];
      }
    } catch (_) {
      /* seguir */
    }
  }
  const tail = s.split('/').pop();
  return tail ? tail.split('?')[0] : null;
}

function firebaseStorageDecodedObjectPath(url) {
  const s = String(url || '').trim();
  if (!s.toLowerCase().includes('firebasestorage.googleapis.com')) return '';
  try {
    const u = new URL(s);
    const parts = u.pathname.split('/o/');
    if (!parts[1]) return '';
    return decodeURIComponent(parts[1]);
  } catch {
    return '';
  }
}

function urlPareceArchivoVideo(url) {
  const s = String(url || '').toLowerCase();
  if (!s) return false;
  if (/\.(mp4|webm|ogg|m4v|mov)(\?|#|$)/i.test(s)) return true;
  if (s.startsWith('data:video/')) return true;
  const dec = firebaseStorageDecodedObjectPath(url).toLowerCase();
  if (dec && /\.(mp4|webm|ogg|m4v|mov)(\?|#|$)/i.test(dec)) return true;
  return false;
}

function urlPareceArchivoImagen(url) {
  const s = String(url || '').toLowerCase();
  if (!s) return false;
  if (/\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?|#|$)/i.test(s)) return true;
  if (s.startsWith('data:image/')) return true;
  const dec = firebaseStorageDecodedObjectPath(url).toLowerCase();
  if (dec && /\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?|#|$)/i.test(dec)) return true;
  return false;
}

function urlPareceArchivoAudio(url) {
  const s = String(url || '').toLowerCase();
  if (!s) return false;
  if (s.startsWith('data:audio/')) return true;
  if (/\.(mp3|mpeg|wav|aac|m4a|flac|oga|ogg|webm|opus)(\?|#|$)/.test(s)) return true;
  const dec = firebaseStorageDecodedObjectPath(url).toLowerCase();
  if (dec && /\.(mp3|mpeg|wav|aac|m4a|flac|oga|ogg|webm|opus)(\?|#|$)/i.test(dec)) return true;
  return false;
}

const ACCEPT_PREVIEW_WEB = 'image/*,video/*,audio/*';

function absolutizarMediaUri(raw) {
  const p = String(raw || '').trim();
  if (!p) return null;
  if (p.startsWith('http') || p.startsWith('data:')) return p;
  if (p.startsWith('/')) return getBaseUrl() + p;
  return `${getBaseUrl()}/${p.replace(/^\/+/, '')}`;
}

function abrirMediaContenidoAdmin(mediaUrl) {
  const u = absolutizarMediaUri(mediaUrl);
  if (u) Linking.openURL(u);
}

/** Miniatura de vídeo en lista admin (Image no puede mostrar mp4/webm). */
function AdminListVideoThumbWeb({ uri }) {
  return React.createElement('video', {
    src: uri,
    muted: true,
    playsInline: true,
    autoPlay: true,
    loop: true,
    controls: false,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      backgroundColor: '#111',
      pointerEvents: 'none',
      display: 'block'
    }
  });
}

function AdminListVideoThumbNative({ uri }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: '100%', backgroundColor: '#111' }}
      nativeControls={false}
      contentFit="cover"
      {...Platform.OS === 'android' ? { surfaceType: 'textureView' } : {}}
    />
  );
}

export default function AdminContenidoExclusivo({ navigation }) {
  const { perfil } = useAuth();
  const [lista, setLista] = useState([]);
  const [refrescando, setRefrescando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [contenido, setContenido] = useState('');
  const [complementario, setComplementario] = useState('');
  const [urlImagen, setUrlImagen] = useState('');
  const [urlMedia, setUrlMedia] = useState('');
  const [tipoContenido, setTipoContenido] = useState('articulo');
  const [nivelRequerido, setNivelRequerido] = useState('thug');
  const [categoria, setCategoria] = useState('');
  const [etiquetasStr, setEtiquetasStr] = useState('');
  const [visible, setVisible] = useState(true);
  const [destacado, setDestacado] = useState(false);
  const [imagenBase64, setImagenBase64] = useState(null);
  const [imagenUri, setImagenUri] = useState(null);
  const [mediaArchivoBase64, setMediaArchivoBase64] = useState(null);
  const [mediaArchivoNombre, setMediaArchivoNombre] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [itemEditando, setItemEditando] = useState(null);
  const [modalEditarVisible, setModalEditarVisible] = useState(false);
  const [enviandoEdit, setEnviandoEdit] = useState(false);
  const [editTitulo, setEditTitulo] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editContenido, setEditContenido] = useState('');
  const [editComplementario, setEditComplementario] = useState('');
  const [editUrlImagen, setEditUrlImagen] = useState('');
  const [editUrlMedia, setEditUrlMedia] = useState('');
  const [editUrlMediaCompleta, setEditUrlMediaCompleta] = useState('');
  const [editTipoContenido, setEditTipoContenido] = useState('articulo');
  const [editNivelRequerido, setEditNivelRequerido] = useState('thug');
  const [editCategoria, setEditCategoria] = useState('');
  const [editEtiquetasStr, setEditEtiquetasStr] = useState('');
  const [editVisible, setEditVisible] = useState(true);
  const [editDestacado, setEditDestacado] = useState(false);
  const [editImagenBase64, setEditImagenBase64] = useState(null);
  const [editImagenUri, setEditImagenUri] = useState(null);
  const [editMediaArchivoBase64, setEditMediaArchivoBase64] = useState(null);
  const [editMediaArchivoNombre, setEditMediaArchivoNombre] = useState(null);
  const [editClearPreview, setEditClearPreview] = useState(false);
  const [editClearMedia, setEditClearMedia] = useState(false);

  const cerrarModal = () => {
    setModalVisible(false);
    setTitulo('');
    setDescripcion('');
    setContenido('');
    setComplementario('');
    setUrlImagen('');
    setUrlMedia('');
    setCategoria('');
    setEtiquetasStr('');
    setImagenBase64(null);
    setImagenUri(null);
    setMediaArchivoBase64(null);
    setMediaArchivoNombre(null);
  };

  useEffect(() => {
    if (perfil && !esAdmin(perfil)) {
      navigation.replace('ContenidoGeneral');
    }
  }, [perfil, navigation]);

  const cargar = async () => {
    try {
      const datos = await listarContenidoExclusivo();
      setLista(Array.isArray(datos) ? datos : []);
    } catch (e) {
      setLista([]);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const onRefresh = async () => {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  };


  const elegirImagen = async () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = ACCEPT_PREVIEW_WEB;
      input.style.display = 'none';
      input.onchange = (e) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          setImagenBase64(reader.result);
          setImagenUri(reader.result);
        };
        reader.readAsDataURL(file);
        input.remove();
      };
      document.body.appendChild(input);
      input.click();
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'video/*', 'audio/*'],
        copyToCacheDirectory: true
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const base64Raw = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      const mime = asset.mimeType || 'application/octet-stream';
      const dataUrl = `data:${mime};base64,${base64Raw}`;
      setImagenUri(dataUrl);
      setImagenBase64(dataUrl);
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo elegir el archivo.');
    }
  };

  const limpiarImagen = () => {
    setImagenUri(null);
    setImagenBase64(null);
  };


  const elegirMediaArchivo = async () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '*/*';
      input.style.display = 'none';
      input.onchange = (e) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          setMediaArchivoBase64(reader.result);
          setMediaArchivoNombre(file.name);
        };
        reader.readAsDataURL(file);
        input.remove();
      };
      document.body.appendChild(input);
      input.click();
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      const mime = asset.mimeType || 'application/octet-stream';
      setMediaArchivoBase64(`data:${mime};base64,${base64}`);
      setMediaArchivoNombre(asset.name || 'Archivo');
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo leer el archivo.');
    }
  };

  const limpiarMediaArchivo = () => {
    setMediaArchivoBase64(null);
    setMediaArchivoNombre(null);
  };

  const elegirMediaArchivoEdit = async () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '*/*';
      input.style.display = 'none';
      input.onchange = (e) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          setEditMediaArchivoBase64(reader.result);
          setEditMediaArchivoNombre(file.name);
        };
        reader.readAsDataURL(file);
        input.remove();
      };
      document.body.appendChild(input);
      input.click();
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      const mime = asset.mimeType || 'application/octet-stream';
      setEditMediaArchivoBase64(`data:${mime};base64,${base64}`);
      setEditMediaArchivoNombre(asset.name || 'Archivo');
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo leer el archivo.');
    }
  };

  const limpiarMediaArchivoEdit = () => {
    setEditMediaArchivoBase64(null);
    setEditMediaArchivoNombre(null);
    setEditClearMedia(true);
    setEditUrlMediaCompleta('');
  };

  const abrirEditar = async (item) => {
    const id = item?.id || item?._id;
    if (!id) return;
    setItemEditando({ ...item, id });
    setModalEditarVisible(true);
    try {
      const doc = await leerContenidoExclusivo(id);
      if (!doc) return;
      setItemEditando(doc);
      setEditTitulo(doc.titulo || '');
      setEditDescripcion(doc.descripcion || '');
      setEditContenido(doc.contenidoCompleto || doc.contenido || '');
      setEditComplementario(doc.complementario || '');
      setEditUrlImagen('');
      const previewPathDb = doc.urlMedia || '';
      setEditUrlMedia(previewPathDb);
      setEditUrlMediaCompleta(doc.urlMediaCompleta || '');
      setEditTipoContenido(doc.tipoContenido || doc.tipo || 'articulo');
      setEditNivelRequerido(doc.nivelRequerido || 'thug');
      setEditCategoria(doc.categoria || '');
      setEditEtiquetasStr(Array.isArray(doc.etiquetas) ? doc.etiquetas.join(', ') : '');
      setEditVisible(doc.visible !== false);
      setEditDestacado(!!doc.destacado);
      setEditImagenBase64(null);
      const previewPath = previewPathDb;
      setEditImagenUri(
        previewPath ?
        previewPath.startsWith('http') || previewPath.startsWith('data:') ?
        previewPath :
        getBaseUrl() + previewPath :
        null
      );
      const nombreExistente =
        nombreArchivoDesdeUrlMedia(doc.urlMediaCompleta) ||
        nombreArchivoDesdeUrlMedia(doc.urlMedia) ||
        null;
      setEditMediaArchivoNombre(nombreExistente);
      setEditClearPreview(false);
      setEditClearMedia(false);
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo cargar el contenido.');
      setModalEditarVisible(false);
    }
  };

  const cerrarModalEditar = () => {
    setModalEditarVisible(false);
    setItemEditando(null);
    setEditImagenBase64(null);
    setEditImagenUri(null);
    setEditMediaArchivoBase64(null);
    setEditMediaArchivoNombre(null);
    setEditClearPreview(false);
    setEditClearMedia(false);
    setEditUrlMedia('');
    setEditUrlMediaCompleta('');
  };

  const elegirImagenEdit = async () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = ACCEPT_PREVIEW_WEB;
      input.style.display = 'none';
      input.onchange = (e) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          setEditImagenBase64(reader.result);
          setEditImagenUri(reader.result);
        };
        reader.readAsDataURL(file);
        input.remove();
      };
      document.body.appendChild(input);
      input.click();
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'video/*', 'audio/*'],
        copyToCacheDirectory: true
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const base64Raw = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      const mime = asset.mimeType || 'application/octet-stream';
      const dataUrl = `data:${mime};base64,${base64Raw}`;
      setEditImagenUri(dataUrl);
      setEditImagenBase64(dataUrl);
      setEditClearPreview(false);
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo elegir el archivo.');
    }
  };

  const limpiarImagenEdit = () => {
    setEditImagenUri(null);
    setEditImagenBase64(null);
    setEditClearPreview(true);
    setEditUrlMedia('');
  };

  const guardarEdicion = async () => {
    if (!itemEditando || !editTitulo.trim()) {
      Alert.alert('', 'El título es obligatorio.');
      return;
    }
    setEnviandoEdit(true);
    try {
      const etiquetas = (editEtiquetasStr || '').trim() ? editEtiquetasStr.split(',').map((e) => e.trim()).filter(Boolean) : [];
      const contenidoTrim = String(editContenido ?? '').trim();
      const body = {
        titulo: String(editTitulo ?? '').trim(),
        descripcion: String(editDescripcion ?? '').trim(),
        previewTexto: contenidoTrim.slice(0, 200),
        contenidoCompleto: contenidoTrim,
        complementario: String(editComplementario ?? '').trim(),
        urlMedia: String(editUrlMedia ?? '').trim(),
        urlMediaCompleta: String(editUrlMediaCompleta ?? '').trim(),
        tipoContenido: String(editTipoContenido ?? 'articulo').trim() || 'articulo',
        nivelRequerido: String(editNivelRequerido ?? 'thug').trim() || 'thug',
        categoria: String(editCategoria ?? '').trim(),
        etiquetas: Array.isArray(etiquetas) ? etiquetas : [],
        visible: editVisible !== false,
        destacado: Boolean(editDestacado)
      };
      if (editImagenBase64) body.mediaPreviewBase64 = editImagenBase64;
      if (editMediaArchivoBase64) body.mediaCompletaBase64 = editMediaArchivoBase64;
      if (editClearPreview) body.clearPreview = true;
      if (editClearMedia) body.clearMedia = true;
      await actualizarContenidoExclusivo(itemEditando.id, body);
      await cargar();
      cerrarModalEditar();
      Alert.alert('Listo', 'Cambios guardados.');
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo guardar.');
    } finally {
      setEnviandoEdit(false);
    }
  };

  const borrarContenido = (item) => {
    const id = item?.id || item?._id;
    if (!id) return;
    const titulo = item.titulo || 'Sin título';


    if (Platform.OS !== 'web') {
      Alert.alert(
        'Borrar contenido',
        `¿Eliminar "${titulo}"? Esta acción no se puede deshacer.`,
        [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarContenidoExclusivo(id);
              setLista((prev) => prev.filter((it) => it.id !== id));
              Alert.alert('Listo', 'Contenido eliminado.');
            } catch (e) {
              Alert.alert('Error', e?.message || 'No se pudo eliminar.');
            }
          }
        }]

      );
      return;
    }



    const ok = window.confirm(
      `¿Eliminar "${titulo}"?\n\nEsta acción no se puede deshacer.`
    );
    if (!ok) return;
    (async () => {
      try {
        await eliminarContenidoExclusivo(id);
        setLista((prev) => prev.filter((it) => it.id !== id));

        window.alert('Contenido eliminado.');
      } catch (e) {

        window.alert(e?.message || 'No se pudo eliminar.');
      }
    })();
  };

  const enviar = async () => {
    if (!titulo.trim()) {
      Alert.alert('', 'El título es obligatorio.');
      return;
    }
    setEnviando(true);
    try {
      const etiquetas = etiquetasStr.trim() ? etiquetasStr.split(',').map((e) => e.trim()).filter(Boolean) : [];
      const contenidoTrim = String(contenido ?? '').trim();
      const body = {
        titulo: String(titulo ?? '').trim(),
        descripcion: String(descripcion ?? '').trim(),
        previewTexto: contenidoTrim.slice(0, 200),
        contenidoCompleto: contenidoTrim,
        complementario: String(complementario ?? '').trim(),
        urlImagen: String(urlImagen ?? '').trim(),
        urlMedia: String(urlMedia ?? '').trim(),
        tipoContenido: String(tipoContenido ?? 'articulo').trim() || 'articulo',
        nivelRequerido: String(nivelRequerido ?? 'thug').trim() || 'thug',
        categoria: String(categoria ?? '').trim(),
        etiquetas: Array.isArray(etiquetas) ? etiquetas : [],
        visible: visible !== false,
        destacado: Boolean(destacado),
        creadoPor: String(perfil?.id ?? '')
      };
      if (imagenBase64) body.mediaPreviewBase64 = imagenBase64;
      if (mediaArchivoBase64) body.mediaCompletaBase64 = mediaArchivoBase64;
      await crearContenidoExclusivo(body);
      cerrarModal();
      await cargar();
      Alert.alert('Listo', 'Contenido creado.');
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo crear.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={estilos.botonAtras}>
          <Text style={estilos.botonAtrasTexto}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={estilos.titulo}>Subir contenido Thug</Text>
      </View>
      <TouchableOpacity style={estilos.botonAbrirModal} onPress={() => setModalVisible(true)}>
        <Text style={estilos.botonAbrirModalTexto}>+ Subir contenido Thug</Text>
      </TouchableOpacity>
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={estilos.scrollContenido}
        refreshControl={
        <RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor="#00dc57" />
        }>
        
        {lista.length === 0 &&
        <Text style={estilos.vacio}>Aún no hay contenido. Usa el botón de arriba para subir.</Text>
        }
        {lista.map((item) => {
          const previewUrl = item.urlMedia || '';
          const mediaUrl = item.urlMediaCompleta || '';
          const previewUri = absolutizarMediaUri(previewUrl);
          const mediaUri = absolutizarMediaUri(mediaUrl);
          const videoThumbUri = (() => {
            const order = [previewUrl, mediaUrl].filter(Boolean);
            for (const raw of order) {
              if (urlPareceArchivoVideo(raw)) {
                const u = absolutizarMediaUri(raw);
                if (u) return u;
              }
            }
            return null;
          })();
          const audioThumbUri = (() => {
            const order = [previewUrl, mediaUrl].filter(Boolean);
            for (const raw of order) {
              if (urlPareceArchivoAudio(raw)) {
                const u = absolutizarMediaUri(raw);
                if (u) return u;
              }
            }
            return null;
          })();
          const tipoItem = String(item.tipoContenido || item.tipo || 'articulo').toLowerCase().trim();
          /** Audio: nunca miniatura imagen aunque `urlMedia` apunte a un PNG/JPG por error. */
          const imageThumbUri =
          tipoItem !== 'audio' &&
          !videoThumbUri &&
          !audioThumbUri &&
          previewUri &&
          urlPareceArchivoImagen(previewUrl) ? previewUri :
          tipoItem !== 'audio' &&
          !videoThumbUri &&
          !audioThumbUri &&
          mediaUri &&
          urlPareceArchivoImagen(mediaUrl) ? mediaUri :
          null;
          const numComentarios = Array.isArray(item.comentarios) ? item.comentarios.length : 0;
          const vistas = item.numeroVistas ?? 0;
          const likes = item.numeroLikes ?? 0;
          const fechaPub = item.fechaPublicacion || item.fechaSubida;
          const fechaAct = item.fechaActualizacion;
          const etiquetasArr = item.etiquetas && Array.isArray(item.etiquetas) ? item.etiquetas : [];
          return (
            <View key={item.id} style={estilos.workspaceCard}>
              <View style={estilos.workspaceHeader}>
                <Text style={estilos.workspaceTitulo} numberOfLines={1}>
                  {item.titulo || 'Sin título'}
                </Text>
                <View style={estilos.workspaceHeaderAcciones}>
                  <TouchableOpacity style={estilos.botonEditar} onPress={() => abrirEditar(item)}>
                    <Ionicons name="pencil" size={20} color="#00dc57" />
                  </TouchableOpacity>
                  <View style={estilos.workspaceBadges}>
                    <View style={estilos.badgeTipo}>
                      <Text style={estilos.badgeTipoTexto}>
                        {item.tipoContenido || item.tipo || 'articulo'}
                      </Text>
                    </View>
                    {item.destacado &&
                    <View style={estilos.badgeDestacado}>
                        <Text style={estilos.badgeDestacadoTexto}>Destacado</Text>
                      </View>
                    }
                    {item.visible === false &&
                    <View style={estilos.badgeOculto}>
                        <Text style={estilos.badgeOcultoTexto}>Oculto</Text>
                      </View>
                    }
                  </View>
                  <TouchableOpacity
                    style={estilos.botonBorrar}
                    onPress={() => borrarContenido(item)}>
                    
                    <Ionicons name="trash-outline" size={20} color="#f44" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={estilos.workspacePreview}>
                {videoThumbUri ?
                <TouchableOpacity style={estilos.workspaceThumb} onPress={() => abrirMediaContenidoAdmin(mediaUrl || previewUrl)}>
                    {Platform.OS === 'web' ?
                  <AdminListVideoThumbWeb uri={videoThumbUri} /> :
                  <AdminListVideoThumbNative uri={videoThumbUri} />
                  }
                  </TouchableOpacity> :
                tipoItem === 'audio' || audioThumbUri ?
                <TouchableOpacity
                  style={[estilos.workspaceThumb, estilos.workspaceThumbIconoTipoLista]}
                  onPress={() => audioThumbUri && abrirMediaContenidoAdmin(mediaUrl || previewUrl)}
                  disabled={!audioThumbUri}
                  activeOpacity={0.75}>
                  
                    <Ionicons name="musical-notes" size={36} color="#00dc57" />
                  </TouchableOpacity> :
                imageThumbUri ?
                <TouchableOpacity style={estilos.workspaceThumb} onPress={() => abrirMediaContenidoAdmin(mediaUrl || previewUrl)}>
                    <Image source={{ uri: imageThumbUri }} style={estilos.workspaceThumbImg} resizeMode="cover" />
                  </TouchableOpacity> :
                tipoItem === 'articulo' ?
                <View style={[estilos.workspaceThumb, estilos.workspaceThumbIconoTipoLista]}>
                    <Ionicons name="document-text" size={36} color="#00dc57" />
                  </View> :

                <View style={estilos.workspaceThumbPlaceholder}>
                    <Ionicons
                    name={tipoItem === 'video' ? 'videocam' : 'image-outline'}
                    size={32}
                    color="#5a5a5a" />
                  
                  </View>
                }
                <Text style={estilos.workspacePreviewTexto} numberOfLines={3}>{item.previewTexto || item.descripcion || ''}</Text>
              </View>
              <View style={estilos.workspaceMetricas}>
                <View style={estilos.metricaItem}>
                  <Ionicons name="eye-outline" size={18} color="#888" />
                  <Text style={estilos.metricaNumero}>{vistas}</Text>
                  <Text style={estilos.metricaLabel}>vistas</Text>
                </View>
                <View style={estilos.metricaItem}>
                  <Ionicons name="heart-outline" size={18} color="#888" />
                  <Text style={estilos.metricaNumero}>{likes}</Text>
                  <Text style={estilos.metricaLabel}>likes</Text>
                </View>
                <View style={estilos.metricaItem}>
                  <Ionicons name="chatbubble-outline" size={18} color="#888" />
                  <Text style={estilos.metricaNumero}>{numComentarios}</Text>
                  <Text style={estilos.metricaLabel}>comentarios</Text>
                </View>
              </View>
              <View style={estilos.workspaceMeta}>
                {item.categoria ? <Text style={estilos.workspaceMetaItem}>Categoría: {item.categoria}</Text> : null}
                <Text style={estilos.workspaceMetaItem}>Nivel: {item.nivelRequerido || 'thug'}</Text>
                {etiquetasArr.length > 0 &&
                <Text style={estilos.workspaceMetaItem}>Etiquetas: {etiquetasArr.join(', ')}</Text>
                }
                {fechaPub && <Text style={estilos.workspaceMetaFecha}>Publicado: {new Date(fechaPub).toLocaleDateString()}</Text>}
                {fechaAct && <Text style={estilos.workspaceMetaFecha}>Actualizado: {new Date(fechaAct).toLocaleDateString()}</Text>}
              </View>
            </View>);

        })}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={cerrarModal}>
        
        <Pressable style={estilos.modalOverlay} onPress={cerrarModal}>
          <Pressable style={estilos.modalCaja} onPress={(e) => e.stopPropagation()}>
            <View style={estilos.modalHeader}>
              <Text style={estilos.modalTitulo}>Nueva publicación</Text>
              <TouchableOpacity onPress={cerrarModal} style={estilos.modalCerrar}>
                <Text style={estilos.modalCerrarTexto}>Cerrar</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={estilos.modalScroll}
              contentContainerStyle={estilos.modalScrollContenido}
              keyboardShouldPersistTaps="handled">
              
        <View style={estilos.formulario}>
          <Text style={estilos.label}>Título *</Text>
          <TextInput
                  style={estilos.input}
                  value={titulo}
                  onChangeText={setTitulo}
                  placeholder="Título de la publicación"
                  placeholderTextColor="#666" />
                
          <Text style={estilos.label}>Descripción</Text>
          <TextInput
                  style={[estilos.input, estilos.inputMultiline]}
                  value={descripcion}
                  onChangeText={setDescripcion}
                  placeholder="Descripción"
                  placeholderTextColor="#666"
                  multiline />
                
          <Text style={estilos.label}>Contenido</Text>
          <TextInput
                  style={[estilos.input, estilos.inputMultiline]}
                  value={contenido}
                  onChangeText={setContenido}
                  placeholder="Contenido del artículo o publicación"
                  placeholderTextColor="#666"
                  multiline />
                
          <Text style={estilos.label}>Complementario</Text>
          <TextInput
                  style={[estilos.input, estilos.inputMultiline]}
                  value={complementario}
                  onChangeText={setComplementario}
                  placeholder="Opcional: nota en cursiva (no es enlace). Si pegás una URL, se verá como enlace verde. El archivo (PDF, etc.) tiene su propio enlace debajo."
                  placeholderTextColor="#666"
                  multiline />
                
          <Text style={estilos.label}>Imagen, vídeo o audio (preview)</Text>
          <View style={estilos.uploadRow}>
            <TouchableOpacity style={estilos.botonUpload} onPress={elegirImagen}>
              <Text style={estilos.botonUploadTexto}>{imagenUri ? 'Cambiar' : 'Elegir archivo'}</Text>
            </TouchableOpacity>
            {imagenUri &&
                  <>
                {tipoContenido === 'audio' || urlPareceArchivoAudio(imagenUri) ?
                  <View style={estilos.previewMiniAudio}>
                      <Ionicons name="musical-notes" size={26} color="#00dc57" />
                    </View> :

                  <View style={estilos.previewMini}>
                  <Image source={{ uri: imagenUri }} style={estilos.previewImg} resizeMode="cover" />
                </View>
                  }
                <TouchableOpacity onPress={limpiarImagen} style={estilos.quitar}>
                  <Text style={estilos.quitarTexto}>Quitar</Text>
                </TouchableOpacity>
              </>
                  }
          </View>
          <Text style={estilos.label}>Media (PDF, enlaces o videos)</Text>
          <View style={estilos.uploadRow}>
            <TouchableOpacity style={estilos.botonUpload} onPress={elegirMediaArchivo}>
              <Text style={estilos.botonUploadTexto}>{mediaArchivoNombre ? 'Cambiar' : 'Subir archivo'}</Text>
            </TouchableOpacity>
            {mediaArchivoNombre &&
                  <>
                <Text style={estilos.archivoNombre} numberOfLines={1}>{mediaArchivoNombre}</Text>
                <TouchableOpacity onPress={limpiarMediaArchivo} style={estilos.quitar}>
                  <Text style={estilos.quitarTexto}>Quitar</Text>
                </TouchableOpacity>
              </>
                  }
          </View>

          <Text style={estilos.label}>Tipo de contenido</Text>
          <View style={estilos.filaOpciones}>
            {TIPOS_CONTENIDO.map((t) =>
                  <TouchableOpacity
                    key={t}
                    style={[estilos.chip, t === tipoContenido && estilos.chipActivo]}
                    onPress={() => setTipoContenido(t)}>
                    
                <Text style={[estilos.chipTexto, t === tipoContenido && estilos.chipTextoActivo]}>{t}</Text>
              </TouchableOpacity>
                  )}
          </View>
          <Text style={estilos.label}>Nivel requerido</Text>
          <View style={estilos.filaOpciones}>
            {NIVELES.map((n) =>
                  <TouchableOpacity
                    key={n}
                    style={[estilos.chip, n === nivelRequerido && estilos.chipActivo]}
                    onPress={() => setNivelRequerido(n)}>
                    
                <Text style={[estilos.chipTexto, n === nivelRequerido && estilos.chipTextoActivo]}>{n}</Text>
              </TouchableOpacity>
                  )}
          </View>
          <Text style={estilos.label}>Categoría</Text>
          <TextInput
                  style={estilos.input}
                  value={categoria}
                  onChangeText={setCategoria}
                  placeholder="Ej: behind the scenes"
                  placeholderTextColor="#666" />
                
          <Text style={estilos.label}>Etiquetas (separadas por coma)</Text>
          <TextInput
                  style={estilos.input}
                  value={etiquetasStr}
                  onChangeText={setEtiquetasStr}
                  placeholder="ej: sesion, inedito"
                  placeholderTextColor="#666" />
                
          <View style={estilos.filaSwitch}>
            <Text style={estilos.label}>Visible</Text>
            <Switch value={visible} onValueChange={setVisible} trackColor={{ false: '#444', true: '#00dc57' }} thumbColor="#fff" />
          </View>
          <View style={estilos.filaSwitch}>
            <Text style={estilos.label}>Destacado</Text>
            <Switch value={destacado} onValueChange={setDestacado} trackColor={{ false: '#444', true: '#00dc57' }} thumbColor="#fff" />
          </View>

          <TouchableOpacity
                  style={[estilos.botonSubir, enviando && estilos.botonDeshabilitado]}
                  onPress={enviar}
                  disabled={enviando}>
                  
            {enviando ? <ActivityIndicator color="#000" size="small" /> : <Text style={estilos.botonSubirTexto}>Crear publicación</Text>}
          </TouchableOpacity>
        </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={modalEditarVisible}
        transparent
        animationType="slide"
        onRequestClose={cerrarModalEditar}>
        
        <Pressable style={estilos.modalOverlay} onPress={cerrarModalEditar}>
          <Pressable style={estilos.modalCaja} onPress={(e) => e.stopPropagation()}>
            <View style={estilos.modalHeader}>
              <Text style={estilos.modalTitulo}>Editar publicación</Text>
              <TouchableOpacity onPress={cerrarModalEditar} style={estilos.modalCerrar}>
                <Text style={estilos.modalCerrarTexto}>Cerrar</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={estilos.modalScroll}
              contentContainerStyle={estilos.modalScrollContenido}
              keyboardShouldPersistTaps="handled">
              
              <View style={estilos.formulario}>
                <Text style={estilos.label}>Título *</Text>
                <TextInput
                  style={estilos.input}
                  value={editTitulo}
                  onChangeText={setEditTitulo}
                  placeholder="Título de la publicación"
                  placeholderTextColor="#666" />
                
                <Text style={estilos.label}>Descripción</Text>
                <TextInput
                  style={[estilos.input, estilos.inputMultiline]}
                  value={editDescripcion}
                  onChangeText={setEditDescripcion}
                  placeholder="Descripción"
                  placeholderTextColor="#666"
                  multiline />
                
                <Text style={estilos.label}>Contenido</Text>
                <TextInput
                  style={[estilos.input, estilos.inputMultiline]}
                  value={editContenido}
                  onChangeText={setEditContenido}
                  placeholder="Contenido del artículo o publicación"
                  placeholderTextColor="#666"
                  multiline />
                
                <Text style={estilos.label}>Complementario</Text>
                <TextInput
                  style={[estilos.input, estilos.inputMultiline]}
                  value={editComplementario}
                  onChangeText={setEditComplementario}
                  placeholder="Opcional: nota en cursiva (no es enlace). Si pegás una URL, enlace verde. El archivo tiene enlace aparte."
                  placeholderTextColor="#666"
                  multiline />
                
                <Text style={estilos.label}>Imagen, vídeo o audio (preview)</Text>
                <View style={estilos.uploadRow}>
                  <TouchableOpacity style={estilos.botonUpload} onPress={elegirImagenEdit}>
                    <Text style={estilos.botonUploadTexto}>{editImagenUri ? 'Cambiar' : 'Elegir archivo'}</Text>
                  </TouchableOpacity>
                  {editImagenUri &&
                  <>
                      {editTipoContenido === 'audio' || urlPareceArchivoAudio(editImagenUri) ?
                    <View style={estilos.previewMiniAudio}>
                          <Ionicons name="musical-notes" size={26} color="#00dc57" />
                        </View> :

                      <View style={estilos.previewMini}>
                        <Image source={{ uri: editImagenUri }} style={estilos.previewImg} resizeMode="cover" />
                      </View>
                      }
                      <TouchableOpacity onPress={limpiarImagenEdit} style={estilos.quitar}>
                        <Text style={estilos.quitarTexto}>Quitar</Text>
                      </TouchableOpacity>
                    </>
                  }
                </View>
                <Text style={estilos.label}>Media (PDF, enlaces o videos)</Text>
                <View style={estilos.uploadRow}>
                  <TouchableOpacity style={estilos.botonUpload} onPress={elegirMediaArchivoEdit}>
                    <Text style={estilos.botonUploadTexto}>{editMediaArchivoNombre ? 'Cambiar' : 'Subir archivo'}</Text>
                  </TouchableOpacity>
                  {editMediaArchivoNombre &&
                  <>
                      <Text style={estilos.archivoNombre} numberOfLines={1}>{editMediaArchivoNombre}</Text>
                      <TouchableOpacity onPress={limpiarMediaArchivoEdit} style={estilos.quitar}>
                        <Text style={estilos.quitarTexto}>Quitar</Text>
                      </TouchableOpacity>
                    </>
                  }
                </View>
                <Text style={estilos.label}>Tipo de contenido</Text>
                <View style={estilos.filaOpciones}>
                  {TIPOS_CONTENIDO.map((t) =>
                  <TouchableOpacity
                    key={t}
                    style={[estilos.chip, t === editTipoContenido && estilos.chipActivo]}
                    onPress={() => setEditTipoContenido(t)}>
                    
                      <Text style={[estilos.chipTexto, t === editTipoContenido && estilos.chipTextoActivo]}>{t}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={estilos.label}>Nivel requerido</Text>
                <View style={estilos.filaOpciones}>
                  {NIVELES.map((n) =>
                  <TouchableOpacity
                    key={n}
                    style={[estilos.chip, n === editNivelRequerido && estilos.chipActivo]}
                    onPress={() => setEditNivelRequerido(n)}>
                    
                      <Text style={[estilos.chipTexto, n === editNivelRequerido && estilos.chipTextoActivo]}>{n}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={estilos.label}>Categoría</Text>
                <TextInput
                  style={estilos.input}
                  value={editCategoria}
                  onChangeText={setEditCategoria}
                  placeholder="Ej: behind the scenes"
                  placeholderTextColor="#666" />
                
                <Text style={estilos.label}>Etiquetas (separadas por coma)</Text>
                <TextInput
                  style={estilos.input}
                  value={editEtiquetasStr}
                  onChangeText={setEditEtiquetasStr}
                  placeholder="ej: sesion, inedito"
                  placeholderTextColor="#666" />
                
                <View style={estilos.filaSwitch}>
                  <Text style={estilos.label}>Visible</Text>
                  <Switch value={editVisible} onValueChange={setEditVisible} trackColor={{ false: '#444', true: '#00dc57' }} thumbColor="#fff" />
                </View>
                <View style={estilos.filaSwitch}>
                  <Text style={estilos.label}>Destacado</Text>
                  <Switch value={editDestacado} onValueChange={setEditDestacado} trackColor={{ false: '#444', true: '#00dc57' }} thumbColor="#fff" />
                </View>
                <TouchableOpacity
                  style={[estilos.botonSubir, enviandoEdit && estilos.botonDeshabilitado]}
                  onPress={guardarEdicion}
                  disabled={enviandoEdit}>
                  
                  {enviandoEdit ? <ActivityIndicator color="#000" size="small" /> : <Text style={estilos.botonSubirTexto}>Guardar cambios</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>);

}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#0d0d0d' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a'
  },
  botonAtras: { padding: 8, marginRight: 8 },
  botonAtrasTexto: { color: '#00dc57', fontSize: 14 },
  titulo: { fontSize: 20, color: '#fff', fontWeight: '600' },
  botonAbrirModal: {
    backgroundColor: '#00dc57',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center'
  },
  botonAbrirModalTexto: { color: '#000', fontWeight: '600', fontSize: 16 },
  scroll: { flex: 1 },
  scrollContenido: { padding: 16, paddingBottom: 40 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCaja: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    maxWidth: 500,
    width: '100%',
    maxHeight: '90%'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333'
  },
  modalTitulo: { fontSize: 18, color: '#fff', fontWeight: '600' },
  modalCerrar: { padding: 8 },
  modalCerrarTexto: { color: '#00dc57', fontSize: 14 },
  modalScroll: { maxHeight: 480 },
  modalScrollContenido: { padding: 16, paddingBottom: 24 },
  formulario: { marginBottom: 0 },
  label: { color: '#aaa', fontSize: 13, marginBottom: 4, marginTop: 12 },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#333'
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  uploadRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  botonUpload: {
    backgroundColor: '#333',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00dc57'
  },
  botonUploadTexto: { color: '#00dc57', fontSize: 14 },
  previewMini: { width: 56, height: 56, borderRadius: 8, overflow: 'hidden', backgroundColor: '#222' },
  previewMiniAudio: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: 'rgba(0,220,87,0.35)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  previewImg: { width: '100%', height: '100%' },
  archivoNombre: { color: '#888', fontSize: 12, maxWidth: 120 },
  quitar: { padding: 4 },
  quitarTexto: { color: '#f44', fontSize: 13 },
  filaOpciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#252525',
    borderWidth: 1,
    borderColor: '#444'
  },
  chipActivo: { borderColor: '#00dc57', backgroundColor: 'rgba(0,220,87,0.15)' },
  chipTexto: { color: '#aaa', fontSize: 13 },
  chipTextoActivo: { color: '#00dc57' },
  filaSwitch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  botonSubir: {
    backgroundColor: '#00dc57',
    marginTop: 20,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center'
  },
  botonDeshabilitado: { opacity: 0.7 },
  botonSubirTexto: { color: '#000', fontWeight: '600', fontSize: 16 },
  seccionTitulo: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 12 },
  vacio: { color: '#666', fontSize: 14 },
  workspaceCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    overflow: 'hidden'
  },
  workspaceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  workspaceTitulo: { color: '#fff', fontSize: 16, fontWeight: '600', flex: 1 },
  workspaceHeaderAcciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  botonEditar: { padding: 6 },
  botonBorrar: { padding: 6 },
  workspaceBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badgeTipo: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#252525',
    borderWidth: 1,
    borderColor: '#00dc57'
  },
  badgeTipoTexto: { color: '#00dc57', fontSize: 11, textTransform: 'capitalize' },
  badgeDestacado: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255,193,7,0.2)',
    borderWidth: 1,
    borderColor: '#ffc107'
  },
  badgeDestacadoTexto: { color: '#ffc107', fontSize: 11 },
  badgeOculto: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(244,67,54,0.2)',
    borderWidth: 1,
    borderColor: '#f44336'
  },
  badgeOcultoTexto: { color: '#f44336', fontSize: 11 },
  workspacePreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#252525'
  },
  workspaceThumb: { width: 80, height: 80, borderRadius: 8, overflow: 'hidden', backgroundColor: '#222' },
  /** Misma caja que audio: fondo #2a2a2a, borde verde, icono centrado (audio / artículo en lista). */
  workspaceThumbIconoTipoLista: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: 'rgba(0,220,87,0.35)'
  },
  workspaceThumbImg: { width: '100%', height: '100%' },
  workspaceThumbPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center'
  },
  workspacePreviewTexto: { flex: 1, color: '#aaa', fontSize: 13, lineHeight: 20 },
  workspaceMetricas: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: '#151515',
    borderRadius: 8,
    marginBottom: 10
  },
  metricaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricaNumero: { color: '#fff', fontSize: 14, fontWeight: '600' },
  metricaLabel: { color: '#666', fontSize: 12 },
  workspaceMeta: { marginBottom: 8 },
  workspaceMetaItem: { color: '#666', fontSize: 12, marginBottom: 2 },
  workspaceMetaFecha: { color: '#555', fontSize: 11, marginBottom: 2 },
  workspaceVerArchivo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start'
  },
  enlace: { color: '#00dc57', fontSize: 14 }
});