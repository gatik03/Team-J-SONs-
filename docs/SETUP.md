# Setup and testing

## Requirements

- Git, Node.js 22 with npm, Docker Desktop or Docker Engine + Compose v2.
- Available ports: 5432 (database), 8080 (backend), 5173 (frontend).
- Internet and a Gemini API key with access/quota for chat and embedding models. Docker supplies PostgreSQL; no cloud database account is needed.

## Configure the environment

Clone `https://github.com/gatik03/Team-J-SONs-.git`, or extract the source ZIP and open its `LoanLens-AI` folder. In VS Code or another editor, copy `.env.example` to `.env` in the top-level folder:

```text
LoanLens-AI/               # Team-J-SONs- when cloned
  .env                    # Private; excluded from ZIP
  .env.example
  docker-compose.yml
  backend/
  frontend/
```

Get a key from [Google AI Studio](https://aistudio.google.com/apikey). Put it in **both** `LL_AI_API_KEY` and `LL_EMBED_API_KEY`. The template uses `gemini-3.1-flash-lite` chat and `gemini-embedding-001`, with 768-dimensional embeddings. Keep `VITE_USE_MOCKS=false` and `VITE_API_BASE_URL=` empty.

Never put keys in `VITE_*` variables: those are visible to the browser. Both apps load the root `.env`; avoid competing environment files in `frontend/`. Restart servers after environment changes. The default database URL matches Docker Compose.

## Install, migrate and run

Project root, terminal 1:

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

`seed` loads 8 products, 3 customers, 6 users and 2 applications. Rerunning it resets the named seed applications; avoid doing that during a test you want to retain. `ingest` embeds 12 manifest versions across 11 policy keys, skipping versions already present. It requires the embedding key.

Project root, terminal 2:

```bash
cd frontend
npm ci
npm run dev
```

Open **http://localhost:5173**. [Demo logins](../README.md#demo-logins) all use password `password`.

## Built application

Run `npm run build` in `frontend/`, then `npm start` in `backend/`. Open **http://localhost:8080**. Express serves the built UI, API and nested-route reloads. These commands do not deploy externally.

## Automated checks

In `backend/`:

```bash
npm test
npm run build
npm run prisma -- validate
npm run prisma -- migrate status
```

In `frontend/`:

```bash
npm test
npm run build
```

Keep PostgreSQL available for integration tests. Test fixtures use isolated TEST-* records and replace external AI calls. Confirm database suites run rather than skip because `DATABASE_URL` is missing.

## Troubleshooting

| Symptom | Check |
|---|---|
| Port 5432 busy | Stop the other local database, or change Compose's host mapping to `5433:5432` and `.env` DATABASE_URL port to 5433 together. |
| Database unreachable | `docker compose ps` must show healthy; `.env` must match the host port. |
| Invalid environment | `.env` must be beside `docker-compose.yml`; fill both key fields. |
| AI 503/slow | Check network, quota/model access and backend logs. Retry after a pause. Essential failures are surfaced; optional advisor wording falls back after 3 seconds. |
| Mock data displayed | Set root `VITE_USE_MOCKS=false`, remove conflicting frontend-local overrides, restart Vite. |
| Prisma client missing | Run `npm ci`, then `npm run prisma -- generate` in `backend/`. |
| Login fails | Apply migrations and run seed, then use a README username with `password`. |

The ZIP excludes current database contents, local randomized demo dates, uploads and keys. Recipients recreate synthetic data through seed/ingestion.
