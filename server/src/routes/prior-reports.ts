import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import fs from 'fs';
import { prisma } from '../lib/prisma.js';
import {
  savePriorReportBinary,
  savePriorReportImageBatch,
  deletePriorReportStorage,
} from '../services/prior-report-storage.js';
import {
  extractPdfText,
  structureReportText,
  structureReportFromImages,
  matchObjectTypeId,
} from '../services/prior-report-extract.js';
import { logger } from '../lib/logger.js';

export const priorReportsRouter = Router();

const REPORT_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const reportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 35 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const name = file.originalname.toLowerCase();
    const ok =
      REPORT_MIMES.has(file.mimetype) ||
      name.endsWith('.pdf') ||
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg') ||
      name.endsWith('.png') ||
      name.endsWith('.webp');
    if (ok) cb(null, true);
    else cb(new Error('Alleen PDF of afbeeldingen (JPEG, PNG, WebP) zijn toegestaan'));
  },
});

function isPdfFile(file: Express.Multer.File): boolean {
  return file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
}

function normalizeReportImageMime(file: Express.Multer.File): string {
  return file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype || 'image/jpeg';
}

type ReportChunk =
  | { kind: 'pdf'; file: Express.Multer.File }
  | { kind: 'images'; files: Express.Multer.File[] };

/** PDF’s afzonderlijk; opeenvolgende niet-PDF’s als één fotobatch (uploadvolgorde = paginavolgorde). */
function chunkReportFiles(files: Express.Multer.File[]): ReportChunk[] {
  const chunks: ReportChunk[] = [];
  let i = 0;
  while (i < files.length) {
    if (isPdfFile(files[i])) {
      chunks.push({ kind: 'pdf', file: files[i] });
      i += 1;
    } else {
      const group: Express.Multer.File[] = [];
      while (i < files.length && !isPdfFile(files[i])) {
        group.push(files[i]);
        i += 1;
      }
      chunks.push({ kind: 'images', files: group });
    }
  }
  return chunks;
}

async function assertActiveSession(sessionId: string, inspectorId: string) {
  const session = await prisma.inventorySession.findUnique({
    where: { id: sessionId },
    include: { buildingType: true },
  });
  if (!session) return { type: 'NOT_FOUND' as const };
  if (session.inspectorId !== inspectorId) return { type: 'FORBIDDEN' as const };
  if (session.status !== 'active') return { type: 'SESSION_COMPLETED' as const };
  return { type: 'OK' as const, session };
}

/** Upload PDF’s en/of foto’s van verslagen; extractie draait direct. */
priorReportsRouter.post(
  '/:sessionId/prior-reports',
  reportUpload.array('reports', 25),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId as string;
      const gate = await assertActiveSession(sessionId, req.inspector!.inspectorId);
      if (gate.type === 'NOT_FOUND') {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
        return;
      }
      if (gate.type === 'FORBIDDEN') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your session' } });
        return;
      }
      if (gate.type === 'SESSION_COMPLETED') {
        res.status(400).json({ error: { code: 'SESSION_COMPLETED', message: 'Session is completed' } });
        return;
      }
      const { session } = gate;

      const files = req.files as Express.Multer.File[] | undefined;
      if (!files?.length) {
        res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Geen bestanden (veld: reports): PDF of foto’s' },
        });
        return;
      }

      const objectTypes = await prisma.objectType.findMany({
        where: {
          active: true,
          buildingTypes: { some: { buildingTypeId: session.buildingTypeId } },
        },
        select: { id: true, nameNl: true },
      });
      const namesNl = objectTypes.map((t) => t.nameNl);

      const createdFiles: NonNullable<Awaited<ReturnType<typeof prisma.priorReportFile.findUnique>>>[] = [];

      for (const chunk of chunkReportFiles(files)) {
        if (chunk.kind === 'pdf') {
          const file = chunk.file;
          const { relativePath, normalizedMime } = savePriorReportBinary(sessionId, file.buffer, 'application/pdf');

          const record = await prisma.priorReportFile.create({
            data: {
              sessionId,
              originalName: file.originalname.slice(0, 500),
              storedPath: relativePath,
              mimeType: normalizedMime,
              extractionStatus: 'processing',
            },
          });

          try {
            const text = await extractPdfText(file.buffer);
            if (!text || text.length < 40) {
              await prisma.priorReportFile.update({
                where: { id: record.id },
                data: {
                  extractionStatus: 'failed',
                  extractionError:
                    'Te weinig tekst uit PDF (gescand document). Gebruik foto’s met de camera of upload leesbare PDF’s.',
                },
              });
              const failedRec = await prisma.priorReportFile.findUnique({ where: { id: record.id } });
              if (failedRec) createdFiles.push(failedRec);
              continue;
            }

            const rows = await structureReportText(text, namesNl);
            for (const row of rows) {
              const suggestedId = matchObjectTypeId(row.objectTypeNameNlGuess, objectTypes);
              await prisma.draftAsset.create({
                data: {
                  sessionId,
                  priorReportFileId: record.id,
                  title: row.title.slice(0, 500),
                  lastInspectionDate: row.lastInspectionDate
                    ? new Date(row.lastInspectionDate)
                    : null,
                  locationHint: row.locationHint?.slice(0, 500) ?? null,
                  suggestedObjectTypeId: suggestedId,
                  rawExtraction: row as object,
                  status: 'draft',
                },
              });
            }

            await prisma.priorReportFile.update({
              where: { id: record.id },
              data: { extractionStatus: 'done', extractionError: null },
            });
          } catch (err) {
            logger.error({ err, fileId: record.id }, 'prior report extraction failed');
            await prisma.priorReportFile.update({
              where: { id: record.id },
              data: {
                extractionStatus: 'failed',
                extractionError: err instanceof Error ? err.message.slice(0, 2000) : 'Extractie mislukt',
              },
            });
          }

          const finalRec = await prisma.priorReportFile.findUnique({ where: { id: record.id } });
          if (finalRec) createdFiles.push(finalRec);
          continue;
        }

        const imageFiles = chunk.files;
        const parts = imageFiles.map((f) => ({
          buffer: f.buffer,
          mimeType: normalizeReportImageMime(f),
        }));
        const firstMime = parts[0]?.mimeType ?? 'image/jpeg';
        const { batchRelativeDir } = savePriorReportImageBatch(sessionId, parts);

        const batchLabel =
          imageFiles.length === 1
            ? imageFiles[0].originalname.slice(0, 500)
            : `Foto’s verslag (${imageFiles.length} pagina’s)`.slice(0, 500);

        const record = await prisma.priorReportFile.create({
          data: {
            sessionId,
            originalName: batchLabel,
            storedPath: batchRelativeDir,
            mimeType: firstMime,
            extractionStatus: 'processing',
          },
        });

        try {
          const rows = await structureReportFromImages(parts, namesNl);
          if (rows.length === 0) {
            await prisma.priorReportFile.update({
              where: { id: record.id },
              data: {
                extractionStatus: 'failed',
                extractionError:
                  'Geen bruikbare gegevens uit de foto’s. Probeer scherpere belichting of dichterbij fotograferen.',
              },
            });
            const failedRec = await prisma.priorReportFile.findUnique({ where: { id: record.id } });
            if (failedRec) createdFiles.push(failedRec);
            continue;
          }

          for (const row of rows) {
            const suggestedId = matchObjectTypeId(row.objectTypeNameNlGuess, objectTypes);
            await prisma.draftAsset.create({
              data: {
                sessionId,
                priorReportFileId: record.id,
                title: row.title.slice(0, 500),
                lastInspectionDate: row.lastInspectionDate
                  ? new Date(row.lastInspectionDate)
                  : null,
                locationHint: row.locationHint?.slice(0, 500) ?? null,
                suggestedObjectTypeId: suggestedId,
                rawExtraction: row as object,
                status: 'draft',
              },
            });
          }

          await prisma.priorReportFile.update({
            where: { id: record.id },
            data: { extractionStatus: 'done', extractionError: null },
          });
        } catch (err) {
          logger.error({ err, fileId: record.id }, 'prior report image batch extraction failed');
          await prisma.priorReportFile.update({
            where: { id: record.id },
            data: {
              extractionStatus: 'failed',
              extractionError: err instanceof Error ? err.message.slice(0, 2000) : 'Extractie mislukt',
            },
          });
        }

        const finalBatchRec = await prisma.priorReportFile.findUnique({ where: { id: record.id } });
        if (finalBatchRec) createdFiles.push(finalBatchRec);
      }

      const drafts = await prisma.draftAsset.findMany({
        where: { sessionId, status: 'draft' },
        include: { suggestedObjectType: { select: { nameNl: true } } },
        orderBy: { title: 'asc' },
      });

      res.status(201).json({
        data: {
          files: createdFiles.filter(Boolean),
          draftAssets: drafts,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

priorReportsRouter.get('/:sessionId/prior-reports', async (req, res, next) => {
  try {
    const sessionId = req.params.sessionId as string;
    const session = await prisma.inventorySession.findUnique({ where: { id: sessionId } });
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
      return;
    }
    if (session.inspectorId !== req.inspector!.inspectorId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your session' } });
      return;
    }

    const files = await prisma.priorReportFile.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: files });
  } catch (error) {
    next(error);
  }
});

priorReportsRouter.get('/:sessionId/draft-assets', async (req, res, next) => {
  try {
    const sessionId = req.params.sessionId as string;
    const session = await prisma.inventorySession.findUnique({ where: { id: sessionId } });
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
      return;
    }
    if (session.inspectorId !== req.inspector!.inspectorId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your session' } });
      return;
    }

    const drafts = await prisma.draftAsset.findMany({
      where: { sessionId },
      include: {
        suggestedObjectType: { select: { id: true, nameNl: true } },
        matchedScan: { select: { id: true, confirmedType: { select: { nameNl: true } } } },
        priorReportFile: { select: { originalName: true } },
      },
      orderBy: [{ status: 'asc' }, { title: 'asc' }],
    });

    res.json({ data: drafts });
  } catch (error) {
    next(error);
  }
});

priorReportsRouter.patch('/:sessionId/draft-assets/:draftId', async (req, res, next) => {
  try {
    const sessionId = req.params.sessionId as string;
    const draftId = req.params.draftId as string;
    const body = req.body as { action?: string; scanRecordId?: string | null };

    const session = await prisma.inventorySession.findUnique({ where: { id: sessionId } });
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
      return;
    }
    if (session.inspectorId !== req.inspector!.inspectorId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your session' } });
      return;
    }

    const draft = await prisma.draftAsset.findFirst({
      where: { id: draftId, sessionId },
    });
    if (!draft) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Concept niet gevonden' } });
      return;
    }

    if (body.action === 'skip') {
      const updated = await prisma.draftAsset.update({
        where: { id: draftId },
        data: { status: 'skipped', matchedScanId: null },
      });
      res.json({ data: updated });
      return;
    }

    if (body.action === 'unmatch') {
      const updated = await prisma.draftAsset.update({
        where: { id: draftId },
        data: { status: 'draft', matchedScanId: null },
      });
      res.json({ data: updated });
      return;
    }

    if (body.action === 'match' && body.scanRecordId) {
      const scan = await prisma.scanRecord.findFirst({
        where: { id: body.scanRecordId, sessionId, status: 'confirmed' },
      });
      if (!scan) {
        res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Scan niet gevonden of nog niet bevestigd' },
        });
        return;
      }

      const existing = await prisma.draftAsset.findUnique({
        where: { matchedScanId: body.scanRecordId },
      });
      if (existing && existing.id !== draftId) {
        await prisma.draftAsset.update({
          where: { id: existing.id },
          data: { matchedScanId: null, status: 'draft' },
        });
      }

      const updated = await prisma.draftAsset.update({
        where: { id: draftId },
        data: { matchedScanId: body.scanRecordId, status: 'matched' },
      });
      res.json({ data: updated });
      return;
    }

    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Ongeldige actie' } });
  } catch (error) {
    next(error);
  }
});

/** Verwijder geüpload verslag (en concepten die enkel uit dat bestand komen). */
priorReportsRouter.delete('/:sessionId/prior-reports/:fileId', async (req, res, next) => {
  try {
    const sessionId = req.params.sessionId as string;
    const fileId = req.params.fileId as string;

    const session = await prisma.inventorySession.findUnique({ where: { id: sessionId } });
    if (!session || session.inspectorId !== req.inspector!.inspectorId) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Niet gevonden' } });
      return;
    }

    const file = await prisma.priorReportFile.findFirst({
      where: { id: fileId, sessionId },
    });
    if (!file) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Bestand niet gevonden' } });
      return;
    }

    await prisma.draftAsset.deleteMany({
      where: { priorReportFileId: fileId },
    });

    deletePriorReportStorage(file.storedPath);
    await prisma.priorReportFile.delete({ where: { id: fileId } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
