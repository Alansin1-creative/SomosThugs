import React, { useState, useEffect } from 'react';
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
  Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { listarContenidoExclusivo, crearContenidoExclusivo, actualizarContenidoExclusivo, leerContenidoExclusivo } from '../servicios/api';
import { getBaseUrl } from '../config/api';
import { useAuth } from '../contexto/AuthContext';
import { esAdmin } from '../constantes/nivelesAcceso';

const TIPOS_CONTENIDO = ['articulo', 'video', 'imagen', 'audio'];
const NIVELES = ['fan', 'thug'];

export default function AdminContenidoExclusivo({ navigation }) {
  const { perfil } = useAuth();
  const [lista, setLista] = useState([]);
  const [refrescando, setRefrescando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [previewTexto, setPreviewTexto] = useState('');
  const [contenidoCompleto, setContenidoCompleto] = useState('');
  const [tipoContenido, setTipoContenido] = useState('articulo');
  const [nivelRequerido, setNivelRequerido] = useState('thug');
  const [categoria, setCategoria] = useState('');
  const [etiquetasStr, setEtiquetasStr] = useState('');
  const [visible, setVisible] = useState(true);
  const [destacado, setDestacado] = useState(false);
  const [mediaPreviewBase64, setMediaPreviewBase64] = useState(null);
  const [mediaPreviewUri, setMediaPreviewUri] = useState(null);
  const [mediaCompletaBase64, setMediaCompletaBase64] = useState(null);
  const [mediaCompletaUri, setMediaCompletaUri] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [itemEditando, setItemEditando] = useState(null);
  const [modalEditarVisible, setModalEditarVisible] = useState(false);
  const [enviandoEdit, setEnviandoEdit] = useState(false);
  const [editTitulo, setEditTitulo] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editPreviewTexto, setEditPreviewTexto] = useState('');
  const [editContenidoCompleto, setEditContenidoCompleto] = useState('');
  const [editTipoContenido, setEditTipoContenido] = useState('articulo');
  const [editNivelRequerido, setEditNivelRequerido] = useState('thug');
  const [editCategoria, setEditCategoria] = useState('');
  const [editEtiquetasStr, setEditEtiquetasStr] = useState('');
  const [editVisible, setEditVisible] = useState(true);
  const [editDestacado, setEditDestacado] = useState(false);
  const [editMediaPreviewBase64, setEditMediaPreviewBase64] = useState(null);
  const [editMediaPreviewUri, setEditMediaPreviewUri] = useState(null);
  const [editMediaCompletaBase64, setEditMediaCompletaBase64] = useState(null);
  const [editMediaCompletaUri, setEditMediaCompletaUri] = useState(null);

  const cerrarModal = () => {
    setModalVisible(false);
    setTitulo('');
    setDescripcion('');
    setPreviewTexto('');
    setContenidoCompleto('');
    setCategoria('');
    setEtiquetasStr('');
    setMediaPreviewBase64(null);
    setMediaPreviewUri(null);
    setMediaCompletaBase64(null);
    setMediaCompletaUri(null);
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

  const elegirMedia = (esPreview) => async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const base64 = asset.base64 ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` : null;
      if (esPreview) {
        setMediaPreviewUri(asset.uri);
        setMediaPreviewBase64(base64);
      } else {
        setMediaCompletaUri(asset.uri);
        setMediaCompletaBase64(base64);
      }
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo elegir el archivo.');
    }
  };

  const limpiarPreview = () => {
    setMediaPreviewUri(null);
    setMediaPreviewBase64(null);
  };
  const limpiarCompleta = () => {
    setMediaCompletaUri(null);
    setMediaCompletaBase64(null);
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
      setEditPreviewTexto(doc.previewTexto || '');
      setEditContenidoCompleto(doc.contenidoCompleto || '');
      setEditTipoContenido(doc.tipoContenido || doc.tipo || 'articulo');
      setEditNivelRequerido(doc.nivelRequerido || 'thug');
      setEditCategoria(doc.categoria || '');
      setEditEtiquetasStr(Array.isArray(doc.etiquetas) ? doc.etiquetas.join(', ') : '');
      setEditVisible(doc.visible !== false);
      setEditDestacado(!!doc.destacado);
      setEditMediaPreviewBase64(null);
      setEditMediaPreviewUri(doc.urlMediaPreview ? ((doc.urlMediaPreview.startsWith('http') || doc.urlMediaPreview.startsWith('data:')) ? doc.urlMediaPreview : getBaseUrl() + doc.urlMediaPreview) : null);
      setEditMediaCompletaBase64(null);
      setEditMediaCompletaUri(doc.urlMediaCompleta ? ((doc.urlMediaCompleta.startsWith('http') || doc.urlMediaCompleta.startsWith('data:')) ? doc.urlMediaCompleta : getBaseUrl() + doc.urlMediaCompleta) : null);
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo cargar el contenido.');
      setModalEditarVisible(false);
    }
  };

  const cerrarModalEditar = () => {
    setModalEditarVisible(false);
    setItemEditando(null);
    setEditMediaPreviewBase64(null);
    setEditMediaPreviewUri(null);
    setEditMediaCompletaBase64(null);
    setEditMediaCompletaUri(null);
  };

  const elegirMediaEdit = (esPreview) => async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const base64 = asset.base64 ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` : null;
      if (esPreview) {
        setEditMediaPreviewUri(asset.uri);
        setEditMediaPreviewBase64(base64);
      } else {
        setEditMediaCompletaUri(asset.uri);
        setEditMediaCompletaBase64(base64);
      }
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo elegir el archivo.');
    }
  };

  const guardarEdicion = async () => {
    if (!itemEditando || !editTitulo.trim()) {
      Alert.alert('', 'El título es obligatorio.');
      return;
    }
    setEnviandoEdit(true);
    try {
      const etiquetas = (editEtiquetasStr || '').trim() ? editEtiquetasStr.split(',').map((e) => e.trim()).filter(Boolean) : [];
      const body = {
        titulo: String(editTitulo ?? '').trim(),
        descripcion: String(editDescripcion ?? '').trim(),
        previewTexto: String(editPreviewTexto ?? '').trim(),
        contenidoCompleto: String(editContenidoCompleto ?? '').trim(),
        tipoContenido: String(editTipoContenido ?? 'articulo').trim() || 'articulo',
        nivelRequerido: String(editNivelRequerido ?? 'thug').trim() || 'thug',
        categoria: String(editCategoria ?? '').trim(),
        etiquetas: Array.isArray(etiquetas) ? etiquetas : [],
        visible: editVisible !== false,
        destacado: Boolean(editDestacado),
      };
      if (editMediaPreviewBase64) body.mediaPreviewBase64 = editMediaPreviewBase64;
      if (editMediaCompletaBase64) body.mediaCompletaBase64 = editMediaCompletaBase64;
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

  const enviar = async () => {
    if (!titulo.trim()) {
      Alert.alert('', 'El título es obligatorio.');
      return;
    }
    setEnviando(true);
    try {
      const etiquetas = etiquetasStr.trim() ? etiquetasStr.split(',').map((e) => e.trim()).filter(Boolean) : [];
      // Objeto plano: cada campo como propiedad top-level (el backend los guarda así en el doc)
      const bodySoloTexto = {
        titulo: String(titulo ?? '').trim(),
        descripcion: String(descripcion ?? '').trim(),
        previewTexto: String(previewTexto ?? '').trim(),
        contenidoCompleto: String(contenidoCompleto ?? '').trim(),
        tipoContenido: String(tipoContenido ?? 'articulo').trim() || 'articulo',
        nivelRequerido: String(nivelRequerido ?? 'thug').trim() || 'thug',
        categoria: String(categoria ?? '').trim(),
        etiquetas: Array.isArray(etiquetas) ? etiquetas : [],
        visible: visible !== false,
        destacado: Boolean(destacado),
        creadoPor: String(perfil?.id ?? ''),
      };
      const creado = await crearContenidoExclusivo(bodySoloTexto);
      if (creado?.id && (mediaPreviewBase64 || mediaCompletaBase64)) {
        const bodyMedia = {};
        if (mediaPreviewBase64) bodyMedia.mediaPreviewBase64 = mediaPreviewBase64;
        if (mediaCompletaBase64) bodyMedia.mediaCompletaBase64 = mediaCompletaBase64;
        await actualizarContenidoExclusivo(creado.id, bodyMedia);
      }
      setTitulo('');
      setDescripcion('');
      setPreviewTexto('');
      setContenidoCompleto('');
      setCategoria('');
      setEtiquetasStr('');
      setMediaPreviewBase64(null);
      setMediaPreviewUri(null);
      setMediaCompletaBase64(null);
      setMediaCompletaUri(null);
      await cargar();
      cerrarModal();
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
        }
      >
        {lista.length === 0 && (
          <Text style={estilos.vacio}>Aún no hay contenido. Usa el botón de arriba para subir.</Text>
        )}
        {lista.map((item) => {
          const previewUrl = item.urlMediaPreview || item.urlArchivo;
          const mediaUrl = item.urlMediaCompleta || item.urlMediaPreview || item.urlArchivo;
          const numComentarios = Array.isArray(item.comentarios) ? item.comentarios.length : 0;
          const vistas = item.numeroVistas ?? 0;
          const likes = item.numeroLikes ?? 0;
          const fechaPub = item.fechaPublicacion || item.fechaSubida;
          const fechaAct = item.fechaActualizacion;
          const etiquetasArr = item.etiquetas && Array.isArray(item.etiquetas) ? item.etiquetas : [];
          return (
            <View key={item.id} style={estilos.workspaceCard}>
              <View style={estilos.workspaceHeader}>
                <Text style={estilos.workspaceTitulo} numberOfLines={1}>{item.titulo || 'Sin título'}</Text>
                <TouchableOpacity style={estilos.botonEditar} onPress={() => abrirEditar(item)}>
                  <Ionicons name="pencil" size={20} color="#00dc57" />
                </TouchableOpacity>
                <View style={estilos.workspaceBadges}>
                  <View style={estilos.badgeTipo}>
                    <Text style={estilos.badgeTipoTexto}>{item.tipoContenido || item.tipo || 'articulo'}</Text>
                  </View>
                  {item.destacado && <View style={estilos.badgeDestacado}><Text style={estilos.badgeDestacadoTexto}>Destacado</Text></View>}
                  {item.visible === false && <View style={estilos.badgeOculto}><Text style={estilos.badgeOcultoTexto}>Oculto</Text></View>}
                </View>
              </View>
              <View style={estilos.workspacePreview}>
                {(previewUrl && (previewUrl.startsWith('http') || previewUrl.startsWith('/') || previewUrl.startsWith('data:'))) ? (
                  <TouchableOpacity style={estilos.workspaceThumb} onPress={() => mediaUrl && Linking.openURL(mediaUrl.startsWith('http') ? mediaUrl : getBaseUrl() + mediaUrl)}>
                    <Image source={{ uri: (previewUrl.startsWith('http') || previewUrl.startsWith('data:')) ? previewUrl : getBaseUrl() + previewUrl }} style={estilos.workspaceThumbImg} resizeMode="cover" />
                  </TouchableOpacity>
                ) : (
                  <View style={estilos.workspaceThumbPlaceholder}>
                    <Ionicons name="image-outline" size={32} color="#444" />
                  </View>
                )}
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
                {etiquetasArr.length > 0 && (
                  <Text style={estilos.workspaceMetaItem}>Etiquetas: {etiquetasArr.join(', ')}</Text>
                )}
                {fechaPub && <Text style={estilos.workspaceMetaFecha}>Publicado: {new Date(fechaPub).toLocaleDateString()}</Text>}
                {fechaAct && <Text style={estilos.workspaceMetaFecha}>Actualizado: {new Date(fechaAct).toLocaleDateString()}</Text>}
              </View>
              {mediaUrl && (
                <TouchableOpacity style={estilos.workspaceVerArchivo} onPress={() => Linking.openURL(mediaUrl.startsWith('http') ? mediaUrl : getBaseUrl() + mediaUrl)}>
                  <Ionicons name="open-outline" size={16} color="#00dc57" />
                  <Text style={estilos.enlace}>Ver archivo</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={cerrarModal}
      >
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
              keyboardShouldPersistTaps="handled"
            >
        <View style={estilos.formulario}>
          <Text style={estilos.label}>Título *</Text>
          <TextInput
            style={estilos.input}
            value={titulo}
            onChangeText={setTitulo}
            placeholder="Título de la publicación"
            placeholderTextColor="#666"
          />
          <Text style={estilos.label}>Descripción</Text>
          <TextInput
            style={[estilos.input, estilos.inputMultiline]}
            value={descripcion}
            onChangeText={setDescripcion}
            placeholder="Descripción"
            placeholderTextColor="#666"
            multiline
          />
          <Text style={estilos.label}>Texto preview</Text>
          <TextInput
            style={[estilos.input, estilos.inputMultiline]}
            value={previewTexto}
            onChangeText={setPreviewTexto}
            placeholder="Texto corto para vista previa"
            placeholderTextColor="#666"
            multiline
          />
          <Text style={estilos.label}>Contenido completo</Text>
          <TextInput
            style={[estilos.input, estilos.inputMultiline]}
            value={contenidoCompleto}
            onChangeText={setContenidoCompleto}
            placeholder="Contenido completo del artículo o descripción"
            placeholderTextColor="#666"
            multiline
          />

          <Text style={estilos.label}>Media preview (foto/video miniatura)</Text>
          <View style={estilos.uploadRow}>
            <TouchableOpacity style={estilos.botonUpload} onPress={elegirMedia(true)}>
              <Text style={estilos.botonUploadTexto}>{mediaPreviewUri ? 'Cambiar' : 'Subir preview'}</Text>
            </TouchableOpacity>
            {mediaPreviewUri && (
              <>
                <View style={estilos.previewMini}>
                  <Image source={{ uri: mediaPreviewUri }} style={estilos.previewImg} resizeMode="cover" />
                </View>
                <TouchableOpacity onPress={limpiarPreview} style={estilos.quitar}>
                  <Text style={estilos.quitarTexto}>Quitar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <Text style={estilos.label}>Media completa (foto o archivo)</Text>
          <View style={estilos.uploadRow}>
            <TouchableOpacity style={estilos.botonUpload} onPress={elegirMedia(false)}>
              <Text style={estilos.botonUploadTexto}>{mediaCompletaUri ? 'Cambiar' : 'Subir archivo'}</Text>
            </TouchableOpacity>
            {mediaCompletaUri && (
              <>
                {mediaCompletaUri.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <View style={estilos.previewMini}>
                    <Image source={{ uri: mediaCompletaUri }} style={estilos.previewImg} resizeMode="cover" />
                  </View>
                ) : (
                  <Text style={estilos.archivoNombre} numberOfLines={1}>{mediaCompletaUri.split('/').pop()}</Text>
                )}
                <TouchableOpacity onPress={limpiarCompleta} style={estilos.quitar}>
                  <Text style={estilos.quitarTexto}>Quitar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <Text style={estilos.label}>Tipo de contenido</Text>
          <View style={estilos.filaOpciones}>
            {TIPOS_CONTENIDO.map((t) => (
              <TouchableOpacity
                key={t}
                style={[estilos.chip, t === tipoContenido && estilos.chipActivo]}
                onPress={() => setTipoContenido(t)}
              >
                <Text style={[estilos.chipTexto, t === tipoContenido && estilos.chipTextoActivo]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={estilos.label}>Nivel requerido</Text>
          <View style={estilos.filaOpciones}>
            {NIVELES.map((n) => (
              <TouchableOpacity
                key={n}
                style={[estilos.chip, n === nivelRequerido && estilos.chipActivo]}
                onPress={() => setNivelRequerido(n)}
              >
                <Text style={[estilos.chipTexto, n === nivelRequerido && estilos.chipTextoActivo]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={estilos.label}>Categoría</Text>
          <TextInput
            style={estilos.input}
            value={categoria}
            onChangeText={setCategoria}
            placeholder="Ej: behind the scenes"
            placeholderTextColor="#666"
          />
          <Text style={estilos.label}>Etiquetas (separadas por coma)</Text>
          <TextInput
            style={estilos.input}
            value={etiquetasStr}
            onChangeText={setEtiquetasStr}
            placeholder="ej: sesion, inedito"
            placeholderTextColor="#666"
          />
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
            disabled={enviando}
          >
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
        onRequestClose={cerrarModalEditar}
      >
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
              keyboardShouldPersistTaps="handled"
            >
              <View style={estilos.formulario}>
                <Text style={estilos.label}>Título *</Text>
                <TextInput
                  style={estilos.input}
                  value={editTitulo}
                  onChangeText={setEditTitulo}
                  placeholder="Título de la publicación"
                  placeholderTextColor="#666"
                />
                <Text style={estilos.label}>Descripción</Text>
                <TextInput
                  style={[estilos.input, estilos.inputMultiline]}
                  value={editDescripcion}
                  onChangeText={setEditDescripcion}
                  placeholder="Descripción"
                  placeholderTextColor="#666"
                  multiline
                />
                <Text style={estilos.label}>Texto preview</Text>
                <TextInput
                  style={[estilos.input, estilos.inputMultiline]}
                  value={editPreviewTexto}
                  onChangeText={setEditPreviewTexto}
                  placeholder="Texto corto para vista previa"
                  placeholderTextColor="#666"
                  multiline
                />
                <Text style={estilos.label}>Contenido completo</Text>
                <TextInput
                  style={[estilos.input, estilos.inputMultiline]}
                  value={editContenidoCompleto}
                  onChangeText={setEditContenidoCompleto}
                  placeholder="Contenido completo del artículo o descripción"
                  placeholderTextColor="#666"
                  multiline
                />
                <Text style={estilos.label}>Media preview (foto/video miniatura)</Text>
                <View style={estilos.uploadRow}>
                  <TouchableOpacity style={estilos.botonUpload} onPress={elegirMediaEdit(true)}>
                    <Text style={estilos.botonUploadTexto}>{editMediaPreviewUri ? 'Cambiar' : 'Subir preview'}</Text>
                  </TouchableOpacity>
                  {editMediaPreviewUri && (
                    <>
                      <View style={estilos.previewMini}>
                        <Image source={{ uri: editMediaPreviewUri }} style={estilos.previewImg} resizeMode="cover" />
                      </View>
                      <TouchableOpacity onPress={() => { setEditMediaPreviewUri(null); setEditMediaPreviewBase64(null); }} style={estilos.quitar}>
                        <Text style={estilos.quitarTexto}>Quitar</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
                <Text style={estilos.label}>Media completa (foto o archivo)</Text>
                <View style={estilos.uploadRow}>
                  <TouchableOpacity style={estilos.botonUpload} onPress={elegirMediaEdit(false)}>
                    <Text style={estilos.botonUploadTexto}>{editMediaCompletaUri ? 'Cambiar' : 'Subir archivo'}</Text>
                  </TouchableOpacity>
                  {editMediaCompletaUri && (
                    <>
                      {editMediaCompletaUri.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <View style={estilos.previewMini}>
                          <Image source={{ uri: editMediaCompletaUri }} style={estilos.previewImg} resizeMode="cover" />
                        </View>
                      ) : (
                        <Text style={estilos.archivoNombre} numberOfLines={1}>{editMediaCompletaUri.split('/').pop()?.split('\\').pop() || 'Archivo'}</Text>
                      )}
                      <TouchableOpacity onPress={() => { setEditMediaCompletaUri(null); setEditMediaCompletaBase64(null); }} style={estilos.quitar}>
                        <Text style={estilos.quitarTexto}>Quitar</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
                <Text style={estilos.label}>Tipo de contenido</Text>
                <View style={estilos.filaOpciones}>
                  {TIPOS_CONTENIDO.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[estilos.chip, t === editTipoContenido && estilos.chipActivo]}
                      onPress={() => setEditTipoContenido(t)}
                    >
                      <Text style={[estilos.chipTexto, t === editTipoContenido && estilos.chipTextoActivo]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={estilos.label}>Nivel requerido</Text>
                <View style={estilos.filaOpciones}>
                  {NIVELES.map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={[estilos.chip, n === editNivelRequerido && estilos.chipActivo]}
                      onPress={() => setEditNivelRequerido(n)}
                    >
                      <Text style={[estilos.chipTexto, n === editNivelRequerido && estilos.chipTextoActivo]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={estilos.label}>Categoría</Text>
                <TextInput
                  style={estilos.input}
                  value={editCategoria}
                  onChangeText={setEditCategoria}
                  placeholder="Ej: behind the scenes"
                  placeholderTextColor="#666"
                />
                <Text style={estilos.label}>Etiquetas (separadas por coma)</Text>
                <TextInput
                  style={estilos.input}
                  value={editEtiquetasStr}
                  onChangeText={setEditEtiquetasStr}
                  placeholder="ej: sesion, inedito"
                  placeholderTextColor="#666"
                />
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
                  disabled={enviandoEdit}
                >
                  {enviandoEdit ? <ActivityIndicator color="#000" size="small" /> : <Text style={estilos.botonSubirTexto}>Guardar cambios</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#0d0d0d' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 16 : 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  botonAtras: { padding: 8, marginRight: 8 },
  botonAtrasTexto: { color: '#00dc57', fontSize: 14 },
  titulo: { fontSize: 18, color: '#fff', fontWeight: '600' },
  botonAbrirModal: {
    backgroundColor: '#00dc57',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  botonAbrirModalTexto: { color: '#000', fontWeight: '600', fontSize: 16 },
  scroll: { flex: 1 },
  scrollContenido: { padding: 16, paddingBottom: 40 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCaja: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    maxWidth: 500,
    width: '100%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
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
    borderColor: '#333',
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  uploadRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  botonUpload: {
    backgroundColor: '#333',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00dc57',
  },
  botonUploadTexto: { color: '#00dc57', fontSize: 14 },
  previewMini: { width: 56, height: 56, borderRadius: 8, overflow: 'hidden', backgroundColor: '#222' },
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
    borderColor: '#444',
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
    alignItems: 'center',
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
    overflow: 'hidden',
  },
  workspaceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  workspaceTitulo: { color: '#fff', fontSize: 16, fontWeight: '600', flex: 1 },
  botonEditar: { padding: 6 },
  workspaceBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badgeTipo: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#252525',
    borderWidth: 1,
    borderColor: '#00dc57',
  },
  badgeTipoTexto: { color: '#00dc57', fontSize: 11, textTransform: 'capitalize' },
  badgeDestacado: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255,193,7,0.2)',
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  badgeDestacadoTexto: { color: '#ffc107', fontSize: 11 },
  badgeOculto: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(244,67,54,0.2)',
    borderWidth: 1,
    borderColor: '#f44336',
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
    borderColor: '#252525',
  },
  workspaceThumb: { width: 80, height: 80, borderRadius: 8, overflow: 'hidden', backgroundColor: '#222' },
  workspaceThumbImg: { width: '100%', height: '100%' },
  workspaceThumbPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workspacePreviewTexto: { flex: 1, color: '#aaa', fontSize: 13, lineHeight: 20 },
  workspaceMetricas: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: '#151515',
    borderRadius: 8,
    marginBottom: 10,
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
    alignSelf: 'flex-start',
  },
  enlace: { color: '#00dc57', fontSize: 14 },
});
