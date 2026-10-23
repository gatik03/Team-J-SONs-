import type { AuditEventType } from '@prisma/client';
import type { AiApplication, AiDocument, AiProduct, CustomerSegment } from '../coreBridge';

export type AgentName = 'DocumentVerificationAgent' | 'CreditAssessmentAgent' | 'ComplianceAgent' | 'CustomerCommunicationAgent' | 'OrchestratorAgent';
export type CheckResult = 'PASS' | 'FAIL' | 'INCOMPLETE' | 'EXCEPTION';
export interface AgentCheck { agent: AgentName; result: CheckResult; detail: string }
export interface AgentCheckInternal extends AgentCheck { // facts never leave the server
  facts?: { creditScore?: number; band?: string; ratioPct?: number; missingDocuments?: string[]; exceptions?: string[] } }
export interface AgentCustomer { customerId: string; fullName: string; segment: CustomerSegment; employmentType: string;
  monthlyIncome: number; existingMonthlyObligations: number; location: string; kycStatus: 'VERIFIED' | 'PENDING' | 'FAILED' }

// G-1: explicit field-by-field pick; protected attributes (gender, religion, caste, marital status, dateOfBirth…) are dropped.
export function toAgentCustomer(c: Record<string, unknown>): AgentCustomer {
  return {
    customerId: String(c.customerId), fullName: String(c.fullName), segment: c.segment as CustomerSegment,
    employmentType: String(c.employmentType), monthlyIncome: Number(c.monthlyIncome),
    existingMonthlyObligations: Number(c.existingMonthlyObligations), location: String(c.location),
    kycStatus: c.kycStatus as AgentCustomer['kycStatus'],
  };
}

export interface AuditInput { agent: AgentName; eventType: AuditEventType; toolName?: string | null;
  input?: Record<string, unknown>; output?: Record<string, unknown>; durationMs?: number }
export interface AuditWriter { auditTrailId: string; record(e: AuditInput): Promise<void> }
export interface AgentContext { application: AiApplication; customer: AgentCustomer; documents: AiDocument[];
  product: AiProduct; audit: AuditWriter; options: { demoPermissionViolation: boolean } }
