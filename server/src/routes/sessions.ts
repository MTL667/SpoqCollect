import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  ON_SCAN_PROMPTS_BY_TYPE_NL,
  SESSION_END_ATEX_FIELDS,
  SESSION_END_FIRE_LIGHTING_FIELDS,
  SESSION_END_LIGHTNING_FIELDS,
  sessionStartFieldsForBuilding,
} from '../config/prompt-catalog.js';
import { getSessionCompleteBlockers, mergeSessionPromptPatch } from '../services/session-prompts.js';

export const sessionsRouter = Router();

interface CreateSessionBody {
  clientName?: string;
  street?: string;
  number?: string;
  bus?: string;
  postalCode?: string;
  city?: string;
  buildingTypeId?: string;
  mappingProfileId?: string;
}

sessionsRouter.post('/', async (req, res, next) => {
  try {
    const { clientName, street, number, bus, postalCode, city, buildingTypeId, mappingProfileId } = req.body as CreateSessionBody;

    if (!clientName?.trim() || !street?.trim() || !number?.trim() || !postalCode?.trim() || !city?.trim() || !buildingTypeId) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Naam, straat, nummer, postcode, plaats en gebouwtype zijn verplicht' },
      });
      return;
    }

    const session = await prisma.inventorySession.create({
      data: {
        inspectorId: req.inspector!.inspectorId,
        clientName: clientName.trim(),
        street: street.trim(),
        number: number.trim(),
        bus: bus?.trim() || null,
        postalCode: postalCode.trim(),
        city: city.trim(),
        buildingTypeId,
        ...(mappingProfileId ? { mappingProfileId } : {}),
      },
      include: { buildingType: true, mappingProfile: { select: { id: true, name: true, country: true } } },
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
        mappingProfile: { select: { id: true, name: true, country: true } },
        _count: { select: { scanRecords: true, draftAssets: true, priorReportFiles: true } },
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
        mappingProfile: { select: { id: true, name: true, country: true } },
        inspector: { select: { id: true, name: true } },
        locations: {
          orderBy: { sortOrder: 'asc' },
          include: {
            floors: {
              orderBy: { sortOrder: 'asc' },
              include: {
                scanRecords: {
                  include: { confirmedType: { select: { id: true, nameNl: true } } },
                  orderBy: { createdAt: 'asc' },
                },
              },
            },
          },
        },
        scanRecords: {
          include: { confirmedType: { select: { id: true, nameNl: true } } },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { draftAssets: true, priorReportFiles: true } },
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

/** Update session details (address, mapping profile, client name). */
sessionsRouter.patch('/:id', async (req, res, next) => {
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

    const body = req.body as {
      clientName?: string;
      street?: string;
      number?: string;
      bus?: string | null;
      postalCode?: string;
      city?: string;
      mappingProfileId?: string | null;
    };

    const data: Record<string, unknown> = {};
    if (body.clientName !== undefined) data.clientName = body.clientName.trim();
    if (body.street !== undefined) data.street = body.street.trim();
    if (body.number !== undefined) data.number = body.number.trim();
    if (body.bus !== undefined) data.bus = body.bus?.trim() || null;
    if (body.postalCode !== undefined) data.postalCode = body.postalCode.trim();
    if (body.city !== undefined) data.city = body.city.trim();
    if (body.mappingProfileId !== undefined) data.mappingProfileId = body.mappingProfileId || null;

    const updated = await prisma.inventorySession.update({
      where: { id: req.params.id },
      data,
      include: {
        buildingType: { select: { id: true, nameNl: true } },
        mappingProfile: { select: { id: true, name: true, country: true } },
        inspector: { select: { id: true, name: true } },
      },
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

/** Prompt catalog + completion checklist for client (Epic 6). */
sessionsRouter.get('/:id/prompts/catalog', async (req, res, next) => {
  try {
    const session = await prisma.inventorySession.findUnique({
      where: { id: req.params.id },
      include: {
        buildingType: true,
        scanRecords: { select: { confirmedType: { select: { nameNl: true } } } },
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

    const nameNl = session.buildingType.nameNl;
    const sessionStartFields = sessionStartFieldsForBuilding(nameNl);
    const data = session.sessionPromptData as Record<string, unknown> | null;

    const scans = session.scanRecords.map((r) => ({ confirmedType: r.confirmedType }));
    const completeBlockers =
      session.status === 'active'
        ? getSessionCompleteBlockers({
            buildingTypeNameNl: nameNl,
            sessionPromptData: session.sessionPromptData,
            scans,
          })
        : [];

    res.json({
      data: {
        sessionStartFields: sessionStartFields ?? [],
        sessionEndFireFields: SESSION_END_FIRE_LIGHTING_FIELDS,
        sessionEndLightningFields: SESSION_END_LIGHTNING_FIELDS,
        sessionEndAtexFields: SESSION_END_ATEX_FIELDS,
        sessionPromptData: data,
        completeBlockers,
        onScanPromptsByTypeNl: { ...ON_SCAN_PROMPTS_BY_TYPE_NL },
      },
    });
  } catch (error) {
    next(error);
  }
});

sessionsRouter.patch('/:id/prompts', async (req, res, next) => {
  try {
    const session = await prisma.inventorySession.findUnique({ where: { id: req.params.id } });
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
      return;
    }
    if (session.inspectorId !== req.inspector!.inspectorId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your session' } });
      return;
    }
    if (session.status !== 'active') {
      res.status(400).json({ error: { code: 'SESSION_COMPLETED', message: 'Session is not active' } });
      return;
    }

    const body = req.body as {
      start?: Record<string, unknown>;
      startCompleted?: boolean;
      end?: Record<string, unknown>;
      lightning?: Record<string, unknown>;
      atex?: Record<string, unknown>;
    };

    const merged = mergeSessionPromptPatch(session.sessionPromptData, {
      start: body.start,
      startCompleted: body.startCompleted,
      end: body.end,
      lightning: body.lightning,
      atex: body.atex,
    });

    const updated = await prisma.inventorySession.update({
      where: { id: req.params.id },
      data: { sessionPromptData: merged },
      include: { buildingType: true },
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

sessionsRouter.patch('/:id/complete', async (req, res, next) => {
  try {
    const session = await prisma.inventorySession.findUnique({
      where: { id: req.params.id },
      include: {
        buildingType: true,
        scanRecords: { select: { confirmedType: { select: { nameNl: true } } } },
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

    if (session.status === 'completed') {
      res.status(400).json({
        error: { code: 'SESSION_ALREADY_COMPLETED', message: 'Session is already completed' },
      });
      return;
    }

    const body = req.body as {
      end?: Record<string, unknown>;
      lightning?: Record<string, unknown>;
      atex?: Record<string, unknown>;
    };

    let promptData = session.sessionPromptData;
    if (body.end || body.lightning || body.atex) {
      promptData = mergeSessionPromptPatch(promptData, {
        end: body.end,
        lightning: body.lightning,
        atex: body.atex,
      });
    }

    const scans = session.scanRecords.map((r) => ({ confirmedType: r.confirmedType }));
    const blockers = getSessionCompleteBlockers({
      buildingTypeNameNl: session.buildingType.nameNl,
      sessionPromptData: promptData,
      scans,
    });

    if (blockers.length > 0) {
      res.status(400).json({
        error: {
          code: 'SESSION_PROMPTS_INCOMPLETE',
          message: 'Sessievragen zijn onvolledig',
          details: { blockers },
        },
      });
      return;
    }

    const updated = await prisma.inventorySession.update({
      where: { id: req.params.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        ...(body.end || body.lightning || body.atex ? { sessionPromptData: promptData as object } : {}),
      },
      include: { buildingType: true },
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

sessionsRouter.patch('/:id/reopen', async (req, res, next) => {
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

    if (session.status === 'active') {
      res.status(400).json({
        error: { code: 'SESSION_ALREADY_ACTIVE', message: 'Session is already active' },
      });
      return;
    }

    const updated = await prisma.inventorySession.update({
      where: { id: req.params.id },
      data: { status: 'active', completedAt: null },
      include: { buildingType: true },
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});
