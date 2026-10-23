# AI guardrails, responsible-AI decisions and limitations

## Enforced boundaries

Paths below are relative to `backend/src/`.

| Decision | Enforcement/evidence |
|---|---|
| AI recommends; a human decides | Tools cannot approve/reject; final decisions require analyst role and transactional state checks. `ai/tools/permissionGuard.test.ts`, `ai/testing/fullStack.test.ts`. |
| Exclude protected attributes | Customer/application models omit gender, religion, caste and marital status; explicit AI customer projection. `ai/coreBridge.ts`, `ai/agents/orchestrator.test.ts`. Exclusion alone is not a full fairness evaluation. |
| Calculate in code | EMI, ratios, product matching and checks use deterministic services; extraction is schema-validated. `core/emi/loanMath.test.ts`, `ai/advisor/advisorService.test.ts`. |
| Ground policy answers | In-force/audience retrieval, code-built sources, numeric grounding and safe unsupported response. `ai/rag/retriever.test.ts`, `policyAssistant.test.ts`. |
| Mask identifiers | PAN, Aadhaar/account patterns masked in prompts, ingestion, logs and audits. `ai/masking/piiMasker.test.ts`, `logger.test.ts`. |
| Refuse/log forbidden tools | Guard checks tool permissions and writes ordered audit events. `ai/tools/permissionGuard.test.ts`. |
| Govern policy changes | Admin-only draft, preview/test, publish/schedule, retire/rollback and audit. `ai/rag/policyAdminService.test.ts`. |
| Fail safely | Essential AI errors return 503; optional advisor wording gets one 3-second attempt then a template. `ai/config/llm.test.ts`. |
| Separate customer/staff data | Customer receives a safe next-step projection; internal risk/audits remain staff-only. `ai/testing/fullStack.test.ts`, HTTP acceptance. |

The fixed orchestrator invokes tools from code. This is not autonomous lending or a bank-compliance certification.

## Known limitations

- Seeded accounts use a shared demo password. New customer registration uses salted scrypt password hashes, strict validation, unique usernames and pending KYC; it cannot assign staff roles. There is no email verification, password reset, login throttling or production identity service. Bureau, income and KYC tools remain synthetic.
- Hosted chat/embeddings need network, keys and quota. Timeouts/rate limits/outages can still fail essential requests. Structured calls have at most two application-owned attempts; latency is not guaranteed.
- Retrieval evaluation uses a small synthetic corpus/prompt set. Citations/numeric checks are not full semantic entailment or comprehensive prompt-injection, fairness or safety defenses.
- Regex masking can over-mask long numbers and miss unfamiliar formats. Use synthetic data only.
- Advisor memory is user-scoped, capped at 500 entries, lost on restart and not shared across instances.
- Uploads use local disk. Seed document rows are mock-verification metadata; no production OCR, malware scanning or document verification is claimed.
- One admin publishes without maker-checker approval. Service-level append-only audit is not tamper-proof storage; cross-module audit identifiers are plain strings.
- Effective dates use Asia/Kolkata. Local randomized seed dates and manually uploaded policies are database state and excluded from the source ZIP.
- No external deployment, comprehensive screen-reader audit or independent-device installation is claimed. Rehearse on the presentation device.

## Evidence and responsibility

[Recorded checks](evidence) include hosted-provider/browser flows; automated tests replace hosted AI for repeatability. Recommendations are visibly indicative and require human decisions. Show supported answers and refusals using [TEST_PROMPTS.md](TEST_PROMPTS.md). Historical notes are preserved in a separate archive.
