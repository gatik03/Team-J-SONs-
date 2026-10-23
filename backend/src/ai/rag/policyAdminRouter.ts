import { extname } from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { currentUser, requireAuth, requireRole } from '../../common/auth';
import { AppError, asyncHandler } from '../../common/errors';
import { KbMetaSchema } from './ingest';
import { listLibrary, listVersions, previewVersion, publishVersion, retireVersion, testAsk, uploadDraft } from './policyAdminService';

// Mounted as aiRouter.use('/admin/policies', policyAdminRouter) → /api/admin/policies/**. POLICY_ADMIN only.
export const policyAdminRouter = Router();
policyAdminRouter.use(requireAuth, requireRole('POLICY_ADMIN'));

const ALLOWED = ['.pdf', '.md', '.csv', '.json'];
const upload = multer({
  storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => ALLOWED.includes(extname(file.originalname).toLowerCase())
    ? cb(null, true)
    : cb(new AppError(400, 'VALIDATION_FAILED', 'File must be .pdf, .md, .csv or .json', [{ field: 'file', issue: 'unsupported extension' }])),
});
const UploadBody = KbMetaSchema.extend({ changeNote: z.string().trim().min(5) });
const KeyParam = z.object({ documentKey: KbMetaSchema.shape.documentKey });
const IdParam = z.object({ documentId: z.string().uuid() });

policyAdminRouter.get('/', asyncHandler(async (_req, res) => { res.json(await listLibrary()); }));

policyAdminRouter.post('/', upload.single('file'), asyncHandler(async (req, res) => {
  const { changeNote, ...meta } = UploadBody.parse(req.body);
  if (!req.file) throw new AppError(400, 'VALIDATION_FAILED', 'A file is required', [{ field: 'file', issue: 'required' }]);
  res.status(201).json(await uploadDraft({ buffer: req.file.buffer, fileName: req.file.originalname, meta, changeNote, actor: currentUser(req).username }));
}));

policyAdminRouter.get('/:documentKey/versions', asyncHandler(async (req, res) => {
  res.json(await listVersions(KeyParam.parse(req.params).documentKey));
}));

policyAdminRouter.get('/versions/:documentId/preview', asyncHandler(async (req, res) => {
  res.json(await previewVersion(IdParam.parse(req.params).documentId));
}));

policyAdminRouter.post('/versions/:documentId/test-ask', asyncHandler(async (req, res) => {
  const { question } = z.object({ question: z.string().trim().min(3).max(1000) }).parse(req.body);
  res.json(await testAsk(IdParam.parse(req.params).documentId, question));
}));

policyAdminRouter.post('/versions/:documentId/publish', asyncHandler(async (req, res) => {
  res.json(await publishVersion(IdParam.parse(req.params).documentId, currentUser(req).username));
}));

policyAdminRouter.post('/versions/:documentId/retire', asyncHandler(async (req, res) => {
  const { reason } = z.object({ reason: z.string().trim().min(5) }).parse(req.body);
  res.json(await retireVersion(IdParam.parse(req.params).documentId, reason, currentUser(req).username));
}));
