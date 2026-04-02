import { prisma } from '../lib/prisma.js';
import { deriveRegion } from './region.js';

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

interface MappingCandidate {
  id: string;
  objectTypeId: string;
  regime: string | null;
  region: string | null;
  minQuantity: number | null;
  maxQuantity: number | null;
  odooProductCode: string;
  startPriceProductCode: string | null;
  priority: number;
}

function resolveMapping(
  candidates: MappingCandidate[],
  opts: { regime: string | null; region: string | null; totalQuantity: number },
): MappingCandidate | null {
  const qualifying = candidates.filter((m) => {
    if (m.regime !== null && m.regime !== '' && m.regime !== opts.regime) return false;
    if (m.region !== null && m.region !== opts.region) return false;
    if (m.minQuantity !== null && opts.totalQuantity < m.minQuantity) return false;
    if (m.maxQuantity !== null && opts.totalQuantity > m.maxQuantity) return false;
    return true;
  });

  if (qualifying.length === 0) return null;

  qualifying.sort((a, b) => b.priority - a.priority);
  return qualifying[0];
}

export async function deriveOdooLines(sessionId: string): Promise<OdooLine[]> {
  const session = await prisma.inventorySession.findUnique({
    where: { id: sessionId },
    include: {
      scanRecords: {
        where: { status: 'confirmed', confirmedTypeId: { not: null } },
        include: { confirmedType: true },
      },
      mappingProfile: {
        include: {
          subcontractors: {
            where: { active: true },
            include: { objectTypes: true },
          },
          subassetConfigs: true,
        },
      },
    },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  const profile = session.mappingProfile;
  const promptData = (session.sessionPromptData as { end?: Record<string, string> } | null) ?? {};
  const globalRegime = promptData.end?.brandVeiligheidRegime ?? null;
  const sessionRegion = profile?.hasRegionLogic ? deriveRegion(session.postalCode) : null;

  let mappings: MappingCandidate[];
  if (profile) {
    mappings = await prisma.profileMappingRule.findMany({
      where: { profileId: profile.id, active: true },
    });
  } else {
    mappings = await prisma.serviceCodeMapping.findMany({
      where: { active: true, version: session.mappingVersion },
    });
  }

  // Build subcontractor lookup: objectTypeId → exportLabel
  const partyByObjectType = new Map<string, string>();
  if (profile) {
    for (const sub of profile.subcontractors) {
      for (const link of sub.objectTypes) {
        partyByObjectType.set(link.objectTypeId, sub.exportLabel);
      }
    }
  }

  // Build parent types set (types that have children in this profile's subasset config)
  let typesWithChildren: Set<string>;
  if (profile) {
    typesWithChildren = new Set(profile.subassetConfigs.map((c) => c.parentObjectTypeId));
  } else {
    typesWithChildren = new Set(
      (await prisma.objectType.findMany({
        where: { childObjectTypes: { some: { active: true } } },
        select: { id: true },
      })).map((t) => t.id),
    );
  }

  const quantityByType = new Map<string, number>();
  for (const scan of session.scanRecords) {
    const tid = scan.confirmedTypeId!;
    quantityByType.set(tid, (quantityByType.get(tid) ?? 0) + scan.quantity);
  }

  const lines: OdooLine[] = [];
  const emittedStartPrices = new Set<string>();

  for (const scan of session.scanRecords) {
    const typeId = scan.confirmedTypeId!;
    const confirmedType = scan.confirmedType!;
    const typeNl = confirmedType.nameNl;

    const party = profile
      ? (partyByObjectType.get(typeId) ?? 'Aceg Odoo')
      : confirmedType.exportParty;

    const totalQty = quantityByType.get(typeId) ?? scan.quantity;

    const candidates = mappings.filter((m) => m.objectTypeId === typeId);
    const picked = resolveMapping(candidates, {
      regime: globalRegime,
      region: sessionRegion,
      totalQuantity: totalQty,
    });

    const code = picked?.odooProductCode ?? null;
    const startCode = picked?.startPriceProductCode ?? null;
    const regime = picked?.regime ?? null;
    const unmapped = !picked;
    const isParentWithChildren = typesWithChildren.has(typeId);

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

    if (!isParentWithChildren) {
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
