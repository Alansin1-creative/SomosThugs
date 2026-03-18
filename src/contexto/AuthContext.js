import React, { createContext, useState, useEffect, useContext } from 'react';
import { obtenerPerfil, signOut as authSignOut } from '../servicios/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NIVEL_LIBRE } from '../constantes/nivelesAcceso';

const TOKEN_KEY = 'somos_thugs_token';

export const AuthContext = createContext({
  usuario: null,
  perfil: null,
  nivelAcceso: NIVEL_LIBRE,
  cargando: true,
  cerrarSesion: async () => {},
  establecerPerfil: () => {},
});

export function AuthProvider({ children }) {
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);

  const nivelAcceso = perfil?.nivelAcceso ?? NIVEL_LIBRE;

  useEffect(() => {
    let cancel = false;
    (async () => {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (!token) {
        setCargando(false);
        return;
      }
      try {
        const p = await obtenerPerfil();
        if (!cancel) setPerfil(p);
      } catch (_) {
        if (!cancel) {
          setPerfil(null);
          await authSignOut();
        }
      } finally {
        if (!cancel) setCargando(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  const cerrarSesion = async () => {
    await authSignOut();
    setPerfil(null);
  };

  const establecerPerfil = (p) => {
    setPerfil(p);
  };

  const value = {
    usuario: perfil,
    perfil,
    nivelAcceso,
    cargando,
    cerrarSesion,
    establecerPerfil,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth solo dentro de AuthProvider');
  return ctx;
}
