# Submission preparation verification · 23 October 2026

## Checks performed in this pass

- Backend: **105 tests across 21 files passed**; database suites ran against local PostgreSQL. AI provider calls are mocked in automated tests.
- Frontend: **14 tests across 5 files passed**; production Vite/TypeScript build passed.
- Backend TypeScript build passed; Prisma reported that `backend/prisma/schema.prisma` is valid.
- Documentation reorganized without changing runtime source paths. Current submission docs map every requested deliverable to implementation/evidence.
- Architecture SVG rendered to a standalone PNG and visually inspected. README embeds catalogue, advisor, policy-admin, analyst and mobile screenshots from existing browser evidence.
- Source and supporting-doc ZIPs are built by `scripts/package_submission.py`. It excludes private environment files, keys, dependencies, build output, uploads, logs and Git history, scans for common credential patterns and checks ZIP integrity. SHA-256 checksums accompany the files.
- Both ZIP integrity checks passed. Extracted source documentation links/assets passed; private-file/dependency exclusions passed. A separate comparison confirmed neither ZIP contains either actual API key from the local `.env`.

## Earlier runtime evidence retained

`docs/evidence/` contains actual local browser/runtime records for six logins; catalogue, filtering, compare and EMI; application draft/upload/submission; officer pre-screen and audit; human analyst decision; live advisor and policy questions; policy draft/test/publish/retire; 57 responsive route checks; and production same-origin API/deep-link smoke checks.

The latest advisor follow-up measured 5.0 and 11.6 seconds for two live requests with bounded optional explanations. The cancel follow-up confirmed no upload request after abandoning a selected file. A regression test verifies publication-first library order. These checks do not establish a latency guarantee or comprehensive accessibility/security audit.

## Scope limits

This pass did not reinstall on another device, recreate Docker from scratch, deploy externally or record a new live-demo video. Local DB date randomization is not included in the source package. The team must deliver the live presentation using `docs/DEMO.md`; recorded evidence is labeled as recorded.
