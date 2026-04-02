import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

export const objectTypesRouter = Router();

objectTypesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { buildingTypeId, clientName } = req.query;

    const conditions: object[] = [{ active: true, clientName: null }];

    if (typeof clientName === 'string') {
      conditions.push({ active: true, clientName });
    }

    const where: object = {
      OR: conditions,
      ...(typeof buildingTypeId === 'string'
        ? { buildingTypes: { some: { buildingTypeId } } }
        : {}),
    };

    const objectTypes = await prisma.objectType.findMany({
      where: { ...where, parentObjectTypeId: null },
      orderBy: { nameNl: 'asc' },
      include: { childObjectTypes: { where: { active: true }, orderBy: { nameNl: 'asc' } } },
    });

    res.json({ data: objectTypes });
  } catch (error) {
    next(error);
  }
});

objectTypesRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nameNl, clientName } = req.body as { nameNl?: string; clientName?: string };

    if (!nameNl || !nameNl.trim()) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'nameNl is vereist' } });
      return;
    }
    if (!clientName || !clientName.trim()) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'clientName is vereist' } });
      return;
    }

    const existing = await prisma.objectType.findUnique({
      where: { nameNl_clientName: { nameNl: nameNl.trim(), clientName: clientName.trim() } },
    });
    if (existing) {
      res.json({ data: existing });
      return;
    }

    const objectType = await prisma.objectType.create({
      data: {
        nameNl: nameNl.trim(),
        nameFr: nameNl.trim(),
        heliOmCategory: 'Custom',
        isCustom: true,
        clientName: clientName.trim(),
        active: true,
      },
    });

    res.status(201).json({ data: objectType });
  } catch (error) {
    next(error);
  }
});
