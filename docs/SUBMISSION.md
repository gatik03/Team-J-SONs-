# Submission checklist

Repository: [gatik03/Team-J-SONs-](https://github.com/gatik03/Team-J-SONs-). Start with [README](../README.md). This packet contains source, current documentation, diagrams, screenshots and a reproducible synthetic seed. It does not contain API keys or the author's database.

| Required deliverable | Included evidence |
|---|---|
| Working application and source | `backend/`, `frontend/`; automated tests/builds and recorded local browser evidence in [evidence](evidence). |
| Architecture diagram and solution overview | [Overview](SOLUTION_OVERVIEW.md), [architecture](ARCHITECTURE.md), [PNG](architecture.png), [SVG](architecture.svg). |
| Setup instructions | [SETUP.md](SETUP.md), root [.env.example](../.env.example), locked npm dependencies, Docker Compose, versioned migrations. |
| Live demonstration of key capabilities | [8-minute script](DEMO.md), six seeded accounts, [recorded screenshots/JSON](evidence). A live presentation still has to be delivered by the team. |
| Proper schema designs | [Schema/ER diagram](SCHEMA.md), [Prisma schema](../backend/prisma/schema.prisma), migration SQL and constraints. |
| Validation and error handling | Zod request boundaries; role/ownership guards; file size/type limits; shared structured error handler; HTTP acceptance tests cover 400/401/403/409. |
| Clean folder structure | Source separated into core/AI/common and UI/API/routes. Current judging docs in `docs/`; historical documents in `docs/archive/`. |
| Seed scripts and demo prompts | `backend/prisma/seed.ts`, `backend/src/ai/rag/ingest.ts`, `db/knowledge/manifest.json`, [TEST_PROMPTS.md](TEST_PROMPTS.md). |
| AI guardrails, limitations and responsible AI | [GUARDRAILS.md](GUARDRAILS.md): human approval, permissions, masking, deterministic math, grounding, failure behavior and limits. |

## Shareable files

Run `python3 scripts/package_submission.py` from the project root (Windows: `py scripts/package_submission.py`). Output is in ignored `artifacts/`:

- **LoanLens-AI-submission.zip** — runnable source, migrations, synthetic policies, `.env.example`, current docs, architecture and screenshot evidence.
- **LoanLens-AI-supporting-docs.zip** — the preserved planning, design, handoff and development prompts. This archive also includes current documentation so historical links have their context.
- **SHA256SUMS.txt** — checksums of both ZIPs.

The source archive's top-level folder is `LoanLens-AI/`. Extract it, open `README.md`, create `.env`, then follow setup. Keys, `.git`, dependencies, build output, local overrides, uploads, logs and earlier ZIPs are excluded. ZIP packaging does not include local database date randomization or individually uploaded test policies.

## Verification record

See [VERIFICATION.md](VERIFICATION.md) for this preparation pass. Earlier full-stack evidence covers all six logins, catalogue/EMI, upload/application lifecycle, advisor, grounded policy assistance, governance, a human decision, production deep-link loading and 57 route/viewport checks. Earlier screenshots may show earlier demo state.

Do not claim an independent-machine installation, external deployment, comprehensive accessibility/security audit or an already delivered judging session. The application is a synthetic hackathon demonstration with simulated authentication and banking tools.
