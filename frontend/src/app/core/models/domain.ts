import type { Activo, Auditoria, Lectura, Registro } from './tipos';

// Puntaje máximo alcanzable del índice de prioridad: 40 antigüedad + 30 fallas + 20 garantía + 20 costo (espejo de Prioridad.java).
export const PRIORIDAD_MAX = 110;
// Línea base en minutos de la auditoría manual con Excel (referencia interna de la empresa).
export const LINEA_BASE_MIN = 60;

export interface Attention {
  level: 'red' | 'amber' | 'green' | 'unknown';
  label: string;
  reasons: string[];
}

const day = (date: string) => Date.parse(date + 'T12:00:00Z');
const fecha = (iso?: string | null) =>
  iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '';

// Semáforo explicable: acumula TODOS los motivos (rojo tiene prioridad).
export function attention(a: Activo, registros: Registro[], today: string): Attention {
  const red: string[] = [];
  const amber: string[] = [];
  const mios = registros.filter((r) => r.activoId === a.id);
  const fallaAbierta = mios.find((r) => r.tipo === 'falla' && r.estado === 'abierta');
  if (fallaAbierta) red.push('Falla abierta: ' + fallaAbierta.descripcion);
  const mantVencido = mios.find(
    (r) => r.tipo === 'mantenimiento' && r.estado === 'abierta' && r.proxima && day(r.proxima) < day(today),
  );
  if (mantVencido) red.push('Mantenimiento vencido desde ' + fecha(mantVencido.proxima));
  const limite = day(today) - 90 * 86400000;
  const cerradas = mios.filter(
    (r) =>
      r.tipo === 'falla' &&
      r.estado === 'cerrada' &&
      r.cerradaEn &&
      day(r.cerradaEn.slice(0, 10)) <= day(today) &&
      day(r.cerradaEn.slice(0, 10)) >= limite,
  );
  if (cerradas.length >= 2) amber.push(cerradas.length + ' fallas cerradas en los últimos 90 días');
  if (a.garantiaHasta) {
    const dias = Math.round((day(a.garantiaHasta) - day(today)) / 86400000);
    if (dias < 0) amber.push('Garantía vencida el ' + fecha(a.garantiaHasta));
    else if (dias <= 30) amber.push(`Garantía vence en ${dias} días (${fecha(a.garantiaHasta)})`);
  }
  if (red.length) return { level: 'red', label: 'Atención prioritaria', reasons: [...red, ...amber] };
  if (amber.length) return { level: 'amber', label: 'Revisar pronto', reasons: amber };
  if (!a.garantiaHasta && mios.length === 0)
    return { level: 'unknown', label: 'Datos por completar', reasons: ['Sin fecha de garantía ni historial'] };
  return { level: 'green', label: 'Sin alertas', reasons: ['Sin fallas abiertas ni garantías por vencer'] };
}

export function resolveCode(input: string, assets: Activo[]): Activo | undefined {
  const value = input.trim();
  const m = value.match(/#\/(?:a|activo)\/([0-9a-f-]{36})/i);
  const clave = (m ? m[1] : value).toLowerCase();
  return assets.find(
    (a) => a.id.toLowerCase() === clave || a.codigo.toLowerCase() === clave || `inventario-ti:${a.id}` === value,
  );
}

export function addReading(audit: Auditoria, reading: Lectura): { audit: Auditoria; duplicate: boolean } {
  const lecturas = audit.lecturas ?? [];
  if (lecturas.some((r) => r.activoId === reading.activoId)) return { audit, duplicate: true };
  return { audit: { ...audit, lecturas: [...lecturas, reading] }, duplicate: false };
}

export function tally(audit: Auditoria) {
  const lecturas = audit.lecturas ?? [];
  const found = new Set(lecturas.map((r) => r.activoId));
  return {
    expectedFound: audit.esperados.filter((id) => found.has(id)),
    missing: audit.esperados.filter((id) => !found.has(id)),
    unexpected: lecturas.filter((r) => !audit.esperados.includes(r.activoId)),
    pending: lecturas.filter((r) => !r.sincronizada).length,
  };
}

export interface PrioridadResult {
  score: number;
  nivel: 'alta' | 'media' | 'baja';
  factores: string[];
}

// Índice explicable de prioridad de renovación. Mismos pesos que Prioridad.java.
export function prioridadRenovacion(a: Activo, registros: Registro[], today: string): PrioridadResult {
  const factores: string[] = [];
  let score = 0;
  if (a.compra) {
    const anios = Math.floor((day(today) - day(a.compra)) / (365.25 * 86400000));
    const puntos = Math.min(Math.max(anios, 0) * 8, 40);
    if (puntos > 0) {
      score += puntos;
      factores.push(`Antigüedad: ${anios} años (+${puntos})`);
    }
  } else {
    score += 5;
    factores.push('Sin fecha de compra registrada (+5)');
  }
  const limite = day(today) - 90 * 86400000;
  const fallas = registros.filter(
    (r) =>
      r.activoId === a.id &&
      r.tipo === 'falla' &&
      r.estado === 'cerrada' &&
      r.cerradaEn &&
      day(r.cerradaEn.slice(0, 10)) >= limite,
  ).length;
  if (fallas > 0) {
    const puntos = Math.min(fallas * 15, 30);
    score += puntos;
    factores.push(`${fallas} fallas cerradas en 90 días (+${puntos})`);
  }
  if (a.garantiaHasta) {
    if (day(a.garantiaHasta) < day(today)) {
      score += 20;
      factores.push(`Garantía vencida el ${fecha(a.garantiaHasta)} (+20)`);
    } else if (day(a.garantiaHasta) <= day(today) + 30 * 86400000) {
      score += 10;
      factores.push(`Garantía vence el ${fecha(a.garantiaHasta)} (+10)`);
    }
  }
  const costo = registros
    .filter((r) => r.activoId === a.id && r.tipo === 'mantenimiento' && r.costo)
    .reduce((s, r) => s + Number(r.costo), 0);
  if (costo > 0) {
    const puntos = Math.min(Math.floor(costo / 50) * 5, 20);
    if (puntos > 0) {
      score += puntos;
      factores.push(`Costo acumulado de mantenimientos: S/ ${costo} (+${puntos})`);
    }
  }
  const nivel = score >= 50 ? 'alta' : score >= 25 ? 'media' : 'baja';
  if (!factores.length) factores.push('Sin factores de riesgo registrados');
  return { score, nivel, factores };
}
