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

## Setup (see docs/SETUP.md)

```bash
cp .env.example .env                       # add your LL_AI_API_KEY & LL_EMBED_API_KEY
docker compose up -d --wait                # Postgres + pgvector
cd backend && npm i && npm run db:migrate && npm run seed && npm run dev   # :8080
cd frontend && npm i && npm run dev        # :5173
```
