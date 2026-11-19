import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attention, addReading, resolveCode, tally, prioridadRenovacion } from '../src/app/core/models/domain.ts';

const HOY = '2026-11-17';
const activo = (over = {}) => ({
  id: 'a1', codigo: 'TI-0001', tipo: 'Laptop', marca: 'Dell', modelo: 'Latitude',
  serie: 'S1', compra: '2024-01-01', garantiaHasta: '2027-01-01',
  ubicacion: 'Administración', responsable: 'Ana', estadoOp: 'operativo', asignacion: 'asignado',
  ...over,
});
const falla = (over = {}) => ({
  id: 'r1', activoId: 'a1', tipo: 'falla', estado: 'abierta', fecha: '2026-11-01T10:00:00Z',
  cerradaEn: null, descripcion: 'No enciende', tecnico: '', costo: null, proxima: null, ...over,
});

test('semáforo: verde sin alertas, rojo por falla abierta, ámbar por garantía', () => {
  assert.equal(attention(activo(), [], HOY).level, 'green');
  assert.equal(attention(activo(), [falla()], HOY).level, 'red');
  assert.equal(attention(activo({ garantiaHasta: '2026-10-01' }), [], HOY).level, 'amber');
  assert.equal(attention(activo({ garantiaHasta: '2026-12-01' }), [], HOY).level, 'amber');
  assert.equal(attention(activo({ garantiaHasta: null }), [], HOY).level, 'unknown');
});

test('semáforo acumula motivos y el rojo tiene prioridad', () => {
  const a = activo({ garantiaHasta: '2026-10-01' });
  const r = attention(a, [falla()], HOY);
  assert.equal(r.level, 'red');
  assert.ok(r.reasons.length >= 2);
});

test('mantenimiento vencido es rojo; dos fallas cerradas en 90 días es ámbar', () => {
  const mant = { ...falla(), tipo: 'mantenimiento', proxima: '2026-10-01' };
  assert.equal(attention(activo(), [mant], HOY).level, 'red');
  const cerradas = [
    falla({ id: 'f1', estado: 'cerrada', cerradaEn: '2026-10-01T10:00:00Z' }),
    falla({ id: 'f2', estado: 'cerrada', cerradaEn: '2026-10-20T10:00:00Z' }),
  ];
  assert.equal(attention(activo(), cerradas, HOY).level, 'amber');
});

test('resolveCode acepta código, UUID y URL del QR; rechaza externos', () => {
  const uuid = '11111111-1111-4111-8111-111111111111';
  const assets = [activo({ id: uuid })];
  assert.equal(resolveCode(' ti-0001 ', assets)?.id, uuid);
  assert.equal(resolveCode('inventario-ti:' + uuid, assets)?.codigo, 'TI-0001');
  assert.equal(resolveCode('https://x.com/#/activo/' + uuid, assets)?.id, uuid);
  assert.equal(resolveCode('https://example.com/otra-cosa', assets), undefined);
});

test('auditoría no cuenta duplicados y detecta faltantes y otra ubicación', () => {
  let aud = { id: 'aud1', ubicacion: 'Administración', estado: 'abierta', esperados: ['a1', 'a2'], lecturas: [] };
  aud = addReading(aud, { activoId: 'a1', leidaEn: 'x', origen: 'Código', sincronizada: false }).audit;
  const rep = addReading(aud, { activoId: 'a1', leidaEn: 'x', origen: 'Código', sincronizada: false });
  assert.equal(rep.duplicate, true);
  aud = addReading(aud, { activoId: 'a3', leidaEn: 'x', origen: 'Código', sincronizada: false }).audit;
  const t = tally(aud);
  assert.deepEqual(t.expectedFound, ['a1']);
  assert.deepEqual(t.missing, ['a2']);
  assert.equal(t.unexpected[0].activoId, 'a3');
  assert.equal(t.pending, 2);
  assert.equal(tally({ ...aud, lecturas: aud.lecturas.map((l) => ({ ...l, sincronizada: true })) }).pending, 0);
});

test('prioridad de renovación es explicable y sube con antigüedad y fallas', () => {
  const nuevo = prioridadRenovacion(activo({ compra: '2026-01-01' }), [], HOY);
  assert.equal(nuevo.nivel, 'baja');
  const viejo = prioridadRenovacion(
    activo({ compra: '2018-01-01', garantiaHasta: '2021-01-01' }),
    [falla({ estado: 'cerrada', cerradaEn: '2026-10-01T10:00:00Z' })],
    HOY,
  );
  assert.ok(viejo.score >= 50);
  assert.equal(viejo.nivel, 'alta');
  assert.ok(viejo.factores.some((f) => f.includes('Antigüedad')));
  assert.ok(viejo.factores.some((f) => f.includes('Garantía vencida')));
});