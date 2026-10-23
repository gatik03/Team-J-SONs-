# Setup (owner: S1 — expand once the backend skeleton exists)

## Prerequisites (every device)
- Git, Docker Desktop (or docker engine + compose)
- Node 22 (`nvm install 22`) — that is the whole toolchain; no Java needed
- A Gemini key (https://aistudio.google.com), always needed for embeddings
- Optionally an NVIDIA NIM key (https://build.nvidia.com) for chat; otherwise use Gemini for chat too

## Run
```bash
git clone <repo> && cd loanlens-ai
cp .env.example .env && $EDITOR .env        # set LL_AI_API_KEY (and base URL/model lines for Gemini)
docker compose up -d                        # TODO(S1): Postgres 16 + pgvector
cd backend && npm i
npx prisma migrate dev                      # creates tables (TODO S1)
npm run seed                                # products, users, sample applications (TODO S1)
npm run ingest                              # embeds db/knowledge/* into pgvector (TODO S2)
npm run dev                                 # http://localhost:8080  (tsx watch)
cd ../frontend && npm i && npm run dev      # http://localhost:5173  (TODO S3)
```
`npm run ingest` calls Gemini's embedding API, so it needs internet and `LL_EMBED_API_KEY` in `.env`.
