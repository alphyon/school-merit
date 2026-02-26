import Dexie, { type Table } from 'dexie';

export interface LocalStudent {
  id: string;
  nie: string;
  nombre: string;
  grupo_id: string;
  grupo_nombre: string;
}

export interface PendingEvent {
  id?: number;
  estudiante_id: string;
  docente_id: string;
  tipo: 'demerito' | 'redencion';
  demerito_id: string | null;
  redencion_id: string | null;
  observaciones: string;
  fecha: string;
  sync_status: 'pending' | 'syncing' | 'error';
}

export class MyDatabase extends Dexie {
  students!: Table<LocalStudent>;
  pendingEvents!: Table<PendingEvent>;

  constructor() {
    super('DemeritosOfflineDB');
    this.version(1).stores({
      students: 'id, nie, nombre, grupo_id',
      pendingEvents: '++id, estudiante_id, sync_status'
    });
  }
}

export const db = new MyDatabase();
