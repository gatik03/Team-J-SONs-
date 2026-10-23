> Historical development reference. Current submission guide: [SUBMISSION.md](../SUBMISSION.md). Statements about planned or pending work reflect an earlier stage.

# S2 test prompts and observed outputs (D-8)

Verified on 2026-10-23 against local PostgreSQL + pgvector, real Gemini embeddings and real chat completions. No AI mocks were used for the live outputs below. Automated tests separately replace external AI calls.

Chat model: `gemini-3.1-flash-lite`, via `https://generativelanguage.googleapis.com/v1beta/openai`. Embeddings: `gemini-embedding-001`, 768 dimensions, normalized in code. Keys remain only in the ignored root `.env`.

S1 core services, login and seed are absent on this branch. Live policy governance and workflow requests exercised the real Express app through Supertest HTTP with JWTs minted by the existing `signToken` helper. Application/product/customer data use the prescribed `coreBridge` stub. These runs prove S2, not merged S1/frontend integration. The advisor and five baseline policy questions were also called directly through their service exports with real providers. API paths/bodies below reproduce the same requests once the server and S1 login are available.

## Working commands

Run from `backend/`:

```bash
rtk proxy npx tsx src/ai/rag/ingestCli.ts
rtk npm run prisma -- migrate status
rtk npm test
rtk npm run build
```

Final verification after all code changes: `npm test` → **16 test files passed, 90 tests passed**, `npm run build` → **tsc --noEmit, exit 0**, `git diff --check` → no whitespace errors. Structural checks found no autonomous final-status transition, decision import, coreBridge bypass, forbidden-file edit, or non-CLI console logging. The logger regression emitted `account: "XXXXXXXXXX6789"` and `pan: "XXXXX1234X"` without throwing.

Observed: both migrations applied (`Database schema is up to date!`). Initial ingestion loaded all 12 manifest versions; the repeat run printed 12 `skipped ... (exists)` lines with no duplicate rows. Seeded vehicle 2025.1 was SUPERSEDED and 2026.3 ACTIVE. Chunk counts: CREDIT-POLICY 6, EDUCATION-TNC 6, GENERAL-TNC 5, GRIEVANCE 5, RATE-FEE-SCHEDULE 7, KYC-CHECKLIST 7, OFFICER-PLAYBOOK 5, PERSONAL-TNC 7, PREPAYMENT-POLICY 6, REG-CIRCULAR (real PDF) 7, both VEHICLE-TNC versions 7 each. `GET /api/knowledge/documents` returned 11 versions in force.

The repeatable HTTP acceptance suite is `backend/src/ai/testing/httpAcceptance.test.ts`; it uses isolated TEST-* policies, real JWT middleware, parsers, SQL, agents and persisted audits, with external AI mocked. Parser coverage for all four real file formats is in `rag/ingest.test.ts`. Live scripts were throwaway files under `/tmp`, not committed.

## Advisor

Role: CUSTOMER (`priya.sharma`). Endpoint: `POST /api/advisor/chat`, body `{message, conversationId?}`.

A1 request: `I need ₹5 lakh for a used car. I earn ₹60,000 per month and want an EMI below ₹12,000.`

Observed service output (same numeric response also verified through HTTP with an AI test double):
```json
{
  "interpretedRequirement": "Used car loan of 5 lakh with EMI below 12,000.",
  "loanAmount": 500000,
  "monthlyIncome": 60000,
  "maxPreferredEmi": 12000,
  "currency": "INR",
  "recommendations": [
    {
      "productId": "VL-204",
      "productName": "Kestrel Pre-Owned Car Loan",
      "indicativeInterestRate": 11,
      "tenureMonths": 60,
      "estimatedEmi": 10871,
      "reason": "A 60 months tenure keeps your estimated monthly payment at 10871, which fits within your 12000 budget.",
      "eligibilityIndicator": "LIKELY_ELIGIBLE"
    }
  ],
  "disclaimer": "Indicative only. Final approval is subject to credit assessment.",
  "clarifyingQuestion": null,
  "conversationId": "CONV-9b799d3f"
}
```

A2 request: `I want a loan`. Observed:

```json
{
  "interpretedRequirement": "The customer is requesting a loan.",
  "loanAmount": null,
  "monthlyIncome": null,
  "maxPreferredEmi": null,
  "currency": "INR",
  "recommendations": [],
  "disclaimer": "Indicative only. Final approval is subject to credit assessment.",
  "clarifyingQuestion": "Could you please tell me the purpose of the loan and the amount you are looking to borrow?",
  "conversationId": "CONV-d3a72467"
}
```

Follow-up conversation memory and isolation between two authenticated users are verified in `advisor/advisorService.test.ts`. A live follow-up conversation was not run.

## Policy assistant

Endpoint: `POST /api/policy/ask`, body `{ "question": "<exact question below>" }`. Q1–Q7 use CUSTOMER; Q8 uses LOAN_OFFICER (INTERNAL audience). Answers below were rerun after the numerical grounding guard and threshold calibration.

### Q1 — CUSTOMER

What documents do I need for a home loan if I am self-employed?

```json
{
  "answer": "Self-employed applicants must provide Income Tax Returns for the last 2 years, audited profit and loss account and balance sheet for the last 2 years, and GST returns for the last 12 months. You also need proof of business existence for at least 3 years, business and personal bank statements for the last 12 months, KYC documents for yourself and the business, and all relevant property documents.",
  "confidence": "HIGH",
  "sources": [
    {
      "document": "KYC and Document Checklist",
      "section": "Home Loan — Self-Employed Applicants",
      "version": "2026.1",
      "effectiveDate": "2026-01-01"
    }
  ],
  "followUpRequired": false
}
```

### Q2 — CUSTOMER

What is the processing fee for a personal loan of ₹3 lakh?

```json
{
  "answer": "For a personal loan of ₹3,00,000, the processing fee is ₹4,500 plus 18% GST.",
  "confidence": "HIGH",
  "sources": [
    {
      "document": "Personal Loan Terms and Conditions",
      "section": "Processing Fee",
      "version": "2026.1",
      "effectiveDate": "2026-01-01"
    },
    {
      "document": "Personal Loan Terms and Conditions",
      "section": "Processing Fee Illustrations",
      "version": "2026.1",
      "effectiveDate": "2026-01-01"
    }
  ],
  "followUpRequired": false
}
```

### Q3 — CUSTOMER

Can I foreclose my vehicle loan after six months, and are there any charges?

```json
{
  "answer": "You can foreclose your vehicle loan after 6 EMIs have been paid. The foreclosure charge is 2% of the outstanding principal.",
  "confidence": "HIGH",
  "sources": [
    {
      "document": "Vehicle Loan Terms and Conditions",
      "section": "Foreclosure and Part-Prepayment",
      "version": "2026.3",
      "effectiveDate": "2026-07-01"
    },
    {
      "document": "Interest Rate and Fee Schedule",
      "section": "Vehicle Loans",
      "version": "2026.2",
      "effectiveDate": "2026-04-01"
    }
  ],
  "followUpRequired": false
}
```

### Q4 — CUSTOMER

What is the minimum credit score required for a home loan?

```json
{
  "answer": "The minimum credit score required for a home loan is 700 for salaried applicants and 720 for self-employed applicants.",
  "confidence": "HIGH",
  "sources": [
    {
      "document": "Credit Policy and Eligibility Criteria",
      "section": "Credit Score Requirements",
      "version": "2026.2",
      "effectiveDate": "2026-04-01"
    }
  ],
  "followUpRequired": false
}
```

### Q5 — CUSTOMER

How long does disbursal take after approval?

```json
{
  "answer": "Personal and vehicle loans are disbursed within 2–3 working days, home loans within 7–10 working days, and education loans within 5–7 working days after approval.",
  "confidence": "HIGH",
  "sources": [
    {
      "document": "General Loan Terms and Conditions",
      "section": "Disbursal Timelines",
      "version": "2026.1",
      "effectiveDate": "2026-01-01"
    }
  ],
  "followUpRequired": false
}
```

### Q6 — CUSTOMER

What is the capital of France?

```json
{
  "answer": "I couldn't find this in Kestrel Bank's approved documents. Please contact your loan officer or the call centre.",
  "confidence": "LOW",
  "sources": [],
  "followUpRequired": true
}
```

### Q7 — CUSTOMER

What processing fee waiver can loan officers offer to salaried customers with high credit scores?

```json
{
  "answer": "I couldn't find this in Kestrel Bank's approved documents. Please contact your loan officer or the call centre.",
  "confidence": "LOW",
  "sources": [],
  "followUpRequired": true
}
```

### Q8 — LOAN_OFFICER

What processing fee waiver can loan officers offer to salaried customers with high credit scores?

```json
{
  "answer": "Loan officers may waive up to 50% of the processing fee for salaried customers with a credit score of 780 or above. Any waiver exceeding 50% requires approval from the branch manager.",
  "confidence": "HIGH",
  "sources": [
    {
      "document": "Loan Officer Playbook",
      "section": "Processing Fee Waivers",
      "version": "2026.1",
      "effectiveDate": "2026-01-01"
    }
  ],
  "followUpRequired": false
}
```

## Policy governance — admin.rao

Live requests used `/api/admin/policies`, with metadata `documentKey=VEHICLE-TNC`, `title=Vehicle Loan Terms and Conditions`, `loanType=VEHICLE`, `documentType=TERMS_AND_CONDITIONS`, `audience=CUSTOMER`, `customerSegment=ALL`, `changeNote=Foreclosure lock-in reduced to 3 EMIs`. File: `db/knowledge/demo/vehicle-tnc-v2026.4.md`.

The initial library showed activeVersion 2026.3, no scheduled version, no drafts, totalVersions 2. The first upload returned 201 / DRAFT / DRAFT with documentId `28c7d433-52d0-4871-a6e3-bbe1a5d57ba8`. A slow-provider attempt was interrupted before publishing; the continued run reused this draft without overwriting it.

Observed excerpts, in request order:

**upload 2026.4** — HTTP 409

```json
{
  "status": 409,
  "code": "INVALID_STATE",
  "message": "Version 2026.4 of VEHICLE-TNC already exists; upload a new version number",
  "details": [],
  "timestamp": "2026-10-23T09:23:20.443Z",
  "path": "/api/admin/policies"
}
```

**draft not served** — HTTP 200

```json
{
  "answer": "You can foreclose your vehicle loan after 6 EMIs have been paid. The foreclosure charge is 2% of the outstanding principal.",
  "confidence": "HIGH",
  "sources": [
    {
      "document": "Vehicle Loan Terms and Conditions",
      "section": "Foreclosure and Part-Prepayment",
      "version": "2026.3",
      "effectiveDate": "2026-07-01"
    },
    {
      "document": "Interest Rate and Fee Schedule",
      "section": "Vehicle Loans",
      "version": "2026.2",
      "effectiveDate": "2026-04-01"
    }
  ],
  "followUpRequired": false
}
```

**preview draft** — HTTP 200

```json
{
  "sections": [
    "Vehicle Loan Terms and Conditions",
    "Eligibility",
    "Interest Rate and Tenure",
    "Processing Fee",
    "Foreclosure and Part-Prepayment",
    "Hypothecation and Insurance",
    "Late Payment"
  ]
}
```

**test ask draft** — HTTP 200

```json
{
  "answer": "Yes, you can foreclose your vehicle loan after six months as it is allowed after 3 EMIs have been paid. The foreclosure charge is 1% of the outstanding principal.",
  "confidence": "HIGH",
  "sources": [
    {
      "document": "Vehicle Loan Terms and Conditions",
      "section": "Foreclosure and Part-Prepayment",
      "version": "2026.4",
      "effectiveDate": "2026-10-23"
    }
  ],
  "followUpRequired": false
}
```

**publish active** — HTTP 200

```json
{
  "documentId": "28c7d433-52d0-4871-a6e3-bbe1a5d57ba8",
  "version": "2026.4",
  "effectiveDate": "2026-10-23",
  "status": "PUBLISHED",
  "servingState": "ACTIVE",
  "publishedBy": "admin.rao",
  "retiredReason": null
}
```

**new active answer** — HTTP 200

```json
{
  "answer": "You can foreclose your vehicle loan after 3 EMIs have been paid. The foreclosure charge is 1% of the outstanding principal.",
  "confidence": "HIGH",
  "sources": [
    {
      "document": "Vehicle Loan Terms and Conditions",
      "section": "Foreclosure and Part-Prepayment",
      "version": "2026.4",
      "effectiveDate": "2026-10-23"
    }
  ],
  "followUpRequired": false
}
```

**version history** — HTTP 200

```json
[
  {
    "version": "2026.4",
    "status": "PUBLISHED",
    "servingState": "ACTIVE"
  },
  {
    "version": "2026.3",
    "status": "PUBLISHED",
    "servingState": "SUPERSEDED"
  },
  {
    "version": "2025.1",
    "status": "PUBLISHED",
    "servingState": "SUPERSEDED"
  }
]
```

**retire missing reason** — HTTP 400

```json
{
  "status": 400,
  "code": "VALIDATION_FAILED",
  "message": "Request validation failed",
  "details": [
    {
      "field": "reason",
      "issue": "String must contain at least 5 character(s)"
    }
  ],
  "timestamp": "2026-10-23T09:23:54.833Z",
  "path": "/api/admin/policies/versions/28c7d433-52d0-4871-a6e3-bbe1a5d57ba8/retire"
}
```

**retire active** — HTTP 200

```json
{
  "documentId": "28c7d433-52d0-4871-a6e3-bbe1a5d57ba8",
  "version": "2026.4",
  "effectiveDate": "2026-10-23",
  "status": "RETIRED",
  "servingState": "RETIRED",
  "publishedBy": "admin.rao",
  "retiredReason": "Published before legal sign-off"
}
```

**rollback answer** — HTTP 200

```json
{
  "answer": "You can foreclose your vehicle loan after 6 EMIs have been paid. The foreclosure charge is 2% of the outstanding principal.",
  "confidence": "HIGH",
  "sources": [
    {
      "document": "Vehicle Loan Terms and Conditions",
      "section": "Foreclosure and Part-Prepayment",
      "version": "2026.3",
      "effectiveDate": "2026-07-01"
    },
    {
      "document": "Interest Rate and Fee Schedule",
      "section": "Vehicle Loans",
      "version": "2026.2",
      "effectiveDate": "2026-04-01"
    }
  ],
  "followUpRequired": false
}
```

**upload 2026.5** — HTTP 201

```json
{
  "documentId": "a87c1701-a4f4-43b1-9f9c-8850802e830f",
  "version": "2026.5",
  "effectiveDate": "2026-11-22",
  "status": "DRAFT",
  "servingState": "DRAFT",
  "publishedBy": null,
  "retiredReason": null
}
```

**publish scheduled** — HTTP 200

```json
{
  "documentId": "a87c1701-a4f4-43b1-9f9c-8850802e830f",
  "version": "2026.5",
  "effectiveDate": "2026-11-22",
  "status": "PUBLISHED",
  "servingState": "SCHEDULED",
  "publishedBy": "admin.rao",
  "retiredReason": null
}
```

**scheduled not served** — HTTP 200

```json
{
  "answer": "You can foreclose your vehicle loan after 6 EMIs have been paid. The foreclosure charge is 2% of the outstanding principal.",
  "confidence": "HIGH",
  "sources": [
    {
      "document": "Vehicle Loan Terms and Conditions",
      "section": "Foreclosure and Part-Prepayment",
      "version": "2026.3",
      "effectiveDate": "2026-07-01"
    },
    {
      "document": "Interest Rate and Fee Schedule",
      "section": "Vehicle Loans",
      "version": "2026.2",
      "effectiveDate": "2026-04-01"
    }
  ],
  "followUpRequired": false
}
```

**officer denied** — HTTP 403

```json
{
  "status": 403,
  "code": "FORBIDDEN",
  "message": "Role LOAN_OFFICER is not allowed to perform this action",
  "details": [],
  "timestamp": "2026-10-23T09:24:01.392Z",
  "path": "/api/admin/policies"
}
```

**knowledge upload absent** — HTTP 404

```json
{
  "status": 404,
  "code": "NOT_FOUND",
  "message": "Route POST /api/knowledge/documents not found",
  "details": [],
  "timestamp": "2026-10-23T09:24:01.394Z",
  "path": "/api/knowledge/documents"
}
```

Policy history: `GET /api/audit/AUD-POL-78205` as POLICY_ADMIN, HTTP 200:

```json
[
  {
    "sequence": 1,
    "agent": "admin.rao",
    "eventType": "POLICY_DRAFTED",
    "input": {
      "version": "2026.4",
      "changeNote": "Foreclosure lock-in reduced to 3 EMIs",
      "documentKey": "VEHICLE-TNC"
    },
    "output": {
      "status": "DRAFT"
    }
  },
  {
    "sequence": 2,
    "agent": "admin.rao",
    "eventType": "POLICY_PUBLISHED",
    "input": {
      "version": "2026.4",
      "changeNote": "Foreclosure lock-in reduced to 3 EMIs",
      "documentKey": "VEHICLE-TNC"
    },
    "output": {
      "status": "PUBLISHED"
    }
  },
  {
    "sequence": 3,
    "agent": "admin.rao",
    "eventType": "POLICY_RETIRED",
    "input": {
      "reason": "Published before legal sign-off",
      "version": "2026.4",
      "documentKey": "VEHICLE-TNC"
    },
    "output": {
      "status": "RETIRED"
    }
  },
  {
    "sequence": 4,
    "agent": "admin.rao",
    "eventType": "POLICY_DRAFTED",
    "input": {
      "version": "2026.5",
      "changeNote": "Foreclosure lock-in reduced to 3 EMIs",
      "documentKey": "VEHICLE-TNC"
    },
    "output": {
      "status": "DRAFT"
    }
  },
  {
    "sequence": 5,
    "agent": "admin.rao",
    "eventType": "POLICY_PUBLISHED",
    "input": {
      "version": "2026.5",
      "changeNote": "Foreclosure lock-in reduced to 3 EMIs",
      "documentKey": "VEHICLE-TNC"
    },
    "output": {
      "status": "PUBLISHED"
    }
  }
]
```

Preview/test-ask use `GET /api/admin/policies/versions/:id/preview` and `POST .../:id/test-ask` with `{question}`; publishing is `POST .../:id/publish`; retiring is `POST .../:id/retire` with `{reason}`. Version history is `GET /api/admin/policies/VEHICLE-TNC/versions`. Every non-admin role is tested for 403 on every admin route in `testing/httpAcceptance.test.ts`. Scheduled activation at its date is pinned and tested in `rag/retriever.test.ts` and `rag/policyAdminService.test.ts`.

## Workflow — officer.kumar

`POST /api/workflow/applications/LA-2026-00418/run`, empty body. Observed HTTP 200 with real RAG and chat, stub core data:

```json
{
  "applicationId": "LA-2026-00418",
  "recommendation": "REQUEST_ADDITIONAL_DOCUMENTS",
  "riskBand": "MEDIUM",
  "checks": [
    {
      "agent": "DocumentVerificationAgent",
      "result": "INCOMPLETE",
      "detail": "Address proof is missing"
    },
    {
      "agent": "CreditAssessmentAgent",
      "result": "PASS",
      "detail": "Obligation ratio is 35% (limit 50%); credit score band is 720-760"
    },
    {
      "agent": "ComplianceAgent",
      "result": "PASS",
      "detail": "KYC status verified"
    }
  ],
  "missingDocuments": [
    "Address proof"
  ],
  "customerMessage": "Please upload your address proof to complete your application. You can submit this document through your account dashboard.",
  "requiresHumanApproval": true,
  "auditTrailId": "AUD-2026-46279"
}
```

**repeat workflow** — HTTP 409

```json
{
  "status": 409,
  "code": "INVALID_STATE",
  "message": "Workflow can only run on SUBMITTED or UNDER_VERIFICATION applications (current: UNDER_REVIEW)",
  "details": [],
  "timestamp": "2026-10-23T09:24:25.064Z",
  "path": "/api/workflow/applications/LA-2026-00418/run"
}
```

**customer workflow denied** — HTTP 403

```json
{
  "status": 403,
  "code": "FORBIDDEN",
  "message": "Role CUSTOMER is not allowed to perform this action",
  "details": [],
  "timestamp": "2026-10-23T09:24:25.067Z",
  "path": "/api/workflow/applications/LA-2026-00418/run"
}
```

**permission violation** — HTTP 200

```json
{
  "applicationId": "LA-2026-00418",
  "recommendation": "REQUEST_ADDITIONAL_DOCUMENTS",
  "riskBand": "MEDIUM",
  "checks": [
    {
      "agent": "DocumentVerificationAgent",
      "result": "INCOMPLETE",
      "detail": "Address proof is missing"
    },
    {
      "agent": "CreditAssessmentAgent",
      "result": "PASS",
      "detail": "Obligation ratio is 35% (limit 50%); credit score band is 720-760"
    },
    {
      "agent": "ComplianceAgent",
      "result": "PASS",
      "detail": "KYC status verified"
    },
    {
      "agent": "CustomerCommunicationAgent",
      "result": "EXCEPTION",
      "detail": "Refused: CustomerCommunicationAgent is not permitted to call get_credit_score"
    }
  ],
  "missingDocuments": [
    "Address proof"
  ],
  "customerMessage": "Please upload a copy of your address proof to complete your application. You can submit this document through your account dashboard.",
  "requiresHumanApproval": true,
  "auditTrailId": "AUD-2026-28816"
}
```

The refusal request was `POST /api/workflow/applications/LA-2026-00418/run?demoPermissionViolation=true` as LOAN_OFFICER after resetting the in-memory stub. The customer refusal used the normal run URL as CUSTOMER. `GET /api/workflow/applications/LA-2026-00418/recommendation` returned HTTP 200 and the exact saved normal recommendation.

## Audit

`GET /api/audit/AUD-2026-46279` as LOAN_OFFICER, HTTP 200:

```json
{
  "auditTrailId": "AUD-2026-46279",
  "eventCount": 27,
  "eventTypes": {
    "AGENT_START": 5,
    "TOOL_CALL": 7,
    "TOOL_RESULT": 7,
    "AGENT_END": 5,
    "LLM_CALL": 1,
    "LLM_RESULT": 1,
    "HUMAN_REQUIRED": 1
  },
  "maskedPanPresent": true,
  "rawPanPresent": false
}
```

`GET /api/audit/AUD-2026-28816` as LOAN_OFFICER, HTTP 200:

```json
{
  "auditTrailId": "AUD-2026-28816",
  "eventCount": 28,
  "eventTypes": {
    "AGENT_START": 5,
    "TOOL_CALL": 7,
    "TOOL_RESULT": 7,
    "AGENT_END": 5,
    "PERMISSION_DENIED": 1,
    "LLM_CALL": 1,
    "LLM_RESULT": 1,
    "HUMAN_REQUIRED": 1
  },
  "maskedPanPresent": true,
  "rawPanPresent": false
}
```

## Retrieval threshold

Measured with live Gemini embeddings and the original version in force. Top three cosine distances (smaller is closer):

| Prompt | Audience | Top 1 | Top 2 | Top 3 |
|---|---|---:|---:|---:|
| Q1 | CUSTOMER | 0.229851 | 0.307443 | 0.321037 |
| Q2 | CUSTOMER | 0.258954 | 0.267460 | 0.302420 |
| Q3 | CUSTOMER | 0.239563 | 0.271754 | 0.285366 |
| Q4 | CUSTOMER | 0.297129 | 0.373734 | 0.399924 |
| Q5 | CUSTOMER | 0.252220 | 0.293211 | 0.339779 |
| Q6 | CUSTOMER | 0.501850 | 0.510392 | 0.511961 |
| Q7 | CUSTOMER | 0.343104 | 0.350105 | 0.350446 |
| Q8 | INTERNAL | 0.163406 | 0.320199 | 0.343104 |

Final `MAX_DISTANCE = 0.32`: above the worst relevant top-1 distance 0.297129, below the customer playbook query 0.343104 and off-topic query 0.501850. This is calibrated only on these demo questions, not a general relevance evaluation. A policy answer repeating a numerical figure absent from its cited content is also refused by code.

## Provider failures and fallback observed

- The original embedding key returned HTTP 400 `API_KEY_INVALID`; the user replaced it locally and real ingestion succeeded.
- NVIDIA `meta/llama-3.1-70b-instruct` returned `Gone`; advisor returned the public 503 `AI_UNAVAILABLE` error after its one retry.
- Gemini 2.5 Flash returned 404 saying it was unavailable to new users; the suggested 3.8 Flash returned 503 high demand. Successful live completion probes identified `gemini-3.1-flash-lite`; local `.env` now uses it for all chat calls.
- AI SDK warns that provider-enforced JSON schemas are unavailable with this compatibility setting. Responses are still parsed/validated with Zod by the SDK, and schema/provider failures become 503. No warning is hidden.
- Provider calls now have a 20-second abort timeout per attempt; structured calls retry once. Communication/reason wording falls back to templates, while policy retrieval/extraction failures never answer from general knowledge.

## Historical S2 handoff (resolved by full-stack integration)

`contract: integrate S1 core services and auth`: S1 must supply its real `core/**/service.ts`, `core/emi/loanMath.ts`, login routes and seed. Then change only `ai/coreBridge.ts` to map real S1 shapes into the Ai* interfaces, move the stub to test-only storage per S2 step 3.0, and rerun the login-based full verification block on merged main. No S1 or frontend file was edited in this pass. There is no git remote on this checkout, so no remote PR or merge was possible.

Clean-machine Docker startup and frontend integration were not run. Existing Postgres on localhost:5433 was used; Docker's snap wrapper failed with an AppArmor confinement error when queried.

## Full-stack integration acceptance — 2026-10-23

S1 core/login/seed and S3 are now merged. Current evidence superseding the pre-merge handoff above: `docs/evidence/browser-qa.json` (real draft/reload/uploads/submit/workflow/customer status and role permissions), `live-ai-browser-qa.json` (actual advisor and policy admin lifecycle), `responsive-qa.json` (57 checks across six users at three widths), `production-smoke.json` (built app and API on localhost:8080). Final tests: backend103 /21files; frontend14 /5files. Both builds and both npm audits pass.
