import { prisma } from '../lib/prisma.js';

function escapeCsvCell(v: string): string {
  if (/[",\n\r]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export type OdooLineType = 'startprijs' | 'stukprijs' | null;

export interface OdooLine {
  scanId: string;
  objectTypeNl: string;
  quantity: number;
  odooProductCode: string;
  regime: string | null;
  unmapped: boolean;
  parentScanId: string | null;
  lineType: OdooLineType;
  exportParty: string;
}

/**
 * Map scans to Odoo-oriented lines using ServiceCodeMapping.
 *
 * When a mapping has a startPriceProductCode, TWO lines are emitted:
 *   1. A "startprijs" line (qty=1) – emitted only ONCE per ObjectType per session
 *   2. A "stukprijs" line (qty=N) – emitted for each scan
 *
 * When a mapping has no startPriceProductCode, a single line with lineType=null is emitted.
 */
export async function deriveOdooLines(sessionId: string): Promise<OdooLine[]> {
  const session = await prisma.inventorySession.findUnique({
    where: { id: sessionId },
    include: {
      scanRecords: {
        where: { status: 'confirmed', confirmedTypeId: { not: null } },
        include: { confirmedType: true },
      },
    },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  const promptData = (session.sessionPromptData as { end?: Record<string, string> } | null) ?? {};
  const globalRegime = promptData.end?.brandVeiligheidRegime ?? null;

  const mappings = await prisma.serviceCodeMapping.findMany({
    where: { active: true, version: session.mappingVersion },
    include: { objectType: true },
  });

  const lines: OdooLine[] = [];
  const emittedStartPrices = new Set<string>();

  for (const scan of session.scanRecords) {
    const typeId = scan.confirmedTypeId!;
    const confirmedType = scan.confirmedType!;
    const typeNl = confirmedType.nameNl;
    const party = confirmedType.exportParty;

    const candidates = mappings.filter((m) => m.objectTypeId === typeId);
    let code: string | null = null;
    let startCode: string | null = null;
    let regime: string | null = null;
    let unmapped = false;

    if (candidates.length === 0) {
      unmapped = true;
    } else {
      const byRegime = globalRegime
        ? candidates.find((m) => m.regime === globalRegime)
        : null;
      const defaultRow = candidates.find((m) => m.regime === null || m.regime === '');
      const picked = byRegime ?? defaultRow ?? candidates[0];
      if (picked) {
        code = picked.odooProductCode;
        startCode = picked.startPriceProductCode;
        regime = picked.regime;
      } else {
        unmapped = true;
      }
    }

    const resolvedRegime = regime ?? globalRegime;
    const startPriceKey = `${typeId}::${resolvedRegime ?? ''}`;

    if (startCode && !emittedStartPrices.has(startPriceKey)) {
      emittedStartPrices.add(startPriceKey);
      lines.push({
        scanId: scan.id,
        objectTypeNl: typeNl,
        quantity: 1,
        odooProductCode: startCode,
        regime: resolvedRegime,
        unmapped: false,
        parentScanId: scan.parentScanId,
        lineType: 'startprijs',
        exportParty: party,
      });
    }

    lines.push({
      scanId: scan.id,
      objectTypeNl: typeNl,
      quantity: scan.quantity,
      odooProductCode: code ?? 'UNMAPPED',
      regime: resolvedRegime,
      unmapped,
      parentScanId: scan.parentScanId,
      lineType: startCode ? 'stukprijs' : null,
      exportParty: party,
    });
  }

  return lines;
}

function linesToCsv(lines: OdooLine[]): Buffer {
  const rows = lines.map((l) => ({
    scan_id: l.scanId,
    parent_scan_id: l.parentScanId ?? '',
    object_type_nl: l.objectTypeNl,
    quantity: String(l.quantity),
    odoo_product_code: l.odooProductCode,
    regime: l.regime ?? '',
    unmapped: l.unmapped ? 'yes' : 'no',
    line_type: l.lineType ?? '',
  }));

  const cols = ['scan_id', 'parent_scan_id', 'object_type_nl', 'quantity', 'odoo_product_code', 'regime', 'unmapped', 'line_type'] as const;
  const headerLine = cols.join(',');
  const body = rows
    .map((r) =>
      [
        escapeCsvCell(r.scan_id),
        escapeCsvCell(r.parent_scan_id),
        escapeCsvCell(r.object_type_nl),
        escapeCsvCell(r.quantity),
        escapeCsvCell(r.odoo_product_code),
        escapeCsvCell(r.regime),
        escapeCsvCell(r.unmapped),
        escapeCsvCell(r.line_type),
      ].join(','),
    )
    .join('\n');
  return Buffer.from(`${headerLine}\n${body}\n`, 'utf-8');
}

export interface OdooExportFile {
  party: string;
  csv: Buffer;
  unmappedCount: number;
}

/**
 * Generate separate CSV buffers per export party (aceg, simafire, firesecure).
 * Only returns files for parties that have at least one line.
 */
export async function generateOdooCsvBuffers(sessionId: string): Promise<OdooExportFile[]> {
  const lines = await deriveOdooLines(sessionId);

  const grouped = new Map<string, OdooLine[]>();
  for (const line of lines) {
    const existing = grouped.get(line.exportParty);
    if (existing) {
      existing.push(line);
    } else {
      grouped.set(line.exportParty, [line]);
    }
  }

  const files: OdooExportFile[] = [];
  for (const [party, partyLines] of grouped) {
    files.push({
      party,
      csv: linesToCsv(partyLines),
      unmappedCount: partyLines.filter((l) => l.unmapped).length,
    });
  }

  return files;
}

/** @deprecated Use generateOdooCsvBuffers instead */
export async function generateOdooCsvBuffer(sessionId: string): Promise<{ csv: Buffer; unmappedCount: number }> {
  const lines = await deriveOdooLines(sessionId);
  const unmappedCount = lines.filter((l) => l.unmapped).length;
  const csv = linesToCsv(lines);
  return { csv, unmappedCount };
}
