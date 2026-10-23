import type { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';
import { Prisma } from '@prisma/client';
import { logger } from './logger';

export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_STATE'
  | 'AI_UNAVAILABLE'
  | 'INTERNAL';

export interface ErrorDetail {
  field: string;
  issue: string;
}

export class AppError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    message: string,
    public details: ErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export const notFound: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let status = 500;
  let code: ErrorCode = 'INTERNAL';
  let message = 'Unexpected server error';
  let details: ErrorDetail[] = [];

  if (err instanceof AppError) {
    status = err.status;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    status = 400;
    code = 'VALIDATION_FAILED';
    message = 'Request validation failed';
    details = err.issues.map((i) => ({
      field: i.path.join('.'),
      issue: i.message,
    }));
  } else if (err instanceof multer.MulterError) {
    status = 400;
    code = 'VALIDATION_FAILED';
    message = err.message;
    details = [{ field: err.field ?? 'file', issue: err.code }];
  } else if (err && typeof err === 'object' && (err as { type?: string }).type === 'entity.parse.failed') {
    status = 400;
    code = 'VALIDATION_FAILED';
    message = 'Malformed JSON body';
    details = [];
  } else if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    status = 404;
    code = 'NOT_FOUND';
    message = 'Record not found';
    details = [];
  } else {
    logger.error({ err });
  }

  res.status(status).json({
    status,
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  });
};
