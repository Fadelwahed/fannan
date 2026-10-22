# ecc-tools checks that this repo skips

GitHub PR #26 (commit `508ad11`) was flagged by the ecc-tools GitHub app. This note is the reference-set answer for the areas that do not apply to Fannan. It is a workbench document. It does not change `release/` or `trust/`.

## Skipped

**RAG.** The repo has no retrieval or embeddings pipeline. A search of `release/` finds no embeddings client, vector store or retrieval stage. The word "vector" in `release/tools/integrity.mjs` is the checker's measurement record, not a search index. "Retrieve" in the input pack is Stitch MCP metadata (`input/fannan-review-pack/skills/manage-design-system/SKILL.md`), not a Fannan RAG index.

**Discussion triage.** GitHub Discussions are not used. A search of the markdown in this worktree found no Discussions setup. Review notes are files under `reviews/`, including `reviews/panel-rNN/MERGED.md` and `reviews/MIMAR-R<n>-changes-<sha>.md`.

**Harness compatibility.** Fannan is a skill bundle for one bot host. The skills are `release/skills/<name>/SKILL.md`. It is not an agent-harness plugin, and there is no harness plugin manifest to score.

## Not a code change

**SBOM and SARIF.** No SBOM or SARIF file is in this worktree. That security evidence is owned by Amin, in a separate pull request.

**Check publication denied.** The message `Check publication denied: app owner must enable Checks: read and write` is an ecc-tools GitHub App permission. It is not in the repo files. Only the repo owner (Fadel) can grant Checks: read and write in the GitHub App settings. It is not fixable in code.
