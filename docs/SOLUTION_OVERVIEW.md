# Solution overview

LoanLens AI joins three lending capabilities in one synthetic Kestrel Bank application:

1. **Discovery and applications:** customers filter/compare eight products, calculate EMI/amortization, save drafts, upload evidence and track next steps. AI extracts requirements; code selects products and computes financial figures.
2. **Grounded policy assistance:** PDF/Markdown/CSV/JSON policies are chunked, masked and embedded. PostgreSQL/pgvector retrieves published, effective versions visible to the caller. Answers cite document, section, version and effective date, or safely decline unsupported questions.
3. **Auditable pre-screening:** a fixed orchestrator runs document, credit, compliance and communication steps using synthetic banking tools. Tool permissions and each step are logged. A human credit analyst makes the final decision.

Policy admins upload immutable drafts, preview sections, test questions, publish/schedule and retire versions. Customers cannot access these controls or internal risk/audit details.

## Design decisions

- One Express API and one PostgreSQL database avoid distributed-service overhead while separating core, AI, permissions and audit modules.
- The LLM extracts intent and explains; deterministic functions calculate EMI, ratios and recommendation outcomes. Optional wording has a template fallback.
- Final decisions require analyst role and transactional status checks, including concurrent-decision protection.
- Policy serving uses publication status and the Asia/Kolkata calendar, without a manually maintained “latest” flag.
- The brief permits an alternate framework. Node/TypeScript shares contracts across UI/backend; PostgreSQL/pgvector provides relational and vector capabilities.

See [architecture](ARCHITECTURE.md), [schema](SCHEMA.md), [demo](DEMO.md) and [guardrails](GUARDRAILS.md).
