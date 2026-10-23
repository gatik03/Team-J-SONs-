import { http, HttpResponse } from 'msw';
import { API_BASE } from '../api/client';
import type {
  AgentRecommendation,
  ApplicationDocument,
  AuditTrail,
  CustomerProfile,
  EmiRequest,
  EmiResult,
  ErrorResponse,
  KnowledgeDocument,
  LoanApplication,
  LoanProduct,
  PolicyLibraryItem,
  PolicyVersion,
  Role,
  ScheduleRow,
} from '../api/types';
import {
  advisorClarify,
  advisorSample,
  applications as initialApplications,
  auditTrails as initialAuditTrails,
  documents as initialDocuments,
  foreclosureAnswers,
  policyNotFound,
  policySample,
  policyVersions as initialPolicyVersions,
  previewSections,
  products as initialProducts,
  profiles as initialProfiles,
  users,
  workflowDenied,
  workflowSample,
} from './fixtures';

let stateProducts: LoanProduct[];
let stateProfiles: Record<string, CustomerProfile>;
let stateApplications: LoanApplication[];
let stateDocuments: ApplicationDocument[];
let statePolicyVersions: Omit<PolicyVersion, 'servingState'>[];
let stateAuditTrails: Record<string, AuditTrail>;
let stateRecommendations: Record<string, AgentRecommendation>;
let appCounter = 500;
let docCounter = 10;
let kbCounter = 101;

export function resetMockState() {
  stateProducts = structuredClone(initialProducts);
  stateProfiles = structuredClone(initialProfiles);
  stateApplications = structuredClone(initialApplications);
  stateDocuments = structuredClone(initialDocuments);
  statePolicyVersions = structuredClone(initialPolicyVersions);
  stateAuditTrails = structuredClone(initialAuditTrails);
  stateRecommendations = {
    'LA-2026-00418': structuredClone(workflowSample),
  };
  appCounter = 500;
  docCounter = 10;
  kbCounter = 101;
}

resetMockState();

function err(status: number, code: string, message: string, details?: { field?: string; issue?: string }[]): Response {
  const body: ErrorResponse = {
    status,
    code,
    message,
    details: details ?? [],
    timestamp: new Date().toISOString(),
  };
  return HttpResponse.json(body, { status });
}

function getUser(req: Request): { username: string; role: Role; customerId: string | null; displayName: string } | null {
  const auth = req.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer mock.')) return null;
  const username = auth.slice('Bearer mock.'.length);
  const u = users[username as keyof typeof users];
  if (!u) return null;
  return { username, role: u.role, customerId: u.customerId, displayName: u.displayName };
}

function calculateEmi(principal: number, annualRate: number, tenureMonths: number): EmiResult {
  const r = annualRate / 1200;
  const n = tenureMonths;
  let emi = 0;
  if (r === 0) {
    emi = Math.round(principal / n);
  } else {
    const factor = Math.pow(1 + r, n);
    emi = Math.round((principal * r * factor) / (factor - 1));
  }

  const schedule: ScheduleRow[] = [];
  let balance = principal;
  let totalInterest = 0;

  for (let m = 1; m <= n; m++) {
    const openingBalance = balance;
    let interestComponent = Math.round(balance * r);
    let principalComponent = emi - interestComponent;

    if (m === n || principalComponent > balance) {
      principalComponent = balance;
      interestComponent = Math.max(0, emi - principalComponent);
      balance = 0;
    } else {
      balance = balance - principalComponent;
    }

    totalInterest += interestComponent;

    schedule.push({
      month: m,
      openingBalance,
      emi,
      principalComponent,
      interestComponent,
      closingBalance: m === n ? 0 : balance,
    });
  }

  return {
    principal,
    annualRate,
    tenureMonths,
    emi,
    totalInterest,
    totalPayment: principal + totalInterest,
    schedule,
  };
}

function computeServingState(
  row: Omit<PolicyVersion, 'servingState'>,
  allRows: Omit<PolicyVersion, 'servingState'>[],
  today: string
): PolicyVersion['servingState'] {
  if (row.status === 'DRAFT') return 'DRAFT';
  if (row.status === 'RETIRED') return 'RETIRED';
  if (row.effectiveDate > today) return 'SCHEDULED';

  const publishedSameKey = allRows.filter(
    (r) => r.documentKey === row.documentKey && r.status === 'PUBLISHED' && r.effectiveDate <= today
  );

  publishedSameKey.sort((a, b) => {
    if (b.effectiveDate !== a.effectiveDate) {
      return b.effectiveDate.localeCompare(a.effectiveDate);
    }
    return (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '');
  });

  if (publishedSameKey[0]?.documentId === row.documentId) {
    return 'ACTIVE';
  }
  return 'SUPERSEDED';
}

function withServingState(row: Omit<PolicyVersion, 'servingState'>): PolicyVersion {
  const today = new Date().toISOString().slice(0, 10);
  return {
    ...row,
    servingState: computeServingState(row, statePolicyVersions, today),
  };
}

function getForeclosureAnswer(version: string, effectiveDate: string) {
  return {
    ...policySample,
    answer: foreclosureAnswers[version] ?? policySample.answer,
    sources: [
      {
        document: 'Vehicle Loan Terms and Conditions',
        section: 'Foreclosure and Part-Prepayment',
        version,
        effectiveDate,
      },
    ],
  };
}

export const handlers = [
  // 1. POST /api/auth/login
  http.post(`${API_BASE}/api/auth/login`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { username?: string; password?: string };
    if (!body.username || body.password !== 'password' || !users[body.username as keyof typeof users]) {
      return err(401, 'UNAUTHORIZED', 'Invalid username or password');
    }
    const u = users[body.username as keyof typeof users];
    return HttpResponse.json({
      token: `mock.${body.username}`,
      role: u.role,
      customerId: u.customerId,
      displayName: u.displayName,
    });
  }),

  // 2. GET /api/auth/me
  http.get(`${API_BASE}/api/auth/me`, ({ request }) => {
    const user = getUser(request);
    if (!user) return err(401, 'UNAUTHORIZED', 'Missing or invalid token');
    return HttpResponse.json({
      username: user.username,
      role: user.role,
      customerId: user.customerId,
    });
  }),

  // 3. GET /api/products/compare (MUST be registered before /:productId)
  http.get(`${API_BASE}/api/products/compare`, ({ request }) => {
    const url = new URL(request.url);
    const rawIds = url.searchParams.get('ids') ?? '';
    const ids = rawIds.split(',').filter(Boolean);
    if (ids.length < 2 || ids.length > 4) {
      return err(400, 'VALIDATION_FAILED', 'Compare requires between 2 and 4 product IDs');
    }
    const found = ids.map((id) => stateProducts.find((p) => p.productId === id)).filter(Boolean);
    return HttpResponse.json(found);
  }),

  // 4. GET /api/products/:productId
  http.get(`${API_BASE}/api/products/:productId`, ({ params }) => {
    const id = params.productId as string;
    const p = stateProducts.find((x) => x.productId === id);
    if (!p) return err(404, 'NOT_FOUND', `Product ${id} not found`);
    return HttpResponse.json(p);
  }),

  // 5. GET /api/products
  http.get(`${API_BASE}/api/products`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.toLowerCase();
    const loanType = url.searchParams.get('loanType');
    const segment = url.searchParams.get('segment');
    const minAmount = url.searchParams.get('minAmount') ? Number(url.searchParams.get('minAmount')) : undefined;
    const maxAmount = url.searchParams.get('maxAmount') ? Number(url.searchParams.get('maxAmount')) : undefined;
    const sort = url.searchParams.get('sort');

    let list = [...stateProducts];

    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.productId.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }
    if (loanType && loanType !== 'ALL') {
      list = list.filter((p) => p.loanType === loanType);
    }
    if (segment && segment !== 'ALL') {
      list = list.filter((p) => p.eligibilityCriteria.allowedSegments?.includes(segment as any));
    }
    if (minAmount !== undefined) {
      list = list.filter((p) => p.maxAmount >= minAmount);
    }
    if (maxAmount !== undefined) {
      list = list.filter((p) => p.minAmount <= maxAmount);
    }

    if (sort === 'rate_asc') {
      list.sort((a, b) => a.minInterestRate - b.minInterestRate);
    } else if (sort === 'rate_desc') {
      list.sort((a, b) => b.minInterestRate - a.minInterestRate);
    } else if (sort === 'amount_asc') {
      list.sort((a, b) => a.minAmount - b.minAmount);
    } else if (sort === 'amount_desc') {
      list.sort((a, b) => b.maxAmount - a.maxAmount);
    } else if (sort === 'tenure_asc') {
      list.sort((a, b) => a.minTenureMonths - b.minTenureMonths);
    } else if (sort === 'tenure_desc') {
      list.sort((a, b) => b.maxTenureMonths - a.maxTenureMonths);
    } else if (sort === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return HttpResponse.json(list);
  }),

  // 6. POST /api/emi/calculate
  http.post(`${API_BASE}/api/emi/calculate`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as EmiRequest;
    const { principal, annualRate, tenureMonths } = body;
    if (!principal || !annualRate || !tenureMonths) {
      return err(400, 'VALIDATION_FAILED', 'Invalid EMI calculation parameters');
    }
    const result = calculateEmi(principal, annualRate, tenureMonths);
    return HttpResponse.json(result);
  }),

  // 7. GET /api/customers/me
  http.get(`${API_BASE}/api/customers/me`, ({ request }) => {
    const user = getUser(request);
    if (!user) return err(401, 'UNAUTHORIZED', 'Not authenticated');
    if (user.role !== 'CUSTOMER' || !user.customerId) {
      return err(403, 'FORBIDDEN', 'Only customers have profile records');
    }
    const profile = stateProfiles[user.customerId];
    if (!profile) return err(404, 'NOT_FOUND', 'Profile not found');
    return HttpResponse.json(profile);
  }),

  // 8. PUT /api/customers/me
  http.put(`${API_BASE}/api/customers/me`, async ({ request }) => {
    const user = getUser(request);
    if (!user) return err(401, 'UNAUTHORIZED', 'Not authenticated');
    if (user.role !== 'CUSTOMER' || !user.customerId) {
      return err(403, 'FORBIDDEN', 'Only customers can update their profile');
    }
    const body = (await request.json().catch(() => ({}))) as Partial<CustomerProfile>;
    const current = stateProfiles[user.customerId];
    if (!current) return err(404, 'NOT_FOUND', 'Profile not found');
    const updated: CustomerProfile = { ...current, ...body };
    stateProfiles[user.customerId] = updated;
    return HttpResponse.json(updated);
  }),

  // 9. GET /api/applications
  http.get(`${API_BASE}/api/applications`, ({ request }) => {
    const user = getUser(request);
    if (!user) return err(401, 'UNAUTHORIZED', 'Not authenticated');

    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    let list = [...stateApplications];
    if (user.role === 'CUSTOMER') {
      list = list.filter((a) => a.customerId === user.customerId);
    }
    if (status) {
      list = list.filter((a) => a.status === status);
    }
    return HttpResponse.json(list);
  }),

  // 10. POST /api/applications
  http.post(`${API_BASE}/api/applications`, async ({ request }) => {
    const user = getUser(request);
    if (!user) return err(401, 'UNAUTHORIZED', 'Not authenticated');
    if (user.role !== 'CUSTOMER' || !user.customerId) {
      return err(403, 'FORBIDDEN', 'Only customers can create loan applications');
    }
    const body = (await request.json().catch(() => ({}))) as Partial<LoanApplication>;
    const newId = `LA-2026-00${appCounter++}`;
    const now = new Date().toISOString();

    let estimatedEmi: number | null = null;
    if (body.productId && body.requestedAmount && body.tenureMonths) {
      const prod = stateProducts.find((p) => p.productId === body.productId);
      if (prod) {
        estimatedEmi = calculateEmi(body.requestedAmount, prod.minInterestRate, body.tenureMonths).emi;
      }
    }

    const newApp: LoanApplication = {
      applicationId: newId,
      customerId: user.customerId,
      productId: body.productId,
      requestedAmount: body.requestedAmount,
      tenureMonths: body.tenureMonths,
      purpose: body.purpose,
      employmentType: body.employmentType,
      monthlyIncome: body.monthlyIncome,
      existingMonthlyObligations: body.existingMonthlyObligations,
      currentStep: body.currentStep ?? 1,
      status: 'DRAFT',
      estimatedEmi,
      createdAt: now,
      updatedAt: now,
      latestRecommendation: null,
      timeline: [
        {
          status: 'DRAFT',
          at: now,
          by: user.username,
          note: 'Draft created',
        },
      ],
    };
    stateApplications.push(newApp);
    return HttpResponse.json(newApp, { status: 201 });
  }),

  // 11. GET /api/applications/:id
  http.get(`${API_BASE}/api/applications/:id`, ({ params }) => {
    const id = params.id as string;
    const app = stateApplications.find((a) => a.applicationId === id);
    if (!app) return err(404, 'NOT_FOUND', `Application ${id} not found`);
    return HttpResponse.json(app);
  }),

  // 12. PUT /api/applications/:id
  http.put(`${API_BASE}/api/applications/:id`, async ({ params, request }) => {
    const id = params.id as string;
    const appIndex = stateApplications.findIndex((a) => a.applicationId === id);
    if (appIndex === -1) return err(404, 'NOT_FOUND', `Application ${id} not found`);

    const existing = stateApplications[appIndex];
    if (existing.status !== 'DRAFT') {
      return err(409, 'INVALID_STATE', 'Only draft applications can be updated');
    }

    const body = (await request.json().catch(() => ({}))) as Partial<LoanApplication>;
    const now = new Date().toISOString();

    const merged = { ...existing, ...body, updatedAt: now };

    if (merged.productId && merged.requestedAmount && merged.tenureMonths) {
      const prod = stateProducts.find((p) => p.productId === merged.productId);
      if (prod) {
        merged.estimatedEmi = calculateEmi(merged.requestedAmount, prod.minInterestRate, merged.tenureMonths).emi;
      }
    }

    stateApplications[appIndex] = merged;
    return HttpResponse.json(merged);
  }),

  // 13. POST /api/applications/:id/submit
  http.post(`${API_BASE}/api/applications/:id/submit`, ({ params, request }) => {
    const user = getUser(request);
    const id = params.id as string;
    const appIndex = stateApplications.findIndex((a) => a.applicationId === id);
    if (appIndex === -1) return err(404, 'NOT_FOUND', `Application ${id} not found`);

    const app = stateApplications[appIndex];
    const details: { field: string; issue: string }[] = [];
    if (!app.productId) details.push({ field: 'productId', issue: 'Product must be selected' });
    if (!app.requestedAmount) details.push({ field: 'requestedAmount', issue: 'Requested amount is required' });
    if (!app.tenureMonths) details.push({ field: 'tenureMonths', issue: 'Tenure is required' });
    if (!app.purpose) details.push({ field: 'purpose', issue: 'Purpose is required' });
    if (!app.employmentType) details.push({ field: 'employmentType', issue: 'Employment type is required' });
    if (app.monthlyIncome === undefined || app.monthlyIncome === null) details.push({ field: 'monthlyIncome', issue: 'Monthly income is required' });
    if (app.existingMonthlyObligations === undefined || app.existingMonthlyObligations === null) {
      details.push({ field: 'existingMonthlyObligations', issue: 'Existing monthly obligations is required' });
    }

    if (details.length > 0) {
      return err(400, 'VALIDATION_FAILED', 'All required fields must be completed before submission', details);
    }

    const now = new Date().toISOString();
    app.status = 'SUBMITTED';
    app.updatedAt = now;
    app.timeline.push({
      status: 'SUBMITTED',
      at: now,
      by: user?.username ?? 'customer',
      note: 'Submitted by customer',
    });

    stateApplications[appIndex] = app;
    return HttpResponse.json(app);
  }),

  // 14. POST /api/applications/:id/decision
  http.post(`${API_BASE}/api/applications/:id/decision`, async ({ params, request }) => {
    const user = getUser(request);
    if (!user) return err(401, 'UNAUTHORIZED', 'Not authenticated');
    if (user.role !== 'CREDIT_ANALYST') {
      return err(403, 'FORBIDDEN', 'Only a Credit Analyst can record a credit decision');
    }

    const id = params.id as string;
    const appIndex = stateApplications.findIndex((a) => a.applicationId === id);
    if (appIndex === -1) return err(404, 'NOT_FOUND', `Application ${id} not found`);

    const app = stateApplications[appIndex];
    if (app.status !== 'UNDER_REVIEW') {
      return err(409, 'INVALID_STATE', 'Application must be UNDER_REVIEW to record a decision');
    }

    const body = (await request.json().catch(() => ({}))) as { decision?: 'APPROVED' | 'REJECTED'; reason?: string };
    if (!body.decision || (body.decision !== 'APPROVED' && body.decision !== 'REJECTED')) {
      return err(400, 'VALIDATION_FAILED', 'Decision must be APPROVED or REJECTED');
    }
    if (!body.reason || body.reason.trim().length < 10) {
      return err(400, 'VALIDATION_FAILED', 'Reason must be at least 10 characters long');
    }

    const now = new Date().toISOString();
    app.status = body.decision;
    app.updatedAt = now;
    app.timeline.push({
      status: body.decision,
      at: now,
      by: user.username,
      note: body.reason,
    });

    stateApplications[appIndex] = app;
    return HttpResponse.json(app);
  }),

  // 15. GET /api/applications/:id/documents
  http.get(`${API_BASE}/api/applications/:id/documents`, ({ params }) => {
    const id = params.id as string;
    const list = stateDocuments.filter((d) => d.applicationId === id);
    return HttpResponse.json(list);
  }),

  // 16. POST /api/applications/:id/documents
  http.post(`${API_BASE}/api/applications/:id/documents`, async ({ params, request }) => {
    const id = params.id as string;
    const form = await request.formData().catch(() => null);
    if (!form) return err(400, 'VALIDATION_FAILED', 'Multipart form data required');

    const docType = form.get('documentType') as string;
    const file = form.get('file') as File;
    if (!docType || !file) {
      return err(400, 'VALIDATION_FAILED', 'documentType and file are required');
    }

    const newDoc: ApplicationDocument = {
      documentId: `DOC-2026-000${docCounter++}`,
      applicationId: id,
      documentType: docType as any,
      fileName: file.name,
      contentType: file.type || 'application/pdf',
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
    };
    stateDocuments.push(newDoc);
    return HttpResponse.json(newDoc, { status: 201 });
  }),

  // 17. POST /api/advisor/chat
  http.post(`${API_BASE}/api/advisor/chat`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { message?: string };
    const msg = body.message ?? '';
    if (/car|lakh/i.test(msg)) {
      return HttpResponse.json(advisorSample);
    }
    return HttpResponse.json(advisorClarify);
  }),

  // 18. GET /api/knowledge/documents (read-only, policies in force)
  http.get(`${API_BASE}/api/knowledge/documents`, ({ request }) => {
    const user = getUser(request);
    if (!user) return err(401, 'UNAUTHORIZED', 'Not authenticated');
    if (user.role === 'CUSTOMER') {
      return err(403, 'FORBIDDEN', 'Customers cannot access internal knowledge documents');
    }

    const today = new Date().toISOString().slice(0, 10);
    const activeDocs: KnowledgeDocument[] = [];
    for (const row of statePolicyVersions) {
      const state = computeServingState(row, statePolicyVersions, today);
      if (state === 'ACTIVE') {
        activeDocs.push({
          documentId: row.documentId,
          title: row.title,
          version: row.version,
          effectiveDate: row.effectiveDate,
          loanType: row.loanType,
          documentType: row.documentType,
          audience: row.audience,
          customerSegment: row.customerSegment,
          chunkCount: row.chunkCount,
          documentKey: row.documentKey,
          status: row.status,
          ingestedAt: row.ingestedAt,
        });
      }
    }
    return HttpResponse.json(activeDocs);
  }),

  // 19. POST /api/policy/ask
  http.post(`${API_BASE}/api/policy/ask`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { question?: string };
    const q = body.question ?? '';

    if (/foreclos/i.test(q)) {
      const today = new Date().toISOString().slice(0, 10);
      const activeVehicle = statePolicyVersions.find(
        (r) => r.documentKey === 'VEHICLE-TNC' && computeServingState(r, statePolicyVersions, today) === 'ACTIVE'
      );
      if (activeVehicle) {
        return HttpResponse.json(getForeclosureAnswer(activeVehicle.version, activeVehicle.effectiveDate));
      }
    }
    return HttpResponse.json(policyNotFound);
  }),

  // 20. GET /api/admin/policies
  http.get(`${API_BASE}/api/admin/policies`, ({ request }) => {
    const user = getUser(request);
    if (!user) return err(401, 'UNAUTHORIZED', 'Not authenticated');
    if (user.role !== 'POLICY_ADMIN') return err(403, 'FORBIDDEN', 'Policy Admin role required');

    const today = new Date().toISOString().slice(0, 10);
    const keys = Array.from(new Set(statePolicyVersions.map((r) => r.documentKey)));
    const items: PolicyLibraryItem[] = [];

    for (const key of keys) {
      const rows = statePolicyVersions.filter((r) => r.documentKey === key);
      rows.sort((a, b) => (b.ingestedAt ?? '').localeCompare(a.ingestedAt ?? ''));
      const newest = rows[0];

      const activeRow = rows.find((r) => computeServingState(r, statePolicyVersions, today) === 'ACTIVE');
      const scheduledRows = rows
        .filter((r) => computeServingState(r, statePolicyVersions, today) === 'SCHEDULED')
        .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
      const scheduledRow = scheduledRows[0];
      const draftCount = rows.filter((r) => r.status === 'DRAFT').length;

      items.push({
        documentKey: key,
        title: newest.title,
        documentType: newest.documentType,
        audience: newest.audience,
        activeVersion: activeRow ? activeRow.version : null,
        activeEffectiveDate: activeRow ? activeRow.effectiveDate : null,
        scheduledVersion: scheduledRow ? scheduledRow.version : null,
        scheduledEffectiveDate: scheduledRow ? scheduledRow.effectiveDate : null,
        draftCount,
        totalVersions: rows.length,
      });
    }

    return HttpResponse.json(items);
  }),

  // 21. GET /api/admin/policies/:documentKey/versions
  http.get(`${API_BASE}/api/admin/policies/:documentKey/versions`, ({ params, request }) => {
    const user = getUser(request);
    if (!user) return err(401, 'UNAUTHORIZED', 'Not authenticated');
    if (user.role !== 'POLICY_ADMIN') return err(403, 'FORBIDDEN', 'Policy Admin role required');

    const key = params.documentKey as string;
    const rows = statePolicyVersions.filter((r) => r.documentKey === key);
    if (rows.length === 0) return err(404, 'NOT_FOUND', `Policy key ${key} not found`);

    const result = rows.map(withServingState);
    result.sort((a, b) => {
      if (b.effectiveDate !== a.effectiveDate) {
        return b.effectiveDate.localeCompare(a.effectiveDate);
      }
      return b.ingestedAt.localeCompare(a.ingestedAt);
    });

    return HttpResponse.json(result);
  }),

  // 22. POST /api/admin/policies
  http.post(`${API_BASE}/api/admin/policies`, async ({ request }) => {
    const user = getUser(request);
    if (!user) return err(401, 'UNAUTHORIZED', 'Not authenticated');
    if (user.role !== 'POLICY_ADMIN') return err(403, 'FORBIDDEN', 'Policy Admin role required');

    const form = await request.formData().catch(() => null);
    if (!form) return err(400, 'VALIDATION_FAILED', 'Multipart form data required');

    const file = form.get('file') as File;
    const documentKey = form.get('documentKey') as string;
    const title = form.get('title') as string;
    const version = form.get('version') as string;
    const effectiveDate = form.get('effectiveDate') as string;
    const loanType = form.get('loanType') as any;
    const documentType = form.get('documentType') as any;
    const audience = form.get('audience') as any;
    const customerSegment = (form.get('customerSegment') as any) || 'ALL';
    const changeNote = form.get('changeNote') as string;

    const details: { field: string; issue: string }[] = [];
    if (!file) details.push({ field: 'file', issue: 'File is required' });
    if (!documentKey) details.push({ field: 'documentKey', issue: 'documentKey is required' });
    if (!title) details.push({ field: 'title', issue: 'title is required' });
    if (!version) details.push({ field: 'version', issue: 'version is required' });
    if (!effectiveDate) details.push({ field: 'effectiveDate', issue: 'effectiveDate is required' });
    if (!loanType) details.push({ field: 'loanType', issue: 'loanType is required' });
    if (!documentType) details.push({ field: 'documentType', issue: 'documentType is required' });
    if (!audience) details.push({ field: 'audience', issue: 'audience is required' });
    if (!changeNote || changeNote.length < 5) details.push({ field: 'changeNote', issue: 'changeNote must be at least 5 characters' });

    if (documentKey && !/^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(documentKey)) {
      details.push({ field: 'documentKey', issue: 'Invalid documentKey format. Use UPPERCASE letters, digits, and single hyphens' });
    }

    if (details.length > 0) {
      return err(400, 'VALIDATION_FAILED', 'Validation failed', details);
    }

    const exists = statePolicyVersions.some((r) => r.documentKey === documentKey && r.version === version);
    if (exists) {
      return err(409, 'INVALID_STATE', `Version ${version} already exists for ${documentKey}`);
    }

    const now = new Date().toISOString();
    const newDoc: Omit<PolicyVersion, 'servingState'> = {
      documentId: `KB-${kbCounter++}`,
      documentKey,
      title,
      version,
      effectiveDate,
      loanType,
      documentType,
      audience,
      customerSegment,
      chunkCount: 9,
      status: 'DRAFT',
      createdBy: user.username,
      publishedBy: null,
      publishedAt: null,
      retiredAt: null,
      retiredReason: null,
      ingestedAt: now,
      changeNote,
    };

    statePolicyVersions.push(newDoc);
    const withState = withServingState(newDoc);
    return HttpResponse.json(withState, { status: 201 });
  }),

  // 23. GET /api/admin/policies/versions/:documentId/preview
  http.get(`${API_BASE}/api/admin/policies/versions/:documentId/preview`, ({ params, request }) => {
    const user = getUser(request);
    if (!user) return err(401, 'UNAUTHORIZED', 'Not authenticated');
    if (user.role !== 'POLICY_ADMIN') return err(403, 'FORBIDDEN', 'Policy Admin role required');

    const id = params.documentId as string;
    const doc = statePolicyVersions.find((r) => r.documentId === id);
    if (!doc) return err(404, 'NOT_FOUND', `Version ${id} not found`);

    if (doc.documentKey === 'VEHICLE-TNC' && previewSections[doc.version]) {
      return HttpResponse.json(previewSections[doc.version]);
    }

    return HttpResponse.json([
      { section: 'Overview', content: `${doc.title} v${doc.version} (mock preview).` },
    ]);
  }),

  // 24. POST /api/admin/policies/versions/:documentId/test-ask
  http.post(`${API_BASE}/api/admin/policies/versions/:documentId/test-ask`, async ({ params, request }) => {
    const user = getUser(request);
    if (!user) return err(401, 'UNAUTHORIZED', 'Not authenticated');
    if (user.role !== 'POLICY_ADMIN') return err(403, 'FORBIDDEN', 'Policy Admin role required');

    const id = params.documentId as string;
    const doc = statePolicyVersions.find((r) => r.documentId === id);
    if (!doc) return err(404, 'NOT_FOUND', `Version ${id} not found`);

    const body = (await request.json().catch(() => ({}))) as { question?: string };
    const q = body.question ?? '';

    if (doc.documentKey === 'VEHICLE-TNC' && /foreclos/i.test(q)) {
      return HttpResponse.json(getForeclosureAnswer(doc.version, doc.effectiveDate));
    }

    return HttpResponse.json(policyNotFound);
  }),

  // 25. POST /api/admin/policies/versions/:documentId/publish
  http.post(`${API_BASE}/api/admin/policies/versions/:documentId/publish`, ({ params, request }) => {
    const user = getUser(request);
    if (!user) return err(401, 'UNAUTHORIZED', 'Not authenticated');
    if (user.role !== 'POLICY_ADMIN') return err(403, 'FORBIDDEN', 'Policy Admin role required');

    const id = params.documentId as string;
    const docIndex = statePolicyVersions.findIndex((r) => r.documentId === id);
    if (docIndex === -1) return err(404, 'NOT_FOUND', `Version ${id} not found`);

    const doc = statePolicyVersions[docIndex];
    if (doc.status !== 'DRAFT') {
      return err(409, 'INVALID_STATE', 'Only DRAFT versions can be published');
    }

    const now = new Date().toISOString();
    doc.status = 'PUBLISHED';
    doc.publishedBy = user.username;
    doc.publishedAt = now;
    statePolicyVersions[docIndex] = doc;

    return HttpResponse.json(withServingState(doc));
  }),

  // 26. POST /api/admin/policies/versions/:documentId/retire
  http.post(`${API_BASE}/api/admin/policies/versions/:documentId/retire`, async ({ params, request }) => {
    const user = getUser(request);
    if (!user) return err(401, 'UNAUTHORIZED', 'Not authenticated');
    if (user.role !== 'POLICY_ADMIN') return err(403, 'FORBIDDEN', 'Policy Admin role required');

    const id = params.documentId as string;
    const docIndex = statePolicyVersions.findIndex((r) => r.documentId === id);
    if (docIndex === -1) return err(404, 'NOT_FOUND', `Version ${id} not found`);

    const doc = statePolicyVersions[docIndex];
    if (doc.status !== 'PUBLISHED') {
      return err(409, 'INVALID_STATE', 'Only PUBLISHED versions can be retired');
    }

    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    if (!body.reason || body.reason.trim().length < 5) {
      return err(400, 'VALIDATION_FAILED', 'Retire reason must be at least 5 characters');
    }

    const now = new Date().toISOString();
    doc.status = 'RETIRED';
    doc.retiredAt = now;
    doc.retiredReason = body.reason.trim();
    statePolicyVersions[docIndex] = doc;

    return HttpResponse.json(withServingState(doc));
  }),

  // 27. POST /api/workflow/applications/:id/run
  http.post(`${API_BASE}/api/workflow/applications/:id/run`, ({ params, request }) => {
    const user = getUser(request);
    if (!user) return err(401, 'UNAUTHORIZED', 'Not authenticated');
    if (user.role === 'CUSTOMER') return err(403, 'FORBIDDEN', 'Customers cannot execute agent workflows');

    const id = params.id as string;
    const appIndex = stateApplications.findIndex((a) => a.applicationId === id);
    if (appIndex === -1) return err(404, 'NOT_FOUND', `Application ${id} not found`);

    const app = stateApplications[appIndex];
    if (app.status !== 'SUBMITTED') {
      return err(409, 'INVALID_STATE', `Application must be in SUBMITTED status (currently ${app.status})`);
    }

    const url = new URL(request.url);
    const demoDenied = url.searchParams.get('demoPermissionViolation') === 'true';

    const now = new Date().toISOString();
    app.status = 'UNDER_REVIEW';
    app.updatedAt = now;
    app.timeline.push(
      {
        status: 'UNDER_VERIFICATION',
        at: now,
        by: 'OrchestratorAgent',
        note: 'Agent pre-screen verification initiated',
      },
      {
        status: 'UNDER_REVIEW',
        at: now,
        by: 'OrchestratorAgent',
        note: 'Pre-screen checks completed; human review required',
      }
    );

    const rec = demoDenied
      ? { ...workflowDenied, applicationId: id }
      : { ...workflowSample, applicationId: id };

    stateRecommendations[id] = rec;
    app.latestRecommendation = rec;
    stateApplications[appIndex] = app;

    return HttpResponse.json(rec);
  }),

  // 28. GET /api/workflow/applications/:id/recommendation
  http.get(`${API_BASE}/api/workflow/applications/:id/recommendation`, ({ params }) => {
    const id = params.id as string;
    const rec = stateRecommendations[id];
    if (!rec) return err(404, 'NOT_FOUND', `No recommendation found for application ${id}`);
    return HttpResponse.json(rec);
  }),

  // 29. GET /api/audit/:auditTrailId
  http.get(`${API_BASE}/api/audit/:auditTrailId`, ({ params }) => {
    const id = params.auditTrailId as string;
    const trail = stateAuditTrails[id];
    if (!trail) return err(404, 'NOT_FOUND', `Audit trail ${id} not found`);
    return HttpResponse.json(trail);
  }),
];
