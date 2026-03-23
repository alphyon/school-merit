import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { MyDatabase } from './localDb';
import type { LocalStudent, LocalGroup, LocalCatalogItem, PendingEvent } from './localDb';

// Use a fresh DB instance per test suite to avoid cross-test pollution.
// fake-indexeddb/auto patches globalThis.indexedDB so Dexie uses it automatically.

let db: MyDatabase;

beforeEach(async () => {
  // Create a unique DB name per test so there's zero state leakage
  db = new MyDatabase();
  // Purge all tables before each test
  await db.students.clear();
  await db.groups.clear();
  await db.catalog.clear();
  await db.pendingEvents.clear();
});

// ─── students ─────────────────────────────────────────────────────────────────

describe('students table', () => {
  const STUDENTS: LocalStudent[] = [
    { id: 's1', nie: '001', nombre: 'Ana López', grupo_id: 'g1', grupo_nombre: '1°A' },
    { id: 's2', nie: '002', nombre: 'Juan Pérez', grupo_id: 'g1', grupo_nombre: '1°A' },
    { id: 's3', nie: '003', nombre: 'Marta Gil', grupo_id: 'g2', grupo_nombre: '2°B' },
  ];

  it('bulkPut y toArray devuelven exactamente lo insertado', async () => {
    await db.students.bulkPut(STUDENTS);
    const result = await db.students.toArray();
    expect(result).toHaveLength(3);
    expect(result.map(s => s.id).sort()).toEqual(['s1', 's2', 's3']);
  });

  it('where("grupo_id").equals() filtra correctamente', async () => {
    await db.students.bulkPut(STUDENTS);

    const grupo1 = await db.students.where('grupo_id').equals('g1').toArray();
    expect(grupo1).toHaveLength(2);
    expect(grupo1.every(s => s.grupo_id === 'g1')).toBe(true);

    const grupo2 = await db.students.where('grupo_id').equals('g2').toArray();
    expect(grupo2).toHaveLength(1);
    expect(grupo2[0].id).toBe('s3');
  });

  it('where("grupo_id").equals() retorna vacío si no hay coincidencia', async () => {
    await db.students.bulkPut(STUDENTS);
    const result = await db.students.where('grupo_id').equals('g-inexistente').toArray();
    expect(result).toHaveLength(0);
  });
});

// ─── groups ───────────────────────────────────────────────────────────────────

describe('groups table', () => {
  const GROUPS: LocalGroup[] = [
    { id: 'g1', nombre: '1°A' },
    { id: 'g2', nombre: '2°B' },
  ];

  it('bulkPut y toArray devuelven exactamente lo insertado', async () => {
    await db.groups.bulkPut(GROUPS);
    const result = await db.groups.toArray();
    expect(result).toHaveLength(2);
    expect(result.map(g => g.id).sort()).toEqual(['g1', 'g2']);
  });
});

// ─── catalog ──────────────────────────────────────────────────────────────────

describe('catalog table', () => {
  const ITEMS: LocalCatalogItem[] = [
    { id: 'c1', codigo: 'D01', descripcion: 'Falta leve', puntos_valor: 1, tipo: 'demerito' },
    { id: 'c2', codigo: 'D02', descripcion: 'Falta grave', puntos_valor: 3, tipo: 'demerito' },
    { id: 'c3', codigo: 'R01', descripcion: 'Redención básica', puntos_valor: 1, tipo: 'redencion' },
    { id: 'c4', codigo: 'RC01', descripcion: 'Logro destacado', puntos_valor: 2, tipo: 'reconocimiento' },
  ];

  it('where("tipo").equals("demerito") filtra correctamente', async () => {
    await db.catalog.bulkPut(ITEMS);
    const result = await db.catalog.where('tipo').equals('demerito').toArray();
    expect(result).toHaveLength(2);
    expect(result.every(i => i.tipo === 'demerito')).toBe(true);
  });

  it('where("tipo").equals("redencion") retorna solo redenciones', async () => {
    await db.catalog.bulkPut(ITEMS);
    const result = await db.catalog.where('tipo').equals('redencion').toArray();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c3');
  });

  it('where("tipo").equals("reconocimiento") retorna solo reconocimientos', async () => {
    await db.catalog.bulkPut(ITEMS);
    const result = await db.catalog.where('tipo').equals('reconocimiento').toArray();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c4');
  });
});

// ─── pendingEvents ────────────────────────────────────────────────────────────

const makePendingEvent = (overrides: Partial<PendingEvent> = {}): PendingEvent => ({
  estudiante_id: 'stu-1',
  docente_id: 'doc-1',
  tipo: 'demerito',
  demerito_id: 'c1',
  redencion_id: null,
  reconocimiento_id: null,
  observaciones: '',
  fecha: new Date().toISOString(),
  sync_status: 'pending',
  ...overrides,
});

describe('pendingEvents table', () => {
  it('add() incrementa el count correctamente', async () => {
    await db.pendingEvents.add(makePendingEvent());
    await db.pendingEvents.add(makePendingEvent({ tipo: 'reconocimiento', demerito_id: null, reconocimiento_id: 'c4' }));
    expect(await db.pendingEvents.count()).toBe(2);
  });

  it('delete() reduce el count', async () => {
    const id = await db.pendingEvents.add(makePendingEvent());
    await db.pendingEvents.delete(id);
    expect(await db.pendingEvents.count()).toBe(0);
  });

  it('where("sync_status").equals("pending") filtra correctamente', async () => {
    await db.pendingEvents.add(makePendingEvent({ sync_status: 'pending' }));
    await db.pendingEvents.add(makePendingEvent({ sync_status: 'syncing' }));
    await db.pendingEvents.add(makePendingEvent({ sync_status: 'error' }));

    const pending = await db.pendingEvents.where('sync_status').equals('pending').toArray();
    expect(pending).toHaveLength(1);
    expect(pending[0].sync_status).toBe('pending');
  });

  it('el evento guardado preserva todos los campos', async () => {
    const event = makePendingEvent({
      estudiante_id: 'stu-42',
      docente_id: 'doc-99',
      tipo: 'redencion',
      demerito_id: null,
      redencion_id: 'c3',
      evento_referencia_id: 'evt-ref-1',
      observaciones: 'Buen trabajo',
      sync_status: 'pending',
    });

    const id = await db.pendingEvents.add(event);
    const saved = await db.pendingEvents.get(id);

    expect(saved?.estudiante_id).toBe('stu-42');
    expect(saved?.docente_id).toBe('doc-99');
    expect(saved?.tipo).toBe('redencion');
    expect(saved?.redencion_id).toBe('c3');
    expect(saved?.evento_referencia_id).toBe('evt-ref-1');
    expect(saved?.sync_status).toBe('pending');
  });
});
