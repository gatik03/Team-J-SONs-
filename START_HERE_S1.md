# START HERE — you are **S1**: Backend core (Express API, Prisma, auth, products, EMI, applications, uploads)

## Read in this order (≈30 min)
1. `Preliminary_Design.md` — what we are building and why (explain-to-judges version)
2. `Getting_Started.md` — set up your laptop, branch, git loop
3. `docs/USECASE.md` — the hackathon brief (source of truth)
4. `Team_Work_Split.md` — what you own and must not touch
5. `prompts/S1_backend_core.md` — your full build spec; paste ALL of it into Antigravity (Gemini) as the first message

## Setup
```bash
# If the GitHub repo exists, clone it instead of using this zip:
#   git clone git@github.com:<lead>/loanlens-ai.git && cd loanlens-ai
# Otherwise, from this unzipped folder:
cd loanlens-ai
cp .env.example .env        # NVIDIA key in LL_AI_API_KEY + Gemini key in LL_EMBED_API_KEY (both free)
git checkout -b feat/s1-core         # only if this is a git clone
```
Needs: Git, Node 22, Docker Desktop, Antigravity. No Java.

## Rules that matter most
- Edit only your own folders (Team_Work_Split.md). Shared files change via a `contract:` PR.
- JSON field names must match `openapi.yaml` exactly.
- Commit as `<REQ-ID>: summary`; push your branch; PR to main when a phase passes.
