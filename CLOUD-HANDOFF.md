# Resume Fannan R3 — 17 October 2026

## User objective

“Please update our plan and package with the final Version, and we also need to enhance it more, improve it more, and verify everything.” Continue that work here so the user can follow up from a phone. This private repository contains the project files, not the full local chat history. The original assignment supplies the full acceptance criteria.

## Read first

1. ORIGINAL-ASSIGNMENT.md and CHECKPOINT.md.
2. release/FANNAN-PLAN.md and release/REVIEW-RESPONSE.md (R2).
3. FANNAN-OPEN-ITEMS.md (r7 third-party review; contains errors and conflicting status).
4. Current changed code and tests; compare revisions/r2/release.
5. input/fannan-review-pack/CODEX-START-HERE.md and round-5 findings for preserved requirements.

## Exact state at transfer

R2 was packaged and locally verified. Its manifest SHA256 is `204f79e40aec2966cbb666c559758e8b8b20938c278d70d2515c6c778c2d2b06` (57 files). R2 had 4 Node test passes, 3 Python passes and 1 Linux-only skip; token/browser fixture assertions passed but the full gate correctly FAILED because the original detector was absent. These are historical results, not R3 results.

R3 implementation was interrupted by account-credit errors. Some child edits landed. Do not assume they are correct. `tests/host-trust.test.mjs` imports `tools/executable-trust.mjs`, which has not been written; it failed with ERR_MODULE_NOT_FOUND. The combined Markdown and trust manifest have NOT been regenerated. No final R3 ZIP exists.

Current changed/added files compared with R2:

- `release/tests/host-trust.test.mjs`
- `release/tests/test_guard_tools.py`
- `release/tests/token-validation.test.mjs`
- `release/tools/designmd-to-sd.mjs`
- `release/tools/launcher-impeccable.sh`
- `release/tools/launcher-impeccable.sh.internal`
- `release/tools/readonly-precheck.sh`
- `release/tools/sd-build.mjs`
- `release/tools/token-references.mjs`
- `release/tools/verify-manifest.sh`

## Required fixes and corrections

- Finish and verify token type validation: unknown types must fail, unitless fontSize must not be mis-tagged as a dimension or silently become rem; resolve missing/self/cyclic references before output. Review partial token-references module and tests.
- Finish manifest mode checks without the root bypass; removing the bypass while retaining `-w` incorrectly rejects root reading mode0444. Inspect write bits. Review partial launcher changes: sanitized environment first, deterministic helper resolution, no symlink bypass, fixed external detector path, hash the copied executable and execute that copy.
- Browser: reject arbitrary executable environment overrides. Review/pin the actual executable before launch, record its identity/version, protect storage. A fixed path plus a hash recorded after launch is insufficient. No target Linux browser hash was supplied: remain blocked until reviewed evidence exists. No invented digest.
- Dependencies: protect the entire external tree AND ancestors from untrusted replacement before hash/import. `chmod a-w` under the same untrusted owner is reversible and does not fix the race. Any protected-prefix change must update all consumers, test adapters and docs. Keep Node packages outside the hashed release. A dedicated runtime identity and no hostile same-identity processes remain security prerequisites.
- Do not weaken safe-write root-ancestor/dedicated-user rules merely to make shared box uid1000 work. Current reported host ownership is incompatible. Provide explicit host remediation/decision without chowning shared directories or treating isolation as optional. Project directories are intentionally preprovisioned; do not casually weaken that boundary.
- Remove vendor-specific key rules from generic memory save3 while keeping ownership/90-day/exposure rotation in the selected adapter.
- Improve focus screening: unchanged decorative shadows/outlines do not prove a visible focus indicator; background/border indicators can be valid. Manual WCAG evidence remains mandatory.
- Desktop coverage should follow declared project widths; requiring1280/1920 for every project is a new requirement, not the original RTL finding. Canonical1440frames and accessibility320CSSpx/reflow evidence must preserve desktop-only phase gates.
- Reconcile all B1–B7, P2-A–H, P3-A–I and D1–D8 in a corrected response ledger. Preserve original review as evidence. Recheck older R3-7/8/12/16/20 explicitly.

## Review claims that must not become facts or commands

- Node22: r7 header reports v22.23.3 installed at `/home/box/.local/node-v22.23.3` with Fadel's yes; later rows wrongly say absent and propose a different prefix. Record REPORTED COMPLETE, original evidence not inspected here. Do not reinstall or request the same decision again merely because old rows conflict. Target runtime flags must reflect local verification versus reported evidence separately.
- Amin: r7 reports per-file PASS on R2 digest above. The original SECURITY-amin.md/REVIEW.md records were not supplied. R3 changes need review of their new digest regardless. Do not fabricate a sign-off.
- GitHub: a zero-SHA ref-create403 is not proof of read-only permission;422 is not an authoritative write-permission classifier. Use authoritative scope/repository selection evidence plus safe read verification.403 branch API can mean permissions or other restrictions; it does not alone prove plan entitlement. A daily branch check is detective, with concrete owner/taskID/schedule/timezone/last-run/result/escalation. No mutation probes.
- Approval location stays Fadel's written yes in Fannan's own chat under the original rules, not a third-party review's proposed alternate chat.
- Original missing archives/helper tests/approval register must be recovered from actual records or remain missing; do not reconstruct supposedly verbatim history. No external messaging is authorized by this handoff.

## Pinned dependencies and detector

Use release/runtime/package.json and package-lock.json; no dependency upgrades. Node22.12+ is required; reviewed target version22.23.3 Linuxx64 SHA256 `df450af89261115ef9f9e3830c3eeb2cc9213b63c720b1af623cb5dcbe2e02de`. Cloud runtime need not replace the bot's live runtime.

The existing dependency lock SHA256 is `55a645b144e5acc796e075d3868b0b1f8fb71271b806f30509fde8fec7928710`; R2 dependency inventory SHA256 `0f7891dbbd5883f8123781844c41a1eae7aea70750a13d87cf56693d7124a031`. Install fresh outside release using `npm ci --ignore-scripts`; never silently repin a mismatch. node_modules were deliberately excluded from Git.

Impeccable pinned source: https://github.com/pbakaus/impeccable/releases/tag/engine-v0.1.14 ; asset `impeccable-linux-x64`; fullSHA256 `3d31ec1a664ac35c815ea1d7c10abad1155ce364d0f461157eb837a34368efb6`. Official release metadata was checked, binary not downloaded/executed. No latest-version substitution. The supplied r7 curl example uses an ellipsis checksum and must be replaced before use. Original support assets still need verification.

## Verification and delivery

Run the Node test suite, Python guard tests and syntax checks. Inspect tests/local-fixture.mjs before running: it is currently Mac-specific, uses copied guards and absolute paths, and must be adapted in isolated copied tools for Linux. Never turn fixture bypasses into production configuration. Exercise positive and negative token/browser/contract paths; the real pinned detector is required for claiming full production-style gatePASS. Linux cloud tests can improve syscall coverage but are not proof of the separate live bot host.

Check all16skills, nine steps, stale active callers, generic memory, no spend cap, linked references and all seven requested deliverables. Update plan, skills/references, changelog, corrected review ledger, open questions and separate untested list. Regenerate FANNAN-REWRITE.md from the current files. Freeze release, generate a fresh external manifest/pin, build the final ZIP with evidence, and verify exact inventory, hashes and ZIP CRC. Preserve R2. Do not call it install-ready until real prerequisites and approvals exist.

## Cloud starting prompt

Read CLOUD-HANDOFF.md, AGENTS.md and ORIGINAL-ASSIGNMENT.md. Continue the unfinished Fannan R3 plan/package revision. Review partial changes first, fix and test all authorized local defects, preserve security and approval rules, reconcile the r7 findings, rebuild the seven-deliverable Markdown and final ZIP with fresh manifest/hash verification. Treat historical and reported host evidence separately from current executed tests. Work autonomously; no live bot installation, paid calls, external messages or invented approval.

## Transfer verification

The private GitHub repository is `Fadelwahed/fannan`; initial transfer commit `9b1500f6d7445e276ba9f570c28c2e59fa6651c2` was pushed and its remote main SHA matched locally. All232initial files were committed after a targeted credential-pattern scan found no hits; this is not a comprehensive secrets audit. No node_modules or unrelated workspace folders were uploaded. Cloud environment/task creation is pending browser sign-in and repository selection.

Git stores the executable bit, not all filesystem permission bits. Before running the manifest verifier on a fresh clone, set the external manifest to mode0444 as specified; that local setup does not change its bytes or approve a release. Source fixture evidence contains historical Mac paths and synthetic approval records; never use them as current cloud paths or real approvals.

## Parallel Grok review

Fadel asked Grok to collaborate. GROK-HANDOFF.md assigns independent review/evidence reconciliation to Grok; Codex retains implementation and packaging. Continue without waiting for the report, then resolve findings against the exact reviewed commit. No automatic cross-agent messaging has been established.
