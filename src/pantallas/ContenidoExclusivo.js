import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexto/AuthContext';
import { puedeVerContenidoExclusivo, esAdmin } from '../constantes/nivelesAcceso';
const FONDO_THUGS = require('../../assets/fondo-thugs.png');

export default function ContenidoExclusivo({ navigation }) {
  const insets = useSafeAreaInsets();
  const { perfil, cerrarSesion } = useAuth();

  useEffect(() => {
    if (perfil && !puedeVerContenidoExclusivo(perfil.nivelAcceso, perfil.rol)) {
      navigation.replace('ContenidoGeneral');
    }
  }, [perfil, navigation]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'Zona Thug - Somos Thugs';
    }
  }, []);

  return (
    <View style={[estilos.contenedor, { paddingTop: insets.top + 8 }]}>
      <View style={estilos.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={estilos.headerBack}
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={estilos.headerTitulo}>Zona Thug</Text>
        <View style={{ width: 32 }} />
      </View>
      <View style={estilos.cuerpo}>
        <Image
          source={FONDO_THUGS}
          style={estilos.fondoImagen}
          resizeMode="repeat"
        />
        <View style={estilos.contenidoSobreFondo}>
          <View style={estilos.cuadroGlass}>
            <View style={estilos.cardHero}>
              <Text style={estilos.heroTitulo}>Contenido exclusivo</Text>
              <Text style={estilos.heroSubtitulo}>Solo para la banda Thug</Text>
              <Text style={estilos.heroTexto}>
                Aquí pronto vas a encontrar sesiones, contenido detrás de cámaras,
                material inédito y sorpresas solo para quienes apoyan el proyecto.
              </Text>
              {esAdmin(perfil) && (
                <Text style={estilos.heroAdminHint}>
                  (Como admin, podrás subir y gestionar el contenido desde el panel.)
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#050505' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0d0d0d',
  },
  headerBack: {
    padding: 4,
  },
  headerTitulo: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  cuerpo: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
  },
  fondoImagen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    zIndex: 0,
  },
  contenidoSobreFondo: {
    zIndex: 1,
    alignSelf: 'center',
    maxWidth: 520,
    width: '100%',
  },
  cuadroGlass: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'web' ? 'rgba(15,23,42,0.86)' : 'rgba(15,23,42,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    ...(Platform.OS === 'web' && { backdropFilter: 'blur(14px)' }),
  },
  cardHero: {
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  heroTitulo: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  heroSubtitulo: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  heroTexto: {
    color: '#e5e7eb',
    fontSize: 14,
    lineHeight: 20,
  },
  heroAdminHint: {
    marginTop: 16,
    color: '#9ca3af',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
