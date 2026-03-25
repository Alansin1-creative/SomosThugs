import React, { useEffect, useRef } from 'react';
import { Platform, View, StyleSheet } from 'react-native';

const client = process.env.EXPO_PUBLIC_ADSENSE_CLIENT || '';
const slot = process.env.EXPO_PUBLIC_ADSENSE_SLOT || '';

function loadAdSenseScript() {
  if (typeof document === 'undefined' || !client) return;
  const id = 'somos-thugs-adsense';
  if (document.getElementById(id)) return;
  const s = document.createElement('script');
  s.id = id;
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
    client
  )}`;
  document.head.appendChild(s);
}

/**
 * Banner AdSense solo en web. Configura en .env:
 * EXPO_PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXX
 * EXPO_PUBLIC_ADSENSE_SLOT=XXXXXXXXXX
 */
export default function WebAnuncioAdSense() {
  const hostRef = useRef(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !client || !slot) return;

    loadAdSenseScript();

    const host = hostRef.current;
    if (!host || typeof document === 'undefined') return;

    host.innerHTML = '';

    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.style.minWidth = '320px';
    ins.style.width = '100%';
    ins.setAttribute('data-ad-client', client);
    ins.setAttribute('data-ad-slot', slot);
    ins.setAttribute('data-ad-format', 'horizontal');
    ins.setAttribute('data-full-width-responsive', 'true');

    host.appendChild(ins);

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (_) {
      // Fallo de red o bloqueador; no romper la app
    }

    return () => {
      host.innerHTML = '';
    };
  }, []);

  if (Platform.OS !== 'web' || !client || !slot) {
    return null;
  }

  return (
    <View style={styles.wrap} collapsable={false}>
      <View ref={hostRef} style={styles.slot} collapsable={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    backgroundColor: '#0d0d0d',
    alignItems: 'center',
    flexShrink: 0,
  },
  slot: {
    width: '100%',
    maxWidth: 728,
    minHeight: 90,
  },
});
