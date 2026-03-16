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
  recordRow: { flexDirection: 'row', marginBottom: 8, borderBottom: '0.5px solid #eee', paddingBottom: 6 },
  thumbnail: { width: 60, height: 60, objectFit: 'cover', marginRight: 10, borderRadius: 2 },
  recordInfo: { flex: 1, justifyContent: 'center' },
  recordName: { fontSize: 11, fontWeight: 'bold' },
  recordNameFr: { fontSize: 10, color: '#555', fontStyle: 'italic' },
  recordMeta: { fontSize: 8, color: '#888', marginTop: 2 },
  footer: { position: 'absolute', bottom: 20, left: 30, right: 30, fontSize: 8, color: '#aaa', textAlign: 'center' },
});

interface ScanData {
  id: string;
  photoPath: string;
  confirmedType: { nameNl: string; nameFr: string; heliOmCategory: string } | null;
  createdAt: Date;
  aiConfidence: number | null;
}

interface SessionData {
  clientAddress: string;
  createdAt: Date;
  completedAt: Date | null;
  buildingType: { nameNl: string; nameFr: string };
  inspector: { name: string };
  scanRecords: ScanData[];
}

function getPhotoPath(relativePath: string): string {
  return path.join(config.STORAGE_PATH, relativePath);
}

function ClientReport({ session }: { session: SessionData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Inventarisatierapport / Rapport d'inventaire</Text>
          <Text style={styles.subtitle}>{session.clientAddress}</Text>
          <Text style={styles.meta}>
            Gebouwtype / Type de bâtiment: {session.buildingType.nameNl} / {session.buildingType.nameFr}
          </Text>
          <Text style={styles.meta}>
            Inspecteur: {session.inspector.name}
          </Text>
          <Text style={styles.meta}>
            Datum / Date: {session.createdAt.toLocaleDateString('nl-BE')}
            {session.completedAt ? ` — ${session.completedAt.toLocaleDateString('nl-BE')}` : ''}
          </Text>
          <Text style={styles.meta}>
            Aantal objecten / Nombre d'objets: {session.scanRecords.length}
          </Text>
        </View>

        <View style={styles.divider} />

        {session.scanRecords.map((record, index) => {
          const photoAbsPath = getPhotoPath(record.photoPath);
          const hasPhoto = fs.existsSync(photoAbsPath);

          return (
            <View key={record.id} style={styles.recordRow} wrap={false}>
              {hasPhoto ? (
                <Image src={photoAbsPath} style={styles.thumbnail} />
              ) : (
                <View style={[styles.thumbnail, { backgroundColor: '#f0f0f0' }]} />
              )}
              <View style={styles.recordInfo}>
                <Text style={styles.recordName}>
                  {index + 1}. {record.confirmedType?.nameNl ?? 'Onbekend'}
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

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `InventariSpoq — ${session.clientAddress} — Pagina ${pageNumber} / ${totalPages}`
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
