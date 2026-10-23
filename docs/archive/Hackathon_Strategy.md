> Historical development reference. Current submission guide: [SUBMISSION.md](../SUBMISSION.md). Statements about planned or pending work reflect an earlier stage.

# Hackathon Strategy — LoanLens AI

Status: planning document. No code exists yet. Every capability below is **planned** until the matching REQUIREMENTS.md ID is ticked with evidence. Source of truth for scope is `docs/USECASE.md`; this file only decides *how we win with it*.

## 1. Problem validation

The brief (`docs/USECASE.md` §1) lists the pain points verbatim. We map each to the module that answers it so judges can see nothing is invented.

| Pain point (brief) | Who feels it | Our answer | REQ IDs |
|---|---|---|---|
| Choosing the right product, amount, tenure | Customer | AI Loan Advisor: NL → structured recommendation with EMI computed in code | M1-10..M1-16 |
| Uncertainty about eligibility before applying | Customer | `eligibilityIndicator` on every recommendation; pre-screen reasons | M1-13 |
| Confusion about rates, fees, prepayment, foreclosure | Customer | RAG policy assistant grounded in versioned bank docs with cited section | M2-6, M2-9 |
| Repeated document requests, lengthy documentation | Customer | Document Verification Agent names exactly what is missing once; `missingDocuments[]` + plain `customerMessage` | M3-2, M3-5 |
| No visibility of status / next steps | Customer | Status tracker with timeline from `status_event` rows | M1-7, B-4 |
| Inconsistent answers across channels | Customer | Single RAG source with latest-effective-version rule; same answer for app, branch, call centre | M2-5 |
| Manual document verification and cross-checking | Ops | Document Verification Agent + mock `verify_income` tool | M3-2, M3-8 |
| Applying credit policy consistently | Ops | Credit Assessment Agent with deterministic `obligationRatioPct()` from `core/emi/loanMath.ts` and product rules | M3-3, M3-9 |
| High volume of incomplete / ineligible applications | Ops | Agents triage to `REQUEST_ADDITIONAL_DOCUMENTS` / `RECOMMEND_REJECT` before an analyst spends time | M3-6 |
| Explaining decisions clearly | Ops | `detail` on every check, `reason` on every recommendation | G-3 |
| Complete audit trail for compliance | Ops | `audit_event` per agent step / tool call / LLM call, PII-masked | M3-12, M2-8 |
| Coordinating sales, KYC, credit, compliance | Ops | Orchestrator Agent routes between specialised agents and escalates to a human | M3-6, M3-10 |

## 2. Target users

Three roles from the brief (M1-8), five seeded users from `Integration_Contracts.md` §2:

| Role | Seeded user | Segment | What they need from LoanLens |
|---|---|---|---|
| Customer | `priya.sharma` (CUST-1001) | Salaried | Advisor, EMI calculator, apply, track status |
| Customer | `rahul.verma` (CUST-1002) | Self-employed | Document checklist for self-employed (M2-Q1), apply |
| Customer | `ananya.iyer` (CUST-1003) | Student | Education loan discovery, eligibility indicator |
| Loan Officer | `officer.kumar` | — | Queue of submitted applications, run workflow, knowledge upload, internal-audience policy answers |
| Credit Analyst | `analyst.mehta` | — | Review agent checks + audit trail, make the **only** approve/reject decision |

## 3. Competitors and existing solutions

| Category | Examples | What they do | Where LoanLens differs |
|---|---|---|---|
| Generic bank chatbots | FAQ bots on bank sites / apps | Scripted intents, canned answers, no citation, no versioning | Every answer carries `document`, `section`, `version`, `effectiveDate`; refuses when nothing is retrieved (M2-7); audience filter keeps internal playbooks away from customers (M2-10) |
| Indian loan aggregators | Paisabazaar, BankBazaar | Cross-bank comparison and lead generation; eligibility is a form, not a conversation; no processing side | Single-bank, in-policy advisor; EMI/ratio are deterministic code not marketing estimates; continues into application, agentic pre-processing and analyst decision |
| Generic RAG demos | "chat with your PDF" apps | One flat index, no metadata, hallucinate when the doc is silent | Metadata filtering on loan type / effective date / segment / document type / audience (M2-4); latest-effective-version rule (M2-5); safe not-found; PII masking in prompts and logs (M2-8) |
| Rule-based LOS | Legacy loan origination systems | Deterministic, auditable, but rigid; every rule is code; no natural-language intake; explanations are codes not sentences | Keeps the determinism (numbers in `core/emi/loanMath.ts`, rules in code) but adds NL understanding, plain-language reasons (G-3), and agentic routing — without letting the model decide (G-2) |
| Autonomous "AI underwriter" pitches | Various startups | Model outputs an approve/reject | Agents can only recommend; `POST /api/applications/{id}/decision` is CREDIT_ANALYST-only and no agent has a tool that reaches it (G-2, M3-11) |

## 4. Unique selling proposition

**Explainable, auditable agentic pre-processing with a human in the loop, on top of versioned, audience-filtered RAG and deterministic math.**

Concretely (all planned):

1. **Deterministic core**: `core/emi/loanMath.ts` (`calculateEmi`, `amortization`, `obligationRatioPct`) is the only place EMI, amortization and obligation ratio are computed. The LLM receives numbers, never produces them (M3-9). The brief's `10871` must come from `loanMath.test.ts`, not from a prompt.
2. **Agents recommend, humans decide**: `guardedTools()` in `ai/tools/permissionGuard.ts` enforces the `(agent, tool)` matrix in `Integration_Contracts.md` §7; `update_application` can only move to `UNDER_VERIFICATION` / `UNDER_REVIEW`; the decision endpoint is role-gated to CREDIT_ANALYST (G-2, G-4, M3-10, M3-11).
3. **Audit everything**: every `AGENT_START`, `TOOL_CALL`, `TOOL_RESULT`, `LLM_CALL`, `LLM_RESULT`, `PERMISSION_DENIED`, `AGENT_END`, `HUMAN_REQUIRED` event is persisted with masked input/output and `durationMs` (M3-12), viewable at `GET /api/audit/{auditTrailId}`.
4. **RAG that knows what it is allowed to say**: audience derived from the caller's role (never from the request), latest effective version wins, and "not found" is a first-class response (M2-4, M2-5, M2-7, M2-10).
5. **Fairness by construction**: `CustomerProfile` has no gender / religion / caste / marital-status fields at all, so the decision path cannot use them (G-1).

## 4a. Stack decision (summary of `Decisions.md` ADR-0)

The brief *recommends* Spring Boot + Spring AI and *permits* any framework. We build on Node 22 + Express + TypeScript + Prisma + Zod + Vercel AI SDK v5, with PostgreSQL + pgvector exactly as recommended.

- **Delivery risk beats framework points.** Three students with Node/Prisma/React experience and no JDK ship all three modules instead of learning Spring DI, JPA and the Spring AI API mid-hackathon.
- **Same design, different runtime.** `openapi.yaml`, the brief's JSON, Postgres + pgvector, the agent/tool/audit design and every guardrail are unchanged; `ChatClient` / `@Tool` / `BeanOutputConverter` map one-to-one to `generateText` / `tool()` / `generateObject`.
- **One schema at the AI boundary.** A Zod schema is the request validator, the TypeScript type and the JSON schema handed to `generateObject`, so the brief's field names cannot drift.
- **One language end to end.** TypeScript in frontend, backend, agents and tests: everyone can review every PR, and `types.ts` mirrors the contract.
- **Free, portable, fast feedback.** One OpenAI-compatible provider for NIM or Gemini via env, Gemini embeddings over the API (`@ai-sdk/google`, free key, no model to host), sub-second `tsx watch` restarts.

## 5. Judging strategy — mapped to the brief's deliverables and guardrails

| Brief deliverable / guardrail | How we score it | Evidence we plan to show |
|---|---|---|
| Working application and source code (D-1) | Both sample scenarios run live, not from slides | Live demo; `git log` with `<REQ-ID>:` commits |
| Architecture diagram + solution overview (D-2) | One Mermaid diagram in `Architecture.md` (+ `Preliminary_Design.md`) matching the actual packages `core`, `common`, `ai` | Open the file, point to the same names in the code tree |
| Setup instructions (D-3) | `docker compose up` + `docs/SETUP.md` on a clean machine; S1 owns this in phase 3 | Run it on the demo laptop from scratch if time allows |
| Live demonstration (D-4) | 5-beat narrative (§9) under 8 minutes | `Demo_Runbook.md` |
| Proper schema design (D-5) | Prisma schema `backend/prisma/schema.prisma` + `prisma/migrations/`, singular snake_case tables (`@@map`), FKs, `status_event` and `audit_event` as append-only | Show ERD + `schema.prisma` + migration folder |
| Validation and error handling (D-6) | Zod `parse()` on every request body and query; single Express `errorHandler` (`common/errors.ts`, `AppError`); one error envelope with codes `VALIDATION_FAILED`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `INVALID_STATE`, `AI_UNAVAILABLE`, `INTERNAL` | Send a bad request live, show the envelope |
| Clean folder structure (D-7) | Layout from `CLAUDE.md` §5; one directory per session so the tree is also the work split | Tree view |
| Seed scripts + test prompts (D-8) | `backend/prisma/seed.ts` (`npm run seed`), `docs/TEST_PROMPTS.md` containing every prompt used in the demo | Open both |
| Guardrails / limitations / responsible-AI note (D-9) | `docs/GUARDRAILS.md` written by S2, honest about what is mocked | Hand it to judges |
| G-1 protected attributes | Schema has no such columns; `OpenAPI` `CustomerProfile` description says so | Show the entity and the migration |
| G-2 no autonomous approve/reject | `Recommendation` enum has no APPROVE/REJECT; decision endpoint is human-only | Try the decision call as `officer.kumar` → 403 |
| G-3 plain-language reasons | `reason` / `detail` / `customerMessage` fields always populated | Sample outputs |
| G-4 refuse and log out-of-permission actions | `permissionGuard.test.ts`; a `PERMISSION_DENIED` audit event | Show the audit row live |

Judges typically weight: does it work, does it match the brief, is the AI usage responsible, can the team explain it. We optimise in that order.

## 6. MVP definition

The MVP is exactly `CLAUDE.md` §6 "Definition of done", nothing more:

1. **Advisor scenario (M1-16)**: `POST /api/advisor/chat` with "I need ₹5 lakh for a used car. I earn ₹60,000 per month and want an EMI below ₹12,000." returns `VL-204` / `Kestrel Pre-Owned Car Loan` / 11.0 % / 60 months / `estimatedEmi: 10871` / `LIKELY_ELIGIBLE` / `clarifyingQuestion: null`, in the brief's exact JSON shape (M1-15).
2. **Workflow scenario (M3-14)**: seeded application `LA-2026-00418` (₹5 lakh personal loan, salary slips + bank statement, no address proof) → `POST /api/workflow/applications/LA-2026-00418/run` returns `recommendation: REQUEST_ADDITIONAL_DOCUMENTS`, `riskBand: MEDIUM`, three checks (`INCOMPLETE` / `PASS` / `PASS`), `missingDocuments: ["Address proof"]`, `requiresHumanApproval: true`, an `auditTrailId` that resolves at `GET /api/audit/{id}`.
3. **RAG scenario (M2-Q1..Q5)**: the five example questions each return an `answer`, `confidence`, at least one source with `document`/`section`/`version`/`effectiveDate`, and `followUpRequired`. Plus one off-policy question returns the safe not-found response (M2-7).
4. **UI path for each**: Login → Advisor chat; Login → Policy chat; Officer → run workflow → Analyst → review checks + audit → decision.

Everything else in REQUIREMENTS.md must *exist and work* ("thin but complete") but may be minimal.

## 7. Feature priority

Scores 1–5. Priority = impact × feasibility, time is the cost. Everything in REQUIREMENTS.md is mandatory; this table decides build order, not inclusion.

| Feature | REQ IDs | Impact | Feasibility | Est. time | Order |
|---|---|---|---|---|---|
| `core/emi/loanMath.ts` + EMI endpoint + `loanMath.test.ts` | M1-3, M3-9 | 5 | 5 | 1 h | 1 |
| Products catalogue + seed (incl. VL-204) | M1-1, M1-2, B-3 | 5 | 5 | 2 h | 1 |
| Auth, roles, seeded users | M1-4, M1-8 | 5 | 5 | 2 h | 1 |
| Applications state machine + timeline + seed `LA-2026-00418` | M1-5, M1-7, B-4 | 5 | 4 | 3 h | 2 |
| Knowledge docs (9 docs, one in two versions) | M2-K1..K9 | 5 | 5 | 2 h | 1 (S2 can start day 0) |
| Ingestion + chunking + PgVector + Gemini embeddings | M2-1..M2-3 | 5 | 3 | 4 h | 2 |
| Retrieval with metadata filter + latest version + audience | M2-4, M2-5, M2-10 | 5 | 3 | 3 h | 2 |
| `ai/rag/policyAssistant.ts` grounded answer + not-found + `maskPii()` | M2-6..M2-9 | 5 | 4 | 3 h | 3 |
| `ai/advisor/advisorService.ts` structured output (`generateObject` + Zod) | M1-10..M1-16 | 5 | 3 | 3 h | 3 |
| 3 core agents + `ai/tools/mockTools.ts` + `ai/tools/permissionGuard.ts` + audit | M3-1..M3-4, M3-8, M3-11, M3-12 | 5 | 3 | 5 h | 3 |
| Orchestrator + HITL rule + Customer Communication Agent | M3-5, M3-6, M3-10 | 5 | 3 | 3 h | 4 |
| Document upload (local disk) | M1-6 | 4 | 5 | 1 h | 3 |
| Frontend: login, catalogue, EMI, advisor, policy (with MSW) | M1-9 | 5 | 4 | 6 h | 2–3 |
| Frontend: wizard + save-as-draft + uploads + status tracker | M1-5, M1-7 | 4 | 4 | 5 h | 3 |
| Frontend: officer queue + analyst review + audit viewer + decision | M3-13, G-2 | 5 | 4 | 4 h | 4 |
| Product comparison UI | M1-2 | 3 | 5 | 1 h | 5 |
| Responsive polish 375/768/1280 | M1-9 | 3 | 5 | 2 h | 5 |
| Docs: ARCHITECTURE, SETUP, GUARDRAILS, TEST_PROMPTS | D-2, D-3, D-8, D-9 | 5 | 5 | 3 h | 5 (write as you go) |
| Knowledge upload UI | M2-1 | 3 | 4 | 1 h | 5 |
| Simulated disbursement | B-7 | 2 | 5 | 0.5 h | 6 |

## 8. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation (planned) |
|---|---|---|---|
| LLM latency / quota on NVIDIA NIM during the demo | High | High | Gemini `gemini-2.0-flash` fallback selected by env var; keep prompts short; cache the two scenario responses in `docs/TEST_PROMPTS.md` so the narrative can continue if the API is slow; `AI_UNAVAILABLE` 503 envelope instead of a stack trace |
| Tool-calling reliability of `meta/llama-3.1-70b-instruct` via NIM (malformed or skipped tool calls) | High | High | Agents do not *depend* on the model choosing tools: each agent calls its tools from TypeScript code and uses the LLM only for the `detail`/`customerMessage` wording and for intent extraction; `generateObject` with a Zod schema and one retry on parse failure; `orchestrator.test.ts` runs with the LLM mocked so the workflow is provably correct without the LLM |
| Advisor returns wrong product/tenure | Medium | High | Candidate products and tenures are enumerated in code (`listProducts()` + `calculateEmi()` across the tenure range), the LLM only picks among pre-computed valid options; the response is post-validated against the catalogue |
| PgVector setup (extension, dimension mismatch 768, migration ordering) | Medium | High | `docker-compose.yml` uses the `pgvector/pgvector` image; the `vector(768)` column is fixed in `schema.prisma` (enabled via `CREATE EXTENSION vector` in the first migration); S1 ships compose in phase 1 so S2 hits it early |
| Gemini embeddings API (`gemini-embedding-001`): search and `npm run ingest` need internet; free-tier rate limits; a second key (`LL_EMBED_API_KEY`) if chat uses NVIDIA | Medium | High | ~10 docs + demo traffic is well inside the free tier; batches ≤ 100 and one retry after 2 s on 429; startup fails with a clear env error if the key is missing; query-time embedding failure → `AI_UNAVAILABLE` 503 (never answer without retrieval); ingest before the demo and check the key in the pre-demo checklist |
| Judges ask why we did not use the brief's recommended Spring Boot + Spring AI stack | Medium | Medium | Brief permits any framework; rehearsed answer from `Decisions.md` ADR-0 (same architecture, contract and database; only the runtime changed; Spring→Node mapping table) and `Preliminary_Design.md`; Judge Q&A B4/B5. S3 still works against MSW mocks from `openapi.yaml` until integration, so the frontend is never blocked on the backend |
| Merge conflicts | Medium | Medium | Split by directory (`core/common` vs `ai` vs `frontend`); shared files only via `contract:` PRs; `git pull --rebase origin main` every 30–60 min per `Team_Work_Split.md` |
| S2 blocked on S1 interfaces | Medium | Medium | S2 codes against the TypeScript signatures in `Integration_Contracts.md` §6 with in-memory stubs under `ai/stub/`, deleted at integration |
| The 5 RAG questions answer from the wrong version | Medium | High | `retriever.test.ts`; seed one doc deliberately in two versions with different numbers so the test is meaningful |
| PII leaks in logs | Low | High (guardrail) | `maskPii()` (`ai/masking/piiMasker.ts`) as the pino serializer in `common/logger.ts` plus `piiMasker.test.ts`; grep the log file during rehearsal |
| Demo machine cold start | Medium | High | S1 rehearses `docker compose up` on a clean machine in phase 3; keep a warmed-up backup laptop |

## 9. Cut order if time runs short

Cut from the bottom. Nothing above the line is cut; it is simplified instead.

1. Simulated disbursement button (keep the status in the enum; B-7 says it "may be simulated").
2. Knowledge upload UI (keep the REST endpoint; ingest seed docs by script).
3. Product comparison page (keep `GET /api/products/compare`; show it with curl).
4. Responsive polish beyond 1280 px (keep mobile layout for the advisor and catalogue screens only).
5. Customer Communication Agent as a separate LLM call → template-based `customerMessage` (the brief needs *at least three* agents; this is the fifth).
6. PDF ingestion → keep MD/CSV/JSON, document PDF as a limitation in `docs/GUARDRAILS.md` (M2-1 lists PDF, so this is a last resort and must be reported, per `CLAUDE.md` §3.7).
7. Conversation memory in the advisor (`conversationId`) → stateless single-turn with clarifying question.

Never cut: the two sample scenarios, the five RAG questions, the audit trail, the permission guard, the error envelope, the human-only decision.

## 10. Demo narrative — 5 beats

Target 8 minutes. Every prompt used is listed in `docs/TEST_PROMPTS.md`.

| Beat | Who is logged in | What happens | What we say |
|---|---|---|---|
| 1. Discover | `priya.sharma` | Catalogue → filter VEHICLE → open VL-204 → EMI calculator 5 lakh / 11 % / 60 → `10871` with amortization table | "Every number on screen comes from `core/emi/loanMath.ts`, not from a model. The same function feeds the advisor and the agents." |
| 2. Advise | `priya.sharma` | Advisor chat: the brief's used-car sentence → JSON card with VL-204 / 60 months / 10871 / LIKELY_ELIGIBLE. Then a second message missing income → `clarifyingQuestion` populated | "The model extracts intent and explains; code picks the valid tenure and computes the EMI. If information is missing it asks instead of guessing." |
| 3. Ask policy | `priya.sharma`, then `officer.kumar` | Policy chat: "Can I foreclose my vehicle loan after six months…" → answer with source, section, version 2026.3. Ask an out-of-scope question → safe not-found. Switch to officer, ask the same question → an internal playbook source appears that the customer never saw | "Answers are grounded only in approved documents, the latest effective version wins, and audience is derived from the role, never from the request." |
| 4. Process | `officer.kumar` | Officer queue → `LA-2026-00418` → Run workflow → checks table: Document INCOMPLETE (address proof missing), Credit PASS (ratio, score band), Compliance PASS (KYC) → `REQUEST_ADDITIONAL_DOCUMENTS`, `requiresHumanApproval: true`, customer message | "Three agents, each with its own tools and no access to the others'. Show the audit trail: every tool call, input, output, timestamp, masked PAN." |
| 5. Decide | `analyst.mehta` | Analyst review page → read checks + audit → approve/reject with reason → timeline updates. Then show the 403 when `officer.kumar` tries the decision endpoint, and the `PERMISSION_DENIED` audit event from the workflow run with the staff-only `?demoPermissionViolation=true` flag | "The system never approves or rejects. A human does, with a reason, and it is logged. Agents that try to step outside their permissions are refused and logged." |

Close with `docs/GUARDRAILS.md` on screen: what is mocked, what is a limitation, what we would do next.
