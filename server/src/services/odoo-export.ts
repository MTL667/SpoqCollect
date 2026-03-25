import { prisma } from '../lib/prisma.js';

function escapeCsvCell(v: string): string {
  if (/[",\n\r]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export interface OdooLine {
  scanId: string;
  objectTypeNl: string;
  quantity: number;
  odooProductCode: string;
  regime: string | null;
  unmapped: boolean;
  parentScanId: string | null;
}

/**
 * Map scans to Odoo-oriented lines using ServiceCodeMapping (default regime = null row).
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

  for (const scan of session.scanRecords) {
    const typeId = scan.confirmedTypeId!;
    const typeNl = scan.confirmedType!.nameNl;

    const candidates = mappings.filter((m) => m.objectTypeId === typeId);
    let code: string | null = null;
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
        regime = picked.regime;
      } else {
        unmapped = true;
      }
    }

    lines.push({
      scanId: scan.id,
      objectTypeNl: typeNl,
      quantity: scan.quantity,
      odooProductCode: code ?? 'UNMAPPED',
      regime: regime ?? globalRegime,
      unmapped,
      parentScanId: scan.parentScanId,
    });
  }

  return lines;
}

export async function generateOdooCsvBuffer(sessionId: string): Promise<{ csv: Buffer; unmappedCount: number }> {
  const lines = await deriveOdooLines(sessionId);
  const unmappedCount = lines.filter((l) => l.unmapped).length;

  const rows = lines.map((l) => ({
    scan_id: l.scanId,
    parent_scan_id: l.parentScanId ?? '',
    object_type_nl: l.objectTypeNl,
    quantity: String(l.quantity),
    odoo_product_code: l.odooProductCode,
    regime: l.regime ?? '',
    unmapped: l.unmapped ? 'yes' : 'no',
  }));

  const cols = ['scan_id', 'parent_scan_id', 'object_type_nl', 'quantity', 'odoo_product_code', 'regime', 'unmapped'] as const;
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
      ].join(','),
    )
    .join('\n');
  const csv = Buffer.from(`${headerLine}\n${body}\n`, 'utf-8');

  return { csv, unmappedCount };
}
