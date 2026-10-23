# Decisions (ADR log)

## ADR-0 — Node + Express + Prisma + Vercel AI SDK instead of Spring Boot + Spring AI

**Context.** The brief lists Spring Boot 3 + Spring AI as the *recommended* backend and says in the same document that "participants may use any approved AI models, frameworks, libraries". Our team of three college students has shipped full-stack projects in Node/Express/Prisma/React with JWT, role-based auth and Zod (see team resumes); none of us has shipped Java/Spring, and none of our laptops has a JDK. We have roughly 24–36 hackathon hours and Gemini-driven coding sessions.

**Options.** (A) Spring Boot + Spring AI as recommended. (B) Node 22 + Express + TypeScript + Prisma + Zod + Vercel AI SDK. (C) Python FastAPI + LangChain.

**Decision.** (B).

**Why — the arguments we give judges.**
1. **Delivery risk beats framework points.** A judge can only score what runs. Every hour spent learning Spring's DI, JPA and the Spring AI 1.0 API is an hour not spent on the three modules. The brief grades working capability, schema design, validation, guardrails and traceability, not the JVM.
2. **Same architecture, same database, same contract.** `openapi.yaml`, the brief's JSON shapes, PostgreSQL + pgvector, the agent/tool/audit design and every guardrail are identical. We changed the *runtime*, not the *design*. Spring AI's `ChatClient` + `@Tool` + `BeanOutputConverter` map one-to-one to the AI SDK's `generateText` + `tool()` + `generateObject`.
3. **Stronger type safety at the AI boundary.** Zod schemas are both our request validators and the JSON schema handed to the LLM in `generateObject`. One definition drives validation, TypeScript types and the model's output format, so the brief's field names cannot drift.
4. **One language end to end.** TypeScript in the frontend, backend, agents and tests means three students can review each other's PRs and the frontend can share the same `types.ts`. With Java we would have two languages and two toolchains across three machines.
5. **Smaller dependency surface, faster feedback.** `tsx watch` restarts in under a second; a Spring Boot restart is 5–15 s. Over hundreds of iterations with an LLM pair-programmer that is hours of difference.
6. **Free, hosted AI with nothing to run ourselves.** The AI SDK's OpenAI-compatible provider lets us point at NVIDIA NIM or Gemini with three env vars, and Gemini's embedding API gives search vectors with the same free key. No model runs inside our server, so the backend is a light Node app that deploys to any web host.
7. **Honest answer to "why not Spring AI?"** We would reach for Spring AI in a Java organisation like a bank's existing platform team; the design is framework-neutral and porting is mechanical (see the mapping table below). We chose the stack that let three students ship all three modules with tests in the time available.

| Spring concept | Our equivalent |
|---|---|
| `@RestController` + `@Valid` DTO | Express router + Zod `parse()` |
| `@ControllerAdvice` | `common/errors.ts` errorHandler |
| Spring Security `@PreAuthorize` | `requireAuth` / `requireRole` middleware |
| JPA entities + Flyway | Prisma models + `prisma migrate` |
| `ChatClient` | AI SDK `generateText` / `generateObject` |
| `@Tool` methods | AI SDK `tool({ inputSchema, execute })` |
| `BeanOutputConverter<T>` | `generateObject({ schema: zod })` |
| `PgVectorStore` | Prisma `$queryRaw` with `<=>` cosine operator |
| `EmbeddingModel` | AI SDK `embed` / `embedMany` with `@ai-sdk/google` |
| Logback masking converter | pino `redact`/serializer with `maskPii()` |

**Consequences.** We must own the pgvector SQL ourselves (one `retriever.ts`), and we must say the above out loud when asked. Everything else is cheaper.

## Other decisions

| # | Decision | Alternatives | Why | Trade-off |
|---|---|---|---|---|
| 1 | Split work by **layer** (core / AI / frontend) | by module | zero shared directories, each stream has its own DoD | S2 needs S1 interfaces → stubs until phase 1 merges |
| 2 | **Contract-first** `openapi.yaml` from the brief's JSON | code-first | three people build in parallel against examples; field names stay verbatim | spec changes need a `contract:` PR |
| 3 | One **OpenAI-compatible** AI SDK provider for NVIDIA NIM *and* Gemini | two providers | swap with 3 env vars; both free | tool-calling quality varies by model (llama via NIM is the risk; Gemini fallback) |
| 4 | **Gemini embeddings API** (`gemini-embedding-001`, 768 d) | local MiniLM model (384 d), NVIDIA embedding NIM | it's a web app: no model to host, ~250 MB less RAM, no cold-start download, better quality, free with our Gemini key. NVIDIA's embedding NIM needs an `input_type` field the SDK doesn't send | search needs internet; free-tier rate limits (fine for ~12 docs); needs a Gemini key even when chat uses NVIDIA |
| 5 | **pgvector** via Prisma raw SQL | in-memory cosine | brief recommends it; metadata filter + persistence | one hand-written SQL query |
| 6 | **Structured output** via `generateObject` + zod | free-text parsing | guarantees the brief's exact field names | retry once on schema failure, then `AI_UNAVAILABLE` |
| 7 | **Deterministic math in `loanMath.ts`** | let LLM estimate | brief mandates it; judge-proof numbers | advisor flow calls code for EMI, then LLM for wording |
| 8 | Agents = explicit TS sequence, each its own LLM call + guarded tools | one autonomous tool loop | explainable, auditable, permissions enforceable, survives flaky tool calling | less "magic"; orchestrator routing is partly rule-based (we think that is a feature) |
| 9 | `requiresHumanApproval` always true | threshold-only | brief: agents never decide | threshold logic still sets riskBand |
| 10 | Simulated auth, 5 seeded users, HS256 JWT | OAuth/Keycloak | brief says auth exists and may be simulated | not production-grade |
| 11 | Uploads on local disk (multer) | S3/MinIO | hackathon time | single machine |
| 12 | Audit = append-only `audit_event` table, masked payloads | log files | queryable, demoable, complete per brief | grows unbounded (fine here) |
| 13 | Single `maskPii()` for prompts **and** pino logs | separate regexes | one source of truth for M2-8 | regex can over-mask long numbers |
| 14 | Frontend **MSW mocks** from openapi examples | wait for backend | S3 unblocked from minute one | must be off before demo |
| 15 | GitHub branches + squash-merge PRs | one machine | three people, three devices | rebase discipline |
| 16 | Latest-version rule: `isLatest` computed at ingest (same title → highest effectiveDate ≤ today) | at query time | cheap, deterministic | re-ingesting older version recomputes flags |
| 17 | Tailwind v4 (already in stack), CSS-first: tokens as CSS variables + `@theme` in `frontend/src/styles/tokens.css`, no `tailwind.config` | CSS modules / MUI | fastest to iterate, judge live-changes are one class edit | design discipline needed to avoid "default Tailwind look" (see Design.md) |

## ADR-18 — Policy Admin role with versioned publishing (judge feedback, 2026-10-23)

**Context.** A judge asked how the RAG assistant gets updated policies and how versions are controlled. The earlier design let staff upload documents and flagged `isLatest` at ingest, with no owner, review step, scheduling or rollback.

**Decision.**
- **Ownership.** A `POLICY_ADMIN` role (a bank official) is the only role that can change policies.
- **Immutable versions.** Each upload is a new version under a stable `documentKey`. It moves `DRAFT → PUBLISHED → RETIRED`, and a published version is never edited.
- **Query-time activation.** The version in force is the PUBLISHED one with the highest `effectiveDate ≤ today`, computed when a question is asked. Future-dated policies therefore go live on their own date with no cron job. Retiring the active version rolls back to the previous one instantly.
- **Review before go-live.** Admins preview the chunked sections and run test questions against a draft before publishing.
- **Audit.** Every action writes `POLICY_*` audit events.

**Alternatives.**
- **Overwrite in place.** Rejected because it loses history and gives no rollback.
- **`isLatest` flag set at ingest.** Rejected because it can't schedule a policy and goes stale on the effective date.
- **Maker-checker, where a second admin approves.** Deferred to the roadmap.

**Consequences.** The retriever query gets one `DISTINCT ON (document_key)` step. Answers already cite version and effective date, so the brief's `PolicyAnswer` shape is unchanged.
