import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { classifyPhoto } from './ai-classifier.js';
import { getPhotoAbsolutePath } from './storage.js';

const MAX_ATTEMPTS = 3;
const POLL_INTERVAL_MS = 2000;

async function processJob(jobId: string): Promise<void> {
  const job = await prisma.scanJob.findUnique({
    where: { id: jobId },
    include: {
      scanRecord: {
        include: {
          session: {
            include: {
              buildingType: true,
            },
          },
        },
      },
    },
  });

  if (!job) return;

  await prisma.scanJob.update({
    where: { id: jobId },
    data: { status: 'processing' },
  });

  try {
    if (!job.scanRecord.photoPath) {
      throw new Error('No photo path for scan record');
    }
    const photoPath = getPhotoAbsolutePath(job.scanRecord.photoPath);
    const buildingTypeNameNl = job.scanRecord.session.buildingType.nameNl;

    const applicableTypes = await prisma.objectType.findMany({
      where: {
        active: true,
        buildingTypes: {
          some: { buildingTypeId: job.scanRecord.session.buildingTypeId },
        },
      },
    });

    const result = await classifyPhoto(photoPath, buildingTypeNameNl, applicableTypes);

    await prisma.scanRecord.update({
      where: { id: job.scanRecordId },
      data: {
        aiProposedTypeId: result.typeId,
        aiConfidence: result.confidence,
        aiRawResponse: JSON.stringify(result),
        status: 'classified',
      },
    });

    await prisma.scanJob.update({
      where: { id: jobId },
      data: { status: 'completed', processedAt: new Date() },
    });

    logger.info({ jobId, typeId: result.typeId, confidence: result.confidence }, 'Classification completed');
  } catch (error) {
    const attempts = job.attempts + 1;
    const errorMsg = error instanceof Error ? error.message : String(error);

    if (attempts >= MAX_ATTEMPTS) {
      await prisma.scanJob.update({
        where: { id: jobId },
        data: { status: 'failed', attempts, lastError: errorMsg },
      });
      await prisma.scanRecord.update({
        where: { id: job.scanRecordId },
        data: { status: 'manual_required' },
      });
      logger.error({ jobId, attempts, error: errorMsg }, 'Classification failed permanently');
    } else {
      await prisma.scanJob.update({
        where: { id: jobId },
        data: { status: 'pending', attempts, lastError: errorMsg },
      });
      logger.warn({ jobId, attempts, error: errorMsg }, 'Classification failed, will retry');
    }
  }
}

async function pollOnce(): Promise<void> {
  try {
    const job = await prisma.scanJob.findFirst({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });

    if (job) {
      await processJob(job.id);
    }
  } catch (error) {
    logger.error({ error }, 'Queue poll error');
  }
}

let running = false;

export function startQueueWorker(): void {
  if (running) return;
  running = true;
  logger.info('Queue worker started (waiting 10s for DB readiness)');

  setTimeout(() => {
    const poll = () => {
      if (!running) return;
      pollOnce().finally(() => {
        setTimeout(poll, POLL_INTERVAL_MS);
      });
    };
    poll();
  }, 10_000);
}

export function stopQueueWorker(): void {
  running = false;
  logger.info('Queue worker stopped');
}
