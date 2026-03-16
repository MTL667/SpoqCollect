import pino from 'pino';
import { config } from '../config.js';

export const logger = pino({
  transport:
    config.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  level: config.NODE_ENV === 'development' ? 'debug' : 'info',
});
