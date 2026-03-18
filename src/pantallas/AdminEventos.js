import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { listarEventos, crearEvento, placesAutocomplete, placeDetails } from '../servicios/api';
import { useAuth } from '../contexto/AuthContext';
import { esAdmin } from '../constantes/nivelesAcceso';

const NIVELES_EVENTO = [
  { id: 'libre', label: 'Libre' },
  { id: 'fan', label: 'Fan' },
  { id: 'thug', label: 'Thug' },
];

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
  const [lugar, setLugar] = useState(''); // texto libre (dirección / venue)
  const [fecha, setFecha] = useState(''); // YYYY-MM-DD
  const [hora, setHora] = useState(''); // HH:MM
  const [fechaDate, setFechaDate] = useState(null); // Date | null
  const [horaDate, setHoraDate] = useState(null); // Date | null
  const [mostrarPickerFecha, setMostrarPickerFecha] = useState(false);
  const [mostrarPickerHora, setMostrarPickerHora] = useState(false);
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const [buscandoLugar, setBuscandoLugar] = useState(false);
  const [sugerenciasLugar, setSugerenciasLugar] = useState([]);
  const [lugarSeleccionado, setLugarSeleccionado] = useState(null); // { placeId, description }
  const debounceRef = useRef(null);
  const [nivelRequerido, setNivelRequerido] = useState('libre');
  const [precio, setPrecio] = useState(''); // string para input; se convierte a number
  const [cupoMaximo, setCupoMaximo] = useState(''); // string -> number
  const [telefonoContacto, setTelefonoContacto] = useState('');
  const [visible, setVisible] = useState(true);
  const [guardando, setGuardando] = useState(false);

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
    input.type = tipo; // 'date' | 'time'
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
    // Preferir showPicker (Chrome) y fallback a click
    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
      } else {
        input.click();
      }
    } catch (_) {
      input.click();
    }
    // fallback cleanup por si cancelan
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

  const guardarEvento = async () => {
    if (!titulo.trim()) {
      Alert.alert('', 'Escribe un título.');
      return;
    }

    // Construir fechaInicio desde fecha+hora (si vienen); si no, usar now.
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
      await crearEvento({
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        lugar: lugar.trim(),
        fechaInicio: fechaInicioISO,
        // Campos extra (backend puede ignorar los que no use aún)
        nivelRequerido,
        latitud: lat,
        longitud: lng,
        precio: precioNum,
        cupoMaximo: cupoNum,
        telefonoContacto: telefonoContacto.trim(),
        visible,
        esPublico: true,
        creadoPor: perfil?.id || perfil?._id || '',
      });
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
    // reset sugerencias cuando se abre
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
        onPress={() => setMostrarForm(!mostrarForm)}
      >
        <Text style={estilos.botonAgregarTexto}>
          {mostrarForm ? 'Cancelar' : '+ Agregar evento'}
        </Text>
      </TouchableOpacity>

      {mostrarForm && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={estilos.formContenedor}
        >
          <ScrollView
            style={estilos.formScroll}
            contentContainerStyle={estilos.formScrollContenido}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={estilos.formLabel}>Datos básicos</Text>
            <TextInput
              style={estilos.input}
              placeholder="Título del evento"
              placeholderTextColor="#666"
              value={titulo}
              onChangeText={setTitulo}
            />
            <TextInput
              style={[estilos.input, estilos.inputArea]}
              placeholder="Descripción"
              placeholderTextColor="#666"
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
            />
            <TextInput
              style={estilos.input}
              placeholder="Lugar / Dirección"
              placeholderTextColor="#666"
              value={lugar}
              onChangeText={(t) => {
                setLugar(t);
                setLugarSeleccionado(null);
              }}
            />
            {(buscandoLugar || (Array.isArray(sugerenciasLugar) && sugerenciasLugar.length > 0)) ? (
              <View style={estilos.sugerenciasWrap}>
                {buscandoLugar ? (
                  <Text style={estilos.sugerenciaLoading}>Buscando…</Text>
                ) : null}
                {Array.isArray(sugerenciasLugar) && sugerenciasLugar.map((s) => (
                  <TouchableOpacity
                    key={s.placeId || s.description}
                    style={estilos.sugerenciaItem}
                    onPress={() => seleccionarLugar(s)}
                    activeOpacity={0.85}
                  >
                    <Text style={estilos.sugerenciaTexto}>{s.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <View style={estilos.fila2}>
              {esWeb ? (
                <>
                  <TouchableOpacity
                    style={[estilos.input, estilos.inputMitad, estilos.inputPicker]}
                    onPress={() => abrirPickerWeb('date')}
                    activeOpacity={0.85}
                  >
                    <Text style={estilos.inputPickerTexto}>
                      {fecha || 'Fecha (toca para elegir)'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[estilos.input, estilos.inputMitad, estilos.inputPicker]}
                    onPress={() => abrirPickerWeb('time')}
                    activeOpacity={0.85}
                  >
                    <Text style={estilos.inputPickerTexto}>
                      {hora || 'Hora (toca para elegir)'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={[estilos.input, estilos.inputMitad, estilos.inputPicker]}
                    onPress={() => setMostrarPickerFecha(true)}
                    activeOpacity={0.85}
                  >
                    <Text style={estilos.inputPickerTexto}>
                      {fecha || (fechaDate ? fmtFecha(fechaDate) : 'Fecha (toca para elegir)')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[estilos.input, estilos.inputMitad, estilos.inputPicker]}
                    onPress={() => setMostrarPickerHora(true)}
                    activeOpacity={0.85}
                  >
                    <Text style={estilos.inputPickerTexto}>
                      {hora || (horaDate ? fmtHora(horaDate) : 'Hora (toca para elegir)')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {!esWeb && mostrarPickerFecha ? (
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
                }}
              />
            ) : null}
            {!esWeb && mostrarPickerHora ? (
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
                }}
              />
            ) : null}
            {Platform.OS === 'ios' && (mostrarPickerFecha || mostrarPickerHora) ? (
              <TouchableOpacity
                style={estilos.botonPickerListo}
                onPress={() => { setMostrarPickerFecha(false); setMostrarPickerHora(false); }}
              >
                <Text style={estilos.botonPickerListoTexto}>Listo</Text>
              </TouchableOpacity>
            ) : null}

            <Text style={estilos.formLabel}>Ubicación (opcional)</Text>
            <View style={estilos.fila2}>
              <TextInput
                style={[estilos.input, estilos.inputMitad]}
                placeholder="Latitud"
                placeholderTextColor="#666"
                value={latitud}
                onChangeText={setLatitud}
                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
              />
              <TextInput
                style={[estilos.input, estilos.inputMitad]}
                placeholder="Longitud"
                placeholderTextColor="#666"
                value={longitud}
                onChangeText={setLongitud}
                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
              />
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
                    activeOpacity={0.85}
                  >
                    <Text style={[estilos.segmentedTexto, activo && estilos.segmentedTextoActivo]}>
                      {n.label}
                    </Text>
                  </TouchableOpacity>
                );
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
                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
              />
              <TextInput
                style={[estilos.input, estilos.inputMitad]}
                placeholder="Cupo máximo (ej. 200)"
                placeholderTextColor="#666"
                value={cupoMaximo}
                onChangeText={setCupoMaximo}
                keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
              />
            </View>
            <TextInput
              style={estilos.input}
              placeholder="Teléfono de contacto (opcional)"
              placeholderTextColor="#666"
              value={telefonoContacto}
              onChangeText={setTelefonoContacto}
              keyboardType={Platform.OS === 'ios' ? 'phone-pad' : 'tel'}
            />

            <TouchableOpacity
              style={[estilos.toggleFila, !visible && estilos.toggleFilaOff]}
              onPress={() => setVisible((v) => !v)}
              activeOpacity={0.85}
            >
              <Text style={estilos.toggleLabel}>Visible</Text>
              <Text style={estilos.toggleValor}>{visible ? 'Sí' : 'No'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[estilos.botonGuardar, guardando && estilos.botonDeshabilitado]}
              onPress={guardarEvento}
              disabled={guardando}
            >
              <Text style={estilos.botonGuardarTexto}>
                {guardando ? 'Guardando…' : 'Guardar evento'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {cargando ? (
        <Text style={estilos.vacio}>Cargando…</Text>
      ) : (
        <ScrollView
          style={estilos.scroll}
          contentContainerStyle={estilos.scrollContenido}
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor="#00dc57" />
          }
        >
          {eventos.length === 0 && !mostrarForm && (
            <Text style={estilos.vacio}>No hay eventos. Agrega uno con el botón de arriba.</Text>
          )}
          {eventos.map((ev) => (
            <View key={ev.id} style={estilos.card}>
              <Text style={estilos.cardTitulo}>{ev.titulo || '(sin título)'}</Text>
              <Text style={estilos.cardTexto}>{ev.descripcion || ''}</Text>
              <Text style={estilos.cardMeta}>
                {ev.fechaInicio ? new Date(ev.fechaInicio).toLocaleDateString() : ''} — {ev.lugar || ''}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
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
    borderBottomColor: '#2a2a2a',
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
    alignItems: 'center',
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
    borderColor: '#333',
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
    marginBottom: 8,
  },
  botonPickerListoTexto: { color: '#000', fontWeight: '800' },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
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
    marginBottom: 8,
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
    overflow: 'hidden',
  },
  sugerenciaLoading: { color: '#888', fontSize: 13, paddingHorizontal: 12, paddingVertical: 10 },
  sugerenciaItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  sugerenciaTexto: { color: '#fff', fontSize: 14 },
  botonGuardar: {
    backgroundColor: '#22c55e',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
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
    marginBottom: 12,
  },
  cardTitulo: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  cardTexto: { color: '#aaa', fontSize: 14, marginBottom: 4 },
  cardMeta: { color: '#666', fontSize: 12 },
});
