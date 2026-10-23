# Team-J-SONs- — LoanLens AI (Kestrel Bank)
> HCLTech Hackathon

LoanLens AI: AI loan advisor, RAG policy assistant and agentic loan pre-processing with human-in-the-loop.
Stack: React 19 + Vite + Tailwind · Node 22 + Express + TypeScript + Prisma + Zod · Vercel AI SDK · PostgreSQL + pgvector · LLM via NVIDIA NIM / Gemini (OpenAI-compatible) · Gemini embeddings.
Why not Spring AI? See `Preliminary_Design.md` §"Why we changed the architecture" and `Decisions.md` ADR-0.

## Start here

| Read | Why |
|---|---|
| `Getting_Started.md` | What to do now: set up your device, clone, branch, start your session |
| `prompts/S1_backend_core.md`, `S2_backend_ai.md`, `S3_frontend.md` | Paste the one for your stream into Antigravity (Gemini) |
| `Preliminary_Design.md` | Judge-facing explanation of the design and how we built it |
| `docs/USECASE.md` | The brief — source of truth |
| `CLAUDE.md`, `REQUIREMENTS.md` | Project rules and the traceability checklist |
| `Integration_Contracts.md`, `openapi.yaml` | What every layer agrees on |
| `Team_Work_Split.md` | Who owns what, git workflow |
| `Hackathon_Strategy.md`, `PRD.md` | Why and what |
| `Architecture.md`, `Flow.md`, `Rules.md`, `Decisions.md`, `Phases.md` | How |
| `Design.md`, `Component_Change_Manual.md` | Frontend look and live-change guide |
| `Demo_Runbook.md`, `Submission_Checklist.md`, `Judge_QA_Playbook.md` | Demo day |
| `Memory.md` | Live progress log — update at every milestone |

## Run the integrated app

Requires Node 22, PostgreSQL 16 with pgvector, and a Gemini key for embeddings. Keep your existing `.env`; for a fresh checkout copy `.env.example` and fill its keys. Use `VITE_USE_MOCKS=false` and leave `VITE_API_BASE_URL` empty for same-origin requests.

```bash
docker compose up -d --wait
cd backend
npm ci
npm run prisma -- generate
npm run prisma -- migrate deploy
npm run seed
npm run ingest
npm run dev
```

In a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open **http://localhost:5173**. The six demo users are shown on the sign-in screen; all use password `password`.

For the built application, run `npm run build` in `frontend/`, then `npm start` in `backend/`. Express serves the built frontend and API together at **http://localhost:8080**, including page reloads on nested routes.

```bash
cd backend && npm test && npm run build
cd ../frontend && npm test && npm run build
```

Current verification: **103 backend tests and 14 frontend tests pass**, both builds pass, and both npm audits report zero findings. Real-browser evidence includes all six demo logins, the application/upload/workflow flow, live AI advisor and policy governance, and 57 route/viewport checks at 390, 768 and 1440px. See [HANDOFF.md](HANDOFF.md) and [docs/evidence](docs/evidence).

The app uses synthetic data and requires live AI providers for advice, embeddings and policy generation. Credit bureau/income/KYC are documented mocks; every final credit decision is a human analyst action. See [docs/SETUP.md](docs/SETUP.md) for database details and [docs/GUARDRAILS.md](docs/GUARDRAILS.md) for AI limits.
