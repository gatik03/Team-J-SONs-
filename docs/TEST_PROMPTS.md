# Demonstration test prompts

These prompts were used in recorded service/HTTP/browser checks. Wording can vary; facts come from the synthetic seed corpus. Sources/dates depend on the published versions in the recipient's database. [Evidence](evidence) contains browser records; historical raw outputs are retained in the separate supporting-docs ZIP.

## Advisor · customer `priya.sharma`

| ID | Exact prompt | Expected |
|---|---|---|
| A1 | I need ₹5 lakh for a used car. I earn ₹60,000 per month and want an EMI below ₹12,000. | VL-204, indicative 11%, 60 months, EMI ₹10,871, indicative eligibility/disclaimer. |
| A2 | I want a loan | Ask for missing amount/purpose; never invent them. |
| A3 | i need 10 lakhs for a used car, i earn 70k per month and want a emi of 25k | Extract ₹10,00,000, ₹70,000 income, ₹25,000 limit. Tested as `rahul.verma`; obligations affect eligibility. |

A3 reproduced timeouts before the latency fix; two local live follow-ups succeeded in 5.0 and 11.6 seconds using template explanations. These are spot timings, not a latency guarantee.

## Policy assistant

| ID | Role | Exact prompt | Expected behavior |
|---|---|---|---|
| Q1 | Customer | What documents do I need for a home loan if I am self-employed? | Cited KYC/income/business/property requirements. |
| Q2 | Customer | What is the processing fee for a personal loan of ₹3 lakh? | Seed illustration ₹4,500 plus GST, with sources. |
| Q3 | Customer | Can I foreclose my vehicle loan after six months, and are there any charges? | Baseline v2026.3: 6 EMIs, 2% outstanding principal. A newer published demo version may change this. |
| Q4 | Customer | What is the minimum credit score required for a home loan? | Salaried 700 versus self-employed 720, with citations. |
| Q5 | Customer | How long does disbursal take after approval? | Policy-backed timelines/conditions, no unsupported guarantee. |
| Q6 | Customer | What is the capital of France? | Safe unsupported response, no model general-knowledge answer. |
| Q7 | Customer | What processing fee waiver can loan officers offer to salaried customers with high credit scores? | No internal playbook disclosure; safe response without public support. |
| Q8 | Loan officer | What processing fee waiver can loan officers offer to salaried customers with high credit scores? | Internal audience can retrieve/cite the officer playbook. |

## Governance, workflow and validation

- Draft Test Ask: “Which documents are required for a used vehicle loan?” against the supplied sample. Preview/test without public serving, publish, verify latest-first, retire and inspect audit.
- Workflow: officer runs seeded `LA-2026-00418`; expect missing address proof, additional-document recommendation and `requiresHumanApproval: true`. Customer sees only safe next steps.
- Permission: officer/customer cannot submit a final decision. `permissionGuard.test.ts`, HTTP acceptance and `fullStack.test.ts` cover refusal/logging and concurrent human decisions.
- Validation: empty advisor message, invalid application values, unsupported upload or malformed policy date returns structured 400/field errors, never a raw stack trace.

The [demo script](DEMO.md) uses these IDs. Automated tests use AI doubles; recorded evidence identifies hosted-provider checks.
