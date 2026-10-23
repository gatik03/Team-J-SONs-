import { AppError } from '../../common/errors';

export interface ScheduleRow {
  month: number;
  openingBalance: number;
  emi: number;
  principalComponent: number;
  interestComponent: number;
  closingBalance: number;
}

export interface EmiResult {
  principal: number;
  annualRate: number;
  tenureMonths: number;
  emi: number;
  totalInterest: number;
  totalPayment: number;
  schedule: ScheduleRow[];
}

export function calculateEmi(principal: number, annualRatePct: number, months: number): number {
  if (principal < 1) {
    throw new AppError(400, 'VALIDATION_FAILED', 'Principal must be at least 1', [
      { field: 'principal', issue: 'must be at least 1' },
    ]);
  }
  if (months < 1) {
    throw new AppError(400, 'VALIDATION_FAILED', 'Tenure months must be at least 1', [
      { field: 'tenureMonths', issue: 'must be at least 1' },
    ]);
  }
  if (annualRatePct < 0) {
    throw new AppError(400, 'VALIDATION_FAILED', 'Annual rate must be non-negative', [
      { field: 'annualRate', issue: 'must be non-negative' },
    ]);
  }

  const r = annualRatePct / 1200;
  if (r === 0) {
    return Math.round(principal / months);
  }
  const factor = (1 + r) ** months;
  return Math.round((principal * r * factor) / (factor - 1));
}

export function amortization(principal: number, annualRatePct: number, months: number): ScheduleRow[] {
  const emi = calculateEmi(principal, annualRatePct, months);
  const r = annualRatePct / 1200;
  const schedule: ScheduleRow[] = [];
  let balance = principal;

  for (let month = 1; month <= months; month++) {
    const interest = Math.round(balance * r);
    const principalPart = month === months ? balance : Math.min(emi - interest, balance);
    const rowEmi = principalPart + interest;
    const closing = month === months ? 0 : balance - principalPart;

    schedule.push({
      month,
      openingBalance: balance,
      emi: rowEmi,
      principalComponent: principalPart,
      interestComponent: interest,
      closingBalance: closing,
    });

    balance = closing;
  }

  return schedule;
}

export function emiResult(principal: number, annualRatePct: number, months: number): EmiResult {
  const schedule = amortization(principal, annualRatePct, months);
  const emi = calculateEmi(principal, annualRatePct, months);
  const totalInterest = schedule.reduce((sum, row) => sum + row.interestComponent, 0);
  const totalPayment = principal + totalInterest;

  return {
    principal,
    annualRate: annualRatePct,
    tenureMonths: months,
    emi,
    totalInterest,
    totalPayment,
    schedule,
  };
}

export function obligationRatioPct(
  monthlyIncome: number,
  existingObligations: number,
  proposedEmi: number
): number {
  if (monthlyIncome <= 0) {
    // No income means fully obligated
    return 100;
  }
  return Math.round(((existingObligations + proposedEmi) / monthlyIncome) * 100);
}
