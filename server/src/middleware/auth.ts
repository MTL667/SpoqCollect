import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type JwtPayload } from '../lib/jwt.js';

declare global {
  namespace Express {
    interface Request {
      inspector?: JwtPayload;
    }
  }
}

const PUBLIC_PATHS = ['/api/auth/login', '/api/health'];

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (PUBLIC_PATHS.some((p) => req.path.startsWith(p))) {
    next();
    return;
  }

  if (!req.path.startsWith('/api/')) {
    next();
    return;
  }

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    return;
  }

  try {
    req.inspector = verifyToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
    });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.inspector) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    return;
  }

  if (req.inspector.role !== 'admin') {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Admin access required' },
    });
    return;
  }

  next();
}
