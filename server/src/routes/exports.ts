import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { generateHeliOmExcel } from '../services/export-heli.js';
import { generateClientReport } from '../services/export-report.js';
import { generateOdooCsvBuffer } from '../services/odoo-export.js';

export const exportsRouter = Router();

exportsRouter.post('/:id/export/heli-om', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.params.id as string;

    const session = await prisma.inventorySession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
      return;
    }

    if (session.inspectorId !== req.inspector!.inspectorId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your session' } });
      return;
    }

    if (session.status !== 'completed') {
      res.status(400).json({ error: { code: 'SESSION_ACTIVE', message: 'Session must be completed before export' } });
      return;
    }

    const buffer = await generateHeliOmExcel(sessionId);

    const sanitizedName = session.clientName.replace(/[^a-zA-Z0-9 -]/g, '').replace(/\s+/g, '-');
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `heli-om-${sanitizedName}-${dateStr}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

exportsRouter.post('/:id/export/report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.params.id as string;

    const session = await prisma.inventorySession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
      return;
    }

    if (session.inspectorId !== req.inspector!.inspectorId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your session' } });
      return;
    }

    if (session.status !== 'completed') {
      res.status(400).json({ error: { code: 'SESSION_ACTIVE', message: 'Session must be completed before export' } });
      return;
    }

    const buffer = await generateClientReport(sessionId);

    const sanitizedName = session.clientName.replace(/[^a-zA-Z0-9 -]/g, '').replace(/\s+/g, '-');
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `rapport-${sanitizedName}-${dateStr}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

exportsRouter.post('/:id/export/odoo', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.params.id as string;

    const session = await prisma.inventorySession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
      return;
    }

    if (session.inspectorId !== req.inspector!.inspectorId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your session' } });
      return;
    }

    if (session.status !== 'completed') {
      res.status(400).json({ error: { code: 'SESSION_ACTIVE', message: 'Session must be completed before export' } });
      return;
    }

    const { csv, unmappedCount } = await generateOdooCsvBuffer(sessionId);

    const sanitizedName = session.clientName.replace(/[^a-zA-Z0-9 -]/g, '').replace(/\s+/g, '-');
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `odoo-${sanitizedName}-${dateStr}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    if (unmappedCount > 0) {
      res.setHeader('X-Odoo-Unmapped-Count', String(unmappedCount));
    }
    res.send(csv);
  } catch (error) {
    next(error);
  }
});
