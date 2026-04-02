import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

export const mappingRulesRouter = Router();

mappingRulesRouter.get('/odoo-products/all', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.odooProduct.findMany({
      where: { active: true },
      orderBy: { code: 'asc' },
    });
    res.json({ data: products });
  } catch (error) {
    next(error);
  }
});

mappingRulesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const objectTypeId = typeof req.query.objectTypeId === 'string' ? req.query.objectTypeId : undefined;

    const where: Record<string, unknown> = {};
    if (objectTypeId) {
      where.objectTypeId = objectTypeId;
    }

    const rules = await prisma.serviceCodeMapping.findMany({
      where,
      include: { objectType: { select: { id: true, nameNl: true, exportParty: true } } },
      orderBy: [{ objectTypeId: 'asc' }, { priority: 'desc' }, { regime: 'asc' }],
    });

    res.json({ data: rules });
  } catch (error) {
    next(error);
  }
});

mappingRulesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const rule = await prisma.serviceCodeMapping.findUnique({
      where: { id },
      include: { objectType: { select: { id: true, nameNl: true, exportParty: true } } },
    });

    if (!rule) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Mapping rule not found' } });
      return;
    }

    res.json({ data: rule });
  } catch (error) {
    next(error);
  }
});

mappingRulesRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { objectTypeId, regime, region, minQuantity, maxQuantity, odooProductCode, startPriceProductCode, labelNl, priority, active } = req.body;

    if (!objectTypeId || !odooProductCode) {
      res.status(400).json({ error: { code: 'VALIDATION', message: 'objectTypeId en odooProductCode zijn verplicht' } });
      return;
    }

    const objectType = await prisma.objectType.findUnique({ where: { id: String(objectTypeId) } });
    if (!objectType) {
      res.status(400).json({ error: { code: 'VALIDATION', message: 'ObjectType niet gevonden' } });
      return;
    }

    const rule = await prisma.serviceCodeMapping.create({
      data: {
        objectTypeId: String(objectTypeId),
        regime: regime ? String(regime) : null,
        region: region ? String(region) : null,
        minQuantity: minQuantity != null ? Number(minQuantity) : null,
        maxQuantity: maxQuantity != null ? Number(maxQuantity) : null,
        odooProductCode: String(odooProductCode),
        startPriceProductCode: startPriceProductCode ? String(startPriceProductCode) : null,
        labelNl: labelNl ? String(labelNl) : null,
        priority: priority != null ? Number(priority) : 0,
        active: active !== false,
        version: 1,
      },
      include: { objectType: { select: { id: true, nameNl: true, exportParty: true } } },
    });

    res.status(201).json({ data: rule });
  } catch (error) {
    next(error);
  }
});

mappingRulesRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.serviceCodeMapping.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Mapping rule not found' } });
      return;
    }

    const { objectTypeId, regime, region, minQuantity, maxQuantity, odooProductCode, startPriceProductCode, labelNl, priority, active } = req.body;

    const data: Record<string, unknown> = {};
    if (objectTypeId !== undefined) data.objectTypeId = String(objectTypeId);
    if (regime !== undefined) data.regime = regime ? String(regime) : null;
    if (region !== undefined) data.region = region ? String(region) : null;
    if (minQuantity !== undefined) data.minQuantity = minQuantity != null ? Number(minQuantity) : null;
    if (maxQuantity !== undefined) data.maxQuantity = maxQuantity != null ? Number(maxQuantity) : null;
    if (odooProductCode !== undefined) data.odooProductCode = String(odooProductCode);
    if (startPriceProductCode !== undefined) data.startPriceProductCode = startPriceProductCode ? String(startPriceProductCode) : null;
    if (labelNl !== undefined) data.labelNl = labelNl ? String(labelNl) : null;
    if (priority !== undefined) data.priority = Number(priority);
    if (active !== undefined) data.active = active;

    const rule = await prisma.serviceCodeMapping.update({
      where: { id },
      data,
      include: { objectType: { select: { id: true, nameNl: true, exportParty: true } } },
    });

    res.json({ data: rule });
  } catch (error) {
    next(error);
  }
});

mappingRulesRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.serviceCodeMapping.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Mapping rule not found' } });
      return;
    }

    await prisma.serviceCodeMapping.delete({ where: { id } });
    res.json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
});
