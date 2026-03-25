import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { objectTypesRouter } from './routes/object-types.js';
import { buildingTypesRouter } from './routes/building-types.js';
import { sessionsRouter } from './routes/sessions.js';
import { scansRouter } from './routes/scans.js';
import { exportsRouter } from './routes/exports.js';
import { locationsRouter } from './routes/locations.js';
import { priorReportsRouter } from './routes/prior-reports.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { config } from './config.js';
import { logger } from './lib/logger.js';
import { startQueueWorker } from './services/queue.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors());
app.use(express.json());
app.use(authMiddleware);

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/object-types', objectTypesRouter);
app.use('/api/building-types', buildingTypesRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/sessions', locationsRouter);
app.use('/api/sessions', scansRouter);
app.use('/api/scans', scansRouter);
app.use('/api/sessions', exportsRouter);
app.use('/api/sessions', priorReportsRouter);

app.use('/api', ((_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API route not found' } });
}) as import('express').RequestHandler);

const publicDir = path.resolve(__dirname, '../../public');
if (config.NODE_ENV === 'production') {
  app.use(express.static(publicDir));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

app.use(errorHandler);

app.listen(config.PORT, () => {
  logger.info(`Server running on port ${config.PORT}`);
  startQueueWorker();
});

export { app };
