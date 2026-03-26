import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

export const locationsRouter = Router();

locationsRouter.get('/:sessionId/locations', async (req: Request, res: Response, next: NextFunction) => {
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

    const locations = await prisma.location.findMany({
      where: { sessionId },
      orderBy: { sortOrder: 'asc' },
      include: {
        floors: { orderBy: { sortOrder: 'asc' } },
      },
    });

    res.json({ data: locations });
  } catch (error) {
    next(error);
  }
});

locationsRouter.post('/:sessionId/locations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.params.sessionId as string;
    const { name } = req.body as { name?: string };

    if (!name?.trim()) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Naam is verplicht' } });
      return;
    }

    const session = await prisma.inventorySession.findUnique({ where: { id: sessionId } });
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
      return;
    }
    if (session.inspectorId !== req.inspector!.inspectorId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your session' } });
      return;
    }

    const count = await prisma.location.count({ where: { sessionId } });

    const location = await prisma.location.create({
      data: {
        sessionId,
        name: name.trim(),
        sortOrder: count,
      },
      include: { floors: true },
    });

    res.status(201).json({ data: location });
  } catch (error) {
    next(error);
  }
});

locationsRouter.delete('/:sessionId/floors/:floorId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, floorId } = req.params as Record<string, string>;

    const floor = await prisma.floor.findUnique({
      where: { id: floorId },
      include: { location: { include: { session: true } }, scanRecords: { include: { scanJob: true } } },
    });

    if (!floor || floor.location.sessionId !== sessionId) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Floor not found' } });
      return;
    }
    if (floor.location.session.inspectorId !== req.inspector!.inspectorId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your session' } });
      return;
    }

    for (const record of floor.scanRecords) {
      if (record.scanJob) await prisma.scanJob.delete({ where: { id: record.scanJob.id } });
    }
    await prisma.scanRecord.deleteMany({ where: { floorId } });
    await prisma.floor.delete({ where: { id: floorId } });

    res.json({ data: { id: floorId, deleted: true } });
  } catch (error) {
    next(error);
  }
});

locationsRouter.post('/:sessionId/floors/:floorId/duplicate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, floorId } = req.params as Record<string, string>;
    const { targetFloorId } = req.body as { targetFloorId?: string };

    if (!targetFloorId) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'targetFloorId is required' } });
      return;
    }

    const sourceFloor = await prisma.floor.findUnique({
      where: { id: floorId },
      include: {
        location: { include: { session: true } },
        scanRecords: { where: { status: 'confirmed' } },
      },
    });

    if (!sourceFloor || sourceFloor.location.sessionId !== sessionId) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Source floor not found' } });
      return;
    }
    if (sourceFloor.location.session.inspectorId !== req.inspector!.inspectorId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your session' } });
      return;
    }

    const targetFloor = await prisma.floor.findUnique({ where: { id: targetFloorId } });
    if (!targetFloor) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Target floor not found' } });
      return;
    }

    const created = [];
    for (const record of sourceFloor.scanRecords) {
      const newRecord = await prisma.scanRecord.create({
        data: {
          sessionId,
          floorId: targetFloorId,
          inspectorId: req.inspector!.inspectorId,
          photoPath: null,
          confirmedTypeId: record.confirmedTypeId,
          quantity: record.quantity,
          status: 'confirmed',
          confirmedAt: new Date(),
        },
        include: { confirmedType: true },
      });
      created.push(newRecord);
    }

    res.status(201).json({ data: { count: created.length } });
  } catch (error) {
    next(error);
  }
});

locationsRouter.post('/:sessionId/locations/:locationId/floors', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, locationId } = req.params as Record<string, string>;
    const { name } = req.body as { name?: string };

    if (!name?.trim()) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Naam is verplicht' } });
      return;
    }

    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: { session: true },
    });

    if (!location || location.sessionId !== sessionId) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Location not found' } });
      return;
    }
    if (location.session.inspectorId !== req.inspector!.inspectorId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your session' } });
      return;
    }

    const count = await prisma.floor.count({ where: { locationId } });

    const floor = await prisma.floor.create({
      data: {
        locationId,
        name: name.trim(),
        sortOrder: count,
      },
    });

    res.status(201).json({ data: floor });
  } catch (error) {
    next(error);
  }
});
