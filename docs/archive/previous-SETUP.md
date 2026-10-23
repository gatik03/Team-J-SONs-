> Historical development reference. Current submission guide: [SUBMISSION.md](../SUBMISSION.md). Statements about planned or pending work reflect an earlier stage.

# Setup & Developer Runbook (LoanLens AI)

## Prerequisites
- **Git**
- **Docker Desktop** (or Docker engine + docker compose)
- **Node 22** (`nvm install 22` or official installer)
- **Gemini API key** from [Google AI Studio](https://aistudio.google.com) (required for embeddings)
- Optionally an **NVIDIA NIM key** from [build.nvidia.com](https://build.nvidia.com) for chat (or use Gemini for both chat and embeddings)

---

## Setup & Running the Stack

```bash
git clone <repo> && cd loanlens-ai
cp .env.example .env            # set LL_AI_API_KEY (+ base URL/model lines for Gemini) and LL_EMBED_API_KEY (Gemini)
docker compose up -d --wait
cd backend && npm install
npm run db:migrate              # applies init + S2 migrations
npm run seed                    # 8 products, 3 customers, 6 users, 2 applications (re-run any time to reset demo)
npm run ingest                  # S2: embeds db/knowledge/* via Gemini API (needs internet + LL_EMBED_API_KEY)
npm run dev                     # http://localhost:8080
cd ../frontend && npm install && npm run dev   # http://localhost:5173
```

---

## Demo Users

Every demo user's password is `password` (simulated authentication).

| Username | Role | Customer ID | Display Name | Permissions / Access |
|---|---|---|---|---|
| `priya.sharma` | `CUSTOMER` | `CUST-1001` | Priya Sharma | View products, calculate EMI, manage own applications & uploads (LA-2026-00418, LA-2026-00420) |
| `rahul.verma` | `CUSTOMER` | `CUST-1002` | Rahul Verma | View products, calculate EMI, manage own applications |
| `ananya.iyer` | `CUSTOMER` | `CUST-1003` | Ananya Iyer | View products, calculate EMI, manage own applications |
| `officer.kumar` | `LOAN_OFFICER` | `null` | Arjun Kumar | View all applications, trigger workflow review, view audit trail |
| `analyst.mehta` | `CREDIT_ANALYST` | `null` | Neha Mehta | View all applications, trigger workflow review, **make credit decisions (approve/reject)** |
| `admin.rao` | `POLICY_ADMIN` | `null` | Admin Rao | Policy library management (draft, test, publish, retire policies); no access to loan applications |

---

## Getting a Bearer Token (One-liner)

```bash
T=$(curl -s -X POST localhost:8080/api/auth/login -H 'content-type: application/json' -d '{"username":"priya.sharma","password":"password"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
echo $T
```

---

## Resetting State

- **Reset demo data & applications**:
  ```bash
  cd backend && npm run seed
  ```
- **Full database wipe & re-migration**:
  ```bash
  docker compose down -v
  docker compose up -d --wait
  cd backend && npm run db:migrate && npm run seed
  ```

---

## Troubleshooting

- **Port 5432 busy**: Stop any locally running PostgreSQL service (`net stop postgresql-x64-18` on Windows, or `sudo systemctl stop postgresql` on Linux) so Docker can bind port 5432.
- **Prisma Error `P1001` (Can't reach database server)**: Make sure the database container is running and healthy: `docker compose ps`.
- **`Invalid environment` on startup**: Ensure `.env` exists in the repository root and has all required variables (`DATABASE_URL`, `LL_EMBED_API_KEY`).
