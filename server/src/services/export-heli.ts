import ExcelJS from 'exceljs';
import { prisma } from '../lib/prisma.js';

const HELI_OM_COLUMNS = [
  'Equipment',
  'Categorie',
  'Omschrijving NL',
  'Omschrijving FR',
  'Klantref',
  'Serial',
  'Product ID',
  'Straat',
  'Huisnummer',
  'Postcode',
  'Stad',
  'Verdieping',
  'Lokaal',
  'Gebouwtype',
  'Merk',
  'Type',
  'Bouwjaar',
  'Inhoud',
  'Klasse',
  'Laatste keuringsdatum',
  'Gekeurd tot datum',
  'LB/LMB %',
  'Commentaar keuring',
  'Keurder-initialen',
  'Ext. keuringsnummer',
  'Status',
  'Opmerkingen',
  'Foto pad',
  'AI confidence',
];

export async function generateHeliOmExcel(sessionId: string): Promise<Buffer> {
  const session = await prisma.inventorySession.findUnique({
    where: { id: sessionId },
    include: {
      buildingType: true,
      inspector: true,
      scanRecords: {
        where: { status: 'confirmed' },
        include: { confirmedType: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!session) throw new Error('Session not found');

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Heli OM');

  sheet.columns = HELI_OM_COLUMNS.map((header) => ({
    header,
    key: header,
    width: 20,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };

  const counters = new Map<string, number>();
  const addressPrefix = session.clientAddress.split(',')[0]?.trim() ?? session.clientAddress;

  for (const record of session.scanRecords) {
    const category = record.confirmedType?.heliOmCategory ?? 'XX';
    const count = (counters.get(category) ?? 0) + 1;
    counters.set(category, count);
    const idLabel = `${addressPrefix} - ${category} ${String(count).padStart(3, '0')}`;

    const addressParts = session.clientAddress.split(',').map((s) => s.trim());

    sheet.addRow({
      'Equipment': idLabel,
      'Categorie': category,
      'Omschrijving NL': record.confirmedType?.nameNl ?? '',
      'Omschrijving FR': record.confirmedType?.nameFr ?? '',
      'Klantref': '',
      'Serial': '',
      'Product ID': '',
      'Straat': addressParts[0] ?? '',
      'Huisnummer': '',
      'Postcode': addressParts[1] ?? '',
      'Stad': addressParts[2] ?? '',
      'Verdieping': '',
      'Lokaal': '',
      'Gebouwtype': session.buildingType.nameNl,
      'Merk': '',
      'Type': '',
      'Bouwjaar': '',
      'Inhoud': '',
      'Klasse': '',
      'Laatste keuringsdatum': '',
      'Gekeurd tot datum': '',
      'LB/LMB %': '',
      'Commentaar keuring': '',
      'Keurder-initialen': session.inspector.name.split(' ').map((n) => n[0]).join(''),
      'Ext. keuringsnummer': '',
      'Status': 'Nieuw',
      'Opmerkingen': '',
      'Foto pad': record.photoPath,
      'AI confidence': record.aiConfidence ? `${Math.round(record.aiConfidence * 100)}%` : '',
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
