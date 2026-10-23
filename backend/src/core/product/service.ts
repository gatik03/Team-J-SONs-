import type { LoanProduct } from '@prisma/client';
import { prisma } from '../../common/prisma';
import { AppError } from '../../common/errors';
import type {
  ProductQueryInput,
  LoanProductDto,
  LoanProductRecord,
  EligibilityCriteriaDto,
} from './schemas';

export function toLoanProduct(row: LoanProduct): LoanProductDto {
  return {
    productId: row.productId,
    name: row.name,
    loanType: row.loanType,
    description: row.description,
    minInterestRate: row.minInterestRate,
    maxInterestRate: row.maxInterestRate,
    minTenureMonths: row.minTenureMonths,
    maxTenureMonths: row.maxTenureMonths,
    minAmount: row.minAmount,
    maxAmount: row.maxAmount,
    processingFeePercent: row.processingFeePercent,
    processingFeeMin: row.processingFeeMin,
    eligibilityCriteria: row.eligibility as unknown as EligibilityCriteriaDto,
  };
}

export function toLoanProductRecord(row: LoanProduct): LoanProductRecord {
  return {
    ...toLoanProduct(row),
    indicativeRate: row.indicativeRate,
    processingFeeMax: row.processingFeeMax,
  };
}

export async function listProducts(query?: ProductQueryInput): Promise<LoanProductRecord[]> {
  const where = query?.loanType ? { loanType: query.loanType } : {};
  let rows = await prisma.loanProduct.findMany({
    where,
    orderBy: { productId: 'asc' },
  });

  if (query) {
    if (query.q) {
      const qLower = query.q.toLowerCase();
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(qLower) ||
          p.productId.toLowerCase().includes(qLower) ||
          p.description.toLowerCase().includes(qLower)
      );
    }

    if (query.segment) {
      rows = rows.filter((p) => {
        const elig = p.eligibility as unknown as EligibilityCriteriaDto;
        return elig.allowedSegments?.includes(query.segment!);
      });
    }

    if (query.minAmount !== undefined) {
      rows = rows.filter((p) => p.maxAmount >= query.minAmount!);
    }

    if (query.maxAmount !== undefined) {
      rows = rows.filter((p) => p.minAmount <= query.maxAmount!);
    }

    if (query.sort) {
      rows.sort((a, b) => {
        switch (query.sort) {
          case 'rate_asc':
            return a.minInterestRate - b.minInterestRate;
          case 'rate_desc':
            return b.minInterestRate - a.minInterestRate;
          case 'amount_asc':
            return a.minAmount - b.minAmount;
          case 'amount_desc':
            return b.maxAmount - a.maxAmount;
          case 'tenure_asc':
            return a.minTenureMonths - b.minTenureMonths;
          case 'tenure_desc':
            return b.maxTenureMonths - a.maxTenureMonths;
          case 'name':
            return a.name.localeCompare(b.name);
          default:
            return a.productId.localeCompare(b.productId);
        }
      });
    }
  }

  return rows.map(toLoanProductRecord);
}

export async function getProduct(productId: string): Promise<LoanProductRecord | null> {
  const row = await prisma.loanProduct.findUnique({
    where: { productId },
  });
  return row ? toLoanProductRecord(row) : null;
}

export async function compareProducts(ids: string[]): Promise<LoanProductDto[]> {
  const products: LoanProductDto[] = [];
  for (const id of ids) {
    const row = await prisma.loanProduct.findUnique({
      where: { productId: id },
    });
    if (!row) {
      throw new AppError(404, 'NOT_FOUND', `Product ${id} not found`);
    }
    products.push(toLoanProduct(row));
  }
  return products;
}
