import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface PendingScan {
  id: string;
  sessionId: string;
  photoBlob: Blob;
  createdAt: string;
  synced: boolean;
}

interface SyncQueueItem {
  id: string;
  sessionId: string;
  scanId: string;
  attempts: number;
  lastAttempt: string | null;
}

interface InventariSpoqDB extends DBSchema {
  pendingScans: {
    key: string;
    value: PendingScan;
    indexes: { 'by-session': string; 'by-synced': number };
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: { 'by-session': string };
  };
  appState: {
    key: string;
    value: { key: string; value: string };
  };
}

let dbInstance: IDBPDatabase<InventariSpoqDB> | null = null;

export async function getDb(): Promise<IDBPDatabase<InventariSpoqDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<InventariSpoqDB>('inventarispoq', 1, {
    upgrade(db) {
      const scanStore = db.createObjectStore('pendingScans', { keyPath: 'id' });
      scanStore.createIndex('by-session', 'sessionId');
      scanStore.createIndex('by-synced', 'synced');

      const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
      queueStore.createIndex('by-session', 'sessionId');

      db.createObjectStore('appState', { keyPath: 'key' });
    },
  });

  return dbInstance;
}

export async function savePendingScan(scan: PendingScan): Promise<void> {
  const db = await getDb();
  await db.put('pendingScans', scan);
}

export async function getPendingScans(sessionId: string): Promise<PendingScan[]> {
  const db = await getDb();
  return db.getAllFromIndex('pendingScans', 'by-session', sessionId);
}

export async function getUnsyncedScans(): Promise<PendingScan[]> {
  const db = await getDb();
  const all = await db.getAll('pendingScans');
  return all.filter((s) => !s.synced);
}

export async function markScanSynced(id: string): Promise<void> {
  const db = await getDb();
  const scan = await db.get('pendingScans', id);
  if (scan) {
    scan.synced = true;
    await db.put('pendingScans', scan);
  }
}

export async function clearSyncedScans(): Promise<void> {
  const db = await getDb();
  const all = await db.getAll('pendingScans');
  for (const scan of all) {
    if (scan.synced) {
      await db.delete('pendingScans', scan.id);
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
