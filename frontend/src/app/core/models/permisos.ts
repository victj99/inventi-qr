import type { Usuario } from './tipos';

// Misma matriz que backend Permisos.java e inventario-ti-qr/src/permisos.js.
// El servidor impone los permisos de verdad; esto solo controla la interfaz.
const P: Record<string, string[]> = {
  administrador: [
    'ver',
    'historial',
    'crear',
    'editar',
    'asignar',
    'estado',
    'falla',
    'mantenimiento',
    'baja',
    'auditar',
    'importar',
    'exportar',
    'etiquetas',
    'panel',
    'usuarios',
  ],
  tecnico: [
    'ver',
    'historial',
    'editar',
    'asignar',
    'estado',
    'falla',
    'mantenimiento',
    'auditar',
    'exportar',
    'etiquetas',
    'panel',
  ],
  colaborador: ['ver', 'falla'],
  consulta: ['ver', 'historial', 'panel', 'exportar'],
};

export const ROLES = Object.keys(P);

// Etiqueta legible de cada rol para la interfaz («Técnico» con tilde; humano() no basta).
// El dato en BD sigue siendo el valor crudo ('tecnico'); esto solo cambia lo que se muestra.
export const ROL_LABELS: Record<Usuario['rol'], string> = {
  administrador: 'Administrador',
  tecnico: 'Técnico',
  colaborador: 'Colaborador',
  consulta: 'Consulta',
};
export const rolLabel = (rol: Usuario['rol'] | undefined | null) =>
  (rol && ROL_LABELS[rol]) || '';

export const can = (rol: string | undefined | null, accion: string) =>
  !!rol && !!P[rol]?.includes(accion);
