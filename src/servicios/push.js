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
    shouldShowList: true
  })
});

function obtenerProjectIdExpo() {
  return (
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    Constants?.expoConfig?.extra?.eas?.projectId ||
    Constants?.easConfig?.projectId ||
    undefined);

}

export async function registrarPushUsuario() {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) return null;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Somos Thugs',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00dc57',
        sound: 'default'
      });
    }

    const permisos = await Notifications.getPermissionsAsync();
    let status = permisos.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return null;

    const projectId = obtenerProjectIdExpo();
    if (!projectId && typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn(
        '[push] Falta EAS project id: definí extra.eas.projectId (tras `eas init`) o EXPO_PUBLIC_EAS_PROJECT_ID en .env'
      );
    }
    const tok = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : {});
    const token = tok?.data || null;
    if (!token) return null;
    await registrarPushToken(token);
    return token;
  } catch (e) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[push] registrarPushUsuario:', e?.message || e);
    }
    return null;
  }
}