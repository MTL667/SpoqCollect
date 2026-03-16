import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const buildingTypesRouter = Router();

buildingTypesRouter.get('/', async (_req, res, next) => {
  try {
    const buildingTypes = await prisma.buildingType.findMany({
      where: { active: true },
      orderBy: { nameNl: 'asc' },
    });

    res.json({ data: buildingTypes });
  } catch (error) {
    next(error);
  }
});
