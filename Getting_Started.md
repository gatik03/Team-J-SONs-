# Getting Started — what to do right now

## The split (3 people, 3 laptops)

| Person | Stream | Branch | Builds | Prompt to paste |
|---|---|---|---|---|
| A | **S1 backend-core** | `feat/s1-core` | Express API, Prisma schema + seed, auth/roles, products, EMI math, applications, uploads, docker-compose | `prompts/S1_backend_core.md` |
| B | **S2 backend-AI** | `feat/s2-ai` | RAG policy assistant, AI loan advisor, 5 agents, mock tools, audit trail, PII masking, knowledge docs | `prompts/S2_backend_ai.md` |
| C | **S3 frontend** | `feat/s3-frontend` | React 19 + Vite + Tailwind v4 UI for all 3 roles, MSW mocks, component change manual | `prompts/S3_frontend.md` |

Nobody edits another stream's folders. Shared files (`openapi.yaml`, `Integration_Contracts.md`, `.env.example`, `backend/package.json`) change only through a PR titled `contract: …`.

## Step 0 — Lead (once, ~5 min)

```bash
cd ~/coding/HCL
git add -A && git commit -m "P0: planning docs, contracts, prompts"
gh repo create loanlens-ai --private --source=. --push
gh repo edit --add-collaborator <github-user-B>   # or: GitHub → Settings → Collaborators
gh repo edit --add-collaborator <github-user-C>
```
If `gh repo edit --add-collaborator` is unavailable, use the GitHub website: Settings → Collaborators → Add people.

## Step 1 — Every laptop (~10 min)

Install once:

| Tool | Check | Install |
|---|---|---|
| Git | `git --version` | git-scm.com |
| Node 22 | `node -v` → v22.x | `nvm install 22` (Windows: nvm-windows) |
| Docker Desktop | `docker compose version` | docker.com, then start it |
| Antigravity | opens | antigravity.google |

No Java needed.

```bash
git clone git@github.com:<lead-user>/loanlens-ai.git
cd loanlens-ai
cp .env.example .env              # NVIDIA key in LL_AI_API_KEY, Gemini key in LL_EMBED_API_KEY
git checkout -b feat/s1-core      # B: feat/s2-ai   C: feat/s3-frontend
```

To use Gemini instead of NVIDIA, comment out the three NVIDIA lines in `.env` and uncomment the three Gemini lines.

## Step 2 — Start your Antigravity session

1. Open the `loanlens-ai` folder in Antigravity.
2. Open your file in `prompts/`, copy all of it, and paste it as the first message.
3. Let it finish **Phase 1 only**, then check the acceptance commands at the end of Phase 1 yourself.

Start order: A starts first, because B and C both depend on the backend skeleton. B and C start at the same time as A anyway. B uses stubs and C uses mocks until A's Phase 1 merges.

## Step 3 — The loop (every phase)

```bash
# while working, every 30–60 min
git add -A && git commit -m "M1-3: EMI calculator with amortization"
git pull --rebase origin main
git push -u origin HEAD

# phase done and acceptance commands pass
gh pr create --base main --fill
# a teammate runs it, then:
gh pr merge --squash --delete-branch=false

# everyone else, right after a merge
git fetch origin && git rebase origin/main
```

Merge order per phase: S1 first, then S2, then S3.

## Step 4 — Integration (after Phase 2 of all three)

```bash
git checkout main && git pull
docker compose up -d
cd backend && npm i && npx prisma migrate dev && npm run seed && npm run ingest && npm run dev
cd frontend && npm i && VITE_USE_MOCKS=false npm run dev
```
Run the two brief scenarios from `Demo_Runbook.md`. Finishing touches happen on `main` in small commits. Pull before every commit.

## Sync rituals

- **Every 2 h:** a 10-minute stand-up. Each person says what merged, what is blocked, and which contract change is needed.
- **Update `Memory.md`** at every merge. The person who merged writes two lines.
- **Tick `REQUIREMENTS.md`** with the file path that proves it, only after running it.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `ECONNREFUSED 5432` | `docker compose up -d`, wait for healthy |
| Port 8080 or 5173 busy | change `LL_SERVER_PORT` / run `npm run dev -- --port 5174` |
| LLM 401 / 429 / timeouts | swap `.env` to the Gemini lines and restart backend |
| `vector type does not exist` | first migration must run `CREATE EXTENSION IF NOT EXISTS vector` |
| Ingest fails with 429 | Gemini free-tier rate limit: wait a minute and rerun `npm run ingest` (it skips docs already ingested) |
| Rebase conflict in a file you don't own | stop, take theirs (`git checkout --theirs <file>`), tell the owner |

## For judges right now

Read `Preliminary_Design.md` together. Each person owns the sections listed in its "Who explains what" table. Hard questions are in `Judge_QA_Playbook.md`.
