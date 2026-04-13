import { Platform } from 'react-native';

/**
 * `expo-auth-session` exige `webClientId` definido al montar el hook en web; si falta
 * `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, un `undefined` revienta la app antes de poder mostrar un aviso.
 * Este valor solo cumple el invariant; OAuth real sigue bloqueado hasta configurar el .env.
 */
const WEB_CLIENT_ID_HOOK_PLACEHOLDER = '000000000000-placeholder.apps.googleusercontent.com';

/**
 * @param {string | undefined} envWebClientId Valor leído de EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
 * @returns {string | undefined} `webClientId` para pasar a `useIdTokenAuthRequest`
 */
export function googleWebClientIdForExpoHook(envWebClientId) {
  if (Platform.OS !== 'web') return undefined;
  return envWebClientId || WEB_CLIENT_ID_HOOK_PLACEHOLDER;
}
