import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface OfflineScan {
  id: string;
  sessionId: string;
  floorId: string;
  confirmedTypeId: string;
  confirmedTypeName: string;
  quantity: number;
  photoBlob: Blob | null;
  createdAt: string;
  synced: boolean;
}

interface InventariSpoqDB extends DBSchema {
  offlineScans: {
    key: string;
    value: OfflineScan;
    indexes: { 'by-session': string; 'by-synced': number };
  };
  appState: {
    key: string;
    value: { key: string; value: string };
  };
}

let dbInstance: IDBPDatabase<InventariSpoqDB> | null = null;

export async function getDb(): Promise<IDBPDatabase<InventariSpoqDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<InventariSpoqDB>('inventarispoq', 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 2) {
        const names = db.objectStoreNames as unknown as DOMStringList;
        if (names.contains('pendingScans')) {
          (db as any).deleteObjectStore('pendingScans');
        }
        if (names.contains('syncQueue')) {
          (db as any).deleteObjectStore('syncQueue');
        }
        if (!db.objectStoreNames.contains('appState')) {
          db.createObjectStore('appState', { keyPath: 'key' });
        }
      }

      if (!db.objectStoreNames.contains('offlineScans')) {
        const store = db.createObjectStore('offlineScans', { keyPath: 'id' });
        store.createIndex('by-session', 'sessionId');
        store.createIndex('by-synced', 'synced');
      }
    },
  });

  return dbInstance;
}

export async function saveOfflineScan(scan: OfflineScan): Promise<void> {
  const db = await getDb();
  await db.put('offlineScans', scan);
}

export async function getOfflineScansForSession(sessionId: string): Promise<OfflineScan[]> {
  const db = await getDb();
  return db.getAllFromIndex('offlineScans', 'by-session', sessionId);
}

export async function getUnsyncedScans(): Promise<OfflineScan[]> {
  const db = await getDb();
  const all = await db.getAll('offlineScans');
  return all.filter((s) => !s.synced);
}

export async function getAllOfflineScansCount(): Promise<number> {
  const db = await getDb();
  const all = await db.getAll('offlineScans');
  return all.filter((s) => !s.synced).length;
}

export async function markScanSynced(id: string): Promise<void> {
  const db = await getDb();
  const scan = await db.get('offlineScans', id);
  if (scan) {
    scan.synced = true;
    await db.put('offlineScans', scan);
  }
}

export async function deleteSyncedScans(): Promise<void> {
  const db = await getDb();
  const all = await db.getAll('offlineScans');
  for (const scan of all) {
    if (scan.synced) {
      await db.delete('offlineScans', scan.id);
    }
  }
}

export async function setAppState(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.put('appState', { key, value });
}

export async function getAppState(key: string): Promise<string | undefined> {
  const db = await getDb();
  const item = await db.get('appState', key);
  return item?.value;
}
