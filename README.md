# Fannan plan and package

Private continuation repository for the Fannan UI/UX design bot rewrite.

Start with [GROK-HANDOFF.md](GROK-HANDOFF.md), [CLOUD-HANDOFF.md](CLOUD-HANDOFF.md) and [ORIGINAL-ASSIGNMENT.md](ORIGINAL-ASSIGNMENT.md).

**Status: R3 local review candidate; live installation BLOCKED.** All 19 independent findings have evidence-backed dispositions in [release/REVIEW-RESPONSE.md](release/REVIEW-RESPONSE.md) and the final branch response under `reviews/CODEX-R3-response-*.md`. Fresh tests and explicit skips are recorded in [release/VERIFICATION.md](release/VERIFICATION.md); no dependency-backed full gate or live approval is claimed.

The seven original deliverables are in [FANNAN-REWRITE.md](FANNAN-REWRITE.md). The package is `artifacts/FANNAN-R3.zip`; `trust/MANIFEST.sha256` covers every release file and `trust/R3-CHANGES.sha256` covers all changed repository files except its own hash and the required final response commit. [Packaging instructions](release/PACKAGING.md) explain verification and those unavoidable self-reference exclusions. `revisions/r2/` and the original review/input remain unchanged.

No live install, system change, paid call, new dependency, credential access or external message is included. Amin's exact-digest review and Fadel's yes in Fannan's own chat remain mandatory.
