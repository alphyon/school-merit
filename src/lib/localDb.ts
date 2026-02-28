import Dexie, { type Table } from 'dexie';

export interface LocalStudent {
  id: string;
  nie: string;
  nombre: string;
  grupo_id: string;
  grupo_nombre: string;
  balance_puntos?: number;
  puntos_limpiados?: number;
  total_reconocimientos?: number;
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
  tipo: 'demerito' | 'redencion' | 'reconocimiento';
}

export interface PendingEvent {
  id?: number;
  estudiante_id: string;
  docente_id: string;
  tipo: 'demerito' | 'redencion' | 'reconocimiento';
  demerito_id: string | null;
  redencion_id: string | null;
  reconocimiento_id?: string | null;
  evento_referencia_id?: string | null;
  observaciones: string;
  fecha: string;
  sync_status: 'pending' | 'syncing' | 'error';
  estado?: 'activo' | 'redimido';
}

export class MyDatabase extends Dexie {
  students!: Table<LocalStudent>;
  groups!: Table<LocalGroup>;
  catalog!: Table<LocalCatalogItem>;
  pendingEvents!: Table<PendingEvent>;

  constructor() {
    super('DemeritosOfflineDB');
    this.version(3).stores({ 
      students: 'id, nie, nombre, grupo_id',
      groups: 'id, nombre',
      catalog: 'id, codigo, tipo',
      pendingEvents: '++id, estudiante_id, sync_status'
    });
  }
}

export const db = new MyDatabase();
