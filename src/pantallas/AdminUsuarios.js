import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
  Modal,
  KeyboardAvoidingView,
  useWindowDimensions } from
'react-native';
import { useAuth } from '../contexto/AuthContext';
import { listarUsuarios, actualizarUsuario, eliminarUsuario } from '../servicios/api';

function getId(u) {
  const raw = u?.id ?? u?._id;
  if (raw == null) return '';
  return typeof raw === 'string' ? raw : raw?.toString?.() ?? String(raw);
}

const isWeb = Platform.OS === 'web';

function BotonWeb({ label, disabled, onAction, danger }) {
  const handleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && onAction) onAction();
  }, [disabled, onAction]);

  if (!isWeb) return null;

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={(e) => {if ((e.key === 'Enter' || e.key === ' ') && !disabled) {e.preventDefault();onAction?.();}}}
      style={{
        padding: '6px 12px',
        borderRadius: 6,
        minHeight: 30,
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: 13,
        fontWeight: 600,
        border: `1px solid ${danger ? '#b91c1c' : '#00dc57'}`,
        backgroundColor: 'transparent',
        color: danger ? '#ef4444' : '#00dc57',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        marginRight: 8,
        display: 'inline-flex'
      }}>
      
      {label}
    </div>);

}

export default function AdminUsuarios({ navigation }) {
  const { width } = useWindowDimensions();
  const { perfil } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const cardMinWidth = width < 520 ? '100%' : '48%';
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [accionandoId, setAccionandoId] = useState(null);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [formEdit, setFormEdit] = useState({});
  const [guardandoEdit, setGuardandoEdit] = useState(false);

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
      u.email && u.email.toLowerCase().includes(q) ||
      u.nombreCompleto && u.nombreCompleto.toLowerCase().includes(q)
    );
  }, [usuarios, busqueda]);

  const perfilId = getId(perfil);
  const { yo, otros } = useMemo(() => {
    const y = filtrados.find((u) => getId(u) === perfilId) || null;
    const rest = filtrados.filter((u) => getId(u) !== perfilId);
    return { yo: y, otros: rest };
  }, [filtrados, perfilId]);

  const ordenados = useMemo(() => yo ? [yo, ...otros] : otros, [yo, otros]);

  const togglePremium = async (user) => {
    const id = getId(user);
    if (!id) return;
    const esThug = user.nivelAcceso === 'thug';
    setAccionandoId(id);
    try {
      await actualizarUsuario(id, {
        nivelAcceso: esThug ? 'fan' : 'thug'
      });
      setUsuarios((prev) =>
      prev.map((u) =>
      getId(u) === id ? { ...u, nivelAcceso: esThug ? 'fan' : 'thug' } : u
      )
      );
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo actualizar');
    } finally {
      setAccionandoId(null);
    }
  };

  const ejecutarHacerAdmin = async (id) => {
    setAccionandoId(id);
    try {
      await actualizarUsuario(id, { rol: 'admin' });
      setUsuarios((prev) =>
      prev.map((u) => getId(u) === id ? { ...u, rol: 'admin' } : u)
      );
      if (isWeb) window.alert('Ahora es administrador.');else
      Alert.alert('Listo', 'Ahora es administrador.');
    } catch (e) {
      const msg = e?.message || 'No se pudo actualizar';
      if (isWeb) window.alert('Error: ' + msg);else
      Alert.alert('Error', msg);
    } finally {
      setAccionandoId(null);
    }
  };

  const hacerAdmin = (user) => {
    if (user.rol === 'admin') return;
    const id = getId(user);
    if (!id) return;
    const mensaje = `¿Dar rol admin a ${user.email || user.nombreCompleto || 'este usuario'}?`;
    if (isWeb) {
      if (window.confirm(mensaje)) ejecutarHacerAdmin(id);
      return;
    }
    Alert.alert('Hacer admin', mensaje, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Sí', onPress: () => ejecutarHacerAdmin(id) }]
    );
  };

  const ejecutarRevocarAdmin = async (id) => {
    setAccionandoId(id);
    try {
      await actualizarUsuario(id, { rol: 'fan' });
      setUsuarios((prev) =>
      prev.map((u) => getId(u) === id ? { ...u, rol: 'fan' } : u)
      );
      if (isWeb) window.alert('Rol admin revocado.');else
      Alert.alert('Listo', 'Rol admin revocado.');
    } catch (e) {
      const msg = e?.message || 'No se pudo actualizar';
      if (isWeb) window.alert('Error: ' + msg);else
      Alert.alert('Error', msg);
    } finally {
      setAccionandoId(null);
    }
  };

  const revocarAdmin = (user) => {
    if (user.rol !== 'admin') return;
    const id = getId(user);
    if (!id || id === perfilId) return;
    const mensaje = `¿Quitar rol admin a ${user.email || user.nombreCompleto || 'este usuario'}? Pasará a usuario fan.`;
    if (isWeb) {
      if (window.confirm(mensaje)) ejecutarRevocarAdmin(id);
      return;
    }
    Alert.alert('Revocar admin', mensaje, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Revocar', style: 'destructive', onPress: () => ejecutarRevocarAdmin(id) }]
    );
  };

  const ejecutarBorrado = async (id) => {
    setAccionandoId(id);
    try {
      await eliminarUsuario(id);
      setUsuarios((prev) => prev.filter((u) => getId(u) !== id));
      if (isWeb) window.alert('Usuario eliminado.');else
      Alert.alert('Listo', 'Usuario eliminado.');
    } catch (e) {
      const msg = e?.message || 'No se pudo eliminar';
      if (isWeb) window.alert('Error: ' + msg);else
      Alert.alert('Error', msg);
    } finally {
      setAccionandoId(null);
    }
  };

  const borrar = (user) => {
    const id = getId(user);
    if (!id) return;
    const mensaje = `¿Eliminar a ${user.email || user.nombreCompleto || 'este usuario'}? Esta acción no se puede deshacer.`;
    if (isWeb) {
      if (window.confirm(mensaje)) ejecutarBorrado(id);
      return;
    }
    Alert.alert('Eliminar usuario', mensaje, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: () => ejecutarBorrado(id) }]
    );
  };

  const editar = (user) => {
    setUsuarioEditando(user);
    setFormEdit({
      nombreCompleto: user.nombreCompleto ?? '',
      username: user.username ?? '',
      email: user.email ?? '',
      telefono: user.telefono ?? ''
    });
  };

  const cerrarModalEdit = () => {
    setUsuarioEditando(null);
    setFormEdit({});
  };

  const guardarEdicion = async () => {
    if (!usuarioEditando) return;
    const id = getId(usuarioEditando);
    if (!id) return;
    setGuardandoEdit(true);
    try {
      await actualizarUsuario(id, {
        nombreCompleto: formEdit.nombreCompleto?.trim() || undefined,
        username: formEdit.username?.trim() || undefined,
        email: formEdit.email?.trim() || undefined,
        telefono: formEdit.telefono?.trim() || undefined
      });
      setUsuarios((prev) =>
      prev.map((u) =>
      getId(u) === id ? { ...u, ...formEdit, nombreCompleto: formEdit.nombreCompleto?.trim(), username: formEdit.username?.trim(), email: formEdit.email?.trim(), telefono: formEdit.telefono?.trim() } : u
      )
      );
      if (isWeb) window.alert('Cambios guardados.');else
      Alert.alert('Listo', 'Cambios guardados.');
      cerrarModalEdit();
    } catch (e) {
      const msg = e?.message || 'No se pudo guardar';
      if (isWeb) window.alert('Error: ' + msg);else
      Alert.alert('Error', msg);
    } finally {
      setGuardandoEdit(false);
    }
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
          onChangeText={setBusqueda} />
        
      </View>

      {cargando ?
      <View style={estilos.centrado}>
          <ActivityIndicator size="large" color="#00dc57" />
        </View> :
      error ?
      <View style={estilos.centrado}>
          <Text style={estilos.errorTexto}>{error}</Text>
          <Text style={estilos.errorHint}>
            ¿Entraste con un usuario admin? El servidor debe tener la ruta GET /usuarios.
          </Text>
          <TouchableOpacity style={estilos.botonReintentar} onPress={cargar}>
            <Text style={estilos.botonReintentarTexto}>Reintentar</Text>
          </TouchableOpacity>
        </View> :

      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={estilos.scrollContenido}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag">
        
          {ordenados.length === 0 &&
        <Text style={estilos.vacio}>
              {busqueda.trim() ? 'No hay coincidencias.' : 'No hay usuarios.'}
            </Text>
        }
          {ordenados.map((u) => {
          const uid = getId(u);
          const estaAccionando = accionandoId === uid;
          const soyYo = uid && perfilId === uid;
          const esYo = !!yo && uid === getId(yo);
          const card =
          <View key={uid || u.email} style={[estilos.card, { width: cardMinWidth, maxWidth: cardMinWidth, flexGrow: 0, flexShrink: 0 }]}>
                <View style={estilos.cardHeader}>
                  <Text style={estilos.cardEmail}>{u.email || '(sin email)'}</Text>
                  {(u.rol === 'admin' || u.nivelAcceso === 'thug') &&
              <View style={estilos.badges}>
                      {u.rol === 'admin' &&
                <Text style={estilos.badgeAdmin}>Admin</Text>
                }
                      {u.nivelAcceso === 'thug' &&
                <Text style={estilos.badgePremium}>Premium (Thug)</Text>
                }
                    </View>
              }
                </View>
                <Text style={estilos.cardNombre}>
                  {u.nombreCompleto || '(sin nombre)'}{u.username ? ` · ${u.username}` : ''}
                </Text>
                <Text style={estilos.cardMeta}>
                  {u.nivelAcceso || 'fan'} · {u.proveedor || u.provider || 'email'}
                </Text>

                <View style={estilos.acciones} pointerEvents="box-none">
                  <View style={estilos.filaPremium}>
                    <Text style={estilos.labelPremium}>Premium (Thug)</Text>
                    <Switch
                  value={u.nivelAcceso === 'thug'}
                  onValueChange={() => togglePremium(u)}
                  trackColor={{ false: '#333', true: '#00dc57' }}
                  thumbColor="#fff"
                  disabled={estaAccionando} />
                
                  </View>
                  {isWeb ?
              <>
                      <BotonWeb
                  label="Editar"
                  disabled={estaAccionando}
                  onAction={() => editar(u)}
                  danger={false} />
                
                      {u.rol === 'admin' ?
                <BotonWeb
                  label={soyYo ? 'Admin (tú)' : 'Revocar admin'}
                  disabled={soyYo || estaAccionando}
                  onAction={() => revocarAdmin(u)}
                  danger={!soyYo} /> :


                <BotonWeb
                  label="Hacer admin"
                  disabled={estaAccionando}
                  onAction={() => hacerAdmin(u)}
                  danger={false} />

                }
                      <BotonWeb
                  label={soyYo ? 'Tú' : 'Borrar'}
                  disabled={soyYo || estaAccionando}
                  onAction={() => borrar(u)}
                  danger />
                
                    </> :

              <>
                      <Pressable
                  style={({ pressed }) => [estilos.botonAccion, estaAccionando && estilos.botonDeshabilitado, pressed && estilos.botonAccionPressed]}
                  onPress={() => {if (!estaAccionando) editar(u);}}
                  disabled={estaAccionando}
                  hitSlop={10}>
                  
                        <Text style={estilos.botonAccionTexto}>Editar</Text>
                      </Pressable>
                      {u.rol === 'admin' ?
                <Pressable
                  style={({ pressed }) => [
                  estilos.botonAccion,
                  !soyYo && estilos.botonRevocarAdmin,
                  (soyYo || estaAccionando) && estilos.botonDeshabilitado,
                  pressed && estilos.botonAccionPressed]
                  }
                  onPress={() => {
                    if (!soyYo && !estaAccionando) revocarAdmin(u);
                  }}
                  disabled={soyYo || estaAccionando}
                  hitSlop={10}>
                  
                          <Text style={[estilos.botonAccionTexto, !soyYo && estilos.botonRevocarAdminTexto]}>
                            {soyYo ? 'Admin (tú)' : 'Revocar admin'}
                          </Text>
                        </Pressable> :

                <Pressable
                  style={({ pressed }) => [estilos.botonAccion, estaAccionando && estilos.botonDeshabilitado, pressed && estilos.botonAccionPressed]}
                  onPress={() => {
                    if (!estaAccionando) hacerAdmin(u);
                  }}
                  disabled={estaAccionando}
                  hitSlop={10}>
                  
                          <Text style={estilos.botonAccionTexto}>Hacer admin</Text>
                        </Pressable>
                }
                      <Pressable
                  style={({ pressed }) => [estilos.botonAccion, estilos.botonEliminar, soyYo && estilos.botonDeshabilitado, estaAccionando && estilos.botonDeshabilitado, pressed && estilos.botonAccionPressed]}
                  onPress={() => {if (!soyYo && !estaAccionando) borrar(u);}}
                  disabled={soyYo || estaAccionando}
                  hitSlop={10}>
                  
                        <Text style={estilos.botonEliminarTexto}>{soyYo ? 'Tú' : 'Borrar'}</Text>
                      </Pressable>
                    </>
              }
                </View>
              </View>;

          return esYo ? <View key={`fila-${uid}`} style={estilos.filaYo}>{card}</View> : card;
        })}
        </ScrollView>
      }

      <Modal
        visible={!!usuarioEditando}
        transparent
        animationType="fade"
        onRequestClose={cerrarModalEdit}>
        
        <Pressable style={estilos.modalOverlay} onPress={cerrarModalEdit}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={estilos.modalCentrado}>
            
            <Pressable style={estilos.modalCaja} onPress={(e) => e?.stopPropagation?.()}>
              <View style={estilos.modalHeader}>
                <Text style={estilos.modalTitulo}>Editar usuario</Text>
                <TouchableOpacity onPress={cerrarModalEdit} style={estilos.modalCerrar} hitSlop={12}>
                  <Text style={estilos.modalCerrarTexto}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={estilos.modalForm}>
                <Text style={estilos.modalLabel}>Nombre completo</Text>
                <TextInput
                  style={estilos.modalInput}
                  value={formEdit.nombreCompleto ?? ''}
                  onChangeText={(t) => setFormEdit((f) => ({ ...f, nombreCompleto: t }))}
                  placeholder="Nombre completo"
                  placeholderTextColor="#666" />
                
                <Text style={estilos.modalLabel}>Usuario</Text>
                <TextInput
                  style={estilos.modalInput}
                  value={formEdit.username ?? ''}
                  onChangeText={(t) => setFormEdit((f) => ({ ...f, username: t }))}
                  placeholder="Usuario"
                  placeholderTextColor="#666"
                  autoCapitalize="none" />
                
                <Text style={estilos.modalLabel}>Correo</Text>
                <TextInput
                  style={estilos.modalInput}
                  value={formEdit.email ?? ''}
                  onChangeText={(t) => setFormEdit((f) => ({ ...f, email: t }))}
                  placeholder="Correo"
                  placeholderTextColor="#666"
                  keyboardType="email-address"
                  autoCapitalize="none" />
                
                <Text style={estilos.modalLabel}>Teléfono</Text>
                <TextInput
                  style={estilos.modalInput}
                  value={formEdit.telefono ?? ''}
                  onChangeText={(t) => setFormEdit((f) => ({ ...f, telefono: t }))}
                  placeholder="Teléfono (opcional)"
                  placeholderTextColor="#666"
                  keyboardType="phone-pad" />
                
              </View>
              <View style={estilos.modalBotones}>
                <TouchableOpacity style={estilos.modalBotonCancelar} onPress={cerrarModalEdit}>
                  <Text style={estilos.modalBotonCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[estilos.modalBotonGuardar, guardandoEdit && estilos.botonDeshabilitado]}
                  onPress={guardarEdicion}
                  disabled={guardandoEdit}>
                  
                  {guardandoEdit ?
                  <ActivityIndicator size="small" color="#000" /> :

                  <Text style={estilos.modalBotonGuardarTexto}>Guardar</Text>
                  }
                </TouchableOpacity>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
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
  buscadorContenedor: { paddingHorizontal: 16, paddingVertical: 12 },
  buscador: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333'
  },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContenido: {
    padding: 16,
    paddingBottom: 40,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  filaYo: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 4
  },
  vacio: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 24, width: '100%' },
  errorTexto: { color: '#ef4444', fontSize: 16, textAlign: 'center', marginBottom: 8 },
  errorHint: { color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 16, paddingHorizontal: 24 },
  botonReintentar: {
    backgroundColor: '#00dc57',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10
  },
  botonReintentarTexto: { color: '#000', fontWeight: '600' },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' },
  cardEmail: { color: '#fff', fontSize: 16, fontWeight: '600', flex: 1 },
  badges: { flexDirection: 'row', gap: 6 },
  badgeAdmin: { backgroundColor: '#00dc57', color: '#000', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: 12, fontWeight: '600' },
  badgePremium: { backgroundColor: '#22c55e', color: '#fff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: 12, fontWeight: '600' },
  cardNombre: { color: '#aaa', fontSize: 14, marginTop: 4 },
  cardMeta: { color: '#666', fontSize: 12, marginTop: 2 },
  acciones: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  filaPremium: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  labelPremium: { color: '#888', fontSize: 12, marginRight: 6 },
  botonAccion: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00dc57',
    backgroundColor: 'transparent',
    minHeight: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' && { cursor: 'pointer' })
  },
  botonDeshabilitado: { opacity: 0.5, ...(Platform.OS === 'web' && { cursor: 'not-allowed' }) },
  botonAccionPressed: { opacity: 0.8 },
  botonAccionTexto: { color: '#00dc57', fontSize: 13, fontWeight: '600' },
  botonRevocarAdmin: { borderColor: '#b45309', backgroundColor: 'rgba(180,83,9,0.12)' },
  botonRevocarAdminTexto: { color: '#fb923c' },
  botonEliminar: { borderColor: '#b91c1c', backgroundColor: 'transparent' },
  botonEliminarTexto: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCentrado: { width: '100%', maxWidth: 400 },
  modalCaja: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    padding: 16
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitulo: { fontSize: 17, fontWeight: '700', color: '#fff' },
  modalCerrar: { padding: 4 },
  modalCerrarTexto: { color: '#888', fontSize: 20 },
  modalForm: {},
  modalLabel: { fontSize: 11, color: '#888', marginBottom: 2, marginTop: 6 },
  modalInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 8,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#333'
  },
  modalBotones: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 14 },
  modalBotonCancelar: { paddingVertical: 8, paddingHorizontal: 14 },
  modalBotonCancelarTexto: { color: '#888', fontSize: 14 },
  modalBotonGuardar: {
    backgroundColor: '#00dc57',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8
  },
  modalBotonGuardarTexto: { color: '#000', fontWeight: '600', fontSize: 14 }
});