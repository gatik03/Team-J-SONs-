import { tool } from 'ai';
import { z } from 'zod';
import { getCustomer, transition } from '../coreBridge';
import { askPolicy } from '../rag/policyAssistant';
import { AgentPermissionDeniedError } from './permissionGuard';

export type ToolName = 'get_credit_score' | 'verify_income' | 'get_kyc_status' | 'update_application' | 'search_policy';

// Deterministic mock bureau / bank data (M3-8). PANs are synthetic: they exist so the audit trail shows masking.
const SCORES: Record<string, number> = { 'CUST-1001': 742, 'CUST-1002': 668, 'CUST-1003': 705 };
const RECORDS: Record<string, { verifiedIncome: number; nameMatch: boolean; addressMatch: boolean; panOnRecord: string | null }> = {
  'CUST-1001': { verifiedIncome: 60000, nameMatch: true, addressMatch: true, panOnRecord: 'ABCPS1234K' },
  'CUST-1002': { verifiedIncome: 95000, nameMatch: true, addressMatch: true, panOnRecord: 'BCDRV5678L' },
  'CUST-1003': { verifiedIncome: 10000, nameMatch: true, addressMatch: true, panOnRecord: 'CDEAI9012M' },
};

const customerId = z.string().min(1);
const specs = {
  get_credit_score: {
    description: 'Get the credit bureau score and band for a customer',
    inputSchema: z.object({ customerId }),
    run: async ({ customerId: id }: { customerId: string }) => {
      const score = SCORES[id] ?? 650;
      const lo = Math.floor(score / 40) * 40;
      return { score, band: `${lo}-${lo + 40}` };
    },
  },
  verify_income: {
    description: "Verify a customer's declared monthly income against bank records",
    inputSchema: z.object({ customerId, declaredIncome: z.number() }),
    run: async ({ customerId: id, declaredIncome }: { customerId: string; declaredIncome: number }) => {
      const r = RECORDS[id] ?? { verifiedIncome: declaredIncome, nameMatch: true, addressMatch: true, panOnRecord: null };
      return { verified: Math.abs(declaredIncome - r.verifiedIncome) / r.verifiedIncome <= 0.2, ...r };
    },
  },
  get_kyc_status: {
    description: 'Get the KYC status of a customer',
    inputSchema: z.object({ customerId }),
    run: async ({ customerId: id }: { customerId: string }) => ({ status: (await getCustomer(id)).kycStatus }),
  },
  update_application: {
    description: 'Move a loan application to UNDER_VERIFICATION or UNDER_REVIEW',
    // status is z.string() on purpose: an illegal target must reach the G-2 check below and be audited, not fail zod silently.
    inputSchema: z.object({ applicationId: z.string(), status: z.string(), note: z.string() }),
    run: async ({ applicationId, status, note }: { applicationId: string; status: string; note: string }) => {
      if (status !== 'UNDER_VERIFICATION' && status !== 'UNDER_REVIEW') {
        throw new AgentPermissionDeniedError('OrchestratorAgent', 'update_application', `status ${status} is not allowed for agents (G-2)`);
      }
      await transition(applicationId, status, 'OrchestratorAgent', note);
      return { ok: true };
    },
  },
  search_policy: {
    description: 'Search approved bank policy documents',
    inputSchema: z.object({ question: z.string(), filters: z.object({ loanType: z.string().optional(), customerSegment: z.string().optional(), documentType: z.string().optional() }).optional() }),
    run: async ({ question, filters }: { question: string; filters?: Record<string, string | undefined> }) =>
      askPolicy(question, (filters ?? {}) as Parameters<typeof askPolicy>[1], 'INTERNAL'),
  },
};

export const TOOL_SPECS: Record<ToolName, { description: string; inputSchema: z.ZodTypeAny; run: (input: any) => Promise<unknown> }> = specs;

export const getCreditScore = tool({ description: specs.get_credit_score.description, inputSchema: specs.get_credit_score.inputSchema, execute: specs.get_credit_score.run });
export const verifyIncome = tool({ description: specs.verify_income.description, inputSchema: specs.verify_income.inputSchema, execute: specs.verify_income.run });
export const getKycStatus = tool({ description: specs.get_kyc_status.description, inputSchema: specs.get_kyc_status.inputSchema, execute: specs.get_kyc_status.run });
export const updateApplication = tool({ description: specs.update_application.description, inputSchema: specs.update_application.inputSchema, execute: specs.update_application.run });
export const searchPolicy = tool({ description: specs.search_policy.description, inputSchema: specs.search_policy.inputSchema, execute: specs.search_policy.run });
