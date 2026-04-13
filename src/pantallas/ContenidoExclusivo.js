import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Image, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexto/AuthContext';
import { puedeVerContenidoExclusivo, esAdmin } from '../constantes/nivelesAcceso';
import HeaderAppConMenu from '../componentes/HeaderAppConMenu';
import { aplicarSeoWeb, tituloSeo } from '../servicios/seoWeb';

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
    aplicarSeoWeb({
      titulo: tituloSeo('Zona Thug'),
      descripcion:
      'Contenido exclusivo Somos Thugs: material para la comunidad, artistas urbanos y fans del movimiento.'
    });
  }, []);

  const alturaFondoNativo =
  Platform.OS !== 'web' ?
  Dimensions.get('window').height - (
  insets.top + 8 + 48) +
  insets.bottom :
  null;

  return (
    <View style={estilos.contenedor}>
      <HeaderAppConMenu navigation={navigation} scrollRef={null} tituloCentro="Zona Thug" />
      <View style={estilos.cuerpo}>
        <View
          style={[
          estilos.fondoAbsoluto,
          alturaFondoNativo != null && {
            top: 0,
            bottom: undefined,
            height: alturaFondoNativo
          }]
          }
          pointerEvents="none">
          
          <Image
            source={FONDO_THUGS}
            style={[
            estilos.fondoImagen,
            alturaFondoNativo != null && {
              bottom: undefined,
              height: alturaFondoNativo
            }]
            }
            resizeMode="repeat" />
          
        </View>
        <View style={estilos.cuerpoContenidoConPadding}>
        <View style={estilos.contenidoSobreFondo}>
          <View style={estilos.cuadroGlass}>
            <View style={estilos.cardHero}>
              <Text style={estilos.heroTitulo}>Contenido exclusivo</Text>
              <Text style={estilos.heroSubtitulo}>Solo para la banda Thug</Text>
              <Text style={estilos.heroTexto}>
                Aquí pronto vas a encontrar sesiones, contenido detrás de las cámaras,
                material inédito y sorpresas solo para quienes apoyan el proyecto.
              </Text>
              {esAdmin(perfil) &&
                <Text style={estilos.heroAdminHint}>
                  (Como admin, podrás subir y gestionar el contenido desde el panel.)
                </Text>
                }
            </View>
          </View>
        </View>
        </View>
      </View>
    </View>);

}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#050505',
    ...(Platform.OS !== 'web' && { overflow: 'visible' })
  },
  cuerpo: {
    flex: 1,
    justifyContent: 'center'
  },
  cuerpoContenidoConPadding: {
    flex: 1,
    padding: 32
  },
  fondoAbsoluto: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0
  },
  fondoImagen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    zIndex: 0
  },
  contenidoSobreFondo: {
    zIndex: 1,
    alignSelf: 'center',
    maxWidth: 520,
    width: '100%'
  },
  cuadroGlass: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'web' ? 'rgba(15,23,42,0.86)' : 'rgba(15,23,42,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    ...(Platform.OS === 'web' && { backdropFilter: 'blur(14px)' })
  },
  cardHero: {
    paddingVertical: 28,
    paddingHorizontal: 24
  },
  heroTitulo: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4
  },
  heroSubtitulo: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16
  },
  heroTexto: {
    color: '#e5e7eb',
    fontSize: 14,
    lineHeight: 20
  },
  heroAdminHint: {
    marginTop: 16,
    color: '#9ca3af',
    fontSize: 12,
    fontStyle: 'italic'
  }
});