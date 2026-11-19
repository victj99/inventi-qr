import { Injectable } from '@angular/core';
import { Usuario } from '../models/tipos';

const TOKEN = 'inventi_token';
const USER = 'inventi_user';

export const getToken = () => sessionStorage.getItem(TOKEN);
export const getUsuario = (): Usuario | null => {
  try {
    const raw = sessionStorage.getItem(USER);
    return raw ? (JSON.parse(raw) as Usuario) : null;
  } catch {
    return null;
  }
};
export const haySesion = () => !!getToken() && !!getUsuario();

export function guardarSesion(token: string, usuario: Usuario) {
  sessionStorage.setItem(TOKEN, token);
  sessionStorage.setItem(USER, JSON.stringify(usuario));
}
export function cerrarSesion() {
  sessionStorage.removeItem(TOKEN);
  sessionStorage.removeItem(USER);
}
export function actualizarUsuario(usuario: Usuario) {
  sessionStorage.setItem(USER, JSON.stringify(usuario));
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Sesión caducada: mismo cierre y aviso que usa la API principal.
function sesionExpirada(): never {
  cerrarSesion();
  window.dispatchEvent(new Event('inventi:sesion-expirada'));
  location.hash = '#/login';
  throw new ApiError(401, 'Sesión expirada. Inicia sesión de nuevo.');
}

async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch('/api' + ruta, {
    method: metodo,
    headers,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  if (res.status === 401 && ruta !== '/auth/login') {
    sesionExpirada();
  }
  if (!res.ok) {
    let msg = 'Error ' + res.status;
    try {
      const j = await res.json();
      msg = j.message || j.error || msg;
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  const tipo = res.headers.get('content-type') || '';
  return (tipo.includes('json') ? await res.json() : await res.blob()) as T;
}

export const api = {
  login: (email: string, password: string) =>
    pedir<{ token: string; usuario: Usuario }>('POST', '/auth/login', { email, password }),
  me: () => pedir<Usuario>('GET', '/auth/me'),
  bootstrap: () =>
    pedir<{ activos: unknown[]; registros: unknown[]; auditorias: unknown[]; historial: unknown[] }>(
      'GET',
      '/bootstrap',
    ),
  get: <T>(ruta: string) => pedir<T>('GET', ruta),
  post: <T>(ruta: string, cuerpo?: unknown) => pedir<T>('POST', ruta, cuerpo),
  patch: <T>(ruta: string, cuerpo: unknown) => pedir<T>('PATCH', ruta, cuerpo),
};

// Descarga autenticada de reportes (xlsx/pdf).
export async function descargarReporte(ruta: string, nombre: string) {
  const res = await fetch('/api' + ruta, { headers: { Authorization: 'Bearer ' + getToken() } });
  if (res.status === 401) sesionExpirada();
  if (!res.ok) throw new ApiError(res.status, 'No se pudo generar el reporte');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  getToken = getToken;
  getUsuario = getUsuario;
  haySesion = haySesion;
  guardarSesion = guardarSesion;
  cerrarSesion = cerrarSesion;
  api = api;
  descargarReporte = descargarReporte;
}
