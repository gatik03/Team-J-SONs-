import { Prisma } from '@prisma/client';
import { prisma } from '../src/common/prisma';
import { calculateEmi } from '../src/core/emi/loanMath';

const products: Prisma.LoanProductCreateInput[] = [
  {
    productId: 'PL-101',
    name: 'Kestrel Personal Loan (Salaried)',
    loanType: 'PERSONAL',
    description: 'Unsecured personal loan for salaried customers with quick disbursal.',
    minInterestRate: 10.99,
    maxInterestRate: 16.0,
    indicativeRate: 12.0,
    minTenureMonths: 12,
    maxTenureMonths: 60,
    minAmount: 50000,
    maxAmount: 2500000,
    processingFeePercent: 1.5,
    processingFeeMin: 2500,
    processingFeeMax: 10000,
    eligibility: {
      minMonthlyIncome: 25000,
      minCreditScore: 700,
      maxObligationRatioPercent: 50,
      allowedSegments: ['SALARIED'],
      minAgeYears: 21,
      maxAgeYears: 58,
    },
  },
  {
    productId: 'PL-102',
    name: 'Kestrel Flexi Personal Loan',
    loanType: 'PERSONAL',
    description: 'Personal loan for self-employed professionals and business owners.',
    minInterestRate: 12.5,
    maxInterestRate: 18.0,
    indicativeRate: 14.0,
    minTenureMonths: 12,
    maxTenureMonths: 48,
    minAmount: 50000,
    maxAmount: 1500000,
    processingFeePercent: 2.0,
    processingFeeMin: 2500,
    processingFeeMax: 15000,
    eligibility: {
      minMonthlyIncome: 35000,
      minCreditScore: 720,
      maxObligationRatioPercent: 45,
      allowedSegments: ['SELF_EMPLOYED', 'SALARIED'],
      minAgeYears: 25,
      maxAgeYears: 65,
    },
  },
  {
    productId: 'HL-301',
    name: 'Kestrel Home Loan',
    loanType: 'HOME',
    description: 'Home purchase or construction loan with tenure up to 30 years.',
    minInterestRate: 8.5,
    maxInterestRate: 9.75,
    indicativeRate: 8.75,
    minTenureMonths: 60,
    maxTenureMonths: 360,
    minAmount: 500000,
    maxAmount: 50000000,
    processingFeePercent: 0.5,
    processingFeeMin: 5000,
    processingFeeMax: 25000,
    eligibility: {
      minMonthlyIncome: 30000,
      minCreditScore: 700,
      maxObligationRatioPercent: 50,
      allowedSegments: ['SALARIED', 'SELF_EMPLOYED'],
      minAgeYears: 23,
      maxAgeYears: 65,
    },
  },
  {
    productId: 'HL-302',
    name: 'Kestrel Home Improvement Loan',
    loanType: 'HOME',
    description: 'Renovation and repair loan for an existing home.',
    minInterestRate: 9.25,
    maxInterestRate: 11.0,
    indicativeRate: 9.75,
    minTenureMonths: 12,
    maxTenureMonths: 180,
    minAmount: 100000,
    maxAmount: 5000000,
    processingFeePercent: 0.75,
    processingFeeMin: 3000,
    processingFeeMax: null,
    eligibility: {
      minMonthlyIncome: 25000,
      minCreditScore: 700,
      maxObligationRatioPercent: 50,
      allowedSegments: ['SALARIED', 'SELF_EMPLOYED'],
      minAgeYears: 23,
      maxAgeYears: 65,
    },
  },
  {
    productId: 'VL-201',
    name: 'Kestrel New Car Loan',
    loanType: 'VEHICLE',
    description: 'Finance up to 90% of the on-road price of a new car.',
    minInterestRate: 8.75,
    maxInterestRate: 11.5,
    indicativeRate: 9.25,
    minTenureMonths: 12,
    maxTenureMonths: 84,
    minAmount: 100000,
    maxAmount: 5000000,
    processingFeePercent: 1.0,
    processingFeeMin: 1500,
    processingFeeMax: null,
    eligibility: {
      minMonthlyIncome: 20000,
      minCreditScore: 680,
      maxObligationRatioPercent: 50,
      allowedSegments: ['SALARIED', 'SELF_EMPLOYED'],
      minAgeYears: 21,
      maxAgeYears: 65,
    },
  },
  {
    productId: 'VL-204',
    name: 'Kestrel Pre-Owned Car Loan',
    loanType: 'VEHICLE',
    description: 'Loan for used cars up to 8 years old at the end of the tenure.',
    minInterestRate: 10.5,
    maxInterestRate: 13.0,
    indicativeRate: 11.0,
    minTenureMonths: 12,
    maxTenureMonths: 84,
    minAmount: 100000,
    maxAmount: 2500000,
    processingFeePercent: 1.5,
    processingFeeMin: 1000,
    processingFeeMax: null,
    eligibility: {
      minMonthlyIncome: 25000,
      minCreditScore: 650,
      maxObligationRatioPercent: 50,
      allowedSegments: ['SALARIED', 'SELF_EMPLOYED'],
      minAgeYears: 21,
      maxAgeYears: 60,
    },
  },
  {
    productId: 'EL-401',
    name: 'Kestrel Scholar Education Loan',
    loanType: 'EDUCATION',
    description: 'Education loan for studies in India with a co-applicant.',
    minInterestRate: 9.0,
    maxInterestRate: 11.5,
    indicativeRate: 9.5,
    minTenureMonths: 12,
    maxTenureMonths: 120,
    minAmount: 50000,
    maxAmount: 2000000,
    processingFeePercent: 0.5,
    processingFeeMin: 1000,
    processingFeeMax: null,
    eligibility: {
      minMonthlyIncome: 0,
      minCreditScore: 650,
      maxObligationRatioPercent: 50,
      allowedSegments: ['STUDENT'],
      minAgeYears: 18,
      maxAgeYears: 35,
    },
  },
  {
    productId: 'EL-402',
    name: 'Kestrel Global Education Loan',
    loanType: 'EDUCATION',
    description: 'Education loan for studies abroad, covering tuition and living costs.',
    minInterestRate: 10.5,
    maxInterestRate: 13.0,
    indicativeRate: 11.5,
    minTenureMonths: 24,
    maxTenureMonths: 180,
    minAmount: 500000,
    maxAmount: 7500000,
    processingFeePercent: 1.0,
    processingFeeMin: 5000,
    processingFeeMax: null,
    eligibility: {
      minMonthlyIncome: 0,
      minCreditScore: 680,
      maxObligationRatioPercent: 50,
      allowedSegments: ['STUDENT'],
      minAgeYears: 18,
      maxAgeYears: 35,
    },
  },
];

const customers = [
  {
    customerId: 'CUST-1001',
    fullName: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    phone: '+91-98200-11001',
    segment: 'SALARIED' as const,
    employmentType: 'Private sector salaried',
    monthlyIncome: 60000,
    existingMonthlyObligations: 8000,
    location: 'Pune',
    kycStatus: 'VERIFIED' as const,
    dateOfBirth: new Date('1994-03-14'),
    kycRef: 'PAN ABCDE1234F; Aadhaar 2345 6789 0123; A/c 001234567890',
  },
  {
    customerId: 'CUST-1002',
    fullName: 'Rahul Verma',
    email: 'rahul.verma@example.com',
    phone: '+91-98290-11002',
    segment: 'SELF_EMPLOYED' as const,
    employmentType: 'Self-employed retail business owner',
    monthlyIncome: 95000,
    existingMonthlyObligations: 22000,
    location: 'Jaipur',
    kycStatus: 'VERIFIED' as const,
    dateOfBirth: new Date('1988-07-02'),
    kycRef: 'PAN FGHIJ5678K; Aadhaar 3456 7890 1234',
  },
  {
    customerId: 'CUST-1003',
    fullName: 'Ananya Iyer',
    email: 'ananya.iyer@example.com',
    phone: '+91-98400-11003',
    segment: 'STUDENT' as const,
    employmentType: 'Full-time postgraduate student',
    monthlyIncome: 0,
    existingMonthlyObligations: 0,
    location: 'Chennai',
    kycStatus: 'PENDING' as const,
    dateOfBirth: new Date('2003-11-21'),
    kycRef: 'PAN KLMNO9012P; Aadhaar 4567 8901 2345',
  },
];

const users = [
  { username: 'priya.sharma', role: 'CUSTOMER' as const, customerId: 'CUST-1001', displayName: 'Priya Sharma' },
  { username: 'rahul.verma', role: 'CUSTOMER' as const, customerId: 'CUST-1002', displayName: 'Rahul Verma' },
  { username: 'ananya.iyer', role: 'CUSTOMER' as const, customerId: 'CUST-1003', displayName: 'Ananya Iyer' },
  { username: 'officer.kumar', role: 'LOAN_OFFICER' as const, customerId: null, displayName: 'Arjun Kumar' },
  { username: 'analyst.mehta', role: 'CREDIT_ANALYST' as const, customerId: null, displayName: 'Neha Mehta' },
  { username: 'admin.rao', role: 'POLICY_ADMIN' as const, customerId: null, displayName: 'Admin Rao' },
];

export async function main() {
  // Upsert products
  for (const prod of products) {
    await prisma.loanProduct.upsert({
      where: { productId: prod.productId },
      create: prod,
      update: prod,
    });
  }

  // Upsert customers (before users)
  for (const cust of customers) {
    await prisma.customer.upsert({
      where: { customerId: cust.customerId },
      create: cust,
      update: cust,
    });
  }

  // Upsert users
  for (const user of users) {
    await prisma.appUser.upsert({
      where: { username: user.username },
      create: user,
      update: user,
    });
  }

  // Application LA-2026-00418
  const la418Data = {
    applicationId: 'LA-2026-00418',
    customerId: 'CUST-1001',
    productId: 'PL-101',
    requestedAmount: 500000,
    tenureMonths: 48,
    purpose: 'Home renovation and furnishing',
    employmentType: 'Private sector salaried',
    monthlyIncome: 60000,
    existingMonthlyObligations: 8000,
    currentStep: 4,
    status: 'SUBMITTED' as const,
    estimatedEmi: calculateEmi(500000, 12.0, 48),
    createdAt: new Date('2026-10-20T09:15:00Z'),
    updatedAt: new Date('2026-10-21T10:30:00Z'),
  };

  await prisma.statusEvent.deleteMany({ where: { applicationId: 'LA-2026-00418' } });
  await prisma.applicationDocument.deleteMany({ where: { applicationId: 'LA-2026-00418' } });
  await prisma.loanApplication.upsert({
    where: { applicationId: 'LA-2026-00418' },
    create: la418Data,
    update: la418Data,
  });

  await prisma.statusEvent.createMany({
    data: [
      { applicationId: 'LA-2026-00418', status: 'DRAFT', at: new Date('2026-10-20T09:15:00Z'), actor: 'priya.sharma', note: 'Draft created' },
      { applicationId: 'LA-2026-00418', status: 'SUBMITTED', at: new Date('2026-10-21T10:30:00Z'), actor: 'priya.sharma', note: 'Submitted by customer' },
    ],
  });

  await prisma.applicationDocument.createMany({
    data: [
      {
        documentId: 'DOC-2026-00001',
        applicationId: 'LA-2026-00418',
        documentType: 'IDENTITY',
        fileName: 'pan-card.pdf',
        storedPath: 'seed/pan-card.pdf',
        contentType: 'application/pdf',
        sizeBytes: 182344,
        uploadedAt: new Date('2026-10-21T10:18:00Z'),
      },
      {
        documentId: 'DOC-2026-00002',
        applicationId: 'LA-2026-00418',
        documentType: 'INCOME',
        fileName: 'salary-slips-jul-sep-2026.pdf',
        storedPath: 'seed/salary-slips-jul-sep-2026.pdf',
        contentType: 'application/pdf',
        sizeBytes: 412880,
        uploadedAt: new Date('2026-10-21T10:20:00Z'),
      },
      {
        documentId: 'DOC-2026-00003',
        applicationId: 'LA-2026-00418',
        documentType: 'INCOME',
        fileName: 'bank-statement-apr-sep-2026.pdf',
        storedPath: 'seed/bank-statement-apr-sep-2026.pdf',
        contentType: 'application/pdf',
        sizeBytes: 905112,
        uploadedAt: new Date('2026-10-21T10:22:00Z'),
      },
    ],
  });

  // Application LA-2026-00420
  const la420Data = {
    applicationId: 'LA-2026-00420',
    customerId: 'CUST-1001',
    productId: 'VL-204',
    requestedAmount: 500000,
    tenureMonths: 60,
    purpose: 'Used car purchase',
    employmentType: null,
    monthlyIncome: null,
    existingMonthlyObligations: null,
    currentStep: 2,
    status: 'DRAFT' as const,
    estimatedEmi: calculateEmi(500000, 11.0, 60),
    createdAt: new Date('2026-10-22T14:05:00Z'),
    updatedAt: new Date('2026-10-22T14:05:00Z'),
  };

  await prisma.statusEvent.deleteMany({ where: { applicationId: 'LA-2026-00420' } });
  await prisma.applicationDocument.deleteMany({ where: { applicationId: 'LA-2026-00420' } });
  await prisma.loanApplication.upsert({
    where: { applicationId: 'LA-2026-00420' },
    create: la420Data,
    update: la420Data,
  });

  await prisma.statusEvent.createMany({
    data: [
      { applicationId: 'LA-2026-00420', status: 'DRAFT', at: new Date('2026-10-22T14:05:00Z'), actor: 'priya.sharma', note: 'Draft created' },
    ],
  });

  console.log('Seeded: 8 products, 3 customers, 6 users, 2 applications');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
