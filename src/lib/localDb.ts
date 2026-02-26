import Dexie, { type Table } from 'dexie';

export interface LocalStudent {
  id: string;
  nie: string;
  nombre: string;
  grupo_id: string;
  grupo_nombre: string;
}

export interface LocalGroup {
  id: string;
  nombre: string;
}

export interface LocalCatalogItem {
  id: string;
  codigo: string;
  descripcion: string;
  puntos_valor: number;
  tipo: 'demerito' | 'redencion';
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
  groups!: Table<LocalGroup>;
  catalog!: Table<LocalCatalogItem>;
  pendingEvents!: Table<PendingEvent>;

  constructor() {
    super('DemeritosOfflineDB');
    this.version(2).stores({ // Subimos versión para aplicar cambios
      students: 'id, nie, nombre, grupo_id',
      groups: 'id, nombre',
      catalog: 'id, codigo, tipo',
      pendingEvents: '++id, estudiante_id, sync_status'
    });
  }
}

export const db = new MyDatabase();
