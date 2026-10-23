import { calculateEmi, obligationRatioPct } from '../coreBridge';
import { invokeTool } from '../tools/permissionGuard';
import type { AgentCheckInternal, AgentContext } from './types';

export async function runCreditAssessmentAgent(ctx: AgentContext): Promise<AgentCheckInternal> {
  const { application, customer, product, audit } = ctx;
  const s = await invokeTool<{ score: number; band: string }>('CreditAssessmentAgent', 'get_credit_score', { customerId: customer.customerId }, audit);
  const inc = await invokeTool<{ verifiedIncome: number }>('CreditAssessmentAgent', 'verify_income',
    { customerId: customer.customerId, declaredIncome: application.monthlyIncome }, audit);
  const rate = Number(product.indicativeRate ?? product.minInterestRate);
  const emi = calculateEmi(application.requestedAmount, rate, application.tenureMonths);
  const ratio = obligationRatioPct(inc.verifiedIncome, application.existingMonthlyObligations, emi);
  const { maxObligationRatioPercent: limit, minCreditScore, minMonthlyIncome } = product.eligibilityCriteria;
  const failures: string[] = [];
  if (s.score < minCreditScore) failures.push(`credit score below product minimum ${minCreditScore}`);
  if (inc.verifiedIncome < minMonthlyIncome) failures.push(`income below product minimum ₹${minMonthlyIncome.toLocaleString('en-IN')}`);
  if (!(ratio <= limit)) failures.push('obligation ratio above limit');
  const detail = [`Obligation ratio is ${Math.round(ratio)}% (limit ${limit}%); credit score band is ${s.band}`, ...failures].join('; ');
  return { agent: 'CreditAssessmentAgent', result: failures.length ? 'FAIL' : 'PASS', detail, facts: { creditScore: s.score, band: s.band, ratioPct: ratio } };
}
