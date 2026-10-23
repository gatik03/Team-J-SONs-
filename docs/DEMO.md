# Live demonstration · approximately 8 minutes

Start using [SETUP.md](SETUP.md). All demo passwords: `password`. Exact prompts: [TEST_PROMPTS.md](TEST_PROMPTS.md). Use synthetic files only.

| Time | Role/action | Show |
|---|---|---|
| 0:00–1:00 | `priya.sharma`: filter Vehicle, compare loans, calculate ₹5,00,000 at 11% for 60 months | EMI ₹10,871, amortization, deterministic math. |
| 1:00–2:00 | Advisor A1, then A2 | Calculated recommendation/disclaimer; clarification for missing facts. |
| 2:00–3:00 | Policy Q1 or Q4, then Q6 | Cited answer with version/date; safe refusal. |
| 3:00–4:00 | Save application, reload, upload identity/income, submit without address proof | Draft persistence, upload validation, status timeline. Seeded `LA-2026-00418` is an alternative missing-address example. |
| 4:00–5:15 | `officer.kumar`: run pre-screen | Missing-address check, persisted audit, human-required recommendation; no final decision control. |
| 5:15–6:15 | `analyst.mehta`: review and record a reasoned decision on a disposable demo application | Human decision and updated status; customer sees only next steps. |
| 6:15–7:30 | `admin.rao`: upload, preview, Test Ask, publish, inspect library, retire | Draft isolation, confirmation, latest publication first, rollback/audit. |
| 7:30–8:00 | Mobile resize/theme toggle; try another role's route | Responsive UI and role boundaries. |

## Sample admin upload

Use [DEMO-VEHICLE-CHECKLIST.md](samples/DEMO-VEHICLE-CHECKLIST.md).

| Field | Value |
|---|---|
| Key | `DEMO-VEHICLE-CHECKLIST` |
| Title | Demo Vehicle Loan Document Checklist |
| Version | `2026.4` or another unused version |
| Effective date | Today; use a future date to demonstrate scheduling |
| Loan/document type | Vehicle / KYC Checklist |
| Audience/segment | Customer / All |
| Change note | Synthetic checklist for admin testing |

Ask: “Which documents are required for a used vehicle loan?” Test before publishing, then retire the disposable test version. Cancel abandons an unsubmitted form; it cannot undo ingestion already processing.

## Provider outage backup

Show the safe error and retry after a pause. Screenshots and JSON in [evidence](evidence) are recorded checks, not live results; present them explicitly as a backup. Banking tools remain synthetic even when hosted AI calls are live.
