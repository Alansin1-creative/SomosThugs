import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { NavigationContainer, NavigationIndependentTree } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexto/AuthContext';
import InicioPresskit from '../pantallas/InicioPresskit';
import Perfil from '../pantallas/Perfil';
import MenuAdmin from '../pantallas/MenuAdmin';
import ModoAdmin from '../pantallas/ModoAdmin';
import AdminUsuarios from '../pantallas/AdminUsuarios';
import AdminContenidoExclusivo from '../pantallas/AdminContenidoExclusivo';
import AdminEventos from '../pantallas/AdminEventos';
import AdminFlyers from '../pantallas/AdminFlyers';
import EventosGeneral from '../pantallas/EventosGeneral';
import ContenidoGeneral from '../pantallas/ContenidoGeneral';
import ContenidoExclusivo from '../pantallas/ContenidoExclusivo';
import { nombreRutaHomeApp } from '../constantes/nivelesAcceso';

const Stack = createNativeStackNavigator();

const opcionesBase = {
  headerShown: false,
  contentStyle: { backgroundColor: '#0d0d0d' }
};

function obtenerRutaActiva(state) {
  if (!state || typeof state.index !== 'number') return null;
  const route = state.routes?.[state.index];
  if (!route) return null;
  if (route.state) return obtenerRutaActiva(route.state);
  return route.name || null;
}

export default function Navegador() {
  const { cargando, perfil } = useAuth();
  const navRef = useRef(null);
  const [rutaActual, setRutaActual] = useState(null);

  if (cargando) {
    return null;
  }


  const rutaInicial = perfil ? nombreRutaHomeApp(perfil) : 'Inicio';

  return (
    <View style={{ flex: 1, backgroundColor: '#0d0d0d' }}>
      <View style={{ flex: 1 }}>
        <NavigationIndependentTree>
          <NavigationContainer
            ref={navRef}
            onReady={() => {
              const route = navRef.current?.getCurrentRoute?.();
              setRutaActual(route?.name || null);
            }}
            onStateChange={(state) => {
              const activa = obtenerRutaActiva(state);
              setRutaActual(activa);
            }}>
            
            <Stack.Navigator screenOptions={opcionesBase} initialRouteName={rutaInicial}>
              <Stack.Screen name="Inicio" component={InicioPresskit} options={{ title: 'Somos Thugs' }} />
              <Stack.Screen name="Perfil" component={Perfil} options={{ title: 'Perfil' }} />
              <Stack.Screen name="MenuAdmin" component={MenuAdmin} options={{ title: 'Panel Admin' }} />
              <Stack.Screen name="ModoAdmin" component={ModoAdmin} options={{ title: 'Admin' }} />
              <Stack.Screen name="AdminUsuarios" component={AdminUsuarios} options={{ title: 'Admin Usuarios' }} />
              <Stack.Screen name="AdminContenidoExclusivo" component={AdminContenidoExclusivo} options={{ title: 'Admin Contenido' }} />
              <Stack.Screen name="AdminEventos" component={AdminEventos} options={{ title: 'Admin Eventos' }} />
              <Stack.Screen name="AdminFlyers" component={AdminFlyers} options={{ title: 'Admin Flyers' }} />
              <Stack.Screen name="EventosGeneral" component={EventosGeneral} options={{ title: 'Eventos' }} />
              <Stack.Screen name="ContenidoGeneral" component={ContenidoGeneral} options={{ title: 'Contenido' }} />
              <Stack.Screen name="ContenidoExclusivo" component={ContenidoExclusivo} options={{ title: 'Contenido Exclusivo' }} />
            </Stack.Navigator>
          </NavigationContainer>
        </NavigationIndependentTree>
      </View>
    </View>);

}