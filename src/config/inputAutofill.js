import { Platform } from 'react-native';

function extrasWebAntiGestores() {
  if (Platform.OS !== 'web') return {};
  return {
    autoCorrect: false,
    spellCheck: false,
    'data-lpignore': 'true',
    'data-1p-ignore': 'true',
    'data-bwignore': 'true',
    'data-form-type': 'other'
  };
}

/** Registro / alta: evita que el navegador y gestores rellenen credenciales guardadas. */
export const inputPropsRegistroSinAutofill = {
  autoComplete: 'off',
  ...extrasWebAntiGestores(),
  ...(Platform.OS === 'android' ? { importantForAutofill: 'no' } : {}),
  ...(Platform.OS === 'ios' ? { textContentType: 'none' } : {})
};

export const inputPropsRegistroPassword = {
  autoComplete: 'new-password',
  ...extrasWebAntiGestores(),
  ...(Platform.OS === 'android' ? { importantForAutofill: 'no' } : {}),
  ...(Platform.OS === 'ios' ? { textContentType: 'newPassword' } : {})
};

/** Inicio de sesión: permite correo y contraseña guardados. */
export const inputPropsLoginEmail = {
  autoComplete: 'email',
  ...(Platform.OS === 'android' ? { importantForAutofill: 'yes' } : {}),
  ...(Platform.OS === 'ios' ? { textContentType: 'emailAddress' } : {})
};

export const inputPropsLoginPassword = {
  autoComplete: 'current-password',
  ...(Platform.OS === 'android' ? { importantForAutofill: 'yes' } : {}),
  ...(Platform.OS === 'ios' ? { textContentType: 'password' } : {})
};
