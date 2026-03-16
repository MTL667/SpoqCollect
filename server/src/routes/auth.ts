import { Router } from 'express';
import { compare } from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' },
      });
      return;
    }

    const inspector = await prisma.inspector.findUnique({ where: { email } });

    if (!inspector) {
      res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
      return;
    }

    const valid = await compare(password, inspector.passwordHash);
    if (!valid) {
      res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
      return;
    }

    const token = signToken({
      inspectorId: inspector.id,
      email: inspector.email,
      name: inspector.name,
      role: inspector.role,
    });

    res.json({
      data: {
        token,
        inspector: {
          id: inspector.id,
          email: inspector.email,
          name: inspector.name,
          role: inspector.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});
