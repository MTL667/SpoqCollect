import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

export const mappingProfilesRouter = Router();

mappingProfilesRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const profiles = await prisma.mappingProfile.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { subcontractors: true, mappingRules: true, subassetConfigs: true, sessions: true },
        },
      },
    });
    res.json({ data: profiles });
  } catch (error) {
    next(error);
  }
});

mappingProfilesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await prisma.mappingProfile.findUnique({
      where: { id: req.params.id as string },
      include: {
        subcontractors: {
          where: { active: true },
          include: {
            objectTypes: { include: { objectType: { select: { id: true, nameNl: true } } } },
          },
          orderBy: { name: 'asc' },
        },
        mappingRules: {
          where: { active: true },
          include: { objectType: { select: { id: true, nameNl: true } } },
          orderBy: { objectType: { nameNl: 'asc' } },
        },
        subassetConfigs: {
          include: {
            parentObjectType: { select: { id: true, nameNl: true } },
            childObjectType: { select: { id: true, nameNl: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!profile) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Profile not found' } });
      return;
    }

    res.json({ data: profile });
  } catch (error) {
    next(error);
  }
});

mappingProfilesRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, country, hasRegionLogic, odooExportEnabled } = req.body as {
      name?: string;
      country?: string;
      hasRegionLogic?: boolean;
      odooExportEnabled?: boolean;
    };

    if (!name?.trim()) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name is required' } });
      return;
    }

    const profile = await prisma.mappingProfile.create({
      data: {
        name: name.trim(),
        country: country?.trim() || 'BE',
        hasRegionLogic: hasRegionLogic ?? false,
        odooExportEnabled: odooExportEnabled ?? true,
      },
    });

    res.status(201).json({ data: profile });
  } catch (error) {
    next(error);
  }
});

mappingProfilesRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, country, hasRegionLogic, odooExportEnabled, active } = req.body as {
      name?: string;
      country?: string;
      hasRegionLogic?: boolean;
      odooExportEnabled?: boolean;
      active?: boolean;
    };

    const profile = await prisma.mappingProfile.update({
      where: { id: req.params.id as string },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(country !== undefined ? { country } : {}),
        ...(hasRegionLogic !== undefined ? { hasRegionLogic } : {}),
        ...(odooExportEnabled !== undefined ? { odooExportEnabled } : {}),
        ...(active !== undefined ? { active } : {}),
      },
    });

    res.json({ data: profile });
  } catch (error) {
    next(error);
  }
});

// ── Subcontractors ──

mappingProfilesRouter.post('/:id/subcontractors', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, exportLabel, objectTypeIds } = req.body as {
      name?: string;
      exportLabel?: string;
      objectTypeIds?: string[];
    };

    if (!name?.trim() || !exportLabel?.trim()) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name and exportLabel required' } });
      return;
    }

    const sub = await prisma.profileSubcontractor.create({
      data: {
        profileId: req.params.id as string,
        name: name.trim(),
        exportLabel: exportLabel.trim(),
        ...(objectTypeIds?.length
          ? { objectTypes: { create: objectTypeIds.map((otId) => ({ objectTypeId: otId })) } }
          : {}),
      },
      include: { objectTypes: { include: { objectType: { select: { id: true, nameNl: true } } } } },
    });

    res.status(201).json({ data: sub });
  } catch (error) {
    next(error);
  }
});

mappingProfilesRouter.patch('/:id/subcontractors/:subId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, exportLabel, objectTypeIds, active } = req.body as {
      name?: string;
      exportLabel?: string;
      objectTypeIds?: string[];
      active?: boolean;
    };

    const subId = req.params.subId as string;

    if (objectTypeIds) {
      await prisma.profileSubcontractorObjectType.deleteMany({ where: { subcontractorId: subId } });
      if (objectTypeIds.length > 0) {
        await prisma.profileSubcontractorObjectType.createMany({
          data: objectTypeIds.map((otId) => ({ subcontractorId: subId, objectTypeId: otId })),
        });
      }
    }

    const sub = await prisma.profileSubcontractor.update({
      where: { id: subId },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(exportLabel !== undefined ? { exportLabel: exportLabel.trim() } : {}),
        ...(active !== undefined ? { active } : {}),
      },
      include: { objectTypes: { include: { objectType: { select: { id: true, nameNl: true } } } } },
    });

    res.json({ data: sub });
  } catch (error) {
    next(error);
  }
});

// ── Subasset configs ──

mappingProfilesRouter.post('/:id/subasset-configs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { parentObjectTypeId, childObjectTypeId, sortOrder } = req.body as {
      parentObjectTypeId?: string;
      childObjectTypeId?: string;
      sortOrder?: number;
    };

    if (!parentObjectTypeId || !childObjectTypeId) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'parentObjectTypeId and childObjectTypeId required' } });
      return;
    }

    const config = await prisma.profileSubassetConfig.create({
      data: {
        profileId: req.params.id as string,
        parentObjectTypeId,
        childObjectTypeId,
        sortOrder: sortOrder ?? 0,
      },
      include: {
        parentObjectType: { select: { id: true, nameNl: true } },
        childObjectType: { select: { id: true, nameNl: true } },
      },
    });

    res.status(201).json({ data: config });
  } catch (error) {
    next(error);
  }
});

mappingProfilesRouter.delete('/:id/subasset-configs/:configId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.profileSubassetConfig.delete({ where: { id: req.params.configId as string } });
    res.json({ data: { deleted: true } });
  } catch (error) {
    next(error);
  }
});

// ── Profile Mapping Rules ──

mappingProfilesRouter.get('/:id/rules', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rules = await prisma.profileMappingRule.findMany({
      where: { profileId: req.params.id as string, active: true },
      include: { objectType: { select: { id: true, nameNl: true } } },
      orderBy: { objectType: { nameNl: 'asc' } },
    });
    res.json({ data: rules });
  } catch (error) {
    next(error);
  }
});

mappingProfilesRouter.post('/:id/rules', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { objectTypeId, regime, region, minQuantity, maxQuantity, odooProductCode, startPriceProductCode, labelNl, priority } = req.body as {
      objectTypeId?: string;
      regime?: string | null;
      region?: string | null;
      minQuantity?: number | null;
      maxQuantity?: number | null;
      odooProductCode?: string;
      startPriceProductCode?: string | null;
      labelNl?: string | null;
      priority?: number;
    };

    if (!objectTypeId || !odooProductCode) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'objectTypeId and odooProductCode required' } });
      return;
    }

    const rule = await prisma.profileMappingRule.create({
      data: {
        profileId: req.params.id as string,
        objectTypeId,
        regime: regime || null,
        region: region || null,
        minQuantity: minQuantity ?? null,
        maxQuantity: maxQuantity ?? null,
        odooProductCode,
        startPriceProductCode: startPriceProductCode || null,
        labelNl: labelNl || null,
        priority: priority ?? 0,
      },
      include: { objectType: { select: { id: true, nameNl: true } } },
    });

    res.status(201).json({ data: rule });
  } catch (error) {
    next(error);
  }
});

mappingProfilesRouter.patch('/:id/rules/:ruleId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as Record<string, unknown>;
    const ruleId = req.params.ruleId as string;

    const rule = await prisma.profileMappingRule.update({
      where: { id: ruleId },
      data: {
        ...(body.objectTypeId !== undefined ? { objectTypeId: String(body.objectTypeId) } : {}),
        ...(body.regime !== undefined ? { regime: body.regime ? String(body.regime) : null } : {}),
        ...(body.region !== undefined ? { region: body.region ? String(body.region) : null } : {}),
        ...(body.minQuantity !== undefined ? { minQuantity: body.minQuantity != null ? Number(body.minQuantity) : null } : {}),
        ...(body.maxQuantity !== undefined ? { maxQuantity: body.maxQuantity != null ? Number(body.maxQuantity) : null } : {}),
        ...(body.odooProductCode !== undefined ? { odooProductCode: String(body.odooProductCode) } : {}),
        ...(body.startPriceProductCode !== undefined ? { startPriceProductCode: body.startPriceProductCode ? String(body.startPriceProductCode) : null } : {}),
        ...(body.labelNl !== undefined ? { labelNl: body.labelNl ? String(body.labelNl) : null } : {}),
        ...(body.priority !== undefined ? { priority: Number(body.priority) } : {}),
        ...(body.active !== undefined ? { active: Boolean(body.active) } : {}),
      },
      include: { objectType: { select: { id: true, nameNl: true } } },
    });

    res.json({ data: rule });
  } catch (error) {
    next(error);
  }
});

mappingProfilesRouter.delete('/:id/rules/:ruleId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.profileMappingRule.delete({ where: { id: req.params.ruleId as string } });
    res.json({ data: { deleted: true } });
  } catch (error) {
    next(error);
  }
});
