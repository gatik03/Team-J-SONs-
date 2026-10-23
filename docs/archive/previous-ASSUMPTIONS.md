> Historical development reference. Current submission guide: [SUBMISSION.md](../SUBMISSION.md). Statements about planned or pending work reflect an earlier stage.

# Assumptions (one line each: what, why)

- Auth is simulated with 5 seeded users and HS256 JWT — brief says registration/auth/KYC already exist and may be simulated.
- Money is integer rupees in JSON; rates are percent doubles; EMI rounded to nearest rupee — matches the brief's sample numbers (10871).
- LLM chat goes through one OpenAI-compatible Vercel AI SDK provider (NVIDIA NIM default, Gemini fallback) — brief allows any model; team has free keys for both.
- Backend is Node + Express + Prisma, not Spring Boot — brief's stack is "recommended", frameworks are explicitly participant's choice; team skills are Node/Express/Prisma/React (Decisions.md ADR-0).
- Embeddings come from Gemini `gemini-embedding-001` at 768 dims — it's a web app, so no model is hosted on our server; kb_chunk.embedding is vector(768).
- `requiresHumanApproval` is always true in this build — brief: agents only recommend; final decision is always a Credit Analyst.
- Borderline = obligation ratio 45–55 % or credit score 640–680; high-value = requestedAmount ≥ ₹10 lakh — brief leaves thresholds open.
- Uploaded documents are stored on local disk under backend/uploads/, max 5 MB, pdf/jpg/png — out-of-scope storage service.
- Document "mismatch" checks compare declared name/income/address with values the mock verification tools return — no OCR.
- Disbursement is a single simulated transition APPROVED → DISBURSED by the Credit Analyst — brief: disbursement is out of scope / simulated.
- Audience filter for /api/policy/ask is derived from the caller's role, never the request body — prevents customers requesting internal docs.
- Knowledge docs are seeded from db/knowledge/ by `npm run ingest` and can also be uploaded via API — satisfies both ingestion and demo readiness.
