import React from 'react';
import { View } from 'react-native';
import { NavigationContainer, NavigationIndependentTree } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexto/AuthContext';
import WebAnuncioAdSense from '../componentes/WebAnuncioAdSense';
import InicioPresskit from '../pantallas/InicioPresskit';
import Perfil from '../pantallas/Perfil';
import MenuAdmin from '../pantallas/MenuAdmin';
import ModoAdmin from '../pantallas/ModoAdmin';
import AdminUsuarios from '../pantallas/AdminUsuarios';
import AdminContenidoExclusivo from '../pantallas/AdminContenidoExclusivo';
import AdminEventos from '../pantallas/AdminEventos';
import EventosGeneral from '../pantallas/EventosGeneral';
import ContenidoGeneral from '../pantallas/ContenidoGeneral';
import ContenidoExclusivo from '../pantallas/ContenidoExclusivo';
import { esAdmin } from '../constantes/nivelesAcceso';

const Stack = createNativeStackNavigator();

const opcionesBase = {
  headerShown: false,
  contentStyle: { backgroundColor: '#0d0d0d' },
};

export default function Navegador() {
  const { cargando, perfil } = useAuth();

  if (cargando) {
    return null;
  }

  const admin = !!perfil && esAdmin(perfil);

  // Solo admin va al panel; fan y thug entran en Inicio (logo + presskit) y desde ahí al menú.
  const rutaInicial = admin ? 'ModoAdmin' : 'Inicio';

  return (
    <View style={{ flex: 1, backgroundColor: '#0d0d0d' }}>
      <View style={{ flex: 1 }}>
        <NavigationIndependentTree>
          <NavigationContainer>
            <Stack.Navigator screenOptions={opcionesBase} initialRouteName={rutaInicial}>
              <Stack.Screen name="Inicio" component={InicioPresskit} />
              <Stack.Screen name="Perfil" component={Perfil} />
              <Stack.Screen name="MenuAdmin" component={MenuAdmin} />
              <Stack.Screen name="ModoAdmin" component={ModoAdmin} />
              <Stack.Screen name="AdminUsuarios" component={AdminUsuarios} />
              <Stack.Screen name="AdminContenidoExclusivo" component={AdminContenidoExclusivo} />
              <Stack.Screen name="AdminEventos" component={AdminEventos} />
              <Stack.Screen name="EventosGeneral" component={EventosGeneral} />
              <Stack.Screen name="ContenidoGeneral" component={ContenidoGeneral} />
              <Stack.Screen name="ContenidoExclusivo" component={ContenidoExclusivo} />
            </Stack.Navigator>
          </NavigationContainer>
        </NavigationIndependentTree>
      </View>
      <WebAnuncioAdSense />
    </View>
  );
}
