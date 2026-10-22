# Changelog and round-5 P1 disposition

`reviews/`, `scripts/`, `test-results/` and `REVIEW-RESPONSE.md`, named below, are on the `workbench` branch, not on `main`.

## R4 fixes (Mi'mar, branch `mimar-r4-fixes`, 17 October 2026)

Implemented from the independent review `reviews/GROK-R4-eb2d540.md` (branch `grok-review`). Local review candidate only; live installation remains BLOCKED.

| ID | Change | Test (fails before, passes after) |
|---|---|---|
| R4-1 | DTCG font-weight aliases (thin … ultra-black) are converted to numbers in `tools/designmd-to-sd.mjs`; shared validation in `tools/token-references.mjs` now accepts only 1–1000, `normal` and `bold`, so no raw alias reaches CSS (hand-edited JSON is rejected by `sd-build.mjs`). | `tests/token-validation.test.mjs` |
| R4-2 | A unitless `0` is accepted as a dimension (emitted as `0`); every other unitless dimension still fails ("units required" / "unknown token type"). Restores d2c36c1 caller compatibility for `rounded`/`padding`/`margin`/`gap: 0`. | `tests/token-validation.test.mjs` |
| R4-3 | New `focusSettle` waits (capped 1 s) for finite transitions on the focused element and ancestors before reading; `focusStyleProbe` ignores colour-only changes below 3:1 between states and changes to unrendered outline/border/decoration/pseudo-elements. Both checker tab loops call it. Manual focus evidence stays mandatory. | `tests/focus-screen.test.mjs`; real-Chrome probe in `test-results/r4/` |
| R4-4 | The checker refuses a browser whose `Browser.version()` differs from the reviewed pin; `runtime/browser-trust.json` now requires `supportTreeSha256`, verified over the executable's own directory by `tools/executable-trust.mjs`. The pin stays BLOCKED. | `tests/host-trust.test.mjs`, `tests/checker-boundaries.test.mjs` |
| R4-5 | `scripts/package-r3.py verify --registry-sha256 <digest>` anchors the changed-file registry externally (checked first); `PACKAGING.md` documents `chmod 0444` for both trust files. | `scripts/test_package_r3.py` |
| R4-6 | The owner's decision (17 Oct 2026, 6:18 AM UTC+3): spacing requires units. The converter's units-required check now covers `spacing` (`spacing: 8` fails; `8px` and a bare `0` pass), and shared validation types spacing as dimension only, so hand-edited `number` spacing is rejected by `sd-build.mjs` too. | `tests/token-validation.test.mjs` |


The requested design/text rewrite is supplied. **“All seven P1s closed” is not a truthful live-state claim from these inputs.** Five have candidate fixes or preserved fixes with local evidence; actual reviewer approval, live access controls and deployment-dependent verification remain blocked. The table keeps code/text completion separate from operational closure.

| Round-5 P1 | Candidate change | Evidence / closure test | Honest disposition |
|---|---|---|---|
| N1 — setup prechecks the output root and stops | Project selection precedes the project-specific path; setup and all workflow callers supply both target and project | `skills/design-setup/SKILL.md`; explicit usage/precheck tests and full caller scan in verification record | Candidate caller defect fixed; live skill execution untested |
| N2 — npm dependencies conflict with the hashed tree | Exact package and lock stay in `runtime/`; actual npm install is outside `release/`; all three dependency consumers verify lock and installed-tree hashes before loading through `FANNAN_DEPS`, and reject an in-tree prefix | Local `npm ci --ignore-scripts`, token/browser fixture execution, release inventory contains no node_modules; external manifest generated after edits | Candidate layout/runtime defect fixed; target-host install untested |
| N5 — launcher has no explicit pinned-binary path | Checker invokes the protected launcher with only PATH and the selected project; the launcher owns the fixed `/opt/fannan/bin/impeccable-linux-x64` selection | Missing binary produces a failing evidence record; supplied launcher hash pin retained; negative path executed | Caller fixed; successful real binary execution remains BLOCKED because the binary is absent |
| R3-2 — the security reviewer's review is not recorded | Add `INSTALL-ACCEPTANCE.md` with per-file/digest review requirement and blocked status; do not reuse an old review for rewritten files | Candidate review by a native reviewer is documented separately and is **not the security reviewer's review** | **OPEN** until the security reviewer actually reviews and records the candidate hashes |
| R3-3 — paid threshold remains in skills/memory | All candidate skills require approval for every paid job; proposed memory save 8 says exactly “Ask the owner before anything that costs money” | Search active skills and proposed memory for old threshold wording; no threshold widget or unsupported paid command introduced | Candidate text fixed; live skill/memory activation remains pending approval |
| R3-4 — read-only token and branch checks approved but not implemented | Preserve exact one-repository Contents:read control and branch/daily-check fallback; specify secret-safe proof and task ownership | `references/security-and-install.md`, `INSTALL-ACCEPTANCE.md`; no credential or branch mutation attempted | **OPEN** until real permissions, read access and branch/task evidence exist |
| R3-5 — project omitted / unsafe writes | Keep exactly two arguments in guard; every caller supplies project; evidence output is fresh/versioned and uses guarded no-clobber writes | Guard/negative-path tests, contract checks and caller review; descriptor-relative exclusive writer and same-identity host boundary documented | Candidate caller/output defects fixed; descriptor regression tests required; actual Linux host enforcement remains untested |

## Requested improvements

- Rewrote the complete plan while retaining Scope and authority as rules and the exact eight steps plus Step 9. Step 5 now explicitly uses the structural/copy checks before color/type; this is the existing gate, not a new one.
- Wrote all nine workflow and seven vendor skill files in full, with focused triggers, generic project lookup, security rules and Gotchas. Detailed criteria load from supporting references. The old routine text is not reconstructed from memory.
- Added the brief/section/decision trace, copy-first source ledger, six-size type ceiling, ten-percent accent ceiling, purposeful spacing/grid/motion, translations/RTL and long-text acceptance.
- Integrated the anti-pattern and copy checklist into the pre-handoff contract and browser check. Semantic judgments require explicit scoped reviewer evidence, not a detector's optimistic guess.
- Added an independent copy-and-design rubric, real-reference comparisons, generic-headline failure and a hard three-round/stalled-score stop with no soft pass.
- Defined the canonical handoff record and generated checklist, scoped to every screen/state/language, with real copy, source/rights records, artifact hashes, tokens/CSS/build inputs, audit intent and no open questions.
- Supplied the token conversion/build path and config using the existing pinned dependency. Selected the permitted reviewed Node 22 installation route for the original Node20 host; this Mac's Node22 evidence is separately labelled.
- Supplied the complete rename map and a single release manifest/pin. No active skill caller retains an obsolete skill name; migration/history/helper-path mentions are explicitly classified.
- Removed unsupported media search/resume instructions. Matching avatars become a reference-backed acceptance process requiring real references and the owner's approval before paid generation.

## Closed historical findings preserved

R3-1 stays rejected: the gate already used the launcher; N5 is the missing-binary-path issue. The launcher stays allowlisted and copy-hash-run, with no download fallback. shadcn stays guidance-only without CLI execution. Vendor output remains text/design reference, never repository writes. The AA floor, desktop approval, external manifest, required project argument, negative-path failures, fixed tool versions and explicit untested boundaries stay in place. This rewrite does not reclassify old closed findings as new defects.

## Review fixes made in this candidate

An independent read-only reviewer identified and the implementation addressed phase-inappropriate placeholder rejection, contradictory PASS/FAIL records, insufficient per-state checks, evidence overwrite risk, incomplete generated checklist, and weak token/frame fixture validation. See the verification record for the tests actually executed; source review is not a runtime PASS. Any limitation remaining there is still a limitation here.

## Grok review revision — 16 October 2026

The complete finding-by-finding disposition is in `REVIEW-RESPONSE.md`. This revision pins a proposed Node distribution/checksum, verifies dependency bytes before imports, narrows detector/browser access, replaces pathname writes with a descriptor-based writer, adds Arabic and tagline screening, and makes authority, key rotation, avatar uniqueness and engineer ownership explicit. It preserves the existing approval gates, tools and exact npm versions. No review finding is closed by inventing the security reviewer's approval, a missing binary, a target-host run or a live atomic transaction.

## Independent R3 correction — 17 October 2026

- G-1/G-3/G-14: preserve first/caller arguments, remove the checker's stale detector override, and pass canonically checked input paths.
- G-2/G-4/G-15/G-16: add before-launch browser identity verification and protected root-owned bin/dependency storage checks. No browser pin or host isolation proof was invented.
- G-5–G-9: validate hand-edited token JSON and converter output with shared type/value/reference rules; reject nonfinite values and invalid font weights; retain family arrays and percentage line-height input.
- G-10: compare computed focus appearance before/after Tab in both loops; static decorative shadows no longer count alone. Manual visibility/contrast and WCAG review remain mandatory.
- G-12/G-13: refresh R3 ledger and packaging, keep generic memory save 3 while preserving the selected adapter's ownership/90-day/exposure rotation rule.
- G-11 remains a real host blocker. G-17/G-18/G-19 were already fixed at the starting SHA; preserve them and reject duplicate implementation requests with evidence.

Fresh evidence and explicit skips replace historical R2 results as R3 claims. No new dependency, system change, credential access, live install or approval is included. All seven original deliverables remain present in the combined document.

Found during fix: dot-joined token path collision and inherited type allowlist names could evade validation; own-name/path regressions now reject both. The focus recheck also added wrapper/pseudo-element style comparison and unchanged-decoration negatives. These are bounded corrections required for G-5/G-6/G-10, not extra features.
