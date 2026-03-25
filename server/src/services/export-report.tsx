import React from 'react';
import { renderToBuffer, Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: 'Helvetica' },
  header: { marginBottom: 20 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 12, color: '#666', marginBottom: 4 },
  meta: { fontSize: 9, color: '#888', marginBottom: 2 },
  divider: { borderBottom: '1px solid #ccc', marginVertical: 10 },
  locationHeader: { fontSize: 13, fontWeight: 'bold', marginTop: 14, marginBottom: 4, color: '#222' },
  floorHeader: { fontSize: 11, fontWeight: 'bold', marginTop: 8, marginBottom: 4, color: '#444', paddingLeft: 8 },
  recordRow: { flexDirection: 'row', marginBottom: 8, borderBottom: '0.5px solid #eee', paddingBottom: 6, paddingLeft: 16 },
  thumbnail: { width: 60, height: 60, objectFit: 'cover', marginRight: 10, borderRadius: 2 },
  recordInfo: { flex: 1, justifyContent: 'center' },
  recordName: { fontSize: 11, fontWeight: 'bold' },
  recordNameFr: { fontSize: 10, color: '#555', fontStyle: 'italic' },
  recordMeta: { fontSize: 8, color: '#888', marginTop: 2 },
  footer: { position: 'absolute', bottom: 20, left: 30, right: 30, fontSize: 8, color: '#aaa', textAlign: 'center' },
  tableSection: { marginBottom: 14 },
  tableTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 6, color: '#222' },
  tableSubtitle: { fontSize: 8, color: '#666', marginBottom: 6 },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 4,
    marginBottom: 2,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRowTotal: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 6,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  colNl: { flex: 2.3, fontSize: 9, paddingRight: 4 },
  colFr: { flex: 2.3, fontSize: 9, color: '#444', paddingRight: 4 },
  colCode: { flex: 0.9, fontSize: 9 },
  colQty: { flex: 0.65, fontSize: 9, textAlign: 'right' },
  colReg: { flex: 0.65, fontSize: 9, textAlign: 'right' },
  th: { fontWeight: 'bold', fontSize: 9 },
});

function resolvePhotoAbsPath(relativePath: string | null | undefined): string | null {
  if (relativePath == null || relativePath === '') return null;
  return path.join(config.STORAGE_PATH, relativePath);
}

function formatAddr(s: { street: string; number: string; bus: string | null; postalCode: string; city: string }) {
  return `${s.street} ${s.number}${s.bus ? ` bus ${s.bus}` : ''}, ${s.postalCode} ${s.city}`;
}

interface ScanData {
  id: string;
  confirmedTypeId: string | null;
  photoPath: string | null;
  confirmedType: { nameNl: string; nameFr: string; heliOmCategory: string } | null;
  quantity: number;
  createdAt: Date;
  aiConfidence: number | null;
}

interface ObjectTypeAggregateRow {
  nameNl: string;
  nameFr: string;
  heliOmCategory: string;
  totalStuks: number;
  registraties: number;
}

function aggregateObjectTypes(records: ScanData[]): ObjectTypeAggregateRow[] {
  const map = new Map<
    string,
    { nameNl: string; nameFr: string; heliOmCategory: string; totalStuks: number; registraties: number }
  >();

  for (const r of records) {
    const key = r.confirmedTypeId ?? '__zonder_type__';
    const qty = r.quantity ?? 1;
    const nameNl = r.confirmedType?.nameNl ?? 'Onbekend';
    const nameFr = r.confirmedType?.nameFr ?? 'Inconnu';
    const heliOmCategory = r.confirmedType?.heliOmCategory ?? '—';

    const cur = map.get(key);
    if (cur) {
      cur.totalStuks += qty;
      cur.registraties += 1;
    } else {
      map.set(key, {
        nameNl,
        nameFr,
        heliOmCategory,
        totalStuks: qty,
        registraties: 1,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.nameNl.localeCompare(b.nameNl, 'nl', { sensitivity: 'base' }));
}

interface FloorData {
  name: string;
  scanRecords: ScanData[];
}

interface LocationData {
  name: string;
  floors: FloorData[];
}

interface SessionData {
  clientName: string;
  street: string;
  number: string;
  bus: string | null;
  postalCode: string;
  city: string;
  createdAt: Date;
  completedAt: Date | null;
  buildingType: { nameNl: string; nameFr: string };
  inspector: { name: string };
  locations: LocationData[];
  scanRecords: ScanData[];
}

function ObjectTypeSummaryTable({
  rows,
  grandTotalStuks,
  grandTotalReg,
}: {
  rows: ObjectTypeAggregateRow[];
  grandTotalStuks: number;
  grandTotalReg: number;
}) {
  return (
    <View style={styles.tableSection}>
      <Text style={styles.tableTitle}>Overzicht per objecttype / Vue par type d&apos;objet</Text>
      <Text style={styles.tableSubtitle}>
        Totalen over de volledige sessie (som van stuks per type; registraties = aantal ingevoerde lijnen).
        {' / '}
        Totaux sur la session (somme des quantit&eacute;s; lignes = nombre d&apos;enregistrements).
      </Text>
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.colNl, styles.th]}>Type (NL)</Text>
        <Text style={[styles.colFr, styles.th]}>Type (FR)</Text>
        <Text style={[styles.colCode, styles.th]}>Code</Text>
        <Text style={[styles.colQty, styles.th]}>Stuks</Text>
        <Text style={[styles.colReg, styles.th]}>Lijnen</Text>
      </View>
      {rows.map((row, i) => (
        <View key={`${row.nameNl}-${row.heliOmCategory}-${i}`} style={styles.tableRow} wrap={false}>
          <Text style={styles.colNl}>{row.nameNl}</Text>
          <Text style={styles.colFr}>{row.nameFr}</Text>
          <Text style={styles.colCode}>{row.heliOmCategory}</Text>
          <Text style={styles.colQty}>{row.totalStuks}</Text>
          <Text style={styles.colReg}>{row.registraties}</Text>
        </View>
      ))}
      <View style={styles.tableRowTotal} wrap={false}>
        <Text style={[styles.colNl, { fontWeight: 'bold' }]}>Totaal / Total</Text>
        <Text style={styles.colFr}> </Text>
        <Text style={styles.colCode}> </Text>
        <Text style={[styles.colQty, { fontWeight: 'bold' }]}>{grandTotalStuks}</Text>
        <Text style={[styles.colReg, { fontWeight: 'bold' }]}>{grandTotalReg}</Text>
      </View>
    </View>
  );
}

function ClientReport({ session }: { session: SessionData }) {
  const address = formatAddr(session);
  let globalIndex = 0;
  const typeRows = aggregateObjectTypes(session.scanRecords);
  const grandTotalStuks = typeRows.reduce((s, r) => s + r.totalStuks, 0);
  const grandTotalReg = typeRows.reduce((s, r) => s + r.registraties, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <Text style={styles.title}>Inventarisatierapport / Rapport d&apos;inventaire</Text>
          <Text style={styles.subtitle}>{session.clientName}</Text>
          <Text style={styles.meta}>{address}</Text>
          <Text style={styles.meta}>
            Gebouwtype / Type de b&acirc;timent: {session.buildingType.nameNl} / {session.buildingType.nameFr}
          </Text>
          <Text style={styles.meta}>Inspecteur: {session.inspector.name}</Text>
          <Text style={styles.meta}>
            Datum / Date: {session.createdAt.toLocaleDateString('nl-BE')}
            {session.completedAt ? ` — ${session.completedAt.toLocaleDateString('nl-BE')}` : ''}
          </Text>
          <Text style={styles.meta}>
            Aantal objecten / Nombre d&apos;objets: {session.scanRecords.reduce((s, r) => s + (r.quantity ?? 1), 0)}
          </Text>
        </View>

        <View style={styles.divider} />

        <ObjectTypeSummaryTable
          rows={typeRows}
          grandTotalStuks={grandTotalStuks}
          grandTotalReg={grandTotalReg}
        />

        <View style={styles.divider} />

        <Text style={[styles.locationHeader, { marginTop: 0 }]}>Detail per locatie / D&eacute;tail par emplacement</Text>

        {session.locations.map((loc) => (
          <View key={loc.name}>
            <Text style={styles.locationHeader}>{loc.name}</Text>
            {loc.floors.map((floor) => (
              <View key={floor.name}>
                <Text style={styles.floorHeader}>{floor.name}</Text>
                {floor.scanRecords.map((record) => {
                  globalIndex++;
                  const photoAbsPath = resolvePhotoAbsPath(record.photoPath);
                  const hasPhoto = photoAbsPath !== null && fs.existsSync(photoAbsPath);
                  return (
                    <View key={record.id} style={styles.recordRow} wrap={false}>
                      {hasPhoto ? (
                        <Image src={photoAbsPath} style={styles.thumbnail} />
                      ) : (
                        <View style={[styles.thumbnail, { backgroundColor: '#f0f0f0' }]} />
                      )}
                      <View style={styles.recordInfo}>
                        <Text style={styles.recordName}>
                          {globalIndex}. {record.confirmedType?.nameNl ?? 'Onbekend'}{(record.quantity ?? 1) > 1 ? ` (×${record.quantity})` : ''}
                        </Text>
                        <Text style={styles.recordNameFr}>
                          {record.confirmedType?.nameFr ?? 'Inconnu'}
                        </Text>
                        <Text style={styles.recordMeta}>
                          {record.confirmedType?.heliOmCategory ?? '-'} | {record.createdAt.toLocaleTimeString('nl-BE')}
                          {record.aiConfidence !== null ? ` | AI: ${Math.round(record.aiConfidence * 100)}%` : ''}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        ))}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `InventariSpoq — ${session.clientName} — Pagina ${pageNumber} / ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}

export async function generateClientReport(sessionId: string): Promise<Buffer> {
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
      scanRecords: {
        where: { status: 'confirmed' },
        include: { confirmedType: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!session) throw new Error('Session not found');

  const pdfBuffer = await renderToBuffer(<ClientReport session={session} />);
  return Buffer.from(pdfBuffer);
}
