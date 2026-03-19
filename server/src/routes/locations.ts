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
