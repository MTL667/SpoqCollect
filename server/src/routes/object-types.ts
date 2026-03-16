import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const objectTypesRouter = Router();

objectTypesRouter.get('/', async (req, res, next) => {
  try {
    const { buildingTypeId } = req.query;

    const where: { active: boolean; buildingTypes?: { some: { buildingTypeId: string } } } = {
      active: true,
    };

    if (typeof buildingTypeId === 'string') {
      where.buildingTypes = {
        some: { buildingTypeId },
      };
    }

    const objectTypes = await prisma.objectType.findMany({
      where,
      orderBy: { nameNl: 'asc' },
    });

    res.json({ data: objectTypes });
  } catch (error) {
    next(error);
  }
});
