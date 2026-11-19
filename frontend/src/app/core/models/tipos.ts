export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: 'administrador' | 'tecnico' | 'colaborador' | 'consulta';
  activo?: boolean;
  creadoEn?: string | null;
  ultimoAcceso?: string | null;
  passwordActualizadoEn?: string | null;
}

export interface Activo {
  id: string;
  codigo: string;
  tipo: string;
  marca: string;
  modelo: string;
  serie: string | null;
  compra: string | null;
  garantiaHasta: string | null;
  ubicacion: string;
  responsable: string;
  estadoOp: string;
  asignacion: string;
  creadoEn?: string;
}

export interface Registro {
  id: string;
  activoId: string;
  tipo: 'falla' | 'mantenimiento';
  estado: 'abierta' | 'cerrada';
  fecha: string;
  cerradaEn: string | null;
  descripcion: string;
  tecnico: string;
  costo: number | string | null;
  proxima: string | null;
}

export interface Lectura {
  auditoriaId?: string;
  activoId: string;
  leidaEn: string;
  origen: 'Cámara' | 'Código' | 'Imagen';
  sincronizada?: boolean;
}

export interface Auditoria {
  id: string;
  ubicacion: string;
  autor: string;
  autorNombre: string;
  inicio: string;
  fin: string | null;
  estado: 'abierta' | 'cerrada';
  esperados: string[];
  lecturas?: Lectura[];
}

export interface Historial {
  id: string;
  activoId: string;
  fecha: string;
  autor: string | null;
  autorNombre: string;
  accion: string;
  antes: string;
  despues: string;
}

export interface Prioridad {
  activoId: string;
  codigo: string;
  score: number;
  nivel: 'alta' | 'media' | 'baja';
  factores: string[];
}

export const ESTADOS_OP = ['operativo', 'averiado', 'en mantenimiento', 'de baja'];
export const ASIGNACIONES = ['disponible', 'asignado', 'prestado', 'extraviado'];
export const CAMPOS = [
  'codigo',
  'tipo',
  'marca',
  'modelo',
  'serie',
  'compra',
  'garantiaHasta',
  'ubicacion',
  'responsable',
];
