import {
  getUnsyncedScans,
  markScanSynced,
  deleteSyncedScans,
  getAllOfflineScansCount,
  type OfflineScan,
} from './indexed-db';

type SyncListener = (pendingCount: number) => void;

const listeners = new Set<SyncListener>();
let syncing = false;

export function onSyncChange(fn: SyncListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function notifyListeners() {
  const count = await getAllOfflineScansCount();
  for (const fn of listeners) fn(count);
}

function getAuthHeaders(): Record<string, string> {
  try {
    const stored = localStorage.getItem('inventarispoq_auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.token) return { Authorization: `Bearer ${parsed.token}` };
    }
  } catch { /* ignore */ }
  return {};
}

async function uploadScan(scan: OfflineScan): Promise<boolean> {
  try {
    const formData = new FormData();
    formData.append('floorId', scan.floorId);
    formData.append('confirmedTypeId', scan.confirmedTypeId);
    formData.append('quantity', String(scan.quantity));
    if (scan.photoBlob) {
      formData.append('photo', scan.photoBlob, 'scan.jpg');
    }

    const res = await fetch(`/api/sessions/${scan.sessionId}/scans/manual`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });

    return res.ok;
  } catch {
    return false;
  }
}

export async function syncPendingScans(): Promise<void> {
  if (syncing || !navigator.onLine) return;
  syncing = true;

  try {
    const unsynced = await getUnsyncedScans();
    if (unsynced.length === 0) return;

    for (const scan of unsynced) {
      if (!navigator.onLine) break;

      const ok = await uploadScan(scan);
      if (ok) {
        await markScanSynced(scan.id);
        await notifyListeners();
      } else {
        await delay(2000);
      }
    }

    await deleteSyncedScans();
  } finally {
    syncing = false;
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

let started = false;

export function startBackgroundSync(): void {
  if (started) return;
  started = true;

  window.addEventListener('online', () => {
    syncPendingScans();
  });

  syncPendingScans();

  setInterval(() => {
    if (navigator.onLine) syncPendingScans();
  }, 30_000);
}
