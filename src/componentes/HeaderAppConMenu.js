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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexto/AuthContext';
import { esAdmin, nombreRutaHomeApp } from '../constantes/nivelesAcceso';
import { getBaseUrl } from '../config/api';
import {
  contarNotificacionesNoLeidas,
  listarNotificaciones,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
} from '../servicios/api';

const LOGO_THUGS = require('../../assets/logothugs.png');
const LOGO_TEXTO = 'Somos Thugs';

/**
 * Header con logo (vuelve al home / scroll arriba) y botón avatar → menú.
 * Usar en ContenidoGeneral como home autenticado.
 */
export default function HeaderAppConMenu({ navigation, tituloCentro, scrollRef }) {
  const insets = useSafeAreaInsets();
  const { perfil, cerrarSesion } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [avatarDirectFailed, setAvatarDirectFailed] = useState(false);
  const [notificacionesNoLeidas, setNotificacionesNoLeidas] = useState(0);
  const [notifVisible, setNotifVisible] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [notifCargando, setNotifCargando] = useState(false);
  const [toastMensaje, setToastMensaje] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
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

  if (!perfil) return null;

  const avatarUri = perfil.fotoUrl
    ? (perfil.fotoUrl.startsWith('http') ? perfil.fotoUrl : getBaseUrl() + perfil.fotoUrl)
    : null;
  const isGoogleAvatar = !!(avatarUri && avatarUri.includes('googleusercontent.com'));
  const avatarUriDisplay = isGoogleAvatar
    ? (Platform.OS === 'web' && !avatarDirectFailed
        ? avatarUri
        : `${getBaseUrl()}/avatar-proxy?url=${encodeURIComponent(avatarUri)}`)
    : avatarUri;

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
      /* noop */
    }
    navigation.navigate(home);
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
          /* noop */
        }
      }, 260);
    } catch (_) {
      /* noop */
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

  const onAbrirNotificacion = async (item) => {
    const id = item?.id;
    if (!id) return;
    if (!item?.leida) {
      try {
        await marcarNotificacionLeida(id);
      } catch (_) {
        // noop
      }
      setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
      setNotificacionesNoLeidas((prev) => Math.max(0, Number(prev || 0) - 1));
    }
  };

  const marcarTodasLeidas = async () => {
    try {
      await marcarTodasNotificacionesLeidas();
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      setNotificacionesNoLeidas(0);
    } catch (_) {
      // noop
    }
  };

  useEffect(() => {
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
            nuevas === 1
              ? 'Tienes 1 notificacion nueva'
              : `Tienes ${nuevas} notificaciones nuevas`
          );
          reproducirSonidoNotificacion();
        }
        previoNoLeidasRef.current = total;
      } catch (_) {
        // noop
      }
    };
    revisar();
    timer = setInterval(revisar, 15000);
    return () => {
      cancel = true;
      if (timer) clearInterval(timer);
    };
  }, [perfil?.id]);

  return (
    <View style={[styles.header, Platform.OS !== 'web' && { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity onPress={irHomeContenido} style={styles.headerIzq} activeOpacity={0.8}>
        <Image source={LOGO_THUGS} style={styles.headerLogoImg} resizeMode="contain" />
        <Text style={styles.logoTexto}>{LOGO_TEXTO}</Text>
      </TouchableOpacity>
      {tituloCentro ? (
        <Text style={styles.headerTituloCentro} pointerEvents="none">
          {tituloCentro}
        </Text>
      ) : null}
      <View style={styles.headerDerecha}>
        <TouchableOpacity style={styles.notifWrap} activeOpacity={0.8} onPress={abrirNotificaciones}>
          <Ionicons name="notifications-outline" size={20} color="#fff" />
          {notificacionesNoLeidas > 0 ? (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeTexto}>
                {notificacionesNoLeidas > 99 ? '99+' : String(notificacionesNoLeidas)}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
        <Text style={styles.headerUsuario} numberOfLines={1}>
          {perfil?.username ||
            (perfil?.nombreCompleto || '').trim().split(/\s+/)[0] ||
            'Usuario'}
        </Text>
        <View style={styles.headerAvatarWrap}>
          <TouchableOpacity
            style={styles.headerAvatarTouchable}
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.8}
          >
            {avatarUriDisplay && !avatarError ? (
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
                {...(Platform.OS === 'web' &&
                  isGoogleAvatar &&
                  !avatarDirectFailed && { referrerPolicy: 'no-referrer' })}
              />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Ionicons name="person-circle" size={40} color="#00dc57" />
              </View>
            )}
          </TouchableOpacity>
          <Modal
            visible={menuVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setMenuVisible(false)}
          >
            <View style={styles.menuOverlay}>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuVisible(false)} />
              <View style={styles.menuCaja}>
                <View style={styles.menuLista}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setMenuVisible(false);
                      navigation.navigate('Perfil');
                    }}
                  >
                    <Text style={styles.menuItemTexto}>Perfil</Text>
                  </TouchableOpacity>
                  {esAdmin(perfil) && (
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setMenuVisible(false);
                        navigation.navigate('ModoAdmin');
                      }}
                    >
                      <Text style={styles.menuItemTexto}>Panel de Admin</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setMenuVisible(false);
                      navigation.navigate('EventosGeneral');
                    }}
                  >
                    <Text style={styles.menuItemTexto}>Eventos</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setMenuVisible(false);
                      navigation.navigate('Inicio');
                    }}
                  >
                    <Text style={styles.menuItemTexto}>Presskit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.menuItem, styles.menuItemCerrar]}
                    onPress={() => {
                      setMenuVisible(false);
                      cerrarSesion().then(() => navigation.replace('Inicio'));
                    }}
                  >
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
        onRequestClose={() => setNotifVisible(false)}
      >
        <View style={styles.menuOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setNotifVisible(false)} />
          <View style={styles.notifCaja}>
            <View style={styles.notifHeader}>
              <Text style={styles.notifTitulo}>Notificaciones</Text>
              <TouchableOpacity onPress={marcarTodasLeidas} hitSlop={8}>
                <Text style={styles.notifAccion}>Marcar todas</Text>
              </TouchableOpacity>
            </View>
            {notifCargando ? (
              <Text style={styles.notifVacio}>Cargando...</Text>
            ) : (
              <ScrollView style={styles.notifScroll} nestedScrollEnabled>
                {notificaciones.length === 0 ? (
                  <Text style={styles.notifVacio}>Sin notificaciones.</Text>
                ) : (
                  notificaciones.map((n) => (
                    <TouchableOpacity
                      key={n.id}
                      style={[styles.notifItem, !n.leida && styles.notifItemNoLeida]}
                      onPress={() => onAbrirNotificacion(n)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.notifItemTitulo}>{n.titulo || 'Notificacion'}</Text>
                      <Text style={styles.notifItemMsg} numberOfLines={2}>
                        {n.mensaje || ''}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      {toastVisible ? (
        <View style={styles.toastInApp} pointerEvents="none">
          <Ionicons name="notifications" size={16} color="#00dc57" />
          <Text style={styles.toastInAppTexto} numberOfLines={1}>
            {toastMensaje}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 6,
    paddingTop: Platform.OS === 'web' ? 10 : 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    backgroundColor: '#0d0d0d',
  },
  headerIzq: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, zIndex: 1 },
  headerLogoImg: { width: 36, height: 36 },
  logoTexto: { fontSize: 18, fontWeight: 'bold', color: '#fff', flexShrink: 1 },
  headerTituloCentro: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    zIndex: 0,
    pointerEvents: 'none',
  },
  headerDerecha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    justifyContent: 'flex-end',
    minWidth: 0,
    zIndex: 1,
  },
  notifWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginRight: 2,
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
    paddingHorizontal: 4,
  },
  notifBadgeTexto: { color: '#000', fontSize: 10, fontWeight: '700' },
  headerUsuario: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    maxWidth: 100,
  },
  headerAvatarWrap: { position: 'relative' },
  headerAvatarTouchable: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
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
    alignItems: 'center',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  menuCaja: {
    position: 'absolute',
    top: 56,
    right: 14,
  },
  menuLista: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    minWidth: 180,
    paddingVertical: 8,
    ...(Platform.OS === 'web' && { boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }),
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
    ...(Platform.OS === 'web' && { boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }),
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2e2e2e',
  },
  notifTitulo: { color: '#fff', fontSize: 14, fontWeight: '700' },
  notifAccion: { color: '#00dc57', fontSize: 12, fontWeight: '600' },
  notifScroll: { maxHeight: 230 },
  notifVacio: { color: '#888', fontSize: 13, padding: 12 },
  notifItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  notifItemNoLeida: {
    backgroundColor: 'rgba(0,220,87,0.08)',
  },
  notifItemTitulo: { color: '#fff', fontSize: 13, fontWeight: '600' },
  notifItemMsg: { color: '#bbb', fontSize: 12, marginTop: 2 },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemTexto: { color: '#fff', fontSize: 15, fontWeight: '500' },
  menuItemCerrar: { borderTopWidth: 1, borderTopColor: '#333' },
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
    ...(Platform.OS === 'web' && { boxShadow: '0 8px 18px rgba(0,0,0,0.45)' }),
  },
  toastInAppTexto: { color: '#fff', fontSize: 13, fontWeight: '500', flex: 1 },
});
