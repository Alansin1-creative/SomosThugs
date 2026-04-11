import React, { useEffect, useRef } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { aplicarMetaCuentaAdSense } from '../servicios/seoWeb';

const CLIENT = typeof process !== 'undefined' ? (process.env.EXPO_PUBLIC_ADSENSE_CLIENT || '').trim() : '';
const SLOT = typeof process !== 'undefined' ? (process.env.EXPO_PUBLIC_ADSENSE_SLOT || '').trim() : '';

/**
 * Carga el script global de AdSense (necesario para anuncios automáticos y para unidades display).
 * Colocar una sola vez cerca del root (p. ej. app/_layout.js).
 * En la consola de AdSense: Sitios → activar "Anuncios automáticos" si solo usás el client id.
 */
export function AdSenseScript() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined' || !CLIENT) return;
    aplicarMetaCuentaAdSense(CLIENT);
    ensureAdSenseScript(CLIENT);
  }, []);
  return null;
}

/**
 * Unidad display responsive (requiere slot creado en AdSense → Anuncios → Por unidad).
 * Opcional: si no definís EXPO_PUBLIC_ADSENSE_SLOT, no se renderiza nada.
 */
export function AdSenseBanner() {
  const pushed = useRef(false);

  if (Platform.OS !== 'web' || !CLIENT || !SLOT) return null;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    ensureAdSenseScript(CLIENT, () => {
      if (pushed.current) return;
      pushed.current = true;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (_) {
        pushed.current = false;
      }
    });
  }, []);

  return (
    <View style={styles.wrap}>
      {React.createElement('ins', {
        className: 'adsbygoogle',
        style: { display: 'block', width: '100%', minHeight: 90 },
        'data-ad-client': CLIENT,
        'data-ad-slot': SLOT,
        'data-ad-format': 'auto',
        'data-full-width-responsive': 'true'
      })}
    </View>);

}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    minHeight: 100,
    overflow: 'hidden'
  }
});

function ensureAdSenseScript(client, onReady) {
  if (typeof document === 'undefined') return;
  const sel = 'script[data-adsense-app="1"]';
  const existing = document.querySelector(sel);
  if (existing) {
    if (onReady) {
      if (existing.getAttribute('data-loaded') === '1') onReady();
      else existing.addEventListener('load', onReady, { once: true });
    }
    return;
  }
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.dataset.adsenseApp = '1';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
  s.onload = () => {
    s.setAttribute('data-loaded', '1');
    onReady?.();
  };
  document.head.appendChild(s);
}
