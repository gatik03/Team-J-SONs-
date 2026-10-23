import type {
  LoanApplication,
  StatusEvent,
  ApplicationDocument,
  ApplicationStatus,
} from '@prisma/client';
import { prisma } from '../../common/prisma';
import { AppError } from '../../common/errors';
import { newId } from '../../common/ids';
import { calculateEmi } from '../emi/loanMath';
import { assertTransition } from './stateMachine';
import type {
  LoanApplicationDto,
  LoanApplicationWithDocs,
  ApplicationDocumentDto,
  StatusEventDto,
  LoanApplicationDraftInput,
  ApplicationListQueryInput,
} from './schemas';

export type {
  LoanApplicationDto,
  LoanApplicationWithDocs,
  ApplicationDocumentDto,
  StatusEventDto,
  LoanApplicationDraftInput,
  ApplicationListQueryInput,
};

export function toStatusEvent(e: StatusEvent): StatusEventDto {
  return {
    status: e.status,
    at: e.at.toISOString(),
    by: e.actor,
    note: e.note,
  };
}

export function toApplicationDocument(d: ApplicationDocument): ApplicationDocumentDto {
  return {
    documentId: d.documentId,
    applicationId: d.applicationId,
    documentType: d.documentType,
    fileName: d.fileName,
    contentType: d.contentType,
    sizeBytes: d.sizeBytes,
    uploadedAt: d.uploadedAt.toISOString(),
  };
}

export function toLoanApplication(
  row: LoanApplication & { events?: StatusEvent[] }
): LoanApplicationDto {
  const events = (row.events ?? []).sort((a, b) => a.at.getTime() - b.at.getTime());
  const timeline = events.map(toStatusEvent);

  const dto: LoanApplicationDto = {
    applicationId: row.applicationId,
    customerId: row.customerId,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    estimatedEmi: row.estimatedEmi,
    timeline,
    latestRecommendation: null,
  };

  if (row.productId !== null && row.productId !== undefined) dto.productId = row.productId;
  if (row.requestedAmount !== null && row.requestedAmount !== undefined) dto.requestedAmount = row.requestedAmount;
  if (row.tenureMonths !== null && row.tenureMonths !== undefined) dto.tenureMonths = row.tenureMonths;
  if (row.purpose !== null && row.purpose !== undefined) dto.purpose = row.purpose;
  if (row.employmentType !== null && row.employmentType !== undefined) dto.employmentType = row.employmentType;
  if (row.monthlyIncome !== null && row.monthlyIncome !== undefined) dto.monthlyIncome = row.monthlyIncome;
  if (row.existingMonthlyObligations !== null && row.existingMonthlyObligations !== undefined)
    dto.existingMonthlyObligations = row.existingMonthlyObligations;
  if (row.currentStep !== null && row.currentStep !== undefined) dto.currentStep = row.currentStep;

  return dto;
}

export async function computeEstimatedEmi(
  productId?: string | null,
  amount?: number | null,
  tenure?: number | null
): Promise<number | null> {
  if (!productId || !amount || !tenure) {
    return null;
  }
  const product = await prisma.loanProduct.findUnique({
    where: { productId },
  });
  if (!product) {
    return null;
  }
  return calculateEmi(amount, product.indicativeRate, tenure);
}

export async function listApplications(
  filter: { customerId?: string } & ApplicationListQueryInput
): Promise<LoanApplicationDto[]> {
  const where: { customerId?: string; status?: ApplicationStatus } = {};
  if (filter.customerId) {
    where.customerId = filter.customerId;
  }
  if (filter.status) {
    where.status = filter.status;
  }

  const rows = await prisma.loanApplication.findMany({
    where,
    include: { events: true },
    orderBy: { updatedAt: 'desc' },
  });

  return rows.map(toLoanApplication);
}

export async function getApplication(applicationId: string): Promise<LoanApplicationWithDocs> {
  const row = await prisma.loanApplication.findUnique({
    where: { applicationId },
    include: { events: true, documents: true },
  });
  if (!row) {
    throw new AppError(404, 'NOT_FOUND', `Application ${applicationId} not found`);
  }
  const appDto = toLoanApplication(row);
  const docs = (row.documents ?? []).sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime());
  return {
    ...appDto,
    documents: docs.map(toApplicationDocument),
  };
}

export async function createApplication(
  customerId: string,
  username: string,
  input: LoanApplicationDraftInput
): Promise<LoanApplicationDto> {
  if (input.productId) {
    const product = await prisma.loanProduct.findUnique({
      where: { productId: input.productId },
    });
    if (!product) {
      throw new AppError(400, 'VALIDATION_FAILED', `Product ${input.productId} not found`, [
        { field: 'productId', issue: `Product ${input.productId} not found` },
      ]);
    }
  }

  const estimatedEmi = await computeEstimatedEmi(
    input.productId,
    input.requestedAmount,
    input.tenureMonths
  );

  const applicationId = newId('LA');

  const created = await prisma.$transaction(async (tx) => {
    const app = await tx.loanApplication.create({
      data: {
        applicationId,
        customerId,
        productId: input.productId ?? null,
        requestedAmount: input.requestedAmount ?? null,
        tenureMonths: input.tenureMonths ?? null,
        purpose: input.purpose ?? null,
        employmentType: input.employmentType ?? null,
        monthlyIncome: input.monthlyIncome ?? null,
        existingMonthlyObligations: input.existingMonthlyObligations ?? null,
        currentStep: input.currentStep ?? 1,
        status: 'DRAFT',
        estimatedEmi,
      },
    });

    await tx.statusEvent.create({
      data: {
        applicationId,
        status: 'DRAFT',
        actor: username,
        note: 'Draft created',
      },
    });

    return tx.loanApplication.findUniqueOrThrow({
      where: { applicationId },
      include: { events: true },
    });
  });

  return toLoanApplication(created);
}

export async function updateDraft(
  applicationId: string,
  customerId: string,
  input: LoanApplicationDraftInput
): Promise<LoanApplicationDto> {
  const app = await prisma.loanApplication.findUnique({
    where: { applicationId },
  });
  if (!app) {
    throw new AppError(404, 'NOT_FOUND', `Application ${applicationId} not found`);
  }
  if (app.customerId !== customerId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not own this application');
  }
  if (app.status !== 'DRAFT') {
    throw new AppError(409, 'INVALID_STATE', `Cannot edit application in ${app.status} status`);
  }

  const mergedProductId = input.productId !== undefined ? input.productId : app.productId;
  const mergedAmount = input.requestedAmount !== undefined ? input.requestedAmount : app.requestedAmount;
  const mergedTenure = input.tenureMonths !== undefined ? input.tenureMonths : app.tenureMonths;

  if (input.productId) {
    const product = await prisma.loanProduct.findUnique({
      where: { productId: input.productId },
    });
    if (!product) {
      throw new AppError(400, 'VALIDATION_FAILED', `Product ${input.productId} not found`, [
        { field: 'productId', issue: `Product ${input.productId} not found` },
      ]);
    }
  }

  const estimatedEmi = await computeEstimatedEmi(mergedProductId, mergedAmount, mergedTenure);

  const updated = await prisma.loanApplication.update({
    where: { applicationId },
    data: {
      ...input,
      estimatedEmi,
    },
    include: { events: true },
  });

  return toLoanApplication(updated);
}

export async function transition(
  applicationId: string,
  to: ApplicationStatus,
  by: string,
  note: string
): Promise<LoanApplicationDto> {
  const app = await prisma.loanApplication.findUnique({
    where: { applicationId },
  });
  if (!app) {
    throw new AppError(404, 'NOT_FOUND', `Application ${applicationId} not found`);
  }

  assertTransition(app.status, to);

  const updated = await prisma.$transaction(async (tx) => {
    const changed = await tx.loanApplication.updateMany({
      where: { applicationId, status: app.status },
      data: { status: to },
    });
    if (changed.count !== 1) throw new AppError(409, 'INVALID_STATE', 'Application status changed during this action. Refresh and try again.');

    await tx.statusEvent.create({
      data: {
        applicationId,
        status: to,
        actor: by,
        note,
      },
    });

    return tx.loanApplication.findUniqueOrThrow({
      where: { applicationId },
      include: { events: true },
    });
  });

  return toLoanApplication(updated);
}

export async function submitApplication(
  applicationId: string,
  customerId: string,
  username: string
): Promise<LoanApplicationDto> {
  const app = await prisma.loanApplication.findUnique({
    where: { applicationId },
  });
  if (!app) {
    throw new AppError(404, 'NOT_FOUND', `Application ${applicationId} not found`);
  }
  if (app.customerId !== customerId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not own this application');
  }
  if (app.status !== 'DRAFT') {
    throw new AppError(409, 'INVALID_STATE', `Cannot submit application in ${app.status} status`);
  }

  const details: { field: string; issue: string }[] = [];

  if (!app.productId) details.push({ field: 'productId', issue: 'is required to submit' });
  if (app.requestedAmount === null || app.requestedAmount === undefined) {
    details.push({ field: 'requestedAmount', issue: 'is required to submit' });
  }
  if (app.tenureMonths === null || app.tenureMonths === undefined) {
    details.push({ field: 'tenureMonths', issue: 'is required to submit' });
  }
  if (!app.purpose || app.purpose.trim() === '') {
    details.push({ field: 'purpose', issue: 'is required to submit' });
  }
  if (!app.employmentType || app.employmentType.trim() === '') {
    details.push({ field: 'employmentType', issue: 'is required to submit' });
  }
  if (app.monthlyIncome === null || app.monthlyIncome === undefined) {
    details.push({ field: 'monthlyIncome', issue: 'is required to submit' });
  }
  if (app.existingMonthlyObligations === null || app.existingMonthlyObligations === undefined) {
    details.push({ field: 'existingMonthlyObligations', issue: 'is required to submit' });
  }

  let product = null;
  if (app.productId) {
    product = await prisma.loanProduct.findUnique({
      where: { productId: app.productId },
    });
    if (!product) {
      details.push({ field: 'productId', issue: `Product ${app.productId} not found` });
    } else {
      if (app.requestedAmount !== null && app.requestedAmount !== undefined) {
        if (app.requestedAmount < product.minAmount || app.requestedAmount > product.maxAmount) {
          details.push({
            field: 'requestedAmount',
            issue: `must be between ${product.minAmount} and ${product.maxAmount} for ${product.productId}`,
          });
        }
      }
      if (app.tenureMonths !== null && app.tenureMonths !== undefined) {
        if (app.tenureMonths < product.minTenureMonths || app.tenureMonths > product.maxTenureMonths) {
          details.push({
            field: 'tenureMonths',
            issue: `must be between ${product.minTenureMonths} and ${product.maxTenureMonths} for ${product.productId}`,
          });
        }
      }
    }
  }

  if (details.length > 0) {
    throw new AppError(400, 'VALIDATION_FAILED', 'Application is incomplete', details);
  }

  const estimatedEmi = calculateEmi(app.requestedAmount!, product!.indicativeRate, app.tenureMonths!);

  await prisma.loanApplication.update({
    where: { applicationId },
    data: {
      currentStep: 4,
      estimatedEmi,
    },
  });

  return transition(applicationId, 'SUBMITTED', username, 'Submitted by customer');
}

export async function listDocuments(applicationId: string): Promise<ApplicationDocumentDto[]> {
  const docs = await prisma.applicationDocument.findMany({
    where: { applicationId },
    orderBy: { uploadedAt: 'asc' },
  });
  return docs.map(toApplicationDocument);
}
