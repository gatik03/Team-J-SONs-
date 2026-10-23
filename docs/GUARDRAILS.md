# AI Guardrails, Responsible-AI Decisions and Known Limitations (D-9)

Owner: S2. Every row names the code that enforces the rule and the test that proves it. Rows are kept in sync with `backend/src/ai/**`.

## 1. Guardrail → enforcement → proof

| Guardrail | Enforced in (file → function) | Proven by |
|---|---|---|
| G-1 no protected attributes | `ai/agents/types.ts → toAgentCustomer` (explicit field pick); the Prisma `Customer` model has no gender, religion, caste or marital-status columns | `ai/agents/orchestrator.test.ts` |
| G-2 agents only recommend | `ai/tools/mockTools.ts → update_application` allows only `UNDER_VERIFICATION` / `UNDER_REVIEW`; nothing in `src/ai` imports the decision route | `ai/tools/permissionGuard.test.ts` |
| G-3 plain-language reason | agent `detail` templates; advisor `reason` with deterministic fallback; `customerMessage` | `orchestrator.test.ts`, `ai/advisor/advisorService.test.ts` |
| G-4 refuse and log out-of-permission actions | `ai/tools/permissionGuard.ts → invokeTool` writes `PERMISSION_DENIED` | `permissionGuard.test.ts`; live demo hook `?demoPermissionViolation=true` |
| Numbers computed by code | `ai/coreBridge.ts → calculateEmi / obligationRatioPct` (S1's `loanMath.ts` after merge) | `advisorService.test.ts` (EMI 10871 for ₹5,00,000 @ 11 % × 60) |
| RAG answers only from documents | `ai/rag/retriever.ts` calibrated distance threshold; `ai/rag/policyAssistant.ts` safe answer, sources built in code, and numerical figures checked against cited content | `ai/rag/retriever.test.ts`, `policyAssistant.test.ts`, live Q1–Q8 in `docs/TEST_PROMPTS.md` |
| Audience filter | `ai/rag/router.ts` derives audience from the caller's role, never the body; `retriever.ts` audience filter | `retriever.test.ts` |
| Policy governance | `ai/rag/policyAdminRouter.ts → requireRole('POLICY_ADMIN')`; `retriever.ts` in-force CTE (PUBLISHED, highest effectiveDate ≤ today); `policyAdminService.ts` publish/retire state checks; `auditService.recordPolicyEvent` | `retriever.test.ts` (draft never served, scheduled waits, retire rolls back); `ai/rag/policyAdminService.test.ts` |
| PII masking | `ai/masking/piiMasker.ts`; `ai/config/llm.ts` masks prompts and system text; `ingest.ts` masks content/headings; `auditService` masks payloads; JSON-safe logger hook in `ai/index.ts` via `setMasker` | `ai/masking/piiMasker.test.ts` (10 cases), `ai/masking/logger.test.ts`, `ai/rag/ingest.test.ts` |
| Human in the loop | `ai/agents/orchestrator.ts` sets `requiresHumanApproval: true` and writes `HUMAN_REQUIRED` | `orchestrator.test.ts` |

## 2. Responsible-AI decisions

- **Deterministic routing over autonomous loops.** The orchestrator runs agents in a fixed order and decides the recommendation with code rules. The LLM never picks the outcome.
- **LLM for wording only.** Pass, fail, ratios, EMIs, risk bands and recommendations come from code. The LLM writes explanations and customer messages, with template fallbacks when it is unavailable.
- **Tool calls go through one guard.** The workflow invokes tools from code through `permissionGuard`. `guardedTools()` packages the same permissions for an LLM tool loop and is unit-tested; this build does not claim that the LLM drives the tools.
- **A human always decides.** No code path in `src/ai` can move an application to APPROVED, REJECTED or DISBURSED.
- **Policy changes are governed.** A bank official (POLICY_ADMIN) previews and test-asks a draft before it can reach customers, can schedule it, and can roll back instantly. Every change is audited (ADR-18).
- **Synthetic data only.** All customers, products and policy documents are fictional.

## 3. Known limitations

- **External embedding dependency.** Search and ingest need internet access and a Gemini key (`LL_EMBED_API_KEY`), plus a second key if chat uses NVIDIA. Both are subject to Gemini free-tier rate limits.
- **Mock services / S1 integration pending.** Credit bureau, KYC and income verification are synthetic mocks. S1 core services, login and seed are absent on this branch, so application, product and customer data come from the prescribed in-memory stub behind `ai/coreBridge.ts`. Live HTTP checks used real signed JWTs and database audits; they do not verify merged S1 login or frontend integration. The exact handoff is in `docs/TEST_PROMPTS.md`.
- **Masking over-masks.** The regex masks every 9–18 digit number, so phone numbers are masked too.
- **Schema drift risk.** Prisma doesn't know about the HNSW vector index, so a later auto-generated migration may try to drop it. Delete that line before applying.
- **Single-admin publishing.** There is no maker-checker second approval and no side-by-side version diff; both are on the roadmap.
- **Calendar for "today".** Scheduled policies use the Asia/Kolkata calendar date.
- **LLM reliability.** The configured NVIDIA model returned Gone; Gemini 2.5 Flash was unavailable to new users and 3.8 Flash reported high demand. Live checks passed with `gemini-3.1-flash-lite` using the same OpenAI-compatible provider. Local `.env` was changed accordingly; no secret or shared configuration was committed. Calls abort after 20 seconds per attempt; structured output retries once. The compatibility provider warns that server-side JSON schemas are unavailable; the SDK still validates output with Zod.
- **Retrieval evaluation is small.** `MAX_DISTANCE = 0.32` was measured on the five brief questions, playbook question in both audiences, and one off-topic question. Full numerical figures are checked against cited text, but this is not a general semantic entailment or prompt-injection defense.
- **Advisor memory.** Conversation facts are scoped by authenticated username and capped at 500 entries; restart loses them, and there is no multi-instance persistence.
- **Demo state.** The live governance run retired 2026.4 and scheduled 2026.5 for 2026-11-22; 2026.3 currently remains active. Use new version numbers to repeat the upload demo.
- **Runtime scope.** Real-provider advisor/policy services, policy governance HTTP, workflow HTTP and persisted audit checks passed; their observed outputs are in `docs/TEST_PROMPTS.md`. Clean-machine Docker startup, login-based full-stack integration, and a remote PR were not verified (S1 services and git remote are missing).

## Full-stack integration update — 2026-10-23

S1 is now merged. `ai/coreBridge.ts` uses real S1 application/product/customer services and loanMath; the stub is retained only for isolated tests. `testing/fullStack.test.ts` proves the persisted lifecycle and concurrent human-decision protection. The customer status page gets only the validated `{customerMessage, missingDocuments}` projection through its owned application; internal recommendations/audits remain staff-only.

The real-browser full flow, live advisor, off-topic refusal, policy draft/preview/test-ask/publish/retire, all six logins, production build, and 57 responsive route checks passed. Evidence is in `docs/evidence/`. Both package audits report zero findings after patched compatible SDK dependencies, csv-parse 7.0.3 and Vitest 4.1.12; Prisma CLI/client are aligned at 6.12.0. Existing earlier mentions of pending S1 integration describe the pre-merge phase, not the current app.

Still intentional: bureau, KYC and income verification are synthetic mocks; hosted AI requires network and configured keys. This session did not recreate Docker on a clean machine, run a comprehensive screen-reader audit, or deploy the app externally.
