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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { listarEventos, crearEvento } from '../servicios/api';
import { useAuth } from '../contexto/AuthContext';
import { esAdmin } from '../constantes/nivelesAcceso';

export default function AdminEventos({ navigation }) {
  const { perfil } = useAuth();
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [lugar, setLugar] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [guardando, setGuardando] = useState(false);

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
    setGuardando(true);
    try {
      await crearEvento({
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        lugar: lugar.trim(),
        fechaInicio: fechaInicio ? new Date(fechaInicio).toISOString() : new Date().toISOString(),
        esPublico: true,
        creadoPor: perfil?.id || '',
      });
      setTitulo('');
      setDescripcion('');
      setLugar('');
      setFechaInicio('');
      setMostrarForm(false);
      cargar();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGuardando(false);
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
            placeholder="Lugar"
            placeholderTextColor="#666"
            value={lugar}
            onChangeText={setLugar}
          />
          <TextInput
            style={estilos.input}
            placeholder="Fecha (ej. 2025-12-31)"
            placeholderTextColor="#666"
            value={fechaInicio}
            onChangeText={setFechaInicio}
          />
          <TouchableOpacity
            style={[estilos.botonGuardar, guardando && estilos.botonDeshabilitado]}
            onPress={guardarEvento}
            disabled={guardando}
          >
            <Text style={estilos.botonGuardarTexto}>
              {guardando ? 'Guardando…' : 'Guardar evento'}
            </Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      )}

      {cargando ? (
        <Text style={estilos.vacio}>Cargando…</Text>
      ) : (
        <ScrollView
          style={estilos.scroll}
          contentContainerStyle={estilos.scrollContenido}
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor="#c9a227" />
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
  botonAtrasTexto: { color: '#c9a227', fontSize: 14 },
  titulo: { fontSize: 20, color: '#fff', fontWeight: '600' },
  botonAgregar: {
    backgroundColor: '#c9a227',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  botonAgregarTexto: { color: '#000', fontWeight: '600', fontSize: 16 },
  formContenedor: { padding: 16, paddingTop: 12 },
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
