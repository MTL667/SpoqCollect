import type { Prisma } from '../generated/prisma/client.js';
import {
  ATEX_OBJECT_TYPE_NL,
  PROMPT_CATALOG_VERSION,
  SESSION_END_ATEX_FIELDS,
  SESSION_END_FIRE_LIGHTING_FIELDS,
  SESSION_END_LIGHTNING_FIELDS,
  sessionStartFieldsForBuilding,
} from '../config/prompt-catalog.js';

export type SessionPromptData = {
  version?: number;
  start?: Record<string, unknown>;
  startCompleted?: boolean;
  end?: Record<string, unknown>;
  lightning?: Record<string, unknown>;
  atex?: Record<string, unknown>;
};

function asPromptData(raw: Prisma.JsonValue | null | undefined): SessionPromptData {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as SessionPromptData;
  }
  return {};
}

export function mergeSessionPromptPatch(
  current: Prisma.JsonValue | null | undefined,
  patch: {
    start?: Record<string, unknown>;
    startCompleted?: boolean;
    end?: Record<string, unknown>;
    lightning?: Record<string, unknown>;
    atex?: Record<string, unknown>;
  },
): Prisma.InputJsonValue {
  const base = asPromptData(current);
  const next: SessionPromptData = {
    ...base,
    version: PROMPT_CATALOG_VERSION,
  };
  if (patch.start) {
    next.start = { ...base.start, ...patch.start };
  }
  if (patch.startCompleted === true) {
    next.startCompleted = true;
  }
  if (patch.end) {
    next.end = { ...base.end, ...patch.end };
  }
  if (patch.lightning) {
    next.lightning = { ...base.lightning, ...patch.lightning };
  }
  if (patch.atex) {
    next.atex = { ...base.atex, ...patch.atex };
  }
  return next as Prisma.InputJsonValue;
}

export interface ScanForAtex {
  confirmedType: { nameNl: string } | null;
}

export function sessionHasAtexScan(scans: ScanForAtex[]): boolean {
  return scans.some((s) => s.confirmedType?.nameNl === ATEX_OBJECT_TYPE_NL);
}

/** Reasons why complete is blocked (empty = OK to complete). */
export function getSessionCompleteBlockers(input: {
  buildingTypeNameNl: string;
  sessionPromptData: Prisma.JsonValue | null | undefined;
  scans: ScanForAtex[];
}): string[] {
  const data = asPromptData(input.sessionPromptData);
  const missing: string[] = [];

  const startFields = sessionStartFieldsForBuilding(input.buildingTypeNameNl);
  if (startFields && startFields.length > 0 && !data.startCompleted) {
    missing.push('sessionStart');
  }

  const end = data.end ?? {};
  const fireKey = SESSION_END_FIRE_LIGHTING_FIELDS[0]?.key;
  if (fireKey && (end[fireKey] === undefined || end[fireKey] === null || end[fireKey] === '')) {
    missing.push('sessionEndFire');
  }

  const lightning = data.lightning ?? {};
  const lightningKey = SESSION_END_LIGHTNING_FIELDS[0]?.key;
  if (lightningKey && (lightning[lightningKey] === undefined || lightning[lightningKey] === null || lightning[lightningKey] === '')) {
    missing.push('sessionEndLightning');
  }

  if (!sessionHasAtexScan(input.scans)) {
    const atex = data.atex ?? {};
    const atexKey = SESSION_END_ATEX_FIELDS[0]?.key;
    if (atexKey && (atex[atexKey] === undefined || atex[atexKey] === null || atex[atexKey] === '')) {
      missing.push('sessionEndAtex');
    }
  }

  return missing;
}
