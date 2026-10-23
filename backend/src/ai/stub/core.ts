// In-memory stand-in for S1's core services (Integration_Contracts §6). Replaced inside coreBridge.ts after S1 merges.
import { AppError } from '../../common/errors';

export type ApplicationStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_VERIFICATION' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'DISBURSED';
export type LoanType = 'PERSONAL' | 'HOME' | 'VEHICLE' | 'EDUCATION';
export type CustomerSegment = 'SALARIED' | 'SELF_EMPLOYED' | 'STUDENT';
export type DocumentType = 'IDENTITY' | 'ADDRESS' | 'INCOME';

export interface AiProduct { productId: string; name: string; loanType: LoanType; description: string;
  minInterestRate: number; maxInterestRate: number; indicativeRate: number;
  minTenureMonths: number; maxTenureMonths: number; minAmount: number; maxAmount: number;
  processingFeePercent: number; processingFeeMin: number; processingFeeMax: number;
  eligibilityCriteria: { minMonthlyIncome: number; minCreditScore: number; maxObligationRatioPercent: number; allowedSegments: CustomerSegment[] } }
export interface AiCustomer { customerId: string; fullName: string; segment: CustomerSegment; employmentType: string;
  monthlyIncome: number; existingMonthlyObligations: number; location: string; kycStatus: 'VERIFIED' | 'PENDING' | 'FAILED' }
export interface AiDocument { documentId: string; applicationId: string; documentType: DocumentType; fileName: string; uploadedAt: string }
export interface AiApplication { applicationId: string; customerId: string; productId: string; requestedAmount: number; tenureMonths: number;
  purpose: string; monthlyIncome: number; existingMonthlyObligations: number; status: ApplicationStatus;
  timeline: { status: ApplicationStatus; at: string; by: string; note: string }[] }

const p = (productId: string, name: string, loanType: LoanType, description: string, indicativeRate: number, minInterestRate: number, maxInterestRate: number,
  minTenureMonths: number, maxTenureMonths: number, minAmount: number, maxAmount: number, processingFeePercent: number, processingFeeMin: number,
  processingFeeMax: number, minMonthlyIncome: number, minCreditScore: number, allowedSegments: CustomerSegment[]): AiProduct => ({
  productId, name, loanType, description, indicativeRate, minInterestRate, maxInterestRate, minTenureMonths, maxTenureMonths, minAmount, maxAmount,
  processingFeePercent, processingFeeMin, processingFeeMax,
  eligibilityCriteria: { minMonthlyIncome, minCreditScore, maxObligationRatioPercent: 50, allowedSegments } });

const PRODUCTS: AiProduct[] = [
  p('PL-101', 'Kestrel Personal Loan – Salaried', 'PERSONAL', 'Unsecured personal loan for salaried customers', 12.0, 11.5, 18.0, 12, 60, 50000, 2500000, 1.5, 2500, 10000, 25000, 700, ['SALARIED']),
  p('PL-102', 'Kestrel Personal Loan – Self-Employed', 'PERSONAL', 'Unsecured personal loan for business owners', 14.0, 13.0, 20.0, 12, 48, 100000, 1500000, 2.0, 3000, 15000, 40000, 720, ['SELF_EMPLOYED']),
  p('HL-301', 'Kestrel Home Loan', 'HOME', 'Loan to buy or build a home', 8.75, 8.5, 10.5, 60, 360, 500000, 50000000, 0.5, 5000, 25000, 30000, 700, ['SALARIED', 'SELF_EMPLOYED']),
  p('HL-302', 'Kestrel Home Top-Up Loan', 'HOME', 'Additional funds on an existing home loan', 9.5, 9.25, 11.5, 12, 180, 100000, 5000000, 0.5, 3000, 15000, 30000, 700, ['SALARIED', 'SELF_EMPLOYED']),
  p('VL-201', 'Kestrel New Car Loan', 'VEHICLE', 'Finance for brand-new cars', 9.25, 9.25, 12.0, 12, 84, 100000, 5000000, 1.5, 1000, 7500, 25000, 650, ['SALARIED', 'SELF_EMPLOYED']),
  p('VL-204', 'Kestrel Pre-Owned Car Loan', 'VEHICLE', 'Finance for used (pre-owned) cars up to 8 years old', 11.0, 11.0, 14.0, 12, 84, 100000, 2500000, 1.5, 1000, 7500, 25000, 650, ['SALARIED', 'SELF_EMPLOYED']),
  p('EL-401', 'Kestrel Education Loan – India', 'EDUCATION', 'Tuition and living costs for study in India', 10.5, 10.5, 12.5, 12, 120, 50000, 2000000, 1.0, 1000, 10000, 0, 650, ['STUDENT']),
  p('EL-402', 'Kestrel Education Loan – Abroad', 'EDUCATION', 'Tuition and living costs for study overseas', 11.5, 11.5, 13.5, 12, 180, 500000, 7500000, 1.0, 5000, 20000, 0, 650, ['STUDENT']),
];

const CUSTOMERS: AiCustomer[] = [
  { customerId: 'CUST-1001', fullName: 'Priya Sharma', segment: 'SALARIED', employmentType: 'Private sector salaried', monthlyIncome: 60000, existingMonthlyObligations: 8000, location: 'Pune', kycStatus: 'VERIFIED' },
  { customerId: 'CUST-1002', fullName: 'Rahul Verma', segment: 'SELF_EMPLOYED', employmentType: 'Self-employed – retail business', monthlyIncome: 95000, existingMonthlyObligations: 20000, location: 'Bengaluru', kycStatus: 'VERIFIED' },
  { customerId: 'CUST-1003', fullName: 'Ananya Iyer', segment: 'STUDENT', employmentType: 'Full-time student', monthlyIncome: 10000, existingMonthlyObligations: 0, location: 'Chennai', kycStatus: 'PENDING' },
];

function initialApps(): (AiApplication & { documents: AiDocument[] })[] {
  return [{
    applicationId: 'LA-2026-00418', customerId: 'CUST-1001', productId: 'PL-101', requestedAmount: 500000, tenureMonths: 48,
    purpose: 'Home renovation and furniture', monthlyIncome: 60000, existingMonthlyObligations: 8000, status: 'SUBMITTED',
    timeline: [
      { status: 'DRAFT', at: '2026-10-20T09:00:00.000Z', by: 'priya.sharma', note: 'Draft created' },
      { status: 'SUBMITTED', at: '2026-10-21T10:20:00.000Z', by: 'priya.sharma', note: 'Submitted by customer' },
    ],
    documents: [
      { documentId: 'DOC-1', applicationId: 'LA-2026-00418', documentType: 'IDENTITY', fileName: 'pan-card.pdf', uploadedAt: '2026-10-21T10:18:00.000Z' },
      { documentId: 'DOC-2', applicationId: 'LA-2026-00418', documentType: 'INCOME', fileName: 'salary-slips-jul-sep-2026.pdf', uploadedAt: '2026-10-21T10:19:00.000Z' },
      { documentId: 'DOC-3', applicationId: 'LA-2026-00418', documentType: 'INCOME', fileName: 'bank-statement-6m.pdf', uploadedAt: '2026-10-21T10:19:30.000Z' },
    ],
  }];
}
let apps = initialApps();

const EDGES: Record<ApplicationStatus, ApplicationStatus[]> = {
  DRAFT: ['SUBMITTED'], SUBMITTED: ['UNDER_VERIFICATION'], UNDER_VERIFICATION: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'], APPROVED: ['DISBURSED'], REJECTED: [], DISBURSED: [],
};

const clone = <T>(v: T): T => structuredClone(v);

export async function getApplication(applicationId: string): Promise<AiApplication & { documents: AiDocument[] }> {
  const a = apps.find((x) => x.applicationId === applicationId);
  if (!a) throw new AppError(404, 'NOT_FOUND', `Application ${applicationId} not found`);
  return clone(a);
}
export async function transition(applicationId: string, to: ApplicationStatus, by: string, note: string): Promise<AiApplication> {
  const a = apps.find((x) => x.applicationId === applicationId);
  if (!a) throw new AppError(404, 'NOT_FOUND', `Application ${applicationId} not found`);
  if (!EDGES[a.status].includes(to)) throw new AppError(409, 'INVALID_STATE', `Cannot move ${a.status} -> ${to}`);
  a.status = to;
  a.timeline.push({ status: to, at: new Date().toISOString(), by, note });
  const { documents: _d, ...rest } = a;
  return clone(rest);
}
export async function listDocuments(applicationId: string): Promise<AiDocument[]> { return (await getApplication(applicationId)).documents; }
export async function listProducts(): Promise<AiProduct[]> { return clone(PRODUCTS); }
export async function getProduct(productId: string): Promise<AiProduct | null> { const x = PRODUCTS.find((q) => q.productId === productId); return x ? clone(x) : null; }
export async function getCustomer(customerId: string): Promise<AiCustomer> {
  const c = CUSTOMERS.find((x) => x.customerId === customerId);
  if (!c) throw new AppError(404, 'NOT_FOUND', `Customer ${customerId} not found`);
  return clone(c);
}
export function calculateEmi(principal: number, annualRatePct: number, months: number): number {
  const r = annualRatePct / 1200;
  if (r === 0) return Math.round(principal / months);
  const f = Math.pow(1 + r, months);
  return Math.round((principal * r * f) / (f - 1));
}
export function obligationRatioPct(monthlyIncome: number, existingObligations: number, proposedEmi: number): number {
  return ((existingObligations + proposedEmi) / monthlyIncome) * 100;
}
export function resetStub(): void { apps = initialApps(); }
