/**
 * Permite inyectar `extra.eas.projectId` desde EXPO_PUBLIC_EAS_PROJECT_ID (.env local)
 * sin commitear el UUID. Tras `eas init`, Expo suele guardar el id en app.json igualmente.
 */
module.exports = ({ config }) => {
  const fromEnv = typeof process !== 'undefined' ? String(process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '').trim() : '';
  const existing = config?.extra?.eas?.projectId;
  const projectId = fromEnv || existing;
  return {
    ...config,
    extra: {
      ...(config.extra || {}),
      eas: {
        ...(config.extra?.eas || {}),
        ...(projectId ? { projectId } : {})
      }
    }
  };
};
