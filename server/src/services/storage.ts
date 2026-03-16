import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

export function getPhotoDir(sessionId: string): string {
  const dir = path.join(config.STORAGE_PATH, sessionId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function movePhoto(tempPath: string, sessionId: string, scanRecordId: string): string {
  const dir = getPhotoDir(sessionId);
  const finalPath = path.join(dir, `${scanRecordId}.jpg`);
  fs.renameSync(tempPath, finalPath);
  return `${sessionId}/${scanRecordId}.jpg`;
}

export function getPhotoAbsolutePath(relativePath: string): string {
  return path.join(config.STORAGE_PATH, relativePath);
}
