import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform } from
'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { listarEventos, crearEvento, actualizarEvento, eliminarEvento, placesAutocomplete, placeDetails } from '../servicios/api';
import { useAuth } from '../contexto/AuthContext';
import { esAdmin } from '../constantes/nivelesAcceso';

const NIVELES_EVENTO = [
{ id: 'libre', label: 'Libre' },
{ id: 'fan', label: 'Fan' },
{ id: 'thug', label: 'Thug' }];


function parseNumeroFlexible(v) {
  const s = String(v ?? '').trim().replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export default function AdminEventos({ navigation }) {
  const { perfil } = useAuth();
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [lugar, setLugar] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [fechaDate, setFechaDate] = useState(null);
  const [horaDate, setHoraDate] = useState(null);
  const [mostrarPickerFecha, setMostrarPickerFecha] = useState(false);
  const [mostrarPickerHora, setMostrarPickerHora] = useState(false);
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const [buscandoLugar, setBuscandoLugar] = useState(false);
  const [sugerenciasLugar, setSugerenciasLugar] = useState([]);
  const [lugarSeleccionado, setLugarSeleccionado] = useState(null);
  const debounceRef = useRef(null);
  const [nivelRequerido, setNivelRequerido] = useState('libre');
  const [precio, setPrecio] = useState('');
  const [cupoMaximo, setCupoMaximo] = useState('');
  const [telefonoContacto, setTelefonoContacto] = useState('');
  const [visible, setVisible] = useState(true);
  const [imagenBase64, setImagenBase64] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [eventoEditandoId, setEventoEditandoId] = useState(null);

  const esWeb = Platform.OS === 'web';

  const fmtFecha = (d) => {
    if (!(d instanceof Date)) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const fmtHora = (d) => {
    if (!(d instanceof Date)) return '';
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const abrirPickerWeb = (tipo) => {
    if (!esWeb) return;
    if (typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = tipo;
    input.style.position = 'fixed';
    input.style.left = '-1000px';
    input.style.top = '-1000px';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    if (tipo === 'date' && fecha) input.value = fecha;
    if (tipo === 'time' && hora) input.value = hora;

    const cleanup = () => {
      input.removeEventListener('change', onChange);
      if (input.parentNode) input.parentNode.removeChild(input);
    };

    const onChange = () => {
      const v = input.value || '';
      if (tipo === 'date') setFecha(v);
      if (tipo === 'time') setHora(v);
      cleanup();
    };

    input.addEventListener('change', onChange);
    document.body.appendChild(input);

    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
      } else {
        input.click();
      }
    } catch (_) {
      input.click();
    }

    setTimeout(cleanup, 15000);
  };

  useEffect(() => {
    if (perfil && !esAdmin(perfil)) {
      navigation.replace('ContenidoGeneral');
    }
  }, [perfil, navigation]);

  const cargar = async () => {
    try {
      const lista = await listarEventos();
      setEventos(Array.isArray(lista) ? lista : []);
    } catch (e) {
      setEventos([]);
    } finally {
      setCargando(false);
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

  const resetForm = () => {
    setTitulo('');
    setDescripcion('');
    setLugar('');
    setSugerenciasLugar([]);
    setLugarSeleccionado(null);
    setFecha('');
    setHora('');
    setFechaDate(null);
    setHoraDate(null);
    setMostrarPickerFecha(false);
    setMostrarPickerHora(false);
    setLatitud('');
    setLongitud('');
    setNivelRequerido('libre');
    setPrecio('');
    setCupoMaximo('');
    setTelefonoContacto('');
    setVisible(true);
    setImagenBase64('');
    setEventoEditandoId(null);
  };

  const editarEvento = (ev) => {
    const id = ev?.id || ev?._id;
    if (!id) return;
    const fechaEv = ev?.fechaInicio ? new Date(ev.fechaInicio) : null;
    setEventoEditandoId(String(id));
    setTitulo(ev?.titulo || '');
    setDescripcion(ev?.descripcion || '');
    setLugar(ev?.lugar || '');
    setFecha(fechaEv instanceof Date && !Number.isNaN(fechaEv.getTime()) ? fmtFecha(fechaEv) : '');
    setHora(fechaEv instanceof Date && !Number.isNaN(fechaEv.getTime()) ? fmtHora(fechaEv) : '');
    setFechaDate(fechaEv instanceof Date && !Number.isNaN(fechaEv.getTime()) ? fechaEv : null);
    setHoraDate(fechaEv instanceof Date && !Number.isNaN(fechaEv.getTime()) ? fechaEv : null);
    setLatitud(
      ev?.latitud != null ?
      String(ev.latitud) :
      ev?.coordenadas?.lat != null ?
      String(ev.coordenadas.lat) :
      ''
    );
    setLongitud(
      ev?.longitud != null ?
      String(ev.longitud) :
      ev?.coordenadas?.lng != null ?
      String(ev.coordenadas.lng) :
      ''
    );
    setNivelRequerido(ev?.nivelRequerido || 'libre');
    setPrecio(ev?.precio != null ? String(ev.precio) : '');
    setCupoMaximo(ev?.cupoMaximo != null ? String(ev.cupoMaximo) : ev?.capacidad != null ? String(ev.capacidad) : '');
    setTelefonoContacto(ev?.telefonoContacto || ev?.telefono || '');
    setVisible(ev?.visible !== false);
    setImagenBase64('');
    setMostrarForm(true);
  };

  const eliminarEventoCard = (ev) => {
    const id = String(ev?.id || ev?._id || '');
    if (!id) return;
    const nombre = ev?.titulo || 'este evento';
    const ejecutarEliminacion = async () => {
      try {
        await eliminarEvento(id);
        if (eventoEditandoId === id) {
          resetForm();
          setMostrarForm(false);
        }
        await cargar();
      } catch (e) {
        Alert.alert('Error', e?.message || 'No se pudo eliminar el evento.');
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
      const ok = window.confirm(`¿Seguro que quieres eliminar "${nombre}"?`);
      if (ok) ejecutarEliminacion();
      return;
    }

    Alert.alert(
      'Eliminar evento',
      `¿Seguro que quieres eliminar "${nombre}"?`,
      [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: ejecutarEliminacion
      }]

    );
  };

  const guardarEvento = async () => {
    if (!titulo.trim()) {
      Alert.alert('', 'Escribe un título.');
      return;
    }


    let fechaInicioISO = new Date().toISOString();
    const f = String(fecha || '').trim();
    const h = String(hora || '').trim();
    if (f) {
      const hhmm = h && /^\d{2}:\d{2}$/.test(h) ? h : '00:00';
      const dt = new Date(`${f}T${hhmm}:00`);
      if (Number.isNaN(dt.getTime())) {
        Alert.alert('Fecha inválida', 'Usa formato YYYY-MM-DD y hora HH:MM (ej. 2026-12-31 y 19:30).');
        return;
      }
      fechaInicioISO = dt.toISOString();
    }

    const lat = parseNumeroFlexible(latitud);
    const lng = parseNumeroFlexible(longitud);
    if ((latitud || longitud) && (lat == null || lng == null)) {
      Alert.alert('Coordenadas inválidas', 'Latitud/Longitud deben ser números (ej. 28.6353 y -106.0889).');
      return;
    }
    if (lat != null && (lat < -90 || lat > 90)) {
      Alert.alert('Latitud inválida', 'La latitud debe estar entre -90 y 90.');
      return;
    }
    if (lng != null && (lng < -180 || lng > 180)) {
      Alert.alert('Longitud inválida', 'La longitud debe estar entre -180 y 180.');
      return;
    }

    const precioNum = parseNumeroFlexible(precio);
    if (precio && precioNum == null) {
      Alert.alert('Precio inválido', 'El precio debe ser un número (ej. 150 o 150.50).');
      return;
    }
    const cupoNum = parseNumeroFlexible(cupoMaximo);
    if (cupoMaximo && (cupoNum == null || cupoNum < 0)) {
      Alert.alert('Cupo inválido', 'El cupo máximo debe ser un número mayor o igual a 0.');
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        lugar: lugar.trim(),
        fechaInicio: fechaInicioISO,

        nivelRequerido,
        latitud: lat,
        longitud: lng,
        precio: precioNum,
        capacidad: cupoNum,
        cupoMaximo: cupoNum,
        telefonoContacto: telefonoContacto.trim(),
        telefono: telefonoContacto.trim(),
        visible,
        imagenBase64: imagenBase64 || undefined,
        esPublico: true,
        creadoPor: perfil?.id || perfil?._id || ''
      };

      if (eventoEditandoId) {
        await actualizarEvento(eventoEditandoId, payload);
      } else {
        await crearEvento(payload);
      }
      resetForm();
      setMostrarForm(false);
      cargar();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGuardando(false);
    }
  };

  useEffect(() => {
    if (!mostrarForm) return;

    setSugerenciasLugar([]);
    setLugarSeleccionado(null);
  }, [mostrarForm]);

  useEffect(() => {
    if (!mostrarForm) return;
    if (!lugar) {
      setSugerenciasLugar([]);
      setLugarSeleccionado(null);
      return;
    }
    if (lugarSeleccionado && lugarSeleccionado.description === lugar) {
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setBuscandoLugar(true);
        const res = await placesAutocomplete(lugar);
        const preds = Array.isArray(res?.predictions) ? res.predictions : [];
        setSugerenciasLugar(preds.slice(0, 6));
      } catch (_) {
        setSugerenciasLugar([]);
      } finally {
        setBuscandoLugar(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [lugar, mostrarForm, lugarSeleccionado]);

  const seleccionarLugar = async (sug) => {
    try {
      if (!sug?.placeId) return;
      setLugarSeleccionado(sug);
      setSugerenciasLugar([]);
      setBuscandoLugar(true);

      const det = await placeDetails(sug.placeId);
      const direccion = det?.direccion || sug.description || '';
      const lat = det?.latitud;
      const lng = det?.longitud;
      setLugar(direccion);
      if (typeof lat === 'number') setLatitud(String(lat));
      if (typeof lng === 'number') setLongitud(String(lng));
    } catch (e) {
      Alert.alert('Ubicación', e?.message || 'No se pudo obtener la ubicación.');
    } finally {
      setBuscandoLugar(false);
    }
  };

  const elegirImagen = async () => {
    try {

      if (Platform.OS === 'web') {
        if (typeof document === 'undefined') return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = false;
        input.style.position = 'fixed';
        input.style.left = '-1000px';
        input.style.top = '-1000px';
        input.style.opacity = '0';

        const cleanup = () => {
          input.removeEventListener('change', onChange);
          if (input.parentNode) input.parentNode.removeChild(input);
        };

        const onChange = () => {
          const file = input.files && input.files[0];
          if (!file) return cleanup();
          const reader = new FileReader();
          reader.onerror = () => {
            cleanup();
            Alert.alert('Imagen', 'No se pudo leer la imagen.');
          };
          reader.onload = () => {
            const out = String(reader.result || '');
            if (!out.startsWith('data:')) {
              cleanup();
              Alert.alert('Imagen', 'No se pudo leer la imagen.');
              return;
            }
            setImagenBase64(out);
            cleanup();
          };
          reader.readAsDataURL(file);
        };

        input.addEventListener('change', onChange);
        document.body.appendChild(input);
        input.click();
        setTimeout(cleanup, 60000);
        return;
      }

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permiso', 'Activa el acceso a tus fotos para subir una imagen.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true
      });
      if (res.canceled) return;
      const asset = res.assets && res.assets[0];
      const mime = asset?.mimeType || 'image/jpeg';
      let b64 = asset?.base64;


      if (!b64 && Platform.OS === 'web' && asset?.uri) {
        try {
          const resp = await fetch(asset.uri);
          const blob = await resp.blob();
          b64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
            reader.onload = () => {
              const out = String(reader.result || '');

              const m = out.match(/^data:[^;]+;base64,(.+)$/);
              resolve(m ? m[1] : '');
            };
            reader.readAsDataURL(blob);
          });
        } catch (_) {

        }
      }

      if (!b64 && asset?.uri && Platform.OS !== 'web') {
        try {
          b64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64
          });
        } catch (_) {

        }
      }

      if (!b64) {
        Alert.alert('Imagen', 'No se pudo leer la imagen.');
        return;
      }

      setImagenBase64(`data:${mime};base64,${b64}`);
    } catch (e) {
      Alert.alert('Imagen', e?.message || 'No se pudo seleccionar la imagen.');
    }
  };

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={estilos.botonAtras}>
          <Text style={estilos.botonAtrasTexto}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={estilos.titulo}>Eventos</Text>
      </View>

      <TouchableOpacity
        style={estilos.botonAgregar}
        onPress={() => {
          if (mostrarForm) resetForm();
          setMostrarForm(!mostrarForm);
        }}>
        
        <Text style={estilos.botonAgregarTexto}>
          {mostrarForm ? 'Cancelar' : '+ Agregar evento'}
        </Text>
      </TouchableOpacity>

      {mostrarForm &&
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={estilos.formContenedor}>
        
          <ScrollView
          style={estilos.formScroll}
          contentContainerStyle={estilos.formScrollContenido}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          
            <Text style={estilos.formLabel}>Datos básicos</Text>
            <TextInput
            style={estilos.input}
            placeholder="Título del evento"
            placeholderTextColor="#666"
            value={titulo}
            onChangeText={setTitulo} />
          
            <TextInput
            style={[estilos.input, estilos.inputArea]}
            placeholder="Descripción"
            placeholderTextColor="#666"
            value={descripcion}
            onChangeText={setDescripcion}
            multiline />
          
            <TextInput
            style={estilos.input}
            placeholder="Lugar / Dirección"
            placeholderTextColor="#666"
            value={lugar}
            onChangeText={(t) => {
              setLugar(t);
              setLugarSeleccionado(null);
            }} />
          
            {buscandoLugar || Array.isArray(sugerenciasLugar) && sugerenciasLugar.length > 0 ?
          <View style={estilos.sugerenciasWrap}>
                {buscandoLugar ?
            <Text style={estilos.sugerenciaLoading}>Buscando…</Text> :
            null}
                {Array.isArray(sugerenciasLugar) && sugerenciasLugar.map((s) =>
            <TouchableOpacity
              key={s.placeId || s.description}
              style={estilos.sugerenciaItem}
              onPress={() => seleccionarLugar(s)}
              activeOpacity={0.85}>
              
                    <Text style={estilos.sugerenciaTexto}>{s.description}</Text>
                  </TouchableOpacity>
            )}
              </View> :
          null}

            <Text style={estilos.formLabel}>Imagen promocional (opcional)</Text>
            {imagenBase64 ?
          <View style={estilos.imagenRow}>
                <Image source={{ uri: imagenBase64 }} style={estilos.imagenPreview} />
                <View style={estilos.imagenBtns}>
                  <TouchableOpacity style={estilos.imagenBtn} onPress={elegirImagen}>
                    <Text style={estilos.imagenBtnTexto}>Cambiar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[estilos.imagenBtn, estilos.imagenBtnPeligro]} onPress={() => setImagenBase64('')}>
                    <Text style={[estilos.imagenBtnTexto, estilos.imagenBtnTextoPeligro]}>Quitar</Text>
                  </TouchableOpacity>
                </View>
              </View> :

          <TouchableOpacity style={estilos.botonSubirImagen} onPress={elegirImagen} activeOpacity={0.85}>
                <Text style={estilos.botonSubirImagenTexto}>+ Subir imagen</Text>
              </TouchableOpacity>
          }

            <Text style={estilos.formLabel}>Fecha y hora</Text>
            <View style={estilos.fila2}>
              {esWeb ?
            <>
                  <TouchableOpacity
                style={[estilos.input, estilos.inputMitad, estilos.inputPicker]}
                onPress={() => abrirPickerWeb('date')}
                activeOpacity={0.85}>
                
                    <Text style={estilos.inputPickerTexto}>
                      {fecha || 'Fecha (toca para elegir)'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                style={[estilos.input, estilos.inputMitad, estilos.inputPicker]}
                onPress={() => abrirPickerWeb('time')}
                activeOpacity={0.85}>
                
                    <Text style={estilos.inputPickerTexto}>
                      {hora || 'Hora (toca para elegir)'}
                    </Text>
                  </TouchableOpacity>
                </> :

            <>
                  <TouchableOpacity
                style={[estilos.input, estilos.inputMitad, estilos.inputPicker]}
                onPress={() => setMostrarPickerFecha(true)}
                activeOpacity={0.85}>
                
                    <Text style={estilos.inputPickerTexto}>
                      {fecha || (fechaDate ? fmtFecha(fechaDate) : 'Fecha (toca para elegir)')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                style={[estilos.input, estilos.inputMitad, estilos.inputPicker]}
                onPress={() => setMostrarPickerHora(true)}
                activeOpacity={0.85}>
                
                    <Text style={estilos.inputPickerTexto}>
                      {hora || (horaDate ? fmtHora(horaDate) : 'Hora (toca para elegir)')}
                    </Text>
                  </TouchableOpacity>
                </>
            }
            </View>

            {!esWeb && mostrarPickerFecha ?
          <DateTimePicker
            value={fechaDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              if (Platform.OS !== 'ios') setMostrarPickerFecha(false);
              if (event?.type === 'dismissed') return;
              const d = selectedDate || fechaDate || new Date();
              setFechaDate(d);
              setFecha(fmtFecha(d));
            }} /> :

          null}
            {!esWeb && mostrarPickerHora ?
          <DateTimePicker
            value={horaDate || new Date()}
            mode="time"
            is24Hour
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              if (Platform.OS !== 'ios') setMostrarPickerHora(false);
              if (event?.type === 'dismissed') return;
              const d = selectedDate || horaDate || new Date();
              setHoraDate(d);
              setHora(fmtHora(d));
            }} /> :

          null}
            {Platform.OS === 'ios' && (mostrarPickerFecha || mostrarPickerHora) ?
          <TouchableOpacity
            style={estilos.botonPickerListo}
            onPress={() => {setMostrarPickerFecha(false);setMostrarPickerHora(false);}}>
            
                <Text style={estilos.botonPickerListoTexto}>Listo</Text>
              </TouchableOpacity> :
          null}

            <Text style={estilos.formLabel}>Ubicación (opcional)</Text>
            <View style={estilos.fila2}>
              <TextInput
              style={[estilos.input, estilos.inputMitad]}
              placeholder="Latitud"
              placeholderTextColor="#666"
              value={latitud}
              onChangeText={setLatitud}
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'} />
            
              <TextInput
              style={[estilos.input, estilos.inputMitad]}
              placeholder="Longitud"
              placeholderTextColor="#666"
              value={longitud}
              onChangeText={setLongitud}
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'} />
            
            </View>

            <Text style={estilos.formLabel}>Acceso</Text>
            <View style={estilos.segmented}>
              {NIVELES_EVENTO.map((n) => {
              const activo = nivelRequerido === n.id;
              return (
                <TouchableOpacity
                  key={n.id}
                  style={[estilos.segmentedItem, activo && estilos.segmentedItemActivo]}
                  onPress={() => setNivelRequerido(n.id)}
                  activeOpacity={0.85}>
                  
                    <Text style={[estilos.segmentedTexto, activo && estilos.segmentedTextoActivo]}>
                      {n.label}
                    </Text>
                  </TouchableOpacity>);

            })}
            </View>

            <Text style={estilos.formLabel}>Detalles</Text>
            <View style={estilos.fila2}>
              <TextInput
              style={[estilos.input, estilos.inputMitad]}
              placeholder="Precio (ej. 150)"
              placeholderTextColor="#666"
              value={precio}
              onChangeText={setPrecio}
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'} />
            
              <TextInput
              style={[estilos.input, estilos.inputMitad]}
              placeholder="Cupo máximo (ej. 200)"
              placeholderTextColor="#666"
              value={cupoMaximo}
              onChangeText={setCupoMaximo}
              keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'} />
            
            </View>
            <TextInput
            style={estilos.input}
            placeholder="Teléfono de contacto (opcional)"
            placeholderTextColor="#666"
            value={telefonoContacto}
            onChangeText={setTelefonoContacto}
            keyboardType={Platform.OS === 'ios' ? 'phone-pad' : 'tel'} />
          

            <TouchableOpacity
            style={[estilos.toggleFila, !visible && estilos.toggleFilaOff]}
            onPress={() => setVisible((v) => !v)}
            activeOpacity={0.85}>
            
              <Text style={estilos.toggleLabel}>Visible</Text>
              <Text style={estilos.toggleValor}>{visible ? 'Sí' : 'No'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
            style={[estilos.botonGuardar, guardando && estilos.botonDeshabilitado]}
            onPress={guardarEvento}
            disabled={guardando}>
            
              <Text style={estilos.botonGuardarTexto}>
                {guardando ? 'Guardando…' : eventoEditandoId ? 'Actualizar evento' : 'Guardar evento'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      }

      {cargando ?
      <Text style={estilos.vacio}>Cargando…</Text> :

      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={estilos.scrollContenido}
        refreshControl={
        <RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor="#00dc57" />
        }>
        
          {eventos.length === 0 && !mostrarForm &&
        <Text style={estilos.vacio}>No hay eventos. Agrega uno con el botón de arriba.</Text>
        }
          {eventos.map((ev) =>
        <View key={ev.id} style={estilos.card}>
              <Text style={estilos.cardTitulo}>{ev.titulo || '(sin título)'}</Text>
              <Text style={estilos.cardTexto}>{ev.descripcion || ''}</Text>
              <Text style={estilos.cardMeta}>
                {ev.fechaInicio ? new Date(ev.fechaInicio).toLocaleDateString() : ''} — {ev.lugar || ''}
              </Text>
              <View style={estilos.cardAcciones}>
                <TouchableOpacity
              style={estilos.cardBotonEliminar}
              onPress={() => eliminarEventoCard(ev)}
              activeOpacity={0.85}>
              
                  <Text style={estilos.cardBotonEliminarTexto}>Eliminar</Text>
                </TouchableOpacity>
                <TouchableOpacity
              style={estilos.cardBotonEditar}
              onPress={() => editarEvento(ev)}
              activeOpacity={0.85}>
              
                  <Text style={estilos.cardBotonEditarTexto}>Editar</Text>
                </TouchableOpacity>
              </View>
            </View>
        )}
        </ScrollView>
      }
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
  botonAgregar: {
    backgroundColor: '#00dc57',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center'
  },
  botonAgregarTexto: { color: '#000', fontWeight: '600', fontSize: 16 },
  formContenedor: { padding: 16, paddingTop: 12 },
  formScroll: { maxHeight: 520 },
  formScrollContenido: { paddingBottom: 24 },
  formLabel: { color: '#cfcfcf', fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 6 },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333'
  },
  inputArea: { minHeight: 60, textAlignVertical: 'top' },
  fila2: { flexDirection: 'row', gap: 10 },
  inputMitad: { flex: 1 },
  inputPicker: { justifyContent: 'center' },
  inputPickerTexto: { color: '#fff', fontSize: 16 },
  botonPickerListo: {
    alignSelf: 'flex-end',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#00dc57',
    marginBottom: 8
  },
  botonPickerListoTexto: { color: '#000', fontWeight: '800' },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10
  },
  segmentedItem: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#141414' },
  segmentedItemActivo: { backgroundColor: '#00dc57' },
  segmentedTexto: { color: '#cfcfcf', fontSize: 13, fontWeight: '700' },
  segmentedTextoActivo: { color: '#000' },
  toggleFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: 'rgba(0,220,87,0.10)',
    marginBottom: 8
  },
  toggleFilaOff: { backgroundColor: 'rgba(255,255,255,0.03)' },
  toggleLabel: { color: '#fff', fontSize: 15, fontWeight: '700' },
  toggleValor: { color: '#00dc57', fontSize: 14, fontWeight: '700' },
  sugerenciasWrap: {
    marginTop: -2,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    backgroundColor: '#121212',
    overflow: 'hidden'
  },
  sugerenciaLoading: { color: '#888', fontSize: 13, paddingHorizontal: 12, paddingVertical: 10 },
  sugerenciaItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)'
  },
  sugerenciaTexto: { color: '#fff', fontSize: 14 },
  botonSubirImagen: {
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 10
  },
  botonSubirImagenTexto: { color: '#00dc57', fontWeight: '800' },
  imagenRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 10
  },
  imagenPreview: {
    width: 84,
    height: 84,
    borderRadius: 12,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)'
  },
  imagenBtns: { flex: 1, gap: 10 },
  imagenBtn: {
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#141414',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  imagenBtnPeligro: { backgroundColor: 'rgba(255,0,0,0.08)', borderColor: 'rgba(255,0,0,0.25)' },
  imagenBtnTexto: { color: '#fff', fontWeight: '800' },
  imagenBtnTextoPeligro: { color: '#ff8a8a' },
  botonGuardar: {
    backgroundColor: '#22c55e',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8
  },
  botonDeshabilitado: { opacity: 0.7 },
  botonGuardarTexto: { color: '#fff', fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContenido: { padding: 16, paddingBottom: 40 },
  vacio: { color: '#666', fontSize: 14, marginTop: 16 },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12
  },
  cardTitulo: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  cardTexto: { color: '#aaa', fontSize: 14, marginBottom: 4 },
  cardMeta: { color: '#666', fontSize: 12 },
  cardAcciones: { marginTop: 10, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  cardBotonEliminar: {
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.45)',
    backgroundColor: 'rgba(239,68,68,0.14)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  cardBotonEliminarTexto: { color: '#fca5a5', fontWeight: '700', fontSize: 13 },
  cardBotonEditar: {
    borderWidth: 1,
    borderColor: 'rgba(0,220,87,0.35)',
    backgroundColor: 'rgba(0,220,87,0.10)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  cardBotonEditarTexto: { color: '#00dc57', fontWeight: '700', fontSize: 13 }
});