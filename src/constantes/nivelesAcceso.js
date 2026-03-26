export const NIVEL_LIBRE = 'libre';
export const NIVEL_REGISTRADO = 'fan'; // usuario registrado = fan (solo ve presskit/general si no es thug)
export const NIVEL_THUG = 'thug';

export const NIVELES = [NIVEL_LIBRE, NIVEL_REGISTRADO, NIVEL_THUG];

export const ETIQUETAS_NIVEL = {
  [NIVEL_LIBRE]: 'Libre',
  [NIVEL_REGISTRADO]: 'Fan',
  [NIVEL_THUG]: 'Thug',
};

export function puedeVerContenidoGeneral(nivel) {
  return nivel === NIVEL_REGISTRADO || nivel === 'registrado' || nivel === NIVEL_THUG;
}

export const ROL_ADMIN = 'admin';

/** Quien puede ver contenido exclusivo (Zona Thug): nivel thug o rol admin */
export function puedeVerContenidoExclusivo(nivel, rol) {
  if (rol === ROL_ADMIN) return true;
  return nivel === NIVEL_THUG;
}
export function esAdmin(perfil) {
  return perfil?.rol === ROL_ADMIN;
}

/** Pantalla “home” tras login y al volver al inicio: contenido general; solo admin va al panel. */
export function nombreRutaHomeApp(perfil) {
  if (!perfil) return 'Inicio';
  if (esAdmin(perfil)) return 'ModoAdmin';
  return 'ContenidoGeneral';
}

