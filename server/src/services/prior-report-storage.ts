import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { config } from '../config.js';

const PRIOR_SUBDIR = 'prior-reports';

export function getPriorReportsRoot(): string {
  const root = path.join(config.STORAGE_PATH, PRIOR_SUBDIR);
  fs.mkdirSync(root, { recursive: true });
  return root;
}

export function getPriorReportDir(sessionId: string): string {
  const dir = path.join(getPriorReportsRoot(), sessionId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function extensionForMime(mimeType: string): string {
  const m = mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;
  if (m === 'application/pdf') return 'pdf';
  if (m === 'image/png') return 'png';
  if (m === 'image/webp') return 'webp';
  if (m === 'image/jpeg') return 'jpg';
  return 'bin';
}

/** Returns relative path from STORAGE_PATH: prior-reports/{sessionId}/{uuid}.{ext} */
export function savePriorReportBinary(
  sessionId: string,
  buffer: Buffer,
  mimeType: string,
): { id: string; relativePath: string; normalizedMime: string } {
  const id = randomUUID();
  const normalizedMime = mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;
  const ext = extensionForMime(normalizedMime);
  const dir = getPriorReportDir(sessionId);
  const filename = `${id}.${ext}`;
  const abs = path.join(dir, filename);
  fs.writeFileSync(abs, buffer);
  const relativePath = path.join(PRIOR_SUBDIR, sessionId, filename);
  return { id, relativePath, normalizedMime };
}

/** Returns relative path from STORAGE_PATH: prior-reports/{sessionId}/{id}.pdf */
export function savePriorReportPdf(sessionId: string, buffer: Buffer): { id: string; relativePath: string } {
  const { id, relativePath } = savePriorReportBinary(sessionId, buffer, 'application/pdf');
  return { id, relativePath };
}

export function getPriorReportAbsolutePath(relativePath: string): string {
  return path.join(config.STORAGE_PATH, relativePath);
}

/**
 * Schrijf meerdere verslag-foto's onder één map (één DB-record, één vision-batch).
 * Relatief pad: prior-reports/{sessionId}/imgbatch-{uuid}/p-0.jpg, …
 */
export function savePriorReportImageBatch(
  sessionId: string,
  parts: Array<{ buffer: Buffer; mimeType: string }>,
): { batchRelativeDir: string } {
  const batchId = randomUUID();
  const sessionDir = getPriorReportDir(sessionId);
  const batchDirName = `imgbatch-${batchId}`;
  const batchAbs = path.join(sessionDir, batchDirName);
  fs.mkdirSync(batchAbs, { recursive: true });

  parts.forEach((p, i) => {
    const normalized = p.mimeType === 'image/jpg' ? 'image/jpeg' : p.mimeType;
    const ext = extensionForMime(normalized);
    fs.writeFileSync(path.join(batchAbs, `p-${i}.${ext}`), p.buffer);
  });

  const batchRelativeDir = path.join(PRIOR_SUBDIR, sessionId, batchDirName);
  return { batchRelativeDir };
}

/** Verwijder één bestand of een hele batch-map (imgbatch-*). */
export function deletePriorReportStorage(relativePath: string): void {
  const abs = getPriorReportAbsolutePath(relativePath);
  try {
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      fs.rmSync(abs, { recursive: true, force: true });
    } else {
      fs.unlinkSync(abs);
    }
  } catch {
    /* ignore */
  }
}

export function deletePriorReportFile(relativePath: string): void {
  deletePriorReportStorage(relativePath);
}
