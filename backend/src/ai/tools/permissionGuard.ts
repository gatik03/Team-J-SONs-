import { tool, type ToolSet } from 'ai';
import { logger } from '../../common/logger';
import type { AgentName, AuditWriter } from '../agents/types';
import { TOOL_SPECS, type ToolName } from './mockTools';

// Copied from Integration_Contracts §7.
export const TOOL_PERMISSIONS: Record<ToolName, AgentName[]> = {
  get_credit_score: ['CreditAssessmentAgent'],
  verify_income: ['DocumentVerificationAgent', 'CreditAssessmentAgent'],
  get_kyc_status: ['ComplianceAgent'],
  update_application: ['OrchestratorAgent'],
  search_policy: ['ComplianceAgent'],
};

export class AgentPermissionDeniedError extends Error {
  constructor(public agent: AgentName, public tool: string, reason?: string) {
    super(reason ?? `${agent} is not permitted to call ${tool}`);
    this.name = 'AgentPermissionDeniedError';
  }
}

export function isAllowed(agent: AgentName, tool: ToolName): boolean {
  return TOOL_PERMISSIONS[tool]?.includes(agent) ?? false;
}

export async function invokeTool<T = unknown>(agent: AgentName, tool: ToolName, input: unknown, audit: AuditWriter): Promise<T> {
  if (!isAllowed(agent, tool)) {
    const error = `${agent} is not permitted to call ${tool}`;
    await audit.record({ agent, eventType: 'PERMISSION_DENIED', toolName: tool, input: { agent, tool, input }, output: { error } });
    logger.warn({ agent, tool, auditTrailId: audit.auditTrailId }, 'tool permission denied');
    throw new AgentPermissionDeniedError(agent, tool);
  }
  const spec = TOOL_SPECS[tool];
  const parsed = spec.inputSchema.parse(input) as Record<string, unknown>;
  await audit.record({ agent, eventType: 'TOOL_CALL', toolName: tool, input: parsed });
  const t0 = Date.now();
  try {
    const output = await spec.run(parsed);
    await audit.record({ agent, eventType: 'TOOL_RESULT', toolName: tool, output: output as Record<string, unknown>, durationMs: Date.now() - t0 });
    return output as T;
  } catch (err) {
    if (err instanceof AgentPermissionDeniedError) {
      await audit.record({ agent, eventType: 'PERMISSION_DENIED', toolName: tool, input: parsed, output: { error: err.message }, durationMs: Date.now() - t0 });
      logger.warn({ agent, tool, reason: err.message }, 'tool permission denied');
    } else {
      await audit.record({ agent, eventType: 'TOOL_RESULT', toolName: tool, output: { error: (err as Error).message }, durationMs: Date.now() - t0 });
    }
    throw err;
  }
}

// The same guard packaged for an LLM tool loop: only the tools this agent may call.
export function guardedTools(agent: AgentName, audit: AuditWriter): ToolSet {
  const tools: ToolSet = {};
  for (const name of Object.keys(TOOL_PERMISSIONS) as ToolName[]) {
    if (!isAllowed(agent, name)) continue;
    const { description, inputSchema } = TOOL_SPECS[name];
    tools[name] = tool({ description, inputSchema, execute: (i: unknown) => invokeTool(agent, name, i, audit) });
  }
  return tools;
}
