# Judge Q&A Playbook — LoanLens AI

How to use: each entry has a spoken answer (say this), a deeper explanation (if they dig), planned file/class references, what to show live, the likely follow-up, and the honest limitation. **Everything marked (planned) depends on code that does not exist yet.** Never claim a test passed or a number was measured unless you ran it that day. If something is not built, say "that is in our known-limitations note" and move on.

Names used below come from `Integration_Contracts.md` §6 and `Team_Work_Split.md` (all under `backend/src/`): `core/emi/loanMath.ts` (`calculateEmi`, `amortization`, `obligationRatioPct`), `ai/masking/piiMasker.ts` (`maskPii`), `ai/tools/permissionGuard.ts` (`guardedTools`), `ai/tools/mockTools.ts`, `common/errors.ts` (`AppError`, `errorHandler`), `common/auth.ts` (`requireAuth`, `requireRole`), `ai/advisor/advisorService.ts`, `ai/rag/retriever.ts`, `ai/rag/policyAssistant.ts`, `ai/audit/auditService.ts`, agents in `ai/agents/*Agent.ts` + `ai/agents/orchestrator.ts`.

---

## A. Problem, users, innovation, competitors

### A1. What problem are you solving?
**Spoken.** Kestrel Bank's customers cannot tell which loan fits them, whether they are eligible, or what the rules are, and get different answers from branch, app and call centre. Operations teams verify documents by hand, apply policy inconsistently, and struggle to explain decisions and keep an audit trail. LoanLens puts one grounded, auditable assistant in front of both.
**Deeper.** The brief lists 6 customer and 6 ops pain points; `Hackathon_Strategy.md` §1 maps each to a module and REQUIREMENTS ID. Nothing in the product is outside that mapping.
**Refs.** `docs/USECASE.md` §1, `Hackathon_Strategy.md` §1.
**Show.** The mapping table.
**Follow-up.** "Which pain point is hardest?" → consistency across channels; answered by one RAG source with a latest-version rule (M2-5).
**Limitation.** Synthetic data, so we cannot quantify how often real customers hit each pain point.

### A2. Who are the users?
**Spoken.** Three roles from the brief: Customer, Loan Officer, Credit Analyst, plus a fourth we added after judge feedback: Policy Admin, the bank official who owns the policy library. We seed six people: Priya (salaried), Rahul (self-employed), Ananya (student), Officer Kumar, Analyst Mehta, Admin Rao. The segments matter because eligibility and document checklists differ by segment.
**Deeper.** Role comes from the JWT; the permission matrix in `Integration_Contracts.md` §2 is enforced in the backend and only hidden in the frontend. The analyst is the only role that can hit `POST /api/applications/{id}/decision`.
**Refs.** `PRD.md` §1, `Integration_Contracts.md` §2.
**Show.** Log in as two roles; the nav changes (planned).
**Follow-up.** "Why an admin role when the brief names three?" → a judge asked who controls policy updates; giving that to lending staff mixes duties. `POLICY_ADMIN` can only manage policy versions: no applications, no workflow, no decisions (see C3c).
**Limitation.** No real registration or identity provider; login is simulated (brief allows it).

### A3. What is innovative here?
**Spoken.** Not the chat. The innovation is that the AI is boxed in on every side: numbers are computed in code, policy answers can only come from versioned approved documents filtered by audience, agents can only recommend and only call the tools they are permitted, and every step is audited with PII masked. It is agentic AI built the way a bank's compliance team would accept.
**Deeper.** Four mechanisms: `core/emi/loanMath.ts` (M3-9), metadata-filtered retrieval over the version in force (M2-4, M2-5, M2-10), `guardedTools()` + human-only decision endpoint (G-2, G-4, M3-11), `audit_event` + `maskPii()` (M3-12, M2-8).
**Refs.** `Hackathon_Strategy.md` §4.
**Show.** The audit trail after a workflow run (planned).
**Follow-up.** "Is any of this novel research?" → No. It is a disciplined composition of known patterns; the value is in the guardrails being structural, not prompt-based.
**Limitation.** All services behind the agents are mocks.

### A4. How is this different from Paisabazaar / BankBazaar or a bank chatbot?
**Spoken.** Aggregators compare across banks and stop at lead generation; a generic bot answers from scripts without citations. LoanLens is one bank's in-policy advisor that continues into application, agentic pre-processing and an analyst decision, with every answer cited to a document, section and version.
**Deeper.** Table in `Hackathon_Strategy.md` §3 covers aggregators, generic chatbots, generic RAG demos, rule-based LOS, and "AI underwriter" pitches.
**Refs.** `Hackathon_Strategy.md` §3.
**Show.** A policy answer with `sources[]` (planned).
**Follow-up.** "Could a bank plug this into its LOS?" → the `getApplication` / `transition` functions and `ai/tools/mockTools.ts` are the seam; the mock tools would be replaced by real adapters.
**Limitation.** We have not integrated with any real LOS.

### A5. Why would a bank trust this?
**Spoken.** Because the model never makes a decision or a calculation. It paraphrases, explains, and drafts messages. Everything it says about money or policy is either computed in code or quoted from an approved document, and the whole chain is in the audit table.
**Deeper.** `Recommendation` enum in `openapi.yaml` has no APPROVE/REJECT; `update_application` is restricted to UNDER_VERIFICATION / UNDER_REVIEW; `CustomerProfile` has no protected-attribute fields.
**Refs.** `openapi.yaml` `Recommendation`, `CustomerProfile`; `Integration_Contracts.md` §7.
**Show.** The enum in `openapi.yaml`.
**Follow-up.** "What about prompt injection in uploaded documents?" → see D6.
**Limitation.** Only the Policy Admin can publish, after preview and test-ask (planned, C3a), but one admin can publish alone; no maker-checker second approval yet.

---

## B. Architecture, code flow, tech choices

### B1. Walk me through the architecture.
**Spoken.** React 19 + Vite frontend calls a single Node 22 + Express + TypeScript backend over REST defined in `openapi.yaml`. The backend has two folders under `backend/src/`: `core` (products, EMI, customers, applications, auth, uploads) and `ai` (advisor, RAG, agents, audit). Postgres holds the relational data and PgVector holds the embeddings. The chat model is any OpenAI-compatible endpoint, NVIDIA NIM by default, Gemini as fallback. Embeddings come from the Gemini API (`gemini-embedding-001` via `@ai-sdk/google`, 768 dimensions).
**Deeper.** `ai` consumes `core` only via the TypeScript functions in `Integration_Contracts.md` §6 (`getApplication`, `transition`, `listProducts`, `getCustomer`, `calculateEmi`, `obligationRatioPct`); `core` and the frontend consume `ai` only via REST. That boundary is also the team split.
**Refs.** `Architecture.md`, `Preliminary_Design.md` (planned), `CLAUDE.md` §5.
**Show.** Mermaid diagram.
**Follow-up.** "Why a monolith?" → one deployable for a hackathon; the folder boundary is the future service boundary.
**Limitation.** No message queue; workflow runs synchronously in the request.

### B2. Trace the advisor request end to end.
**Spoken.** The frontend posts the sentence to `/api/advisor/chat`. `advisorService.ts` asks the LLM to extract amount, purpose, income and EMI preference into a typed object using `generateObject` with a Zod schema. Code then filters the catalogue by purpose and segment, computes EMI for each valid tenure with `calculateEmi()`, keeps the ones under the preferred EMI, and asks the LLM only for the one-line `reason`. If a required field is missing, we return a `clarifyingQuestion` instead.
**Deeper.** Two LLM calls max; the second is optional and template-able. The response is post-validated: `productId` must exist, `estimatedEmi` must equal `calculateEmi(...)` for that product/tenure. (planned)
**Refs.** `ai/advisor/advisorService.ts` (S2), `core/emi/loanMath.ts` (S1), `listProducts()`.
**Show.** The brief's sentence → VL-204 / 60 / 10871 (planned).
**Follow-up.** "What if the LLM extracts the wrong amount?" → the extracted values are echoed back in `loanAmount` etc. so the customer can see and correct them; the clarifying question covers ambiguity.
**Limitation.** Extraction quality depends on the model; no fine-tuning.

### B3. Trace the workflow request.
**Spoken.** Officer posts to `/api/workflow/applications/{id}/run`. The orchestrator moves the application to UNDER_VERIFICATION, runs Document Verification, Credit Assessment and Compliance agents, each with its own permitted tools, collects their `{agent, result, detail}` checks, asks the Customer Communication Agent for the plain-language message, decides the recommendation and risk band in code, writes the audit trail, moves the application to UNDER_REVIEW and returns the brief's JSON.
**Deeper.** Each agent is `run<Name>Agent(ctx: AgentContext): Promise<AgentCheck>` in `ai/agents/*Agent.ts`. Tools are AI SDK `tool()` objects in `ai/tools/mockTools.ts`; every call passes `guardedTools(agentName)` in `ai/tools/permissionGuard.ts`. Recommendation mapping (planned): any INCOMPLETE → `REQUEST_ADDITIONAL_DOCUMENTS`; any FAIL → `RECOMMEND_REJECT`; all PASS and no HITL trigger → `RECOMMEND_APPROVE`; otherwise `REFER_TO_HUMAN`. `requiresHumanApproval` is always true in this build.
**Refs.** `ai/agents/orchestrator.ts`, `ai/audit/auditService.ts`, `Integration_Contracts.md` §5, §7.
**Show.** The checks table and audit viewer (planned).
**Follow-up.** "Is the orchestrator an LLM?" → see C5.
**Limitation.** Sequential, not parallel; one run per request.

### B4. The brief recommends Spring Boot + Spring AI. Why didn't you use it?
**Spoken.** The brief recommends Spring and, in the same document, says we may use any approved framework. We are three students who have shipped Node, Express, Prisma and React with JWT and role-based auth, and none of us has shipped Spring. A judge can only score what runs, so we kept the design the brief asks for and changed only the runtime. Same `openapi.yaml`, same brief JSON, same PostgreSQL + pgvector, same agents, tools, audit trail and guardrails. Every Spring AI concept we would have used has a one-to-one equivalent in the Vercel AI SDK.
**Deeper.** The full reasoning is ADR-0 in `Decisions.md`: delivery risk, same architecture, one Zod schema that is the validator, the TypeScript type *and* the JSON schema handed to `generateObject`, one language end to end, faster feedback (`tsx watch` vs a 5–15 s Spring restart), and a free, portable AI stack. The mapping:

| Spring concept | Our equivalent (planned file) |
|---|---|
| `@RestController` + `@Valid` DTO | Express router + Zod `parse()` (`core/*/router.ts`, `schemas.ts`) |
| `@ControllerAdvice` | `errorHandler` + `AppError` in `common/errors.ts` |
| Spring Security `@PreAuthorize` | `requireAuth` / `requireRole` in `common/auth.ts` |
| JPA entities + Flyway | Prisma models in `backend/prisma/schema.prisma` + `prisma migrate` |
| `ChatClient` | AI SDK `generateText` / `generateObject` (`ai/config/llm.ts`) |
| `@Tool` methods | AI SDK `tool({ inputSchema, execute })` in `ai/tools/mockTools.ts` |
| `BeanOutputConverter<T>` | `generateObject({ schema: zod })` |
| `PgVectorStore` | Prisma `$queryRaw` with `<=>` in `ai/rag/retriever.ts` |
| `VertexAiTextEmbeddingModel` / Gemini embedding model | `@ai-sdk/google` `embed` / `embedMany` in `ai/rag/embeddings.ts` |
| Logback masking converter | pino serializer calling `maskPii()` (`common/logger.ts`) |

**Refs.** `Decisions.md` ADR-0, `Preliminary_Design.md`, `Integration_Contracts.md` §6.
**Show.** The mapping table above; the folder tree in `Integration_Contracts.md` §6 next to the code tree (planned).
**Follow-up.** "Could you port it to Spring?" → Yes, mechanically: the contract, schema and guardrail logic do not change; each row of the table is a like-for-like swap. We would do that in a bank whose platform team runs on the JVM. We have not done it.
**Limitation.** We give up Spring AI's ready-made `PgVectorStore`, so we own one hand-written pgvector query in `retriever.ts`; the brief's recommended-stack points are a judgement call we accept.

### B4b. Isn't Node too weak for a bank?
**Spoken.** For a bank in production the runtime matters less than where the truth lives and how it is checked. Our system of record is PostgreSQL, with append-only `status_event` and `audit_event` tables; contracts are typed end to end from `openapi.yaml` with Zod at every boundary; numbers come from deterministic code with unit tests; and decisions are human-only. None of that depends on the JVM.
**Deeper.** The design is runtime-neutral: the same tables, endpoints, permission matrix and agent/tool contract would be implemented identically in Spring. A production bank would harden this build (real IdP, secrets manager, async workflow, observability, load testing) or port it to its standard JVM platform using the B4 mapping. Tests planned: `loanMath.test.ts`, `stateMachine.test.ts`, `piiMasker.test.ts`, `retriever.test.ts`, `permissionGuard.test.ts`, `orchestrator.test.ts`, plus a supertest route test.
**Refs.** `Decisions.md` ADR-0, `Preliminary_Design.md`, `Integration_Contracts.md` §6–§8.
**Follow-up.** "What about concurrency/CPU-heavy work?" → The heavy work is the LLM and embedding API calls (network-bound), not CPU in our process; Node's async model fits I/O-bound workloads.
**Limitation.** Single process, no load test, not production-hardened. We claim a correct, auditable design, not bank-grade operations.

### B5. Why PgVector instead of a dedicated vector DB?
**Spoken.** One database, one container, one transaction boundary. Our metadata filters (loan type, effective date, audience) are relational predicates, and PgVector lets us combine them with similarity in one query. For a few hundred chunks it is more than enough.
**Deeper.** The version in force is a pre-filter CTE, `SELECT DISTINCT ON (document_key) id FROM kb_document WHERE status = 'PUBLISHED' AND effective_date <= CURRENT_DATE ORDER BY document_key, effective_date DESC`, joined to `kb_chunk` before the `<=>` similarity ordering, all in the one `$queryRaw` in `ai/rag/retriever.ts` (planned).
**Refs.** `KbDocument` / `KbChunk` models in `backend/prisma/schema.prisma`, `ai/rag/retriever.ts`.
**Show.** `docker-compose.yml` with the `pgvector/pgvector` image.
**Follow-up.** "Index type?" → exact search (no index) by default, HNSW is one raw-SQL migration away; irrelevant at our scale.
**Limitation.** Not benchmarked.

### B6. Why React 19 + Vite, and how did the frontend dev work without a backend?
**Spoken.** Brief's recommended stack. So the frontend never waited for the backend, the frontend developer built every screen against MSW mocks generated from the `example` values in `openapi.yaml`, then flipped `VITE_USE_MOCKS=false` at integration.
**Deeper.** TanStack Query for data, React Router for role-guarded routes, Tailwind for responsive layout; `src/api/types.ts` mirrors `openapi.yaml` field-for-field.
**Refs.** `frontend/src/mocks/handlers.ts`, `Team_Work_Split.md` S3.
**Show.** The same screen with mocks vs live (only if asked; mocks are removed from the demo build).
**Follow-up.** "Are you showing mocks right now?" → No; `VITE_USE_MOCKS=false` and we can show a network tab.
**Limitation.** No E2E test suite; component tests only (planned: `ApplicationWizard.test.tsx`, `RoleGuard.test.tsx`).

---

## C. AI, LLM, RAG, agents, evaluation

### C1. Why is the LLM not computing the EMI?
**Spoken.** Because LLMs are unreliable at arithmetic and a bank cannot ship a number it cannot reproduce. The brief says deterministic calculations must be done by code. `core/emi/loanMath.ts` is the only place EMI, amortization and obligation ratio are computed; the model receives the result and explains it.
**Deeper.** Standard reducing-balance formula; integer rupees; `loanMath.test.ts` asserts 5,00,000 @ 11 % × 60 = 10,871, the brief's figure. The advisor enumerates tenures in code and asks the model only for the explanation; the agents call `obligationRatioPct()` directly.
**Refs.** `core/emi/loanMath.ts` (S1), `loanMath.test.ts`, `/api/emi/calculate`, M1-3, M3-9.
**Show.** The EMI calculator and the test (planned).
**Follow-up.** "What if the model states a different number in the reason text?" → the reason is generated with the computed numbers injected; we post-check that any number in `reason` matches (planned, best effort).
**Limitation.** Rounding convention is ours; real banks round per their own policy.

### C2. How does RAG work and how do you prevent the model answering from general knowledge?
**Spoken.** Three layers. First, retrieval is filtered by metadata, so the model only sees chunks that are the right loan type, audience and the version in force. Second, if nothing scores above the similarity threshold, we return a fixed safe answer before calling the model at all. Third, the system prompt instructs the model to answer only from the provided context and to say it cannot answer otherwise, and we require it to cite the chunk IDs it used; an answer without citations is replaced by the safe response.
**Deeper.** `askPolicy(question, filters, audience)` in `ai/rag/policyAssistant.ts` (planned): `maskPii()` → embed → `retriever.ts` `$queryRaw` with metadata `WHERE` + `<=>` cosine → if empty or top score < threshold → safe response (`confidence: LOW`, `sources: []`, `followUpRequired: true`) → else prompt with numbered chunks → `generateObject` with a Zod schema → map cited chunk IDs to `sources[]` with `document, section, version, effectiveDate`.
**Refs.** `ai/rag/policyAssistant.ts`, `ai/rag/retriever.ts` (S2), M2-4..M2-7, M2-9.
**Show.** Ask "What is the capital of France?" → safe response (planned).
**Follow-up.** "The model could still hallucinate inside a cited answer." → Yes; `confidence` reflects retrieval score, and the sources are shown so a human can verify. We do not claim zero hallucination.
**Limitation.** Threshold tuned by hand on a small synthetic corpus.

### C3. How does versioning work?
**Spoken.** Every policy has a stable key, like `VEHICLE-TNC`, and every upload is a new, immutable version under it: draft, then published, then possibly retired. When a question is asked, we pick, per key, the published version with the latest effective date that is today or earlier. Nothing is flagged at upload time, so a future-dated version goes live on its date by itself. We seed the vehicle T&C in two versions with different foreclosure charges to prove it.
**Deeper.** No `isLatest` flag (rejected in ADR-18: it can't schedule and goes stale on the effective date). `retriever.ts` (planned) starts with a CTE: `DISTINCT ON (document_key) ... WHERE status = 'PUBLISHED' AND effective_date <= CURRENT_DATE ORDER BY document_key, effective_date DESC`, then joins chunks and applies audience/loanType/segment filters and `<=>` similarity. `retriever.test.ts` (planned) asserts the 2026.3 figure, not the 2025.1 one.
**Refs.** M2-5, M2-K9, X-1, `Integration_Contracts.md` §8a, `Decisions.md` ADR-18, `ai/rag/retriever.ts`, `retriever.test.ts`.
**Show.** `GET /api/admin/policies/VEHICLE-TNC/versions` as `admin.rao`: both versions with `servingState` ACTIVE / SUPERSEDED (planned).
**Follow-up.** "What about a question about a loan taken under the old version?" → out of scope; a real system would key on the customer's contract date. Noted as a limitation.
**Limitation.** Version comparison is by effective date, not semantic version string.

### C3a. How do policy updates reach the chatbot? (planned)
**Spoken.** Through one person: the Policy Admin, a bank official. They upload the new version as a draft with a change note, preview it exactly as it was split into sections, and ask it test questions; only then do they publish. From that moment, or from its effective date if that's in the future, the chatbot answers from it and cites the new version and date. Customers never see the draft.
**Deeper.** `ai/rag/policyAdminService.ts` (planned): `createDraft` parses, chunks, masks and embeds immediately (status DRAFT, `POLICY_DRAFTED` audit event), so preview and test-ask work before go-live. `test-ask` runs the normal answer pipeline but restricted to that one `documentId`. `publish` sets status PUBLISHED, `published_by`, `published_at` and writes `POLICY_PUBLISHED`. No re-embedding or cron at publish: `retriever.ts` computes the version in force per question. The `PolicyAnswer` shape is unchanged because `sources[]` already carries `version` and `effectiveDate`.
**Refs.** `ai/rag/policyAdminService.ts`, `ai/rag/retriever.ts`, `POST /api/admin/policies`, `GET /api/admin/policies/versions/{documentId}/preview`, `POST .../test-ask`, `POST .../publish`, `Integration_Contracts.md` §8a, ADR-18, X-1.
**Show.** Demo beat 4b: upload VEHICLE-TNC v2026.4, preview, test-ask, publish; the customer's same foreclosure question now cites v2026.4 (planned).
**Follow-up.** "What if they publish with a future date?" → status PUBLISHED, `servingState` SCHEDULED; it starts answering on that date with no job running, because the in-force rule is evaluated at query time.
**Limitation.** One admin can publish alone; maker-checker is on the roadmap. Embeddings are created at draft time, so a Gemini outage blocks new drafts (not answers from published versions).

### C3b. How do you roll back a wrong policy? (planned)
**Spoken.** The admin retires the wrong version with a reason. Because we work out the version in force at query time, the previous published version answers the very next question. Nothing is deleted or re-ingested, and the retirement is in the audit trail with who, when and why.
**Deeper.** `policyAdminService.retire(documentId, reason, actor)` (planned): PUBLISHED → RETIRED, sets `retired_at`, `retired_reason`, writes `POLICY_RETIRED`. The retriever's CTE filters `status = 'PUBLISHED'`, so the next-highest effective date for that `document_key` wins automatically. Retired rows stay for history.
**Refs.** `ai/rag/policyAdminService.ts`, `ai/rag/retriever.ts`, `POST /api/admin/policies/versions/{documentId}/retire`, `Integration_Contracts.md` §8a.
**Show.** Retire v2026.4 with a reason; the customer re-asks and the source chip is back to v2026.3; the `POLICY_RETIRED` event in the audit view (planned).
**Follow-up.** "Can you un-retire?" → no, a version is immutable; re-upload it as a new version with a change note, so history stays linear.
**Limitation.** If the only published version is retired, that policy has no version in force and questions on it get the safe not-found answer. No side-by-side diff yet (roadmap).

### C3c. Who is allowed to change a policy? (planned)
**Spoken.** Only the `POLICY_ADMIN` role, a bank official; in the demo that's Admin Rao. Customers, loan officers and credit analysts can read the policies in force but cannot draft, publish or retire. And every change is versioned and audited.
**Deeper.** All `/api/admin/policies/**` routes sit behind `requireRole('POLICY_ADMIN')` (planned); any other role gets a 403 in the error envelope. `GET /api/knowledge/documents` is read-only for staff. The admin has no lending powers: no applications, workflow or decision endpoints (permission matrix, `Integration_Contracts.md` §2). Each action writes `POLICY_DRAFTED` / `POLICY_PUBLISHED` / `POLICY_RETIRED` with actor, `documentKey`, version and change note or reason.
**Refs.** `common/auth.ts` (`requireRole`), `/api/admin/policies`, `ai/rag/policyAdminService.ts`, `Integration_Contracts.md` §2 and §8a, X-1.
**Show.** As `officer.kumar`, `POST /api/admin/policies` → 403; as `admin.rao`, the policy library with version history (planned).
**Follow-up.** "What stops a rogue admin?" → today, the audit trail; next, maker-checker so a second official must approve before publish.
**Limitation.** No maker-checker yet: one admin can draft and publish alone.

### C4. How reliable is tool calling with Llama 3.1 70B on NIM?
**Spoken.** Not reliable enough to bet the demo on, so we do not. The agents call their tools from TypeScript code deterministically and use the model for language, not control flow. AI SDK tool calling is still wired so the model *can* call tools where it helps, but the workflow result does not depend on it.
**Deeper.** Each agent's `run()` (planned) gathers tool outputs in code, builds a small context, and asks the model for the `detail` sentence with a fallback template if the call fails or returns malformed output. `orchestrator.test.ts` runs with the LLM mocked (Vitest `vi.mock` of `ai/config/llm.ts`), so the brief's scenario is provably correct independent of the LLM.
**Refs.** `ai/tools/mockTools.ts`, agents in `ai/agents/`, M3-7, M3-8.
**Show.** The audit trail shows `TOOL_CALL` events with inputs/outputs regardless of model behaviour (planned).
**Follow-up.** "Then is it really agentic?" → Agents are specialised, have their own tools and permissions, and the orchestrator routes and escalates; the brief explicitly allows "tool calling or an equivalent approach". We chose reliability over letting the model freewheel.
**Limitation.** Model-driven tool selection is exercised only where it is safe to fail.

### C5. Is the orchestrator an LLM or code?
**Spoken.** Code decides the sequence, the recommendation and whether a human is needed; the rules are the ones in our integration contract. The model drafts text. We did this on purpose: routing rules in a bank must be inspectable.
**Deeper.** HITL rule (planned): any check ≠ PASS, OR amount ≥ 10,00,000, OR obligation ratio 45–55 %, OR credit score 640–680, OR policy exception. Always true in this build because the final decision is always human.
**Refs.** `OrchestratorAgent`, `Integration_Contracts.md` §7, M3-6, M3-10.
**Show.** The rule in the contract document.
**Follow-up.** "Would you let the model route in production?" → Only with the same hard guard on actions and a shadow-mode evaluation first.
**Limitation.** Rule thresholds are illustrative, not from a real credit policy.

### C6. How do you stop an agent approving a loan?
**Spoken.** Three ways. The `Recommendation` enum has no approve/reject value. The only tool that changes status, `update_application`, is restricted to UNDER_VERIFICATION and UNDER_REVIEW and only the orchestrator may call it. The decision endpoint requires the CREDIT_ANALYST role and is never reachable from any tool.
**Deeper.** `guardedTools(agentName)` checks `(agent, tool)` against the matrix; violations throw `AgentPermissionDeniedError`, write a `PERMISSION_DENIED` audit event, and the check becomes `EXCEPTION`. `permissionGuard.test.ts` covers it (planned).
**Refs.** `ai/tools/permissionGuard.ts`, `AgentPermissionDeniedError`, `openapi.yaml` `Recommendation`, `/api/applications/{id}/decision`, G-2, G-4, M3-11.
**Show.** Call the decision endpoint as `officer.kumar` → 403; show a `PERMISSION_DENIED` audit row from a workflow run with the staff-only `?demoPermissionViolation=true` flag (planned).
**Follow-up.** "What if someone adds an approve tool later?" → the guard matrix is a single table in code; a reviewer sees any change in one diff.
**Limitation.** Protection is at the application layer, not the database layer.

### C7. Why Gemini embeddings instead of running a model yourselves?
**Spoken.** It is a web app, so we want a lightweight backend that deploys to free or serverless hosts. Calling `gemini-embedding-001` means no model to host, roughly 250 MB less RAM, no cold-start model download, better retrieval quality than small local models like MiniLM, and it is free with the Gemini key we already have.
**Deeper.** `ai/rag/embeddings.ts` uses `@ai-sdk/google`: `embedMany` with `taskType: 'RETRIEVAL_DOCUMENT'` for chunks (batches of ≤ 100, one retry after 2 s on 429) and `embed` with `taskType: 'RETRIEVAL_QUERY'` for questions, both at `outputDimensionality: 768`. Truncated 768-dim vectors are not unit length, so we normalise them in code before storing and before querying, because retrieval uses cosine distance `<=>` on an HNSW index. Chunks are PII-masked before they are embedded.
**Refs.** `ai/rag/embeddings.ts`, `vector(768)` column in `schema.prisma`, `LL_EMBED_*` in `.env.example`, M2-3.
**Show.** `GET /api/knowledge/documents` after `npm run ingest`; unset `LL_EMBED_API_KEY` → the backend refuses to start with a clear env error.
**Follow-up.** "What if the embedding API is down?" → the policy assistant returns `AI_UNAVAILABLE` 503; it never answers without retrieval. "Multilingual?" → the Gemini model is multilingual, but our documents and evaluation are English only.
**Limitation.** Search needs internet; Gemini free-tier rate limits (fine for ~10 docs + demo); a second key if chat uses NVIDIA; masked chunk text leaves our machine for embedding. Not benchmarked against alternatives.

### C8. How did you evaluate the AI?
**Spoken.** Against the brief. The two sample scenarios and the five example questions are our acceptance tests, written down in `docs/TEST_PROMPTS.md`, plus Vitest unit tests for the deterministic parts: `loanMath.test.ts`, `stateMachine.test.ts`, `piiMasker.test.ts`, `retriever.test.ts`, `permissionGuard.test.ts`, `orchestrator.test.ts`.
**Deeper.** We did not build a retrieval benchmark or an LLM-as-judge harness; with a hand-written synthetic corpus the honest evaluation is "do the brief's questions answer from the right section". (planned: a small table of question → expected source section checked manually.)
**Refs.** `docs/TEST_PROMPTS.md`, test files listed in `Team_Work_Split.md`.
**Show.** Test run output if it exists on demo day; otherwise the prompt list.
**Follow-up.** "Recall at k?" → not measured. We would add a golden set per document type next.
**Limitation.** No quantitative metrics.

### C9. What prompt-injection defences exist?
**Spoken.** Retrieved chunks and user text are placed in clearly delimited context, the system prompt forbids following instructions inside documents, the model has no tool that can change anything except the tightly scoped `update_application`, and every LLM call is audited. The blast radius of a successful injection is a wrong sentence, not a wrong decision.
**Deeper.** Because decisions and numbers are in code, injection can at worst alter `detail`, `reason`, or `customerMessage` text. Documents are assumed approved (brief). (planned)
**Refs.** `ai/rag/policyAssistant.ts`, `ai/tools/permissionGuard.ts`.
**Show.** Not demoed unless asked.
**Follow-up.** "Did you test it?" → Not systematically. Limitation.
**Limitation.** No injection test suite.

### C10. How do you handle a clarifying question?
**Spoken.** If the extraction step returns a required field as null, the advisor returns the brief's shape with `clarifyingQuestion` set and an empty recommendations list instead of guessing. The brief's sample has it `null` because all fields were present.
**Deeper.** Required for a recommendation: amount and purpose; income is required for the eligibility indicator, so without it we still can recommend but set `eligibilityIndicator: UNKNOWN` and ask (planned, our assumption; logged in `docs/ASSUMPTIONS.md`).
**Refs.** `ai/advisor/advisorService.ts`, M1-14, `AdvisorResponse.clarifyingQuestion`.
**Show.** "I need 5 lakh for a car" → question about income (planned).
**Follow-up.** "Multi-turn?" → `conversationId` is in the contract; memory is a cut-order item if time is short.
**Limitation.** May be single-turn.

---

## D. APIs, database, security, privacy, failure handling

### D1. Show me the API design.
**Spoken.** Contract-first: `openapi.yaml` was written before any code from the brief's JSON. Three brief shapes, `AdvisorResponse`, `PolicyAnswer`, `AgentRecommendation`, are copied verbatim. Everything else follows REST conventions, with a single error envelope.
**Deeper.** Tags per area; money as integer rupees; enums in UPPER_SNAKE; `audience` for the policy endpoint is derived from the JWT role, never accepted from the request.
**Refs.** `openapi.yaml`, `Integration_Contracts.md` §1, §3, §4.
**Show.** The file.
**Follow-up.** "Pagination?" → Not for seed-sized lists; limitation.
**Limitation.** No versioned API path.

### D2. Show me the schema.
**Spoken.** Singular snake_case tables with foreign keys: `customer`, `loan_product`, `loan_application`, `application_document`, `status_event`, `kb_document`, `kb_chunk` (with the vector), `audit_event`. `status_event` and `audit_event` are append-only and are the timeline and the audit trail respectively. No column for any protected attribute.
**Deeper.** Prisma models in `backend/prisma/schema.prisma` mapped to snake_case tables, migrations in `prisma/migrations/`; S2 may append only `KbDocument`, `KbChunk`, `AgentRun`, `AuditEvent`. Seed in `backend/prisma/seed.ts` (`npm run seed`). (planned)
**Refs.** `backend/prisma/schema.prisma`, D-5, B-1..B-6.
**Show.** ERD in `Architecture.md` / `Preliminary_Design.md` (planned).
**Follow-up.** "Why not store the recommendation JSON as a column?" → we store it (`latestRecommendation`) for the tracker and keep events normalised for querying.
**Limitation.** Uploads on local disk, path stored in `application_document`.

### D3. How is validation and error handling done?
**Spoken.** Zod `parse()` on every request body and query, and one Express `errorHandler` (`common/errors.ts`) that maps every error to the same envelope: status, code, message, field details, timestamp, path. Codes: `VALIDATION_FAILED`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `INVALID_STATE`, `AI_UNAVAILABLE`, `INTERNAL`. No stack traces leave the server.
**Deeper.** `INVALID_STATE` 409 is thrown as an `AppError` by `transition()` (`core/application/stateMachine.ts`) for illegal transitions; `AI_UNAVAILABLE` 503 wraps any chat-model failure.
**Refs.** `common/errors.ts` (`AppError`, `errorHandler`), `Integration_Contracts.md` §3, D-6.
**Show.** `POST /api/emi/calculate` with `principal: 0` → 400 envelope (planned).
**Follow-up.** "Frontend handling?" → one API client that renders `message` and highlights `details[].field`.
**Limitation.** No request-ID correlation header (planned if time).

### D4. How is PII protected?
**Spoken.** `maskPii()` masks PAN, Aadhaar and account numbers before any text reaches the LLM, before audit inputs/outputs are persisted, and inside every log line via the pino serializer in `common/logger.ts`. Protected attributes are never stored at all.
**Deeper.** Patterns: PAN `[A-Z]{5}[0-9]{4}[A-Z]` → `XXXXX1234X`; Aadhaar 12 digits → `XXXX-XXXX-1234`; account numbers 9–18 digits → last 4 only. `piiMasker.test.ts` covers each.
**Refs.** `ai/masking/piiMasker.ts`, `piiMasker.test.ts`, M2-8, `Integration_Contracts.md` §8.
**Show.** Ask the policy assistant a question containing a fake PAN; show the masked audit row and log line (planned).
**Follow-up.** "False positives on 12-digit numbers?" → Yes, any 12-digit number is masked; acceptable for a bank context. Limitation.
**Limitation.** Regex-based; no NER.

### D5. What happens if NIM is down?
**Spoken.** Switch the base URL and model by environment variable to Gemini `gemini-2.0-flash` and restart; no code change. If both are down, the EMI calculator, catalogue, applications, retrieval and the audit trail still work; the advisor and policy generation return a clean `AI_UNAVAILABLE` 503, and the workflow still completes with templated `detail` text and `requiresHumanApproval: true`.
**Deeper.** `LL_AI_BASE_URL`, `LL_AI_MODEL`, `LL_AI_API_KEY`. Agents have a template fallback for `detail` and `customerMessage` (planned) so the brief's scenario output does not depend on the model being reachable.
**Refs.** `.env.example`, `common/errors.ts`, `Hackathon_Strategy.md` §8.
**Show.** Remove the key, re-run the workflow → still returns checks; advisor returns 503 envelope (planned, only if rehearsed).
**Follow-up.** "Automatic failover?" → Not built; manual env switch. Limitation.
**Limitation.** No circuit breaker.

### D6. Show me the audit trail.
**Spoken.** Every workflow run creates an `auditTrailId` like `AUD-2026-77301`. `GET /api/audit/{id}` returns ordered events: agent start/end, each tool call with input and output, each LLM call, permission denials, and the human-required marker, each with a timestamp and duration, all PII-masked.
**Deeper.** Event types: `AGENT_START, TOOL_CALL, TOOL_RESULT, LLM_CALL, LLM_RESULT, PERMISSION_DENIED, AGENT_END, HUMAN_REQUIRED`. Written by `ai/audit/auditService.ts` (S2), rendered by the analyst review page (S3).
**Refs.** `audit_event` table, `openapi.yaml` `AuditTrail`, M3-12.
**Show.** The viewer after running `LA-2026-00418` (planned).
**Follow-up.** "Can the trail be edited?" → Append-only table; no update endpoint. A real deployment would add WORM storage.
**Limitation.** Not cryptographically tamper-evident.

### D7. How is authentication and authorisation done?
**Spoken.** Simulated login over seeded users returns an HS256 JWT with the role. `requireAuth` / `requireRole` middleware (`common/auth.ts`) enforces the permission matrix per endpoint; customers can only see their own applications; the decision endpoint is analyst-only. The frontend hides what the backend forbids but never relies on hiding.
**Deeper.** Secret from `LL_JWT_SECRET`; `/api/auth/me` for the principal; ownership checks in `core/application/service.ts`.
**Refs.** `Integration_Contracts.md` §2, M1-4, M1-8.
**Show.** 403 as officer on the decision endpoint (planned).
**Follow-up.** "Refresh tokens? Password hashing?" → Not for seeded demo users; brief says auth may be simulated. Limitation.
**Limitation.** Not production auth.

---

## E. Scalability, performance, cost, testing, limitations

### E1. Does this scale?
**Spoken.** The design does; this build does not try to. Stateless backend behind a load balancer, Postgres for state, PgVector fine for thousands of policy chunks, workflow runs moved to a queue when volume demands. The expensive part is the LLM, and we call it at most twice per request.
**Deeper.** Sequential synchronous workflow is the first thing to make async. Audit writes are append-only inserts.
**Refs.** `Hackathon_Strategy.md`, `docs/GUARDRAILS.md` limitations (planned).
**Show.** Nothing; be honest.
**Follow-up.** "Numbers?" → None measured. Limitation.
**Limitation.** No load test.

### E2. What is the latency and cost?
**Spoken.** We have not benchmarked. Deterministic endpoints are local database calls. Advisor and policy answers cost one or two LLM calls on a hosted 70B model, so a few seconds each; the query embedding is one more short Gemini API call (free tier).
**Deeper.** Cost drivers: tokens per prompt (kept small by retrieving top-k chunks only), number of agent LLM calls (one per agent for wording, template fallback).
**Refs.** none.
**Show.** Observed timing during the demo if asked.
**Follow-up.** "Smaller model?" → Any OpenAI-compatible endpoint is a config change.
**Limitation.** No measured numbers; do not quote any.

### E3. What tests exist?
**Spoken.** Planned and listed in the work split (Vitest, `npm test`): `loanMath.test.ts` (the brief's 10,871), `stateMachine.test.ts`, a supertest route test, `piiMasker.test.ts`, `retriever.test.ts`, `permissionGuard.test.ts`, `orchestrator.test.ts` for the brief's missing-address-proof scenario with the LLM mocked, and `ApplicationWizard.test.tsx` and `RoleGuard.test.tsx` on the frontend.
**Deeper.** Deterministic logic is unit-tested; LLM-dependent paths are tested with stubs; the brief's prompts are the manual acceptance suite.
**Refs.** `Team_Work_Split.md` test lists.
**Show.** Only what actually ran that day.
**Follow-up.** "Coverage?" → Not measured.
**Limitation.** No E2E, no load, no injection tests.

### E4. What are the biggest limitations?
**Spoken.** All external services are mocks; evaluation is qualitative; the workflow is synchronous; PII masking is regex; search needs internet and a Gemini key (free-tier rate limits); the HITL thresholds are illustrative. All of it is written in `docs/GUARDRAILS.md`.
**Refs.** `docs/GUARDRAILS.md` (planned, S2), D-9.
**Show.** The file.
**Follow-up.** "Which would you fix first?" → Real evaluation set, then async workflow.
**Limitation.** This answer *is* the limitation list.

### E5. What did AI-assisted development contribute and how did you keep quality?
**Spoken.** We used AI coding tools, as the brief allows, with a contract-first method: `openapi.yaml` and the integration contract were written by hand first, then each session generated code against them, one commit per requirement ID, reviewed by a teammate before merge.
**Deeper.** `CLAUDE.md` is the shared instruction file; commits are `<REQ-ID>: summary`; REQUIREMENTS.md is ticked only with file evidence.
**Refs.** `CLAUDE.md`, `REQUIREMENTS.md`, `Team_Work_Split.md` git workflow.
**Show.** `git log --oneline`.
**Follow-up.** "Did the AI write the guardrails?" → The guardrails are the brief's; we designed the enforcement points and made sure the generated code has tests for them.
**Limitation.** Quality depends on review discipline under time pressure.

---

## F. Impact, feasibility, future, hackathon compliance

### F1. What is the business impact?
**Spoken.** Fewer incomplete applications reaching analysts, consistent answers across channels, faster turnaround because document gaps are caught before review, and an audit trail that is produced as a by-product rather than reconstructed. We cannot quantify it on synthetic data and will not pretend to.
**Refs.** `Hackathon_Strategy.md` §1.
**Follow-up.** "Pilot plan?" → Shadow mode next to analysts, compare recommendations to decisions, measure agreement.
**Limitation.** No measured impact.

### F2. Is it feasible to productionise?
**Spoken.** The seams are there: mock tools behind interfaces, model behind config, decisions human-only. Productionising means real adapters for bureau/KYC/income, object storage for uploads, async workflow, proper IdP, and a real evaluation set.
**Refs.** `PRD.md` §5 out-of-scope.
**Follow-up.** "Regulatory?" → Explainability and audit are designed in; actual compliance review is outside the hackathon.
**Limitation.** None of the above is built.

### F3. What would you build next?
**Spoken.** A golden evaluation set per document type with retrieval metrics; async workflow with a queue; contract-date-aware policy versioning; Hindi-language documents and evaluation; document OCR for real mismatch detection.
**Refs.** `docs/GUARDRAILS.md`.
**Limitation.** Priorities, not commitments.

### F4. Did you meet every requirement in the brief?
**Spoken.** `REQUIREMENTS.md` lists every line of the brief as an ID with a tick and the file that proves it. Anything unticked is named in the known-limitations note rather than hidden.
**Refs.** `REQUIREMENTS.md`, `CLAUDE.md` §3.7, D-9.
**Show.** The checklist.
**Follow-up.** "Which ones are not done?" → Read from the file on the day; do not guess.
**Limitation.** Whatever is unticked on demo day.

### F5. Where are the seed data and test prompts?
**Spoken.** `backend/prisma/seed.ts` (`npm run seed`) creates 8 products, 5 users and 2 applications including `LA-2026-00418`; `db/knowledge/` holds the synthetic policy documents with one in two versions; `docs/TEST_PROMPTS.md` lists every prompt we use in the demo.
**Refs.** D-8, M2-K1..K9.
**Show.** The directories.
**Limitation.** Synthetic, small.

### F6. Did you use protected attributes anywhere?
**Spoken.** No. They are not in the schema, the DTOs, the prompts or the seed data. `CustomerProfile` in `openapi.yaml` says so explicitly. Decision inputs are only documents, income, obligations, credit score, KYC, product rules, and requested amount/tenure.
**Refs.** G-1, `openapi.yaml` `CustomerProfile`, `Integration_Contracts.md` §7.
**Show.** The schema and a grep.
**Follow-up.** "Proxy variables like location?" → Location is stored for profile display and is not a decision input in our rules; worth stating in the guardrails note.
**Limitation.** We have not done a formal fairness audit.

---

## G. Individual contributions

### G1. What did S1 (backend-core) build?
**Spoken.** The Express + TypeScript skeleton, Prisma schema and migrations, Postgres+PgVector compose, JWT auth and roles (`common/auth.ts`), `core/emi/loanMath.ts` and the EMI endpoint, the product catalogue with search/filter/sort/compare, the application state machine with timeline, document upload (multer), `common/errors.ts`, `prisma/seed.ts`, and `docs/SETUP.md`. Tests: `loanMath.test.ts`, `stateMachine.test.ts`, a supertest route test.
**Refs.** `Team_Work_Split.md` S1; `backend/src/core/**`, `backend/src/common/**`, `backend/prisma/**`.
**Follow-up.** "Hardest part?" → State machine and ownership checks across roles.

### G2. What did S2 (backend-ai) build?
**Spoken.** The AI SDK provider config for NIM/Gemini (`ai/config/llm.ts`), Gemini embeddings via `@ai-sdk/google`, the pgvector retriever, ingestion with section-aware chunking and metadata, retrieval with filters and latest-version rule, `policyAssistant.ts`, `maskPii()`, `advisorService.ts` with `generateObject`, the five agents, `mockTools.ts`, `permissionGuard.ts`, `auditService.ts`, the knowledge documents, `docs/GUARDRAILS.md` and `docs/TEST_PROMPTS.md`. Tests: `piiMasker.test.ts`, `retriever.test.ts`, `permissionGuard.test.ts`, `orchestrator.test.ts`.
**Refs.** `Team_Work_Split.md` S2; `ai/**`, `db/knowledge/**`.
**Follow-up.** "How did you work before S1's code existed?" → In-memory stubs under `ai/stub/` against the TypeScript signatures in `Integration_Contracts.md` §6, deleted at integration.

### G3. What did S3 (frontend) build?
**Spoken.** The whole React 19 + Vite app: login, catalogue with search/filter/sort/compare, product detail with EMI and amortization table, advisor chat, policy chat with sources, profile, 4-step wizard with save-as-draft and uploads, status timeline, officer queue, analyst review with checks table, audit viewer and decision form, role-based nav guard, responsive at 375/768/1280, plus MSW mocks, `Demo_Runbook.md` and the judge cheatsheet. Tests: `ApplicationWizard.test.tsx`, `RoleGuard.test.tsx`.
**Refs.** `Team_Work_Split.md` S3; `frontend/**`.
**Follow-up.** "Did you wait for the backend?" → No; built against mocks from `openapi.yaml`, integrated at phase ends.

### G4. How did three people avoid stepping on each other?
**Spoken.** Split by layer, not by module, so no two people own the same directory. Shared files change only through PRs titled `contract:`. Everyone rebases on `main` every 30–60 minutes and integrates at the end of each phase, not at the end.
**Refs.** `Team_Work_Split.md`, `Integration_Contracts.md` §10.
**Follow-up.** "Any conflicts?" → Answer honestly from experience on the day.

---

## H. Tough follow-ups, quick-fire

| Question | Short answer | Pointer |
|---|---|---|
| "Is this response cached or live?" | Live; network tab or re-ask with a changed number. If NIM is slow, say so and show the fallback. | D5 |
| "Why is `requiresHumanApproval` always true?" | Brief: final credit decision stays with a human. The rule still computes borderline/high-value/exception cases and records which one fired (planned) so the analyst sees why. | C5 |
| "Can a customer or loan officer upload a policy document?" | No; only `POLICY_ADMIN`, 403 for everyone else. | C3c, D7 |
| "Can a customer see internal playbooks?" | No; audience from role, not request. | C2, M2-10 |
| "What if two documents of different types have the same title?" | Versions are grouped by `documentKey`, not title, so titles can repeat (planned). | C3 |
| "Why Llama via NIM and not GPT-4?" | Any OpenAI-compatible endpoint works; NIM was available to us. Gemini is the configured fallback. | B4 |
| "Does the model see Aadhaar numbers?" | No; masked before the prompt is built. | D4 |
| "What stops the orchestrator calling the decision endpoint?" | No tool exists for it; HTTP endpoint requires CREDIT_ANALYST JWT; agents run without a user JWT. | C6 |
| "Where is the architecture diagram?" | `Architecture.md` + `Preliminary_Design.md`. | B1 |
| "How do I run it?" | `docker compose up -d`; in `backend/`: `npm i`, `npx prisma migrate dev`, `npm run seed`, `npm run ingest`, `npm run dev`; then `npm run dev` in `frontend/`, per `docs/SETUP.md`. | D-3 |
| "What is not working?" | Read the unticked lines of `REQUIREMENTS.md` and `docs/GUARDRAILS.md` aloud. Never improvise. | F4 |
