import ExcelJS from 'exceljs';
import { prisma } from '../lib/prisma.js';

/**
 * Exact column layout matching the official "Template upload heli OM update" spreadsheet.
 * Columns A-AC (29 columns) with the exact system field names from Row 1.
 */
const HELI_COLUMNS: { key: string; header: string; width: number }[] = [
  { key: 'A', header: 'Equipment',                    width: 30 },  // A - ID Label
  { key: 'B', header: 'Tekst objectsoort',            width: 20 },  // B - Categorie
  { key: 'C', header: 'Omschrijving technisch object', width: 30 }, // C
  { key: 'D', header: 'Plan. Artikelomschrijving',    width: 30 },  // D - Omschrijving
  { key: 'E', header: 'Vest',                         width: 15 },  // E - laatste klant ref positie
  { key: 'F', header: 'Gebruikersstatus',             width: 15 },  // F
  { key: 'G', header: 'Gebruikersstatus2',            width: 15 },  // G
  { key: 'H', header: 'Order',                        width: 15 },  // H
  { key: 'I', header: 'Basisstarttermijn',            width: 18 },  // I
  { key: 'J', header: 'Basiseindtermijn',             width: 18 },  // J
  { key: 'K', header: 'Naam',                         width: 25 },  // K - client ref
  { key: 'L', header: 'Naam2',                        width: 25 },  // L
  { key: 'M', header: 'Straat',                       width: 25 },  // M
  { key: 'N', header: 'Huisnummer',                   width: 12 },  // N
  { key: 'O', header: 'PC',                           width: 10 },  // O - postcode
  { key: 'P', header: 'Plaats',                       width: 20 },  // P - stad
  { key: 'Q', header: 'Last inspection date',         width: 18 },  // Q
  { key: 'R', header: 'Gekeurd tot datum',            width: 18 },  // R - volgende vernieuwing
  { key: 'S', header: 'LB of LMB %',                 width: 12 },  // S
  { key: 'T', header: 'Datum LB of LMB test',        width: 18 },  // T
  { key: 'U', header: 'Commentaar Keuring',           width: 30 },  // U
  { key: 'V', header: 'Initialen laatste keurder',    width: 15 },  // V
  { key: 'W', header: 'Ext. keuringsnummer',          width: 20 },  // W
  { key: 'X', header: 'Instruction Planning',         width: 20 },  // X - client ref 2
  { key: 'Y', header: 'Korte tekst',                  width: 25 },  // Y - product
  { key: 'Z', header: 'Systeemstatus',                width: 15 },  // Z
  { key: 'AA', header: 'Default units',               width: 12 },  // AA - aantallen
  { key: 'AB', header: 'position',                    width: 20 },  // AB
  { key: 'AC', header: 'owner',                       width: 20 },  // AC
];

function formatDate(d: Date | null | undefined): string {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('nl-BE');
}

export async function generateHeliOmExcel(sessionId: string): Promise<Buffer> {
  const session = await prisma.inventorySession.findUnique({
    where: { id: sessionId },
    include: {
      buildingType: true,
      inspector: true,
      locations: {
        orderBy: { sortOrder: 'asc' },
        include: {
          floors: {
            orderBy: { sortOrder: 'asc' },
            include: {
              scanRecords: {
                where: { status: 'confirmed' },
                include: { confirmedType: true },
                orderBy: { createdAt: 'asc' },
              },
            },
          },
        },
      },
    },
  });

  if (!session) throw new Error('Session not found');

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Template upload heli OM update');

  sheet.columns = HELI_COLUMNS.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };

  const counters = new Map<string, number>();
  const initials = session.inspector.name
    .split(' ')
    .map((n) => n[0])
    .join('');
  const addressLabel = `${session.street} ${session.number}`;

  for (const location of session.locations) {
    for (const floor of location.floors) {
      for (const record of floor.scanRecords) {
        const qty = record.quantity ?? 1;
        const category = record.confirmedType?.heliOmCategory ?? 'XX';

        for (let i = 0; i < qty; i++) {
          const count = (counters.get(category) ?? 0) + 1;
          counters.set(category, count);
          const idLabel = `${addressLabel} - ${category} ${String(count).padStart(3, '0')}`;

          sheet.addRow({
            'A': idLabel,
            'B': category,
            'C': record.confirmedType?.nameNl ?? '',
            'D': record.confirmedType?.nameFr ?? '',
            'E': '',
            'F': '',
            'G': '',
            'H': '',
            'I': '',
            'J': '',
            'K': session.clientName,
            'L': '',
            'M': session.street,
            'N': `${session.number}${session.bus ? ` bus ${session.bus}` : ''}`,
            'O': session.postalCode,
            'P': session.city,
            'Q': formatDate(record.lastInspectionDate),
            'R': formatDate(record.certifiedUntilDate),
            'S': record.lbLmbPercentage ?? '',
            'T': formatDate(record.lbLmbTestDate),
            'U': record.inspectionComment ?? '',
            'V': initials,
            'W': record.externalInspectionNumber ?? '',
            'X': '',
            'Y': '',
            'Z': '',
            'AA': qty > 1 ? String(qty) : '1',
            'AB': `${location.name} - ${floor.name}`,
            'AC': '',
          });
        }
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
