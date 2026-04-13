import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Alert } from
'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexto/AuthContext';
import { esAdmin, nombreRutaHomeApp } from '../constantes/nivelesAcceso';
import { getBaseUrl } from '../config/api';
import {
  contarNotificacionesNoLeidas,
  listarNotificaciones,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas } from
'../servicios/api';
import { activarNotificacionesEscritorioWeb } from '../servicios/webPush';

const LOGO_CENTRO_HEADER = require('../../assets/logo-somos-thugs-banner.png');

if (typeof document !== 'undefined' && Platform.OS === 'web') {
  const id = 'st-notif-scroll-scrollbar-none';
  if (!document.getElementById(id)) {
    const s = document.createElement('style');
    s.id = id;
    s.textContent =
    '[data-st-notif-scroll="1"]{scrollbar-width:none;-ms-overflow-style:none;}' +
    '[data-st-notif-scroll="1"]::-webkit-scrollbar{width:0!important;height:0!important;display:none!important;}';
    document.head.appendChild(s);
  }
}






export default function HeaderAppConMenu({
  navigation,
  tituloCentro,
  scrollRef,
  esVistaContenidoFeed = false
}) {
  const insets = useSafeAreaInsets();
  const { perfil, cerrarSesion, cargando: authCargando } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [avatarDirectFailed, setAvatarDirectFailed] = useState(false);
  const [notificacionesNoLeidas, setNotificacionesNoLeidas] = useState(0);
  const [notifVisible, setNotifVisible] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [notifCargando, setNotifCargando] = useState(false);
  const [toastMensaje, setToastMensaje] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [webPushDialogVisible, setWebPushDialogVisible] = useState(false);
  const [webPushActivando, setWebPushActivando] = useState(false);
  const toastTimerRef = useRef(null);
  const previoNoLeidasRef = useRef(null);

  useEffect(() => {
    setAvatarError(false);
    setAvatarDirectFailed(false);
  }, [perfil?.fotoUrl]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const avatarUri = perfil?.fotoUrl ?
  perfil.fotoUrl.startsWith('http') ? perfil.fotoUrl : getBaseUrl() + perfil.fotoUrl :
  null;
  const isGoogleAvatar = !!(avatarUri && avatarUri.includes('googleusercontent.com'));
  const avatarUriDisplay = isGoogleAvatar ?
  Platform.OS === 'web' && !avatarDirectFailed ?
  avatarUri :
  `${getBaseUrl()}/avatar-proxy?url=${encodeURIComponent(avatarUri)}` :
  avatarUri;
  const etiquetaAcceso =
  perfil?.rol === 'admin' ?
  'Admin' :
  perfil?.nivelAcceso === 'thug' ? 'Thug' : '';

  const irHomeContenido = () => {
    const home = esAdmin(perfil) ? 'ContenidoGeneral' : nombreRutaHomeApp(perfil);
    try {
      const state = navigation.getState?.();
      const idx = state?.index;
      const current = idx != null ? state?.routes?.[idx]?.name : null;
      if (current === home) {
        scrollRef?.current?.scrollTo?.({ y: 0, animated: true });
        return;
      }
    } catch (_) {

    }
    navigation.navigate(home);
  };

  const irAtrasOCasa = () => {
    try {
      if (navigation.canGoBack?.()) {
        navigation.goBack();
        return;
      }
    } catch (_) {

    }
    irHomeContenido();
  };

  const reproducirSonidoNotificacion = () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.03, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.2);
      setTimeout(() => {
        try {
          ctx.close();
        } catch (_) {

        }
      }, 260);
    } catch (_) {

    }
  };

  const mostrarToast = (mensaje) => {
    setToastMensaje(mensaje);
    setToastVisible(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 2800);
  };

  const cargarNotificaciones = async () => {
    setNotifCargando(true);
    try {
      const lista = await listarNotificaciones(30);
      setNotificaciones(Array.isArray(lista) ? lista : []);
    } catch (_) {
      setNotificaciones([]);
    } finally {
      setNotifCargando(false);
    }
  };

  const abrirNotificaciones = async () => {
    setNotifVisible(true);
    await cargarNotificaciones();
  };

  const activarPushNativoDesdeCampana = async () => {
    try {
      const Notifications = await import('expo-notifications');
      const permisos = await Notifications.getPermissionsAsync();
      if (permisos.status !== 'granted') {
        Alert.alert(
          'Suscribirte a notificaciones',
          '¿Quieres activar las notificaciones en este dispositivo?',
          [
          { text: 'Ahora no', style: 'cancel' },
          {
            text: 'Activar',
            onPress: async () => {
              try {
                const mod = await import('../servicios/push');
                const token = await mod?.registrarPushUsuario?.();
                if (token) {
                  Alert.alert('Listo', 'Notificaciones activadas en este dispositivo.');
                } else {
                  Alert.alert('Notificaciones', 'No se pudo activar. Revisa permisos del sistema.');
                }
              } catch (e) {
                Alert.alert('Error', e?.message || 'No se pudo activar notificaciones.');
              } finally {
                await abrirNotificaciones();
              }
            }
          }]
        );
        return;
      }

      const mod = await import('../servicios/push');
      const token = await mod?.registrarPushUsuario?.();
      if (!token) {
        Alert.alert(
          'Notificaciones',
          'Tienes permisos activos, pero no se pudo registrar el token push. Intenta de nuevo en unos segundos.'
        );
      }
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo comprobar notificaciones.');
    } finally {
      await abrirNotificaciones();
    }
  };

  const onPressCampanaNotificaciones = async () => {
    try {
      if (Platform.OS !== 'web' || typeof window === 'undefined') {
        await activarPushNativoDesdeCampana();
        return;
      }
      if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
        await abrirNotificaciones();
        return;
      }
      if (Notification.permission === 'denied') {
        await abrirNotificaciones();
        return;
      }
      let faltaSuscripcion = false;
      if (Notification.permission === 'granted') {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          const sub = reg ? await reg.pushManager.getSubscription() : null;
          if (!sub) faltaSuscripcion = true;
        } catch (_) {
          faltaSuscripcion = true;
        }
      }
      const convienePreguntarWebPush = Notification.permission === 'default' || faltaSuscripcion;
      if (!convienePreguntarWebPush) {
        await abrirNotificaciones();
        return;
      }
      setWebPushDialogVisible(true);
      return;
    } catch (e) {
      console.warn('[campana notificaciones]', e);
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(e?.message || 'No se pudo completar la acción.');
      }
      await abrirNotificaciones();
    }
  };

  const onWebPushDialogAhoraNo = async () => {
    setWebPushDialogVisible(false);
    await abrirNotificaciones();
  };

  const onWebPushDialogBackdrop = async () => {
    if (webPushActivando) return;
    setWebPushDialogVisible(false);
    await abrirNotificaciones();
  };

  const onWebPushDialogActivar = async () => {
    setWebPushActivando(true);
    try {
      const r = await activarNotificacionesEscritorioWeb();
      setWebPushDialogVisible(false);
      setWebPushActivando(false);
      const msg = r.mensaje || (r.ok ? 'Listo.' : 'No se pudo activar.');
      if (Platform.OS === 'web' && typeof window.alert === 'function') {
        window.alert(msg);
      } else {
        Alert.alert(r.ok ? 'Listo' : 'Notificaciones', msg);
      }
    } catch (e) {
      setWebPushDialogVisible(false);
      setWebPushActivando(false);
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(e?.message || 'Error al activar notificaciones.');
      } else {
        Alert.alert('Error', e?.message || 'Error desconocido');
      }
    } finally {
      await abrirNotificaciones();
    }
  };

  const onAbrirNotificacion = async (item) => {
    const id = item?.id;
    if (!id) return;
    if (!item?.leida) {
      try {
        await marcarNotificacionLeida(id);
      } catch (_) {

      }
      setNotificaciones((prev) => prev.map((n) => n.id === id ? { ...n, leida: true } : n));
      setNotificacionesNoLeidas((prev) => Math.max(0, Number(prev || 0) - 1));
    }
    const tipo = item?.tipo;
    const entidadId = item?.entidadId != null ? String(item.entidadId).trim() : '';
    setNotifVisible(false);
    if (tipo === 'nuevo_evento' && entidadId) {
      navigation.navigate('EventosGeneral', { eventoId: entidadId });
      return;
    }
    if (tipo === 'nuevo_contenido' && entidadId) {
      navigation.navigate('ContenidoGeneral', { contenidoId: entidadId });
    }
  };

  const marcarTodasLeidas = async () => {
    try {
      await marcarTodasNotificacionesLeidas();
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      setNotificacionesNoLeidas(0);
    } catch (_) {

    }
  };

  useEffect(() => {
    if (authCargando || !perfil?.id) {
      setNotificacionesNoLeidas(0);
      previoNoLeidasRef.current = null;
      return undefined;
    }
    let cancel = false;
    let timer = null;
    const revisar = async () => {
      try {
        const res = await contarNotificacionesNoLeidas();
        const total = Number(res?.total ?? 0);
        if (cancel || !Number.isFinite(total)) return;
        setNotificacionesNoLeidas(total);
        const previo = previoNoLeidasRef.current;
        if (previo != null && total > previo) {
          const nuevas = total - previo;
          mostrarToast(
            nuevas === 1 ?
            'Tienes 1 notificacion nueva' :
            `Tienes ${nuevas} notificaciones nuevas`
          );
          reproducirSonidoNotificacion();
        }
        previoNoLeidasRef.current = total;
      } catch (_) {

      }
    };
    revisar();
    timer = setInterval(revisar, 15000);
    return () => {
      cancel = true;
      if (timer) clearInterval(timer);
    };
  }, [perfil?.id, authCargando]);

  if (!perfil) return null;

  return (
    <View
    style={[
    styles.header,
    Platform.OS !== 'web' && {
      paddingTop: insets.top + 8,
      paddingLeft: 14 + insets.left,
      paddingRight: 14 + insets.right
    }]
    }>
      {esVistaContenidoFeed ?
      <TouchableOpacity
        onPress={irHomeContenido}
        style={[styles.headerIzq, styles.headerIzqFeed]}
        activeOpacity={0.8}>
          <Image source={LOGO_CENTRO_HEADER} style={styles.headerLogoBannerFeed} resizeMode="contain" />
        </TouchableOpacity> :

      <TouchableOpacity onPress={irAtrasOCasa} style={[styles.headerIzq, styles.headerIzqNav]} activeOpacity={0.8} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color="#fff" style={styles.headerFlechaAtras} />
          <Image source={LOGO_CENTRO_HEADER} style={styles.headerLogoAlLado} resizeMode="contain" />
        </TouchableOpacity>
      }
      {tituloCentro ?
      <View style={styles.headerTituloCentroWrap} pointerEvents="box-none">
          <Text
          style={styles.headerTituloCentro}
          pointerEvents="none"
          numberOfLines={1}
          ellipsizeMode="tail">
          
            {tituloCentro}
          </Text>
        </View> :
      null}
      <View style={styles.headerDerecha}>
        <TouchableOpacity
          style={styles.notifWrap}
          activeOpacity={0.8}
          onPress={onPressCampanaNotificaciones}
          {...Platform.OS === 'web' ? { accessibilityRole: 'button', accessibilityLabel: 'Notificaciones' } : {}}>
          <Ionicons name="notifications-outline" size={20} color="#fff" />
          {notificacionesNoLeidas > 0 ?
          <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeTexto}>
                {notificacionesNoLeidas > 99 ? '99+' : String(notificacionesNoLeidas)}
              </Text>
            </View> :
          null}
        </TouchableOpacity>
        <View style={styles.headerUsuarioWrap}>
          <Text style={styles.headerUsuario} numberOfLines={1}>
            {perfil?.username ||
            (perfil?.nombreCompleto || '').trim().split(/\s+/)[0] ||
            'Usuario'}
          </Text>
          {etiquetaAcceso ?
          <Text style={styles.headerNivelAcceso} numberOfLines={1}>
              {etiquetaAcceso}
            </Text> :
          null}
        </View>
        <View style={styles.headerAvatarWrap}>
          <TouchableOpacity
            style={styles.headerAvatarTouchable}
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.8}>
            
            {avatarUriDisplay && !avatarError ?
            <Image
              source={{ uri: avatarUriDisplay }}
              style={styles.headerAvatarImg}
              onError={() => {
                if (Platform.OS === 'web' && isGoogleAvatar && !avatarDirectFailed) {
                  setAvatarDirectFailed(true);
                  setAvatarError(false);
                } else {
                  setAvatarError(true);
                }
              }}
              {...Platform.OS === 'web' &&
              isGoogleAvatar &&
              !avatarDirectFailed && { referrerPolicy: 'no-referrer' }} /> :


            <View style={styles.headerAvatarPlaceholder}>
                <Ionicons name="person-circle" size={40} color="#00dc57" />
              </View>
            }
          </TouchableOpacity>
          <Modal
            visible={menuVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setMenuVisible(false)}>
            
            <View style={styles.menuOverlay}>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuVisible(false)} />
              <View style={styles.menuCaja}>
                <View style={styles.menuLista}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setMenuVisible(false);
                      navigation.navigate('Perfil');
                    }}>
                    
                    <Text style={styles.menuItemTexto}>Perfil</Text>
                  </TouchableOpacity>
                  {esAdmin(perfil) &&
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setMenuVisible(false);
                      navigation.navigate('ModoAdmin');
                    }}>
                    
                      <Text style={styles.menuItemTexto}>Panel de Admin</Text>
                    </TouchableOpacity>
                  }
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setMenuVisible(false);
                      navigation.navigate('EventosGeneral');
                    }}>
                    
                    <Text style={styles.menuItemTexto}>Eventos</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setMenuVisible(false);
                      navigation.navigate('Inicio');
                    }}>
                    
                    <Text style={styles.menuItemTexto}>Somos Thugs</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.menuItem, styles.menuItemCerrar]}
                    onPress={() => {
                      setMenuVisible(false);
                      cerrarSesion().then(() => navigation.replace('Inicio'));
                    }}>
                    
                    <Text style={styles.menuItemTexto}>Cerrar sesión</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </View>
      <Modal
        visible={notifVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotifVisible(false)}>
        
        <View style={styles.menuOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setNotifVisible(false)} />
          <View style={styles.notifCaja}>
            <View style={styles.notifHeader}>
              <Text style={styles.notifTitulo}>Notificaciones</Text>
              <TouchableOpacity onPress={marcarTodasLeidas} hitSlop={8}>
                <Text style={styles.notifAccion}>Marcar todas</Text>
              </TouchableOpacity>
            </View>
            {notifCargando ?
            <Text style={styles.notifVacio}>Cargando…</Text> :

            <ScrollView
              style={styles.notifScroll}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              ref={(r) => {
                if (Platform.OS !== 'web' || !r || typeof r.getScrollableNode !== 'function') return;
                try {
                  const node = r.getScrollableNode();
                  if (node && node.setAttribute) node.setAttribute('data-st-notif-scroll', '1');
                } catch (_) {

                }
              }}>
                {notificaciones.length === 0 ?
              <Text style={styles.notifVacio}>Sin notificaciones.</Text> :

              notificaciones.map((n) =>
              <TouchableOpacity
                key={n.id}
                style={[styles.notifItem, !n.leida && styles.notifItemNoLeida]}
                onPress={() => onAbrirNotificacion(n)}
                activeOpacity={0.8}>
                
                      <Text style={styles.notifItemTitulo}>{n.titulo || 'Notificación'}</Text>
                      <Text style={styles.notifItemMsg} numberOfLines={2}>
                        {n.mensaje || ''}
                      </Text>
                    </TouchableOpacity>
              )
              }
              </ScrollView>
            }
          </View>
        </View>
      </Modal>
      <Modal
        visible={webPushDialogVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!webPushActivando) void onWebPushDialogBackdrop();
        }}>
        
        <View style={styles.webPushDialogOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onWebPushDialogBackdrop} />
          <View style={styles.webPushDialogCaja} pointerEvents="box-none">
            <Text style={styles.webPushDialogTitulo}>Activar avisos</Text>
            <Text style={styles.webPushDialogTexto}>El navegador te pedirá permiso.</Text>
            <View style={styles.webPushDialogBotones}>
              <TouchableOpacity
                style={[styles.webPushBtnSec, webPushActivando && styles.botonDeshabilitado]}
                onPress={onWebPushDialogAhoraNo}
                disabled={webPushActivando}
                activeOpacity={0.85}>
                
                <Text style={styles.webPushBtnSecTexto}>Ahora no</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.webPushBtnPri, webPushActivando && styles.botonDeshabilitado]}
                onPress={onWebPushDialogActivar}
                disabled={webPushActivando}
                activeOpacity={0.85}>
                
                <Text style={styles.webPushBtnPriTexto}>{webPushActivando ? 'Activando…' : 'Activar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {toastVisible ?
      <View style={styles.toastInApp} pointerEvents="none">
          <Ionicons name="notifications" size={16} color="#00dc57" />
          <Text style={styles.toastInAppTexto} numberOfLines={1}>
            {toastMensaje}
          </Text>
        </View> :
      null}
    </View>);

}

const styles = StyleSheet.create({
  header: {
    position: 'relative',
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
  headerIzq: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 0,
    flexShrink: 1,
    alignSelf: 'flex-start',
    minWidth: 0,
    zIndex: 1,
    paddingVertical: 4,
    overflow: 'hidden'
  },
  headerIzqNav: { gap: 0 },
  headerIzqFeed: {
    marginLeft: Platform.OS === 'web' ? -14 : -10
  },
  headerFlechaAtras: { marginRight: -18 },

  headerLogoBannerFeed: {
    height: 44,
    width: 176,
    flexShrink: 1,
    maxWidth: 200,
    marginLeft: Platform.OS === 'web' ? -6 : -4
  },

  headerLogoAlLado: {
    height: 44,
    width: 176,
    flexShrink: 1,
    maxWidth: 200,
    marginLeft: -28
  },
  headerTituloCentroWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'box-none',
    zIndex: 0
  },
  headerTituloCentro: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    pointerEvents: 'none',
    paddingHorizontal: 128
  },
  headerDerecha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    justifyContent: 'flex-end',
    minWidth: 0,
    zIndex: 1
  },
  notifWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginRight: 2,
    zIndex: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : null)
  },
  notifBadge: {
    position: 'absolute',
    top: -3,
    right: -5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#00dc57',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  notifBadgeTexto: { color: '#000', fontSize: 10, fontWeight: '700' },
  headerUsuario: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    maxWidth: 110
  },
  headerUsuarioWrap: {
    alignItems: 'flex-end',
    maxWidth: 120
  },
  headerNivelAcceso: {
    color: '#9ea3a9',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.4
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
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  menuCaja: {
    position: 'absolute',
    top: 56,
    right: 14
  },
  menuLista: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    minWidth: 180,
    paddingVertical: 8,
    ...(Platform.OS === 'web' && { boxShadow: '0 8px 24px rgba(0,0,0,0.5)' })
  },
  notifCaja: {
    position: 'absolute',
    top: 56,
    right: 74,
    width: 320,
    maxWidth: '92%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
    ...(Platform.OS === 'web' && { boxShadow: '0 8px 24px rgba(0,0,0,0.5)' })
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2e2e2e'
  },
  notifTitulo: { color: '#fff', fontSize: 14, fontWeight: '700' },
  notifAccion: { color: '#00dc57', fontSize: 12, fontWeight: '600' },
  notifScroll: { maxHeight: 230 },
  notifVacio: { color: '#888', fontSize: 13, padding: 12 },
  notifItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#262626'
  },
  notifItemNoLeida: {
    backgroundColor: 'rgba(0,220,87,0.08)'
  },
  notifItemTitulo: { color: '#fff', fontSize: 13, fontWeight: '600' },
  notifItemMsg: { color: '#bbb', fontSize: 12, marginTop: 2 },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  menuItemTexto: { color: '#fff', fontSize: 15, fontWeight: '500' },
  menuItemCerrar: { borderTopWidth: 1, borderTopColor: '#333' },
  webPushDialogOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)'
  },
  webPushDialogCaja: {
    zIndex: 2,
    width: 300,
    maxWidth: '90%',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: 'rgba(0,220,87,0.35)',
    ...(Platform.OS === 'web' && { boxShadow: '0 12px 40px rgba(0,0,0,0.55)' })
  },
  webPushDialogTitulo: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  webPushDialogTexto: { color: '#bbb', fontSize: 13, lineHeight: 19, marginBottom: 16 },
  webPushDialogBotones: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  webPushBtnSec: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    backgroundColor: 'transparent'
  },
  webPushBtnSecTexto: { color: '#ccc', fontSize: 14, fontWeight: '600' },
  webPushBtnPri: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#00dc57'
  },
  webPushBtnPriTexto: { color: '#000', fontSize: 14, fontWeight: '700' },
  botonDeshabilitado: { opacity: 0.55 },
  toastInApp: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: -44,
    zIndex: 20,
    backgroundColor: 'rgba(8,8,8,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(0,220,87,0.45)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...(Platform.OS === 'web' && { boxShadow: '0 8px 18px rgba(0,0,0,0.45)' })
  },
  toastInAppTexto: { color: '#fff', fontSize: 13, fontWeight: '500', flex: 1 }
});