import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useAuth } from '../contexto/AuthContext';
import { listarUsuarios, actualizarUsuario, eliminarUsuario } from '../servicios/api';

export default function AdminUsuarios({ navigation }) {
  const { perfil } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const lista = await listarUsuarios();
      setUsuarios(Array.isArray(lista) ? lista : []);
    } catch (e) {
      setError(e.message || 'Error al cargar');
      setUsuarios([]);
      Alert.alert('Error', e.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return usuarios;
    const q = busqueda.trim().toLowerCase();
    return usuarios.filter(
      (u) =>
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.nombreCompleto && u.nombreCompleto.toLowerCase().includes(q))
    );
  }, [usuarios, busqueda]);

  const togglePremium = async (user) => {
    const esThug = user.nivelAcceso === 'thug';
    try {
      await actualizarUsuario(user.id, {
        nivelAcceso: esThug ? 'registrado' : 'thug',
      });
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, nivelAcceso: esThug ? 'registrado' : 'thug' }
            : u
        )
      );
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const hacerAdmin = async (user) => {
    if (user.rol === 'admin') return;
    Alert.alert(
      'Hacer admin',
      `¿Dar rol admin a ${user.email || user.nombreCompleto || user.id}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí',
          onPress: async () => {
            try {
              await actualizarUsuario(user.id, { rol: 'admin' });
              setUsuarios((prev) =>
                prev.map((u) => (u.id === user.id ? { ...u, rol: 'admin' } : u))
              );
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const borrar = async (user) => {
    Alert.alert(
      'Eliminar usuario',
      `¿Eliminar a ${user.email || user.nombreCompleto || user.id}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarUsuario(user.id);
              setUsuarios((prev) => prev.filter((u) => u.id !== user.id));
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const editar = (user) => {
    Alert.alert(
      'Editar',
      'Por ahora edita desde la base de datos (Compass). Próximamente: formulario aquí.',
      [{ text: 'Entendido' }]
    );
  };

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.header}>
        <TouchableOpacity style={estilos.botonAtras} onPress={() => navigation.goBack()}>
          <Text style={estilos.botonAtrasTexto}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={estilos.titulo}>Usuarios</Text>
      </View>

      <View style={estilos.buscadorContenedor}>
        <TextInput
          style={estilos.buscador}
          placeholder="Buscar por email o nombre..."
          placeholderTextColor="#666"
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {cargando ? (
        <View style={estilos.centrado}>
          <ActivityIndicator size="large" color="#c9a227" />
        </View>
      ) : error ? (
        <View style={estilos.centrado}>
          <Text style={estilos.errorTexto}>{error}</Text>
          <Text style={estilos.errorHint}>
            ¿Entraste con un usuario admin? El servidor debe tener la ruta GET /usuarios.
          </Text>
          <TouchableOpacity style={estilos.botonReintentar} onPress={cargar}>
            <Text style={estilos.botonReintentarTexto}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={estilos.scroll}
          contentContainerStyle={estilos.scrollContenido}
          keyboardShouldPersistTaps="handled"
        >
          {filtrados.length === 0 && (
            <Text style={estilos.vacio}>
              {busqueda.trim() ? 'No hay coincidencias.' : 'No hay usuarios.'}
            </Text>
          )}
          {filtrados.map((u) => (
            <View key={u.id} style={estilos.card}>
              <View style={estilos.cardHeader}>
                <Text style={estilos.cardEmail}>{u.email || '(sin email)'}</Text>
                {(u.rol === 'admin' || u.nivelAcceso === 'thug') && (
                  <View style={estilos.badges}>
                    {u.rol === 'admin' && (
                      <Text style={estilos.badgeAdmin}>Admin</Text>
                    )}
                    {u.nivelAcceso === 'thug' && (
                      <Text style={estilos.badgePremium}>Premium (Thug)</Text>
                    )}
                  </View>
                )}
              </View>
              <Text style={estilos.cardNombre}>
                {u.nombreCompleto || '(sin nombre)'}
              </Text>
              <Text style={estilos.cardMeta}>
                {u.nivelAcceso || 'registrado'} · {u.proveedor || u.provider || 'email'}
              </Text>

              <View style={estilos.acciones}>
                <View style={estilos.filaPremium}>
                  <Text style={estilos.labelPremium}>Premium (Thug)</Text>
                  <Switch
                    value={u.nivelAcceso === 'thug'}
                    onValueChange={() => togglePremium(u)}
                    trackColor={{ false: '#333', true: '#c9a227' }}
                    thumbColor="#fff"
                  />
                </View>
                <TouchableOpacity
                  style={estilos.botonAccion}
                  onPress={() => editar(u)}
                >
                  <Text style={estilos.botonAccionTexto}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[estilos.botonAccion, u.rol === 'admin' && estilos.botonDeshabilitado]}
                  onPress={() => hacerAdmin(u)}
                  disabled={u.rol === 'admin'}
                >
                  <Text style={estilos.botonAccionTexto}>
                    {u.rol === 'admin' ? 'Admin' : 'Hacer admin'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[estilos.botonAccion, estilos.botonEliminar, u.id === perfil?.id && estilos.botonDeshabilitado]}
                  onPress={() => borrar(u)}
                  disabled={u.id === perfil?.id}
                >
                  <Text style={estilos.botonEliminarTexto}>
                    {u.id === perfil?.id ? 'Tú' : 'Borrar'}
                  </Text>
                </TouchableOpacity>
              </View>
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
  buscadorContenedor: { paddingHorizontal: 16, paddingVertical: 12 },
  buscador: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContenido: { padding: 16, paddingBottom: 40 },
  vacio: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 24 },
  errorTexto: { color: '#ef4444', fontSize: 16, textAlign: 'center', marginBottom: 8 },
  errorHint: { color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 16, paddingHorizontal: 24 },
  botonReintentar: {
    backgroundColor: '#c9a227',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  botonReintentarTexto: { color: '#000', fontWeight: '600' },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' },
  cardEmail: { color: '#fff', fontSize: 16, fontWeight: '600', flex: 1 },
  badges: { flexDirection: 'row', gap: 6 },
  badgeAdmin: { backgroundColor: '#c9a227', color: '#000', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: 12, fontWeight: '600' },
  badgePremium: { backgroundColor: '#22c55e', color: '#fff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: 12, fontWeight: '600' },
  cardNombre: { color: '#aaa', fontSize: 14, marginTop: 4 },
  cardMeta: { color: '#666', fontSize: 12, marginTop: 2 },
  acciones: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filaPremium: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  labelPremium: { color: '#888', fontSize: 12, marginRight: 6 },
  botonAccion: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  botonDeshabilitado: { opacity: 0.6 },
  botonAccionTexto: { color: '#c9a227', fontSize: 13 },
  botonEliminar: { backgroundColor: '#3a1a1a' },
  botonEliminarTexto: { color: '#ef4444', fontSize: 13 },
});
