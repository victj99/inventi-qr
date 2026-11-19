import { Activo, CAMPOS } from './tipos';

// Nombre legible de un activo: tipo + marca + modelo.
export const nombreActivo = (a: Activo) => [a.tipo, a.marca, a.modelo].filter(Boolean).join(' ');

// Icono según el tipo de equipo.
export const tipoIcon = (tipo: string): string => {
  const t = (tipo || '').toLowerCase();
  if (t.includes('laptop')) return 'laptop';
  if (t.includes('monitor')) return 'monitor';
  if (t.includes('impresora')) return 'printer';
  if (t.includes('router')) return 'router';
  if (t.includes('lector')) return 'reader';
  return 'box';
};

// Capitaliza solo la primera letra para mostrar valores enum en la UI (no altera el dato).
export const humano = (v: string) => (v ? v.charAt(0).toUpperCase() + v.slice(1) : v);

// URL que codifica el QR: lleva el UUID aleatorio, nunca datos internos (RNF03).
export const urlActivo = (a: Activo) => location.origin + location.pathname + '#/activo/' + a.id;

// Acepta la URL leída del QR, el UUID, el código impreso o el formato del prototipo anterior.
export function resolverActivo(activos: Activo[], texto: string): Activo | undefined {
  const t = (texto || '').trim();
  const m = t.match(/#\/(?:a|activo)\/([0-9a-f-]{36})/i);
  const clave = (m ? m[1] : t).toLowerCase();
  return activos.find(
    (a) => a.id.toLowerCase() === clave || a.codigo.toLowerCase() === clave || `inventario-ti:${a.id}` === t,
  );
}

export function aCSV(filas: Record<string, unknown>[], columnas: string[]) {
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [columnas.join(','), ...filas.map((f) => columnas.map((c) => esc(f[c])).join(','))].join('\n');
}

export function descargar(nombre: string, contenido: string, tipo = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob(['\ufeff' + contenido], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

// CSV con comillas. Cabeceras: codigo,tipo,marca,modelo,serie,compra,garantiaHasta,ubicacion,responsable
export function leerCSV(texto: string): Record<string, string>[] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let cel = '';
  let q = false;
  const t = texto.replace(/^\ufeff/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') {
        cel += '"';
        i++;
      } else if (c === '"') q = false;
      else cel += c;
    } else if (c === '"') q = true;
    else if (c === ',' || c === ';') {
      fila.push(cel);
      cel = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      fila.push(cel);
      cel = '';
      if (fila.some((x) => x.trim())) filas.push(fila);
      fila = [];
    } else cel += c;
  }
  fila.push(cel);
  if (fila.some((x) => x.trim())) filas.push(fila);
  if (!filas.length) return [];
  const cab = filas[0].map((h) => h.trim());
  return filas
    .slice(1)
    .map((f) => Object.fromEntries(CAMPOS.map((k) => [k, (f[cab.indexOf(k)] ?? '').trim()])));
}
