import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { upload } from '../middleware/upload.js';
import { movePhoto, getPhotoAbsolutePath } from '../services/storage.js';
import { classifyPhoto } from '../services/ai-classifier.js';
import { logger } from '../lib/logger.js';

export const scansRouter = Router();

/** Update scan parent link, on-scan answers, or confirmed object type. */
scansRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scanId = req.params.id as string;
    const body = req.body as {
      parentScanId?: string | null;
      onScanPromptAnswers?: Record<string, unknown>;
      confirmedTypeId?: string;
    };

    if (body.parentScanId === undefined && body.onScanPromptAnswers === undefined && body.confirmedTypeId === undefined) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'parentScanId, onScanPromptAnswers of confirmedTypeId vereist' } });
      return;
    }

    const scan = await prisma.scanRecord.findUnique({
      where: { id: scanId },
      include: { session: true },
    });

    if (!scan) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Scan record not found' } });
      return;
    }

    if (scan.inspectorId !== req.inspector!.inspectorId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your scan' } });
      return;
    }

    const data: { parentScanId?: string | null; onScanPromptAnswers?: object; confirmedTypeId?: string; confirmedAt?: Date } = {};

    if (body.parentScanId !== undefined) {
      if (body.parentScanId === null) {
        data.parentScanId = null;
      } else {
        if (body.parentScanId === scanId) {
          res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Scan kan niet zichzelf als parent hebben' } });
          return;
        }
        const parent = await prisma.scanRecord.findUnique({ where: { id: body.parentScanId } });
        if (!parent || parent.sessionId !== scan.sessionId) {
          res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Ongeldige parent scan' } });
          return;
        }
        data.parentScanId = body.parentScanId;
      }
    }

    if (body.onScanPromptAnswers !== undefined) {
      data.onScanPromptAnswers = body.onScanPromptAnswers;
    }

    if (body.confirmedTypeId !== undefined) {
      const objectType = await prisma.objectType.findUnique({ where: { id: body.confirmedTypeId } });
      if (!objectType || !objectType.active) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Ongeldig objecttype' } });
        return;
      }
      data.confirmedTypeId = body.confirmedTypeId;
      data.confirmedAt = new Date();
    }

    await prisma.scanRecord.update({
      where: { id: scanId },
      data,
    });

    const updated = await prisma.scanRecord.findUnique({
      where: { id: scanId },
      include: { confirmedType: true, parentScan: { select: { id: true } } },
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

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

scansRouter.post('/:sessionId/scans/manual', upload.single('photo'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.params.sessionId as string;
    const { floorId, confirmedTypeId, quantity: qtyStr } = req.body as { floorId?: string; confirmedTypeId?: string; quantity?: string };

    const session = await prisma.inventorySession.findUnique({ where: { id: sessionId } });
    if (!session) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } }); return; }
    if (session.inspectorId !== req.inspector!.inspectorId) { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your session' } }); return; }
    if (session.status !== 'active') { res.status(400).json({ error: { code: 'SESSION_COMPLETED', message: 'Session is completed' } }); return; }
    if (!floorId || !confirmedTypeId) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'floorId and confirmedTypeId are required' } }); return; }

    const qty = Math.max(1, parseInt(qtyStr ?? '1', 10) || 1);

    const scanRecord = await prisma.scanRecord.create({
      data: {
        sessionId,
        floorId,
        inspectorId: req.inspector!.inspectorId,
        photoPath: null,
        confirmedTypeId,
        quantity: qty,
        status: 'confirmed',
        confirmedAt: new Date(),
      },
    });

    let photoPath: string | null = null;
    if (req.file) {
      photoPath = movePhoto(req.file.path, sessionId, scanRecord.id);
      await prisma.scanRecord.update({
        where: { id: scanRecord.id },
        data: { photoPath },
      });
    }

    const result = await prisma.scanRecord.findUnique({
      where: { id: scanRecord.id },
      include: { confirmedType: true },
    });

    res.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
});

scansRouter.patch('/:id/confirm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { confirmedTypeId, quantity, onScanPromptAnswers } = req.body as {
      confirmedTypeId?: string;
      quantity?: number;
      onScanPromptAnswers?: Record<string, unknown>;
    };
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
        quantity: quantity && quantity >= 1 ? quantity : 1,
        confirmedAt: new Date(),
        status: 'confirmed',
        ...(onScanPromptAnswers !== undefined ? { onScanPromptAnswers } : {}),
      },
      include: { confirmedType: true, parentScan: { select: { id: true } } },
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

scansRouter.patch('/:id/quantity', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { quantity } = req.body as { quantity?: number };
    const scanId = req.params.id as string;

    if (!quantity || quantity < 1) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'quantity must be >= 1' } });
      return;
    }

    const scan = await prisma.scanRecord.findUnique({ where: { id: scanId } });

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
      data: { quantity },
      include: { confirmedType: true },
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

scansRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scanId = req.params.id as string;
    const scan = await prisma.scanRecord.findUnique({ where: { id: scanId }, include: { scanJob: true } });

    if (!scan) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Scan not found' } }); return; }
    if (scan.inspectorId !== req.inspector!.inspectorId) { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your scan' } }); return; }

    if (scan.scanJob) {
      await prisma.scanJob.delete({ where: { id: scan.scanJob.id } });
    }
    await prisma.scanRecord.delete({ where: { id: scanId } });

    res.json({ data: { id: scanId, deleted: true } });
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
