import React, { useEffect } from 'react';
import { LogBox, Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/contexto/AuthContext';
import { AdSenseBanner, AdSenseScript } from '../src/componentes/AdSenseWeb';
import { Slot } from 'expo-router';

LogBox.ignoreLogs([
'props.pointerEvents is deprecated',
'Cross-Origin-Opener-Policy',
'Unexpected text node']
);

if (Platform.OS === 'web' && typeof console !== 'undefined') {
  const _warn = console.warn;
  console.warn = (...args) => {
    if (args[0] && String(args[0]).includes('Cross-Origin-Opener-Policy')) return;
    _warn.apply(console, args);
  };
}

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    import('../src/servicios/webPush').
    then((m) => m.asegurarServiceWorkerNotificaciones()).
    catch(() => {});
    return undefined;
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.lang = 'es';
    let meta = document.querySelector('meta[http-equiv="content-language"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('http-equiv', 'content-language');
      meta.setAttribute('content', 'es');
      const charset = document.querySelector('meta[charset]');
      if (charset && charset.parentNode) {
        charset.parentNode.insertBefore(meta, charset.nextSibling);
      } else {
        document.head.prepend(meta);
      }
    } else {
      meta.setAttribute('content', 'es');
    }
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <AdSenseScript />
        <View style={{ flex: 1, width: '100%', minHeight: 0 }}>
          <View style={{ flex: 1, minHeight: 0 }}>
            <Slot />
          </View>
          <AdSenseBanner />
        </View>
      </AuthProvider>
    </SafeAreaProvider>);

}