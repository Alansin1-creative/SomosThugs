import { apiRegister, apiLogin, apiLoginGoogle, apiPerfil, setToken, removeToken } from './api';

export async function registrarEmail(email, password, datosExtra = {}) {
  const body = {
    email,
    password,
    nombreCompleto: datosExtra.nombreCompleto ?? '',
    username: datosExtra.username ?? '',
    telefono: datosExtra.telefono ?? '',
    aceptaNotificaciones: datosExtra.aceptaNotificaciones !== false
  };
  if (datosExtra.fotoBase64) body.fotoBase64 = datosExtra.fotoBase64;
  const { perfil, token } = await apiRegister(body);
  await setToken(token);
  return perfil;
}

export async function iniciarSesionEmail(email, password) {
  const { perfil, token } = await apiLogin({ email, password });
  await setToken(token);
  return perfil;
}

export async function signOut() {
  await removeToken();
}

export async function iniciarSesionConTokenGoogle(idToken) {
  const { perfil, token } = await apiLoginGoogle(idToken);
  await setToken(token);
  return perfil;
}

export async function obtenerPerfil() {
  return apiPerfil();
}