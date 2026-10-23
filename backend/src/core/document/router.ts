import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { DocumentType } from '@prisma/client';
import { requireAuth, requireRole } from '../../common/auth';
import { AppError, asyncHandler } from '../../common/errors';
import { prisma } from '../../common/prisma';
import { listDocuments } from '../application/service';
import * as documentService from './service';

export const documentRouter = Router({ mergeParams: true });

const UPLOAD_DIR = fileURLToPath(new URL('../../../uploads/', import.meta.url));
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    cb(null, randomUUID() + path.extname(file.originalname).toLowerCase());
  },
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(400, 'VALIDATION_FAILED', 'Only PDF, JPG or PNG files are allowed', [
        { field: 'file', issue: 'unsupported type' },
      ])
    );
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter,
});

// GET /api/applications/:applicationId/documents
documentRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const applicationId = req.params.applicationId;
    const user = req.user!;

    if (user.role === 'POLICY_ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Role POLICY_ADMIN is not allowed to view documents');
    }

    const app = await prisma.loanApplication.findUnique({
      where: { applicationId },
    });
    if (!app) {
      throw new AppError(404, 'NOT_FOUND', `Application ${applicationId} not found`);
    }

    if (user.role === 'CUSTOMER' && app.customerId !== user.customerId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not own this application');
    }

    const docs = await listDocuments(applicationId);
    res.json(docs);
  })
);

// POST /api/applications/:applicationId/documents
documentRouter.post(
  '/',
  requireAuth,
  requireRole('CUSTOMER'),
  asyncHandler(async (req, _res, next) => {
    const applicationId = req.params.applicationId;
    const user = req.user!;

    const app = await prisma.loanApplication.findUnique({
      where: { applicationId },
    });
    if (!app) {
      throw new AppError(404, 'NOT_FOUND', `Application ${applicationId} not found`);
    }

    if (app.customerId !== user.customerId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not own this application');
    }

    const allowedStatuses = ['DRAFT', 'SUBMITTED', 'UNDER_VERIFICATION', 'UNDER_REVIEW'];
    if (!allowedStatuses.includes(app.status)) {
      throw new AppError(
        409,
        'INVALID_STATE',
        `Cannot upload documents for application in ${app.status} status`
      );
    }

    next();
  }),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError(400, 'VALIDATION_FAILED', 'File is required', [
        { field: 'file', issue: 'is required' },
      ]);
    }

    const { documentType } = z
      .object({ documentType: z.nativeEnum(DocumentType) })
      .parse(req.body);

    const applicationId = req.params.applicationId;
    const doc = await documentService.createDocument(
      applicationId,
      documentType,
      req.file.originalname,
      req.file.filename,
      req.file.mimetype,
      req.file.size
    );

    res.status(201).json(doc);
  })
);
