import type {
  AdvisorResponse,
  AgentRecommendation,
  ApplicationDocument,
  AuditTrail,
  CustomerProfile,
  LoanApplication,
  LoanProduct,
  PolicyAnswer,
  PolicyPreviewSection,
  PolicyVersion,
} from '../api/types';

export const products: LoanProduct[] = [
  { productId: 'PL-101', name: 'Kestrel Personal Loan (Salaried)', loanType: 'PERSONAL', description: 'Unsecured personal loan for salaried customers with quick disbursal.', minInterestRate: 10.99, maxInterestRate: 16.0, minTenureMonths: 12, maxTenureMonths: 60, minAmount: 50000, maxAmount: 2500000, processingFeePercent: 1.5, processingFeeMin: 2500, eligibilityCriteria: { minMonthlyIncome: 25000, minCreditScore: 700, maxObligationRatioPercent: 50, allowedSegments: ['SALARIED'], minAgeYears: 21, maxAgeYears: 58 } },
  { productId: 'PL-102', name: 'Kestrel Flexi Personal Loan', loanType: 'PERSONAL', description: 'Personal loan for self-employed professionals and business owners.', minInterestRate: 12.5, maxInterestRate: 18.0, minTenureMonths: 12, maxTenureMonths: 48, minAmount: 50000, maxAmount: 1500000, processingFeePercent: 2.0, processingFeeMin: 2500, eligibilityCriteria: { minMonthlyIncome: 35000, minCreditScore: 720, maxObligationRatioPercent: 45, allowedSegments: ['SELF_EMPLOYED', 'SALARIED'], minAgeYears: 25, maxAgeYears: 65 } },
  { productId: 'HL-301', name: 'Kestrel Home Loan', loanType: 'HOME', description: 'Home purchase or construction loan with tenure up to 30 years.', minInterestRate: 8.5, maxInterestRate: 9.75, minTenureMonths: 60, maxTenureMonths: 360, minAmount: 500000, maxAmount: 50000000, processingFeePercent: 0.5, processingFeeMin: 5000, eligibilityCriteria: { minMonthlyIncome: 30000, minCreditScore: 700, maxObligationRatioPercent: 50, allowedSegments: ['SALARIED', 'SELF_EMPLOYED'], minAgeYears: 23, maxAgeYears: 65 } },
  { productId: 'HL-302', name: 'Kestrel Home Improvement Loan', loanType: 'HOME', description: 'Renovation and repair loan for an existing home.', minInterestRate: 9.25, maxInterestRate: 11.0, minTenureMonths: 12, maxTenureMonths: 180, minAmount: 100000, maxAmount: 5000000, processingFeePercent: 0.75, processingFeeMin: 3000, eligibilityCriteria: { minMonthlyIncome: 25000, minCreditScore: 700, maxObligationRatioPercent: 50, allowedSegments: ['SALARIED', 'SELF_EMPLOYED'], minAgeYears: 23, maxAgeYears: 65 } },
  { productId: 'VL-201', name: 'Kestrel New Car Loan', loanType: 'VEHICLE', description: 'Finance up to 90% of the on-road price of a new car.', minInterestRate: 8.75, maxInterestRate: 11.5, minTenureMonths: 12, maxTenureMonths: 84, minAmount: 100000, maxAmount: 5000000, processingFeePercent: 1.0, processingFeeMin: 1500, eligibilityCriteria: { minMonthlyIncome: 20000, minCreditScore: 680, maxObligationRatioPercent: 50, allowedSegments: ['SALARIED', 'SELF_EMPLOYED'], minAgeYears: 21, maxAgeYears: 65 } },
  { productId: 'VL-204', name: 'Kestrel Pre-Owned Car Loan', loanType: 'VEHICLE', description: 'Loan for used cars up to 8 years old at the end of the tenure.', minInterestRate: 10.5, maxInterestRate: 13.0, minTenureMonths: 12, maxTenureMonths: 84, minAmount: 100000, maxAmount: 2500000, processingFeePercent: 1.5, processingFeeMin: 1000, eligibilityCriteria: { minMonthlyIncome: 25000, minCreditScore: 650, maxObligationRatioPercent: 50, allowedSegments: ['SALARIED', 'SELF_EMPLOYED'], minAgeYears: 21, maxAgeYears: 60 } },
  { productId: 'EL-401', name: 'Kestrel Scholar Education Loan', loanType: 'EDUCATION', description: 'Education loan for studies in India with a co-applicant.', minInterestRate: 9.0, maxInterestRate: 11.5, minTenureMonths: 12, maxTenureMonths: 120, minAmount: 50000, maxAmount: 2000000, processingFeePercent: 0.5, processingFeeMin: 1000, eligibilityCriteria: { minMonthlyIncome: 0, minCreditScore: 650, maxObligationRatioPercent: 50, allowedSegments: ['STUDENT'], minAgeYears: 18, maxAgeYears: 35 } },
  { productId: 'EL-402', name: 'Kestrel Global Education Loan', loanType: 'EDUCATION', description: 'Education loan for studies abroad, covering tuition and living costs.', minInterestRate: 10.5, maxInterestRate: 13.0, minTenureMonths: 24, maxTenureMonths: 180, minAmount: 500000, maxAmount: 7500000, processingFeePercent: 1.0, processingFeeMin: 5000, eligibilityCriteria: { minMonthlyIncome: 0, minCreditScore: 680, maxObligationRatioPercent: 50, allowedSegments: ['STUDENT'], minAgeYears: 18, maxAgeYears: 35 } },
];

export const users = {
  'priya.sharma': { role: 'CUSTOMER', customerId: 'CUST-1001', displayName: 'Priya Sharma' },
  'rahul.verma': { role: 'CUSTOMER', customerId: 'CUST-1002', displayName: 'Rahul Verma' },
  'ananya.iyer': { role: 'CUSTOMER', customerId: 'CUST-1003', displayName: 'Ananya Iyer' },
  'officer.kumar': { role: 'LOAN_OFFICER', customerId: null, displayName: 'Arjun Kumar' },
  'analyst.mehta': { role: 'CREDIT_ANALYST', customerId: null, displayName: 'Neha Mehta' },
  'admin.rao': { role: 'POLICY_ADMIN', customerId: null, displayName: 'Admin Rao' },
} as const;

export const profiles: Record<string, CustomerProfile> = {
  'CUST-1001': { customerId: 'CUST-1001', fullName: 'Priya Sharma', email: 'priya.sharma@example.com', phone: '+91-98200-11001', segment: 'SALARIED', employmentType: 'Private sector salaried', monthlyIncome: 60000, existingMonthlyObligations: 8000, location: 'Pune', kycStatus: 'VERIFIED', dateOfBirth: '1994-03-14' },
  'CUST-1002': { customerId: 'CUST-1002', fullName: 'Rahul Verma', email: 'rahul.verma@example.com', phone: '+91-98290-11002', segment: 'SELF_EMPLOYED', employmentType: 'Self-employed retail business owner', monthlyIncome: 95000, existingMonthlyObligations: 22000, location: 'Jaipur', kycStatus: 'VERIFIED', dateOfBirth: '1988-07-02' },
  'CUST-1003': { customerId: 'CUST-1003', fullName: 'Ananya Iyer', email: 'ananya.iyer@example.com', phone: '+91-98400-11003', segment: 'STUDENT', employmentType: 'Full-time postgraduate student', monthlyIncome: 0, existingMonthlyObligations: 0, location: 'Chennai', kycStatus: 'PENDING', dateOfBirth: '2003-11-21' },
};

export const applications: LoanApplication[] = [
  {
    applicationId: 'LA-2026-00418', customerId: 'CUST-1001', productId: 'PL-101', requestedAmount: 500000, tenureMonths: 48, purpose: 'Home renovation and furnishing', employmentType: 'Private sector salaried', monthlyIncome: 60000, existingMonthlyObligations: 8000, currentStep: 4, status: 'SUBMITTED', estimatedEmi: 13167, createdAt: '2026-10-20T09:15:00.000Z', updatedAt: '2026-10-21T10:30:00.000Z', latestRecommendation: null,
    timeline: [
      { status: 'DRAFT', at: '2026-10-20T09:15:00.000Z', by: 'priya.sharma', note: 'Draft created' },
      { status: 'SUBMITTED', at: '2026-10-21T10:30:00.000Z', by: 'priya.sharma', note: 'Submitted by customer' },
    ],
  },
  {
    applicationId: 'LA-2026-00420', customerId: 'CUST-1001', productId: 'VL-204', requestedAmount: 500000, tenureMonths: 60, purpose: 'Used car purchase', currentStep: 2, status: 'DRAFT', estimatedEmi: 10871, createdAt: '2026-10-22T14:05:00.000Z', updatedAt: '2026-10-22T14:05:00.000Z', latestRecommendation: null,
    timeline: [
      { status: 'DRAFT', at: '2026-10-22T14:05:00.000Z', by: 'priya.sharma', note: 'Draft created' },
    ],
  },
];

export const documents: ApplicationDocument[] = [
  { documentId: 'DOC-2026-00001', applicationId: 'LA-2026-00418', documentType: 'IDENTITY', fileName: 'pan-card.pdf', contentType: 'application/pdf', sizeBytes: 182344, uploadedAt: '2026-10-21T10:18:00.000Z' },
  { documentId: 'DOC-2026-00002', applicationId: 'LA-2026-00418', documentType: 'INCOME', fileName: 'salary-slips-jul-sep-2026.pdf', contentType: 'application/pdf', sizeBytes: 412880, uploadedAt: '2026-10-21T10:20:00.000Z' },
  { documentId: 'DOC-2026-00003', applicationId: 'LA-2026-00418', documentType: 'INCOME', fileName: 'bank-statement-apr-sep-2026.pdf', contentType: 'application/pdf', sizeBytes: 905112, uploadedAt: '2026-10-21T10:22:00.000Z' },
];

export const advisorSample: AdvisorResponse = {
  interpretedRequirement: 'Used car loan of 5 lakh with EMI below 12,000',
  loanAmount: 500000, monthlyIncome: 60000, maxPreferredEmi: 12000, currency: 'INR',
  recommendations: [
    { productId: 'VL-204', productName: 'Kestrel Pre-Owned Car Loan', indicativeInterestRate: 11.0, tenureMonths: 60, estimatedEmi: 10871, reason: '60-month tenure keeps EMI within the limit (about 18% of income)', eligibilityIndicator: 'LIKELY_ELIGIBLE' },
  ],
  disclaimer: 'Indicative only. Final approval is subject to credit assessment.',
  clarifyingQuestion: null, conversationId: 'CONV-MOCK-1',
};

export const advisorClarify: AdvisorResponse = {
  interpretedRequirement: 'Loan request without amount, purpose or income',
  loanAmount: null, monthlyIncome: null, maxPreferredEmi: null, currency: 'INR', recommendations: [],
  disclaimer: 'Indicative only. Final approval is subject to credit assessment.',
  clarifyingQuestion: 'How much do you need, what is it for, and what is your monthly income?', conversationId: 'CONV-MOCK-1',
};

export const policySample: PolicyAnswer = {
  answer: 'Foreclosure is allowed after 6 EMIs, with a 2% charge on the outstanding principal.',
  confidence: 'HIGH',
  sources: [
    { document: 'Vehicle Loan Terms and Conditions', section: 'Foreclosure and Part-Prepayment', version: '2026.3', effectiveDate: '2026-07-01' },
  ],
  followUpRequired: false,
};

export const policyNotFound: PolicyAnswer = {
  answer: "I could not find this in Kestrel Bank's approved documents. Please contact your branch or a loan officer.",
  confidence: 'LOW', sources: [], followUpRequired: true,
};

export const foreclosureAnswers: Record<string, string> = {
  '2026.3': policySample.answer,
  '2026.4': 'Foreclosure is allowed after 3 EMIs, with a 1% charge on the outstanding principal.',
};

export const workflowSample: AgentRecommendation = {
  applicationId: 'LA-2026-00418', recommendation: 'REQUEST_ADDITIONAL_DOCUMENTS', riskBand: 'MEDIUM',
  checks: [
    { agent: 'DocumentVerificationAgent', result: 'INCOMPLETE', detail: 'Address proof is missing' },
    { agent: 'CreditAssessmentAgent', result: 'PASS', detail: 'Obligation ratio is 38% (limit 50%); credit score band is 720-760' },
    { agent: 'ComplianceAgent', result: 'PASS', detail: 'KYC status verified' },
  ],
  missingDocuments: ['Address proof'],
  customerMessage: 'Please upload a valid address proof to continue your application.',
  requiresHumanApproval: true, auditTrailId: 'AUD-2026-77301',
};

export const workflowDenied: AgentRecommendation = {
  ...workflowSample,
  checks: [
    workflowSample.checks[0],
    workflowSample.checks[1],
    { agent: 'ComplianceAgent', result: 'EXCEPTION', detail: 'Refused: ComplianceAgent is not permitted to call get_credit_score' },
  ],
  auditTrailId: 'AUD-2026-77302',
};

export const auditTrails: Record<string, AuditTrail> = {
  'AUD-2026-77301': {
    auditTrailId: 'AUD-2026-77301',
    applicationId: 'LA-2026-00418',
    startedAt: '2026-10-23T10:00:00.000Z',
    completedAt: '2026-10-23T10:00:14.000Z',
    events: [
      { sequence: 1, timestamp: '2026-10-23T10:00:01.000Z', agent: 'OrchestratorAgent', eventType: 'AGENT_START', durationMs: 12 },
      { sequence: 2, timestamp: '2026-10-23T10:00:02.000Z', agent: 'OrchestratorAgent', eventType: 'TOOL_CALL', toolName: 'update_application', input: { applicationId: 'LA-2026-00418', status: 'UNDER_VERIFICATION' }, durationMs: 24 },
      { sequence: 3, timestamp: '2026-10-23T10:00:03.000Z', agent: 'OrchestratorAgent', eventType: 'TOOL_RESULT', toolName: 'update_application', output: { ok: true }, durationMs: 15 },
      { sequence: 4, timestamp: '2026-10-23T10:00:04.000Z', agent: 'DocumentVerificationAgent', eventType: 'AGENT_START', durationMs: 8 },
      { sequence: 5, timestamp: '2026-10-23T10:00:05.000Z', agent: 'DocumentVerificationAgent', eventType: 'TOOL_CALL', toolName: 'verify_income', input: { customerId: 'CUST-1001', declaredIncome: 60000 }, durationMs: 180 },
      { sequence: 6, timestamp: '2026-10-23T10:00:06.000Z', agent: 'DocumentVerificationAgent', eventType: 'TOOL_RESULT', toolName: 'verify_income', output: { verified: true, verifiedIncome: 60000 }, durationMs: 25 },
      { sequence: 7, timestamp: '2026-10-23T10:00:07.000Z', agent: 'DocumentVerificationAgent', eventType: 'AGENT_END', output: { result: 'INCOMPLETE', detail: 'Address proof is missing' }, durationMs: 10 },
      { sequence: 8, timestamp: '2026-10-23T10:00:08.000Z', agent: 'CreditAssessmentAgent', eventType: 'TOOL_CALL', toolName: 'get_credit_score', input: { customerId: 'CUST-1001' }, durationMs: 220 },
      { sequence: 9, timestamp: '2026-10-23T10:00:09.000Z', agent: 'CreditAssessmentAgent', eventType: 'TOOL_RESULT', toolName: 'get_credit_score', output: { score: 735, band: '720-760' }, durationMs: 30 },
      { sequence: 10, timestamp: '2026-10-23T10:00:10.000Z', agent: 'CreditAssessmentAgent', eventType: 'AGENT_END', output: { result: 'PASS' }, durationMs: 14 },
      { sequence: 11, timestamp: '2026-10-23T10:00:11.000Z', agent: 'ComplianceAgent', eventType: 'TOOL_CALL', toolName: 'get_kyc_status', input: { customerId: 'CUST-1001', kycRef: 'PAN XXXXX1234X' }, durationMs: 160 },
      { sequence: 12, timestamp: '2026-10-23T10:00:12.000Z', agent: 'ComplianceAgent', eventType: 'TOOL_RESULT', toolName: 'get_kyc_status', output: { status: 'VERIFIED' }, durationMs: 20 },
      { sequence: 13, timestamp: '2026-10-23T10:00:13.000Z', agent: 'OrchestratorAgent', eventType: 'HUMAN_REQUIRED', output: { reason: 'Missing documents; final decision is always human' }, durationMs: 15 },
      { sequence: 14, timestamp: '2026-10-23T10:00:14.000Z', agent: 'OrchestratorAgent', eventType: 'TOOL_CALL', toolName: 'update_application', input: { status: 'UNDER_REVIEW' }, durationMs: 22 },
    ],
  },
  'AUD-2026-77302': {
    auditTrailId: 'AUD-2026-77302',
    applicationId: 'LA-2026-00418',
    startedAt: '2026-10-23T10:00:00.000Z',
    completedAt: '2026-10-23T10:00:15.000Z',
    events: [
      { sequence: 1, timestamp: '2026-10-23T10:00:01.000Z', agent: 'OrchestratorAgent', eventType: 'AGENT_START', durationMs: 12 },
      { sequence: 2, timestamp: '2026-10-23T10:00:02.000Z', agent: 'OrchestratorAgent', eventType: 'TOOL_CALL', toolName: 'update_application', input: { applicationId: 'LA-2026-00418', status: 'UNDER_VERIFICATION' }, durationMs: 24 },
      { sequence: 3, timestamp: '2026-10-23T10:00:03.000Z', agent: 'OrchestratorAgent', eventType: 'TOOL_RESULT', toolName: 'update_application', output: { ok: true }, durationMs: 15 },
      { sequence: 4, timestamp: '2026-10-23T10:00:04.000Z', agent: 'DocumentVerificationAgent', eventType: 'AGENT_START', durationMs: 8 },
      { sequence: 5, timestamp: '2026-10-23T10:00:05.000Z', agent: 'DocumentVerificationAgent', eventType: 'TOOL_CALL', toolName: 'verify_income', input: { customerId: 'CUST-1001', declaredIncome: 60000 }, durationMs: 180 },
      { sequence: 6, timestamp: '2026-10-23T10:00:06.000Z', agent: 'DocumentVerificationAgent', eventType: 'TOOL_RESULT', toolName: 'verify_income', output: { verified: true, verifiedIncome: 60000 }, durationMs: 25 },
      { sequence: 7, timestamp: '2026-10-23T10:00:07.000Z', agent: 'DocumentVerificationAgent', eventType: 'AGENT_END', output: { result: 'INCOMPLETE', detail: 'Address proof is missing' }, durationMs: 10 },
      { sequence: 8, timestamp: '2026-10-23T10:00:08.000Z', agent: 'CreditAssessmentAgent', eventType: 'TOOL_CALL', toolName: 'get_credit_score', input: { customerId: 'CUST-1001' }, durationMs: 220 },
      { sequence: 9, timestamp: '2026-10-23T10:00:09.000Z', agent: 'CreditAssessmentAgent', eventType: 'TOOL_RESULT', toolName: 'get_credit_score', output: { score: 735, band: '720-760' }, durationMs: 30 },
      { sequence: 10, timestamp: '2026-10-23T10:00:10.000Z', agent: 'CreditAssessmentAgent', eventType: 'AGENT_END', output: { result: 'PASS' }, durationMs: 14 },
      { sequence: 11, timestamp: '2026-10-23T10:00:11.000Z', agent: 'ComplianceAgent', eventType: 'TOOL_CALL', toolName: 'get_kyc_status', input: { customerId: 'CUST-1001', kycRef: 'PAN XXXXX1234X' }, durationMs: 160 },
      { sequence: 12, timestamp: '2026-10-23T10:00:12.000Z', agent: 'ComplianceAgent', eventType: 'TOOL_RESULT', toolName: 'get_kyc_status', output: { status: 'VERIFIED' }, durationMs: 20 },
      { sequence: 13, timestamp: '2026-10-23T10:00:12.500Z', agent: 'ComplianceAgent', eventType: 'PERMISSION_DENIED', toolName: 'get_credit_score', output: { reason: 'ComplianceAgent is not permitted to call get_credit_score' }, durationMs: 5 },
      { sequence: 14, timestamp: '2026-10-23T10:00:13.000Z', agent: 'OrchestratorAgent', eventType: 'HUMAN_REQUIRED', output: { reason: 'Missing documents; final decision is always human' }, durationMs: 15 },
      { sequence: 15, timestamp: '2026-10-23T10:00:14.000Z', agent: 'OrchestratorAgent', eventType: 'TOOL_CALL', toolName: 'update_application', input: { status: 'UNDER_REVIEW' }, durationMs: 22 },
    ],
  },
};

export const policyVersions: Omit<PolicyVersion, 'servingState'>[] = [
  {
    documentId: 'KB-001',
    documentKey: 'VEHICLE-TNC',
    title: 'Vehicle Loan Terms and Conditions',
    version: '2026.3',
    effectiveDate: '2026-07-01',
    loanType: 'VEHICLE',
    documentType: 'TERMS_AND_CONDITIONS',
    audience: 'CUSTOMER',
    customerSegment: 'ALL',
    chunkCount: 9,
    status: 'PUBLISHED',
    createdBy: 'system',
    publishedBy: 'system',
    publishedAt: '2026-10-22T08:00:00.000Z',
    ingestedAt: '2026-10-22T08:00:00.000Z',
    retiredAt: null,
    retiredReason: null,
    changeNote: 'Foreclosure charge revised to 2% after 6 EMIs',
  },
  {
    documentId: 'KB-002',
    documentKey: 'VEHICLE-TNC',
    title: 'Vehicle Loan Terms and Conditions',
    version: '2025.1',
    effectiveDate: '2025-04-01',
    loanType: 'VEHICLE',
    documentType: 'TERMS_AND_CONDITIONS',
    audience: 'CUSTOMER',
    customerSegment: 'ALL',
    chunkCount: 8,
    status: 'PUBLISHED',
    createdBy: 'system',
    publishedBy: 'system',
    publishedAt: '2026-10-22T08:00:00.000Z',
    ingestedAt: '2026-10-22T08:00:00.000Z',
    retiredAt: null,
    retiredReason: null,
    changeNote: 'Initial version',
  },
  {
    documentId: 'KB-003',
    documentKey: 'PERSONAL-RATES',
    title: 'Personal Loan Rate and Fee Schedule',
    version: '2026.1',
    effectiveDate: '2026-04-01',
    loanType: 'PERSONAL',
    documentType: 'RATE_FEE_SCHEDULE',
    audience: 'CUSTOMER',
    customerSegment: 'ALL',
    chunkCount: 4,
    status: 'PUBLISHED',
    createdBy: 'system',
    publishedBy: 'system',
    publishedAt: '2026-10-22T08:00:00.000Z',
    ingestedAt: '2026-10-22T08:00:00.000Z',
    retiredAt: null,
    retiredReason: null,
    changeNote: 'Initial version',
  },
  {
    documentId: 'KB-004',
    documentKey: 'OFFICER-PLAYBOOK',
    title: 'Loan Officer Playbook',
    version: '2026.2',
    effectiveDate: '2026-06-15',
    loanType: 'ALL',
    documentType: 'OFFICER_PLAYBOOK',
    audience: 'INTERNAL',
    customerSegment: 'ALL',
    chunkCount: 6,
    status: 'PUBLISHED',
    createdBy: 'system',
    publishedBy: 'system',
    publishedAt: '2026-10-22T08:00:00.000Z',
    ingestedAt: '2026-10-22T08:00:00.000Z',
    retiredAt: null,
    retiredReason: null,
    changeNote: 'Initial version',
  },
];

export const previewSections: Record<string, PolicyPreviewSection[]> = {
  '2026.3': [
    { section: 'Eligibility', content: 'Salaried and self-employed applicants aged 21–65.' },
    { section: 'Foreclosure and Part-Prepayment', content: 'Foreclosure is allowed after 6 EMIs. A charge of 2% applies on the outstanding principal.' },
    { section: 'Late Payment', content: 'A late payment charge of 2% per month applies on the overdue EMI.' },
  ],
  '2026.4': [
    { section: 'Eligibility', content: 'Salaried and self-employed applicants aged 21–65.' },
    { section: 'Foreclosure and Part-Prepayment', content: 'Foreclosure is allowed after 3 EMIs. A charge of 1% applies on the outstanding principal.' },
    { section: 'Late Payment', content: 'A late payment charge of 2% per month applies on the overdue EMI.' },
  ],
};
