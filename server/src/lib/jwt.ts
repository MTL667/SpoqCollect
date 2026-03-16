import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface JwtPayload {
  inspectorId: string;
  email: string;
  name: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.JWT_SECRET) as JwtPayload;
}
