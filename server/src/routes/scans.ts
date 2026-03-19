import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { upload } from '../middleware/upload.js';
import { movePhoto, getPhotoAbsolutePath } from '../services/storage.js';
import { classifyPhoto } from '../services/ai-classifier.js';
import { logger } from '../lib/logger.js';

export const scansRouter = Router();

scansRouter.post('/:sessionId/scans', upload.single('photo'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.params.sessionId as string;

    const session = await prisma.inventorySession.findUnique({
      where: { id: sessionId },
      include: { buildingType: true },
    });

    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
      return;
    }

    if (session.inspectorId !== req.inspector!.inspectorId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your session' } });
      return;
    }

    if (session.status !== 'active') {
      res.status(400).json({ error: { code: 'SESSION_COMPLETED', message: 'Session is completed' } });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Photo is required' } });
      return;
    }

    const floorId = req.body.floorId as string | undefined;
    if (!floorId) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'floorId is required' } });
      return;
    }

    const scanRecord = await prisma.scanRecord.create({
      data: {
        sessionId,
        floorId,
        inspectorId: req.inspector!.inspectorId,
        photoPath: 'temp',
        status: 'pending',
      },
    });

    const photoPath = movePhoto(req.file.path, sessionId, scanRecord.id);

    await prisma.scanRecord.update({
      where: { id: scanRecord.id },
      data: { photoPath },
    });

    // Try direct classification — skip the queue for speed
    try {
      const applicableTypes = await prisma.objectType.findMany({
        where: {
          active: true,
          buildingTypes: { some: { buildingTypeId: session.buildingTypeId } },
        },
      });

      const result = await classifyPhoto(
        getPhotoAbsolutePath(photoPath),
        session.buildingType.nameNl,
        applicableTypes,
      );

      const classified = await prisma.scanRecord.update({
        where: { id: scanRecord.id },
        data: {
          aiProposedTypeId: result.typeId,
          aiConfidence: result.confidence,
          aiRawResponse: JSON.stringify(result),
          status: 'classified',
        },
      });

      logger.info({ scanId: scanRecord.id, typeId: result.typeId, confidence: result.confidence }, 'Direct classification succeeded');
      res.status(201).json({ data: classified });
    } catch (classifyErr) {
      // Classification failed — fall back to queue for retry
      logger.warn({ scanId: scanRecord.id, error: classifyErr instanceof Error ? classifyErr.message : String(classifyErr) }, 'Direct classification failed, queuing for retry');

      await prisma.scanJob.create({
        data: { scanRecordId: scanRecord.id, status: 'pending' },
      });

      const pending = await prisma.scanRecord.findUnique({ where: { id: scanRecord.id } });
      res.status(201).json({ data: pending });
    }
  } catch (error) {
    next(error);
  }
});

scansRouter.patch('/:id/confirm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { confirmedTypeId } = req.body as { confirmedTypeId?: string };
    const scanId = req.params.id as string;

    if (!confirmedTypeId) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'confirmedTypeId is required' } });
      return;
    }

    const scan = await prisma.scanRecord.findUnique({
      where: { id: scanId },
    });

    if (!scan) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Scan record not found' } });
      return;
    }

    if (scan.inspectorId !== req.inspector!.inspectorId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your scan' } });
      return;
    }

    const updated = await prisma.scanRecord.update({
      where: { id: scanId },
      data: {
        confirmedTypeId,
        confirmedAt: new Date(),
        status: 'confirmed',
      },
      include: { confirmedType: true },
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

scansRouter.get('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scanId = req.params.id as string;
    const scan = await prisma.scanRecord.findUnique({
      where: { id: scanId },
      select: {
        id: true,
        status: true,
        aiProposedTypeId: true,
        aiConfidence: true,
        aiRawResponse: true,
        confirmedTypeId: true,
      },
    });

    if (!scan) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Scan not found' } });
      return;
    }

    res.json({ data: scan });
  } catch (error) {
    next(error);
  }
});

scansRouter.get('/photo/:sessionId/:filename', (req: Request, res: Response) => {
  const { sessionId, filename } = req.params as Record<string, string>;
  const filePath = getPhotoAbsolutePath(`${sessionId}/${filename}`);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Photo not found' } });
    }
  });
});
