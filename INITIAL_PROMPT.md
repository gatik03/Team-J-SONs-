# Initial prompts — index

Each teammate pastes **their whole file** from `prompts/` as the first message in Antigravity (Gemini):

| Stream | File |
|---|---|
| S1 backend-core | `prompts/S1_backend_core.md` |
| S2 backend-AI | `prompts/S2_backend_ai.md` |
| S3 frontend | `prompts/S3_frontend.md` |

Every prompt is self-contained. Each one names the files Gemini must read first, the folders it owns, every build step with an acceptance command, and a pre-PR checklist.

Setup, branching and the merge loop are in `Getting_Started.md`.

## Re-anchoring prompt (paste when Gemini drifts or after a long break)

```
Stop. Re-read CLAUDE.md §2, Integration_Contracts.md, openapi.yaml and your prompts/<stream>.md.
List which step you are on, which files you changed that you do not own (revert those),
and any JSON field that differs from openapi.yaml (fix those). Then continue from that step.
Do not claim anything works until you have run its acceptance command and shown me the output.
```
