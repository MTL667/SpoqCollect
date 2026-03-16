import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const sessionsRouter = Router();

sessionsRouter.post('/', async (req, res, next) => {
  try {
    const { clientAddress, buildingTypeId } = req.body as {
      clientAddress?: string;
      buildingTypeId?: string;
    };

    if (!clientAddress?.trim() || !buildingTypeId) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Client address and building type are required' },
      });
      return;
    }

    const session = await prisma.inventorySession.create({
      data: {
        inspectorId: req.inspector!.inspectorId,
        clientAddress: clientAddress.trim(),
        buildingTypeId,
      },
      include: { buildingType: true },
    });

    res.status(201).json({ data: session });
  } catch (error) {
    next(error);
  }
});

sessionsRouter.get('/', async (req, res, next) => {
  try {
    const sessions = await prisma.inventorySession.findMany({
      where: { inspectorId: req.inspector!.inspectorId },
      include: {
        buildingType: { select: { id: true, nameNl: true } },
        _count: { select: { scanRecords: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: sessions });
  } catch (error) {
    next(error);
  }
});

sessionsRouter.get('/:id', async (req, res, next) => {
  try {
    const session = await prisma.inventorySession.findUnique({
      where: { id: req.params.id },
      include: {
        buildingType: { select: { id: true, nameNl: true } },
        inspector: { select: { id: true, name: true } },
        scanRecords: {
          include: {
            confirmedType: { select: { nameNl: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
      return;
    }

    if (session.inspectorId !== req.inspector!.inspectorId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your session' } });
      return;
    }

    res.json({ data: session });
  } catch (error) {
    next(error);
  }
});

sessionsRouter.patch('/:id/complete', async (req, res, next) => {
  try {
    const session = await prisma.inventorySession.findUnique({
      where: { id: req.params.id },
    });

    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
      return;
    }

    if (session.inspectorId !== req.inspector!.inspectorId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your session' } });
      return;
    }

    if (session.status === 'completed') {
      res.status(400).json({
        error: { code: 'SESSION_ALREADY_COMPLETED', message: 'Session is already completed' },
      });
      return;
    }

    const updated = await prisma.inventorySession.update({
      where: { id: req.params.id },
      data: { status: 'completed', completedAt: new Date() },
      include: { buildingType: true },
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});
