import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { registrarPushToken } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function obtenerProjectIdExpo() {
  return (
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    Constants?.expoConfig?.extra?.eas?.projectId ||
    Constants?.easConfig?.projectId ||
    undefined
  );
}

export async function registrarPushUsuario() {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) return null;
  try {
    const permisos = await Notifications.getPermissionsAsync();
    let status = permisos.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return null;

    const projectId = obtenerProjectIdExpo();
    const tok = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : {});
    const token = tok?.data || null;
    if (!token) return null;
    await registrarPushToken(token);
    return token;
  } catch (_) {
    return null;
  }
}

