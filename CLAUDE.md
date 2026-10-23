# LoanLens AI — Project Instructions

## 0. The source of truth (read this first)

`docs/USECASE.md` (verbatim copy of `docs/archive/LoanLensAI_Hackathon_Usecase.docx`) is the **hackathon-mandated brief. Treat it as the holy grail.**

- Every functional requirement, field name, status value, guardrail, example question, and deliverable in it is **mandatory**, not a suggestion.
- If anything in this file, in `REQUIREMENTS.md`, or in your own judgement conflicts with the brief, **the brief wins**.
- Do not drop, rename, or "improve away" anything the brief specifies. Do not add scope the brief does not ask for.
- Where the brief is silent, the brief itself allows "reasonable assumptions". Make the smallest sensible one and log it in `docs/ASSUMPTIONS.md` (one line each: what, why).
- Before starting any task, re-read the relevant section of `docs/USECASE.md`. Before finishing, tick the matching IDs in `REQUIREMENTS.md` with the file path that proves it.
- JSON responses must use the **exact field names and shapes** shown in the brief's "Expected Response" / "Expected Output" blocks.

## 1. Stack (brief *recommends* Spring; it *permits* any framework — see docs/archive/Decisions.md ADR-0)

- Frontend: React 19 + Vite + TypeScript + Tailwind
- Backend: Node 22 + Express + TypeScript, Prisma ORM, Zod validation, Vercel AI SDK v5 (`ai` + `@ai-sdk/openai-compatible`) for LLM calls, tool calling and structured output
- Database: PostgreSQL 16 + pgvector (same as recommended)
- Embeddings: Gemini `gemini-embedding-001` via `@ai-sdk/google` (768 dims), no local model
- Model: any OpenAI-compatible endpoint via env (NVIDIA NIM default, Gemini fallback); never hardcode keys

## 2. Non-negotiable guardrails (from the brief, Module 3)

1. Protected attributes (gender, religion, caste, marital status) are **never** used in decision logic. Do not even store them in the application/credit model.
2. Agents **never approve or reject** a loan. They only **recommend**. Final decision = human (Credit Analyst) action.
3. Every recommendation carries a **plain-language reason**.
4. Any attempt to act outside an agent's permissions is **refused and logged**.
5. EMI, income-to-obligation ratio, and all other numbers are computed **in code, never by the LLM**.
6. RAG answers come **only from retrieved approved documents**. If nothing supports the answer, return the safe "not found" response — never fall back to model general knowledge.
7. PAN, Aadhaar, and account numbers are **masked in prompts and logs**.
8. Human-in-the-loop is mandatory for borderline, high-value, and policy-exception cases (and the brief's sample output sets `requiresHumanApproval: true`).

## 3. Working method

1. **Contract first.** Write `openapi.yaml` from the brief's JSON shapes before any code. Backend and frontend both build against it so they can work in parallel.
2. **Thin but complete.** Every requirement in `REQUIREMENTS.md` must exist and work end to end. Depth can be minimal (simple UI, small seed set). Presence cannot be skipped.
3. **Synthetic data only** (brief's assumption). Seed via `backend/prisma/seed.ts` (`npm run seed`).
4. **Mock services** for credit bureau (scores 300–900), income verification, KYC status, application update — behind the same interfaces a real service would use.
5. **Validate and handle errors** on every endpoint (Zod on every body/query, one Express `errorHandler`, consistent error JSON). The brief lists this as a deliverable.
6. **Small commits**, one per requirement ID: `M2-5: latest-effective-version retrieval`.
7. If a requirement cannot be met in the time left, **say so in the report instead of silently skipping it**, and note it in the known-limitations file.

## 4. Division of work (parallel)

- Three Antigravity (Gemini) sessions on three devices: S1 `backend/src/core`, S2 `backend/src/ai`, S3 `frontend/`. See `docs/archive/Team_Work_Split.md` and `docs/archive/prompts/`.
- Nobody edits another session's directory. Contract changes go through `openapi.yaml` first.

## 5. Repo layout

```
loanlens/
  CLAUDE.md
  REQUIREMENTS.md          # traceability checklist (tick with evidence)
  openapi.yaml
  docs/
    USECASE.md             # holy grail (do not edit)
    LoanLensAI_Hackathon_Usecase.docx
    ASSUMPTIONS.md
    (architecture lives in root docs/archive/Architecture.md + docs/archive/Preliminary_Design.md)
    GUARDRAILS.md          # AI guardrails, known limitations, responsible-AI decisions
    TEST_PROMPTS.md        # every prompt used in the demo
    SETUP.md
  backend/                 # Node 22 + Express + TS + Prisma + Vercel AI SDK
  frontend/                # React 19 + Vite
  db/
    knowledge/             # synthetic bank policy documents (md/pdf/csv/json)
  (schema = backend/prisma/schema.prisma + migrations; seed = backend/prisma/seed.ts)
  docker-compose.yml       # Postgres + PgVector
```

## 6. Definition of done

- All IDs in `REQUIREMENTS.md` ticked with evidence.
- The brief's two sample scenarios run end to end: the ₹5 lakh used-car advisor query and the ₹5 lakh personal-loan application with missing address proof.
- All five example RAG questions from the brief answer correctly with sources.
- `docker compose up` plus the steps in `SETUP.md` starts the whole app on a clean machine.
- Every deliverable in the brief's "Deliverables" section exists.
