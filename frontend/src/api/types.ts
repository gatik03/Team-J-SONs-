// Mirrors openapi.yaml components.schemas. Field names are VERBATIM from the brief. Do not rename.
export type Role = 'CUSTOMER' | 'LOAN_OFFICER' | 'CREDIT_ANALYST' | 'POLICY_ADMIN';
export type PolicyStatus = 'DRAFT' | 'PUBLISHED' | 'RETIRED';
export type LoanType = 'PERSONAL' | 'HOME' | 'VEHICLE' | 'EDUCATION';
export type LoanTypeOrAll = LoanType | 'ALL';
export type CustomerSegment = 'SALARIED' | 'SELF_EMPLOYED' | 'STUDENT';
export type CustomerSegmentOrAll = CustomerSegment | 'ALL';
export type ApplicationStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_VERIFICATION' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'DISBURSED';
export type DocumentType = 'IDENTITY' | 'ADDRESS' | 'INCOME';
export type KnowledgeDocumentType = 'TERMS_AND_CONDITIONS' | 'RATE_FEE_SCHEDULE' | 'CREDIT_POLICY' | 'KYC_CHECKLIST' | 'PREPAYMENT_POLICY' | 'GRIEVANCE' | 'REGULATORY_CIRCULAR' | 'OFFICER_PLAYBOOK';
export type Audience = 'CUSTOMER' | 'INTERNAL';
export type EligibilityIndicator = 'LIKELY_ELIGIBLE' | 'BORDERLINE' | 'UNLIKELY_ELIGIBLE' | 'UNKNOWN';
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type RiskBand = 'LOW' | 'MEDIUM' | 'HIGH';
export type Recommendation = 'RECOMMEND_APPROVE' | 'RECOMMEND_REJECT' | 'REQUEST_ADDITIONAL_DOCUMENTS' | 'REFER_TO_HUMAN';
export type CheckResult = 'PASS' | 'FAIL' | 'INCOMPLETE' | 'EXCEPTION';
export type KycStatus = 'VERIFIED' | 'PENDING' | 'FAILED';
export type AgentName = 'DocumentVerificationAgent' | 'CreditAssessmentAgent' | 'ComplianceAgent' | 'CustomerCommunicationAgent' | 'OrchestratorAgent';
export type AuditEventType = 'AGENT_START' | 'TOOL_CALL' | 'TOOL_RESULT' | 'LLM_CALL' | 'LLM_RESULT' | 'PERMISSION_DENIED' | 'AGENT_END' | 'HUMAN_REQUIRED' | 'POLICY_DRAFTED' | 'POLICY_PUBLISHED' | 'POLICY_RETIRED';
export type ProductSort = 'rate_asc' | 'rate_desc' | 'amount_asc' | 'amount_desc' | 'tenure_asc' | 'tenure_desc' | 'name';

export interface ErrorResponse { status: number; code: string; message: string; details?: { field?: string; issue?: string }[]; timestamp: string; path?: string }

export interface LoginRequest { username: string; password: string }
export interface LoginResponse { token: string; role: Role; customerId: string | null; displayName: string }
export interface Me { username: string; role: Role; customerId: string | null }

export interface EligibilityCriteria { minMonthlyIncome?: number; minCreditScore?: number; maxObligationRatioPercent?: number; allowedSegments?: CustomerSegment[]; minAgeYears?: number; maxAgeYears?: number }
export interface LoanProduct {
  productId: string; name: string; loanType: LoanType; description?: string;
  minInterestRate: number; maxInterestRate: number; minTenureMonths: number; maxTenureMonths: number;
  minAmount: number; maxAmount: number; processingFeePercent: number; processingFeeMin?: number;
  eligibilityCriteria: EligibilityCriteria;
}
export interface ProductQuery { q?: string; loanType?: LoanType; segment?: CustomerSegment; minAmount?: number; maxAmount?: number; sort?: ProductSort }

export interface EmiRequest { principal: number; annualRate: number; tenureMonths: number }
export interface ScheduleRow { month: number; openingBalance: number; emi: number; principalComponent: number; interestComponent: number; closingBalance: number }
export interface EmiResult { principal: number; annualRate: number; tenureMonths: number; emi: number; totalInterest: number; totalPayment: number; schedule: ScheduleRow[] }

export interface CustomerProfile {
  customerId: string; fullName: string; email: string; phone: string; segment: CustomerSegment; employmentType: string;
  monthlyIncome: number; existingMonthlyObligations: number; location: string; kycStatus: KycStatus; dateOfBirth: string;
}
export interface CustomerProfileUpdate { employmentType?: string; segment?: CustomerSegment; monthlyIncome?: number; existingMonthlyObligations?: number; location?: string }

export interface LoanApplicationDraft {
  productId?: string; requestedAmount?: number; tenureMonths?: number; purpose?: string;
  employmentType?: string; monthlyIncome?: number; existingMonthlyObligations?: number; currentStep?: number;
}
export interface TimelineEvent { status: ApplicationStatus; at: string; by: string; note: string }
export interface LoanApplication extends LoanApplicationDraft {
  applicationId: string; customerId: string; status: ApplicationStatus; createdAt: string; updatedAt: string;
  estimatedEmi: number | null; timeline: TimelineEvent[]; latestRecommendation?: AgentRecommendation | null;
}
export interface ApplicationDocument { documentId: string; applicationId: string; documentType: DocumentType; fileName: string; contentType: string; sizeBytes: number; uploadedAt: string }
export interface DecisionRequest { decision: 'APPROVED' | 'REJECTED'; reason: string }

export interface AdvisorRequest { message: string; conversationId?: string | null }
export interface AdvisorRecommendation {
  productId: string; productName: string; indicativeInterestRate: number; tenureMonths: number;
  estimatedEmi: number; reason: string; eligibilityIndicator: EligibilityIndicator;
}
export interface AdvisorResponse {
  interpretedRequirement: string; loanAmount?: number | null; monthlyIncome?: number | null; maxPreferredEmi?: number | null;
  currency: string; recommendations: AdvisorRecommendation[]; disclaimer: string; clarifyingQuestion: string | null; conversationId?: string;
}

export interface KnowledgeDocument {
  documentId: string; title: string; version: string; effectiveDate: string; loanType: LoanTypeOrAll;
  documentType: KnowledgeDocumentType; audience: Audience; customerSegment?: CustomerSegmentOrAll;
  chunkCount: number; documentKey: string; status: PolicyStatus; ingestedAt: string;
}
export interface PolicyVersion extends KnowledgeDocument {
  changeNote: string; createdBy: string; publishedBy: string | null; publishedAt: string | null;
  retiredAt: string | null; retiredReason: string | null;
  servingState: 'ACTIVE' | 'SCHEDULED' | 'SUPERSEDED' | 'DRAFT' | 'RETIRED';   // computed by the server at read time
}
export interface PolicyLibraryItem {
  documentKey: string; title: string; documentType: KnowledgeDocumentType; audience: Audience;
  activeVersion: string | null; activeEffectiveDate: string | null;
  scheduledVersion: string | null; scheduledEffectiveDate: string | null;
  draftCount: number; totalVersions: number;
}
// multipart body of POST /api/admin/policies (field names verbatim from openapi)
export interface PolicyDraftUpload {
  file: File; documentKey: string; title: string; version: string; effectiveDate: string; loanType: LoanTypeOrAll;
  documentType: KnowledgeDocumentType; audience: Audience; customerSegment?: CustomerSegmentOrAll; changeNote: string;
}
// one item of the inline response of GET /api/admin/policies/versions/{documentId}/preview
export interface PolicyPreviewSection { section: string; content: string }
export interface PolicyAskRequest { question: string; loanType?: LoanTypeOrAll; customerSegment?: CustomerSegmentOrAll }
export interface PolicySource { document: string; section: string; version: string; effectiveDate: string }
export interface PolicyAnswer { answer: string; confidence: Confidence; sources: PolicySource[]; followUpRequired: boolean }

export interface AgentCheck { agent: AgentName; result: CheckResult; detail: string }
export interface AgentRecommendation {
  applicationId: string; recommendation: Recommendation; riskBand: RiskBand; checks: AgentCheck[];
  missingDocuments: string[]; customerMessage: string; requiresHumanApproval: boolean; auditTrailId: string;
}
export interface AuditEvent {
  sequence: number; timestamp: string; agent: string; eventType: AuditEventType; toolName?: string | null;
  input?: Record<string, unknown>; output?: Record<string, unknown>; durationMs?: number;
}
export interface AuditTrail { auditTrailId: string; applicationId: string; startedAt: string; completedAt: string; events: AuditEvent[] }
