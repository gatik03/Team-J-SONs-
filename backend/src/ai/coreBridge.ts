import * as applications from '../core/application/service';
import * as products from '../core/product/service';
import * as customers from '../core/customer/service';
import type { AiApplication, AiProduct, ApplicationStatus } from './stub/core';
export { calculateEmi, obligationRatioPct } from '../core/emi/loanMath';
export type { AiProduct, AiCustomer, AiDocument, AiApplication, ApplicationStatus, LoanType,
              CustomerSegment, DocumentType } from './stub/core';

const application = (a: applications.LoanApplicationDto): AiApplication => ({
  applicationId: a.applicationId, customerId: a.customerId, productId: a.productId ?? '', requestedAmount: a.requestedAmount ?? 0,
  tenureMonths: a.tenureMonths ?? 0, purpose: a.purpose ?? '', monthlyIncome: a.monthlyIncome ?? 0,
  existingMonthlyObligations: a.existingMonthlyObligations ?? 0, status: a.status, timeline: a.timeline,
});
const product = (p: Awaited<ReturnType<typeof products.listProducts>>[number]): AiProduct => ({
  ...p, indicativeRate: Number(p.indicativeRate ?? p.minInterestRate), processingFeeMax: p.processingFeeMax ?? Number.MAX_SAFE_INTEGER,
  eligibilityCriteria: { minMonthlyIncome: p.eligibilityCriteria.minMonthlyIncome ?? 0, minCreditScore: p.eligibilityCriteria.minCreditScore ?? 0,
    maxObligationRatioPercent: p.eligibilityCriteria.maxObligationRatioPercent ?? 50, allowedSegments: p.eligibilityCriteria.allowedSegments ?? [] },
});
export const listDocuments = applications.listDocuments;
export async function getApplication(id: string) { return { ...application(await applications.getApplication(id)), documents: await listDocuments(id) }; }
export async function transition(id: string, to: ApplicationStatus, by: string, note: string) { return application(await applications.transition(id, to, by, note)); }
export async function listProducts() { return (await products.listProducts()).map(product); }
export async function getProduct(id: string) { const p = await products.getProduct(id); return p ? product(p) : null; }
export async function getCustomer(id: string) {
  const c = await customers.getCustomer(id);
  return { customerId: c.customerId, fullName: c.fullName, segment: c.segment, employmentType: c.employmentType,
    monthlyIncome: c.monthlyIncome, existingMonthlyObligations: c.existingMonthlyObligations, location: c.location, kycStatus: c.kycStatus };
}
