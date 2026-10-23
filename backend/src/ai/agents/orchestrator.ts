import { AppError } from '../../common/errors';
import type { AuthUser } from '../../common/auth';
import { logger } from '../../common/logger';
import { getApplication, getCustomer, getProduct } from '../coreBridge';
import { completeTrail, createTrail } from '../audit/auditService';
import { AgentPermissionDeniedError, invokeTool } from '../tools/permissionGuard';
import { runComplianceAgent } from './complianceAgent';
import { runCreditAssessmentAgent } from './creditAssessmentAgent';
import { fallbackMessage, runCustomerCommunicationAgent } from './customerCommunicationAgent';
import { runDocumentVerificationAgent } from './documentVerificationAgent';
import { AgentRecommendationSchema, type AgentRecommendation } from './schemas';
import { toAgentCustomer, type AgentCheckInternal, type AgentContext, type AgentName, type AuditWriter } from './types';

async function runAgent(agent: AgentName, audit: AuditWriter, fn: () => Promise<AgentCheckInternal>): Promise<AgentCheckInternal> {
  await audit.record({ agent, eventType: 'AGENT_START' });
  const t0 = Date.now();
  let check: AgentCheckInternal;
  try {
    check = await fn();
  } catch (err) {
    if (err instanceof AgentPermissionDeniedError) {
      check = { agent, result: 'EXCEPTION', detail: `Refused: ${err.agent} is not permitted to call ${err.tool}` };
    } else {
      logger.error({ agent, err: (err as Error).message }, 'agent error');
      check = { agent, result: 'EXCEPTION', detail: `Agent error: ${(err as Error).message}` };
    }
  }
  await audit.record({ agent, eventType: 'AGENT_END', output: { result: check.result, detail: check.detail }, durationMs: Date.now() - t0 });
  return check;
}

// Agents only recommend (G-2): the workflow ends at UNDER_REVIEW and a Credit Analyst takes it from there.
export async function runWorkflow(applicationId: string, user: AuthUser, opts: { demoPermissionViolation?: boolean } = {}): Promise<AgentRecommendation> {
  const app = await getApplication(applicationId);
  if (app.status !== 'SUBMITTED' && app.status !== 'UNDER_VERIFICATION') {
    throw new AppError(409, 'INVALID_STATE', `Workflow can only run on SUBMITTED or UNDER_VERIFICATION applications (current: ${app.status})`);
  }
  const product = await getProduct(app.productId);
  if (!product) throw new AppError(409, 'INVALID_STATE', 'Application has no product');

  const audit = await createTrail(applicationId);
  await audit.record({ agent: 'OrchestratorAgent', eventType: 'AGENT_START', input: { applicationId, requestedBy: user.username } });
  const t0 = Date.now();
  if (app.status === 'SUBMITTED') {
    await invokeTool('OrchestratorAgent', 'update_application', { applicationId, status: 'UNDER_VERIFICATION', note: 'Agent workflow started' }, audit);
  }
  const { documents, ...application } = app;
  const ctx: AgentContext = { application, customer: toAgentCustomer({ ...(await getCustomer(app.customerId)) }), documents, product, audit,
    options: { demoPermissionViolation: !!opts.demoPermissionViolation } };

  const doc = await runAgent('DocumentVerificationAgent', audit, () => runDocumentVerificationAgent(ctx));
  const credit = await runAgent('CreditAssessmentAgent', audit, () => runCreditAssessmentAgent(ctx));
  const compliance = await runAgent('ComplianceAgent', audit, () => runComplianceAgent(ctx));
  const missingDocuments = doc.facts?.missingDocuments ?? [];
  let customerMessage = fallbackMessage(missingDocuments);
  let commCheck: AgentCheckInternal | null = null;
  const comm = await runAgent('CustomerCommunicationAgent', audit, async () => {
    const r = await runCustomerCommunicationAgent(ctx, missingDocuments);
    customerMessage = r.customerMessage;
    commCheck = r.check;
    return r.check ?? { agent: 'CustomerCommunicationAgent', result: 'PASS', detail: 'Customer message prepared' };
  });
  if (comm.result === 'EXCEPTION') commCheck = comm;

  const checks = [doc, credit, compliance, ...(commCheck ? [commCheck] : [])];
  const has = (r: string) => checks.some((c) => c.result === r);
  const recommendation = has('INCOMPLETE') ? 'REQUEST_ADDITIONAL_DOCUMENTS' : has('FAIL') ? 'RECOMMEND_REJECT'
    : has('EXCEPTION') ? 'REFER_TO_HUMAN' : 'RECOMMEND_APPROVE';

  const score = credit.facts?.creditScore;
  const ratio = credit.facts?.ratioPct;
  const riskBand = score == null || ratio == null ? 'MEDIUM' : score < 680 || ratio > 50 ? 'HIGH' : score >= 750 && ratio <= 35 ? 'LOW' : 'MEDIUM';

  // HITL (Integration_Contracts §7): always true in this build; reasons explain why.
  const reasons = checks.filter((c) => c.result !== 'PASS').map((c) => `Check not passed: ${c.agent} ${c.result}`);
  if (app.requestedAmount >= 1000000) reasons.push('High-value application (₹10,00,000 or more)');
  if (ratio != null && ratio >= 45 && ratio <= 55) reasons.push('Borderline obligation ratio (45–55%)');
  if (score != null && score >= 640 && score <= 680) reasons.push('Borderline credit score (640–680)');
  reasons.push('Standard policy: every final credit decision is made by a Credit Analyst');
  await audit.record({ agent: 'OrchestratorAgent', eventType: 'HUMAN_REQUIRED', output: { reasons } });

  await invokeTool('OrchestratorAgent', 'update_application', { applicationId, status: 'UNDER_REVIEW',
    note: `${recommendation}: ${checks.map((c) => `${c.agent} ${c.result}`).join(', ')}` }, audit);

  const result = AgentRecommendationSchema.parse({ applicationId, recommendation, riskBand,
    checks: checks.map(({ agent, result: r, detail }) => ({ agent, result: r, detail })), missingDocuments, customerMessage,
    requiresHumanApproval: true, auditTrailId: audit.auditTrailId });
  await audit.record({ agent: 'OrchestratorAgent', eventType: 'AGENT_END', output: { recommendation, riskBand }, durationMs: Date.now() - t0 });
  await completeTrail(audit.auditTrailId, result);
  return result;
}
