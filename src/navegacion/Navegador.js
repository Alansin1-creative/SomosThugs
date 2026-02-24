import React from 'react';
import { NavigationContainer, NavigationIndependentTree } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexto/AuthContext';
import InicioPresskit from '../pantallas/InicioPresskit';
import Registro from '../pantallas/Registro';
import Login from '../pantallas/Login';
import ContenidoGeneral from '../pantallas/ContenidoGeneral';
import ContenidoExclusivo from '../pantallas/ContenidoExclusivo';
import { puedeVerContenidoGeneral, puedeVerContenidoExclusivo } from '../constantes/nivelesAcceso';

const Stack = createNativeStackNavigator();

const opcionesBase = {
  headerShown: false,
  contentStyle: { backgroundColor: '#0d0d0d' },
};

export default function Navegador() {
  const { cargando, perfil, nivelAcceso } = useAuth();

  if (cargando) {
    return null;
  }

  const estaAutenticado = !!perfil;
  const puedeGeneral = estaAutenticado && puedeVerContenidoGeneral(nivelAcceso);
  const puedeExclusivo = estaAutenticado && puedeVerContenidoExclusivo(nivelAcceso);

  const rutaInicial = puedeExclusivo
    ? 'ContenidoExclusivo'
    : puedeGeneral
    ? 'ContenidoGeneral'
    : 'Inicio';

  return (
    <NavigationIndependentTree>
      <NavigationContainer>
        <Stack.Navigator screenOptions={opcionesBase} initialRouteName={rutaInicial}>
          <Stack.Screen name="Inicio" component={InicioPresskit} />
          <Stack.Screen name="Registro" component={Registro} />
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="ContenidoGeneral" component={ContenidoGeneral} />
          <Stack.Screen name="ContenidoExclusivo" component={ContenidoExclusivo} />
        </Stack.Navigator>
      </NavigationContainer>
    </NavigationIndependentTree>
  );
}
