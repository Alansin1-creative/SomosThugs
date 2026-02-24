export const NIVEL_LIBRE = 'libre';
export const NIVEL_REGISTRADO = 'registrado';
export const NIVEL_THUG = 'thug';

export const NIVELES = [NIVEL_LIBRE, NIVEL_REGISTRADO, NIVEL_THUG];

export const ETIQUETAS_NIVEL = {
  [NIVEL_LIBRE]: 'Libre',
  [NIVEL_REGISTRADO]: 'Registrado',
  [NIVEL_THUG]: 'Thug',
};

export function puedeVerContenidoGeneral(nivel) {
  return nivel === NIVEL_REGISTRADO || nivel === NIVEL_THUG;
}

export function puedeVerContenidoExclusivo(nivel) {
  return nivel === NIVEL_THUG;
}
