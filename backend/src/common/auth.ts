import type { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from './errors';

export interface AuthUser {
  username: string;
  role: Role;
  customerId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    { sub: user.username, role: user.role, customerId: user.customerId },
    env.LL_JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '8h' }
  );
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Missing or invalid token'));
  }
  const token = header.slice(7).trim();
  try {
    const payload = jwt.verify(token, env.LL_JWT_SECRET, { algorithms: ['HS256'] }) as {
      sub: string;
      role: Role;
      customerId?: string | null;
    };
    req.user = {
      username: payload.sub,
      role: payload.role,
      customerId: payload.customerId ?? null,
    };
    next();
  } catch (_err) {
    next(new AppError(401, 'UNAUTHORIZED', 'Missing or invalid token'));
  }
};

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Missing or invalid token'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', `Role ${req.user.role} is not allowed to perform this action`));
    }
    next();
  };
}

export function currentUser(req: Request): AuthUser {
  if (!req.user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid token');
  }
  return req.user;
}
