# Fannan round 15 — merged review (GPT-6.1-Sol + Mi'mar cross-check)
Head reviewed: **67f3577** (mimar-r4-fixes, PR #1), fresh GitHub clone at /workspace/panel-r15/fannan (left unmodified; tests ran in scratch copies `testrun`, `testbefore`, `testpkg`, `testpkgb`). Graded by the FANNAN-PLAN.md threat model (honest-but-sloppy authors; deliberate obfuscation = ENH) and convergence rule (pass = zero P0-P2). Times: Gaza (UTC+3), Oct 18 2026.

## Who took part
- **GPT-6.1-Sol** (`codex-dce exec -s read-only`, high): 6:58 AM to 7:01 AM, `VERDICT: 6 ISSUES (A: 3 P0-P2, B: 3 P0-P2)`. Note: it labelled its rows `R14-GPT-04/06/12-15`; they are renamed R15-GPT-xx below.
- **Opus 5.5**: health call at 6:58 AM failed immediately: `Failed to authenticate. API Error: 403 Insufficient account balance` ($0). Skipped; no retries.
- **Grok** (6:58 AM): `API error (status 402 Payment Required): Grok Build usage balance exhausted`.
- **Mi'mar (cross-check and tiebreaker)**: checked every GPT finding against the code, and reproduced the browser ones in real Chrome 155 (`mimar-repro.log`, script `../repro/repro.mjs`), 7:00 AM to 7:15 AM.

## Re-check of the R14 fixes (Mi'mar, executed)
- At 67f3577: `panel-r14`, `integrity`, `width-screen` and `designer-process` tests **28/28 pass** (`mimar-tests-after.log`). Package tests **34/34 OK** in a clean clone (`mimar-pkg-after.log`). (In a copy with a `runtime-deps` symlink, `test_live_changed_paths_are_clean` fails only because the symlink is an untracked path; that's environmental, not a defect.)
- Against the 7fc0d6f sources, with the new tests kept: R14 node tests **9 of 10 fail**, every one `ERR_ASSERTION` (no module-load errors; the "floors kept" test passes, as expected). Package tests: **5 fail**, the R14 credential and section tests plus the ZIP-contents test (`mimar-tests-before.log`, `mimar-pkg-before.log`). So the R14 regressions really do test the fixes.
- Result: R14-GPT-01, 02, 03, 05 and R14-GPT-07..11 hold. R14-GPT-04 and R14-GPT-06 hold for their tested cases but are incomplete (A1, A2). R14-MIMAR-01 is text only, not enforced (B3); R14-MIMAR-02..05 rely on free-form critic checks (B4); R14-MIMAR-05's wording contradicts the units rule (B2).

## Part A — gate: agreed (GPT found, Mi'mar confirmed)
| # | Source | Sev | file:line | Problem | Mi'mar's evidence | Fix |
|---|---|---|---|---|---|---|
| A1 | R15-GPT-01 (R14-GPT-04 incomplete) | P2 | release/tools/width-screen.mjs:132 | `innerScroller` exempts anything under an element with `overflow-y:auto/scroll`, even one that can't scroll (auto height). With `html{overflow:hidden}` and an unbounded `overflow-y:auto` wrapper, text below the fold is unreachable but unreported. Honest pattern: an app shell that forgot `height:100%`. | **Chrome 155 confirmed:** wrapper clientHeight = scrollHeight = 1550 in a 900px viewport; `clipped/unreachable/offscreenLeft/scrolledText` all 0 at 1440 and 320. Control without the wrapper: `clipped=1`. Bounded app shell control still passes. | Exempt only when the scroller's scrollport fits within the visible viewport (its own rect bottom ≤ innerHeight, after ancestor clipping) and its scroll range reaches the content. Regressions at 1440/320 for an auto-height wrapper (FAIL) beside the bounded shell (PASS). |
| A2 | R15-GPT-02 (R14-GPT-06 incomplete) | P2 | scripts/package-r3.py:105-111 | The content screen claims "any case or separator", but its `access_token`/`refresh_token`/`client_secret` alternative is exact-case snake_case, and the case-insensitive list lacks access/refresh tokens. So `Access_Token`, `accessToken`, `refreshToken` in an ordinary JSON file pass, though `credential_key()` recognises all three. | **Executed:** `secret_content(notes.json)` → `Access_Token` False, `accessToken` False, `refreshToken` False; `access_token`, `clientSecret`, `apiKey`, `password` True; `credential_key()` True for all. | Screen ordinary JSON by parsing it and applying `credential_key()` recursively to every key (8+ char string values), and keep the regex for non-JSON. Package-input and changed-path regressions for the camelCase and mixed-case spellings. |
| A3 | R15-GPT-03 (N12 / R14-GPT-02 incomplete) | P2 | release/tools/integrity.mjs:49-76 | `contrastProbe` ignores CSS `opacity` on the element and its ancestors. Common honest pattern: fade or scroll-reveal starts at low opacity and scripts raise it. With JS off the text is near-invisible, but both passes report PASS, so integrity passes. | **Chrome 155 confirmed:** black text at `opacity:.1`, script sets 1: JS-on and JS-off both `{failures:0, unknown:0, checked:1}`. Control: `#eee` on white fails (1). | Multiply effective opacity along the composed ancestor chain into the text alpha (and background layers). Where compositing can't be resolved, count unknown → INCOMPLETE. JS-on/off regressions for element and ancestor opacity. |

## Part B — designer quality: agreed (GPT found, Mi'mar confirmed)
| # | Source | Sev | file:line | Problem | Mi'mar's evidence | Exact addition |
|---|---|---|---|---|---|---|
| B1 | R15-GPT-04 (R14-GPT-08/11 side effect) | P2 | release/FANNAN-PLAN.md:61,67; release/tools/handoff-contract.mjs:132-137; release/skills/design-prototype/SKILL.md:12 | The wireframe gate runs at the end of Step 4 ("before Step 5"), but in the wireframe phase every manual ID must be PASS except `accent-area`/`palette`. That includes the new `navigation-findability` and `task-test`, which are Step 5 test results. The bot must either fabricate a PASS or can never pass the Step 4 gate. | **Confirmed in code:** handoff-contract.mjs:132 lets only `accent-area`/`palette` be DEFERRED in the wireframe phase, and :135-137 loops over every `manualIds` entry. | Plan Step 4: "At Step 4, check grayscale structure, copy and provenance and record issues for testing. Within the existing Step 5 gate, after the task and navigation-findability tests and necessary retests, run the complete wireframe quality gate; require PASS before structure approval and Step 6." Align design-prototype:12 and the Step 4 "See" line. (Alternative, same effect: allow those two IDs as DEFERRED at the Step 4 run and require PASS at the Step 5 approval.) Nine steps unchanged. |
| B2 | R15-GPT-05 (R14-MIMAR-05 wording) | P2 | release/FANNAN-PLAN.md:77 | "column count, gutter, outer margin, maximum content width … each value is a spacing-scale token". A column count is a unitless integer; spacing tokens need units, so following the text literally breaks the owner's units rule and the token validator. | **Confirmed:** plan:77 wording; token-references.mjs:9,35 treat spacing/size keys as CSS lengths. | Replace the clause: "Column counts are positive unitless integers recorded beside the grid spec, not spacing tokens. Gutters, outer margins and maximum content widths reference approved dimension tokens with units (bare 0 allowed, no negative spacing tokens). Document recomposition between widths as behaviour." |
| B3 | R15-GPT-06 (R14-MIMAR-01 unenforced) | P2 | release/references/handoff-contract.md:24; release/runtime/quality-checks.json; release/tests/handoff-contract.test.mjs:31 | The approver feedback log is required in prose only: there's no manual ID or validator field, and the "complete handoff passes" fixture has no feedback evidence. The R14 record says it's "echoed in the handoff contract's approval row", which is documentation, not a check. | **Confirmed:** `manualIds` (19) has no `feedback-log`; handoff-contract.mjs has no "feedback". | Add manual ID `feedback-log`. design-quality.md: "The feedback-log artifact records each item's exact words, scope, version, interpretation, decision, resulting change and confirmation. A deferral needs the approver's recorded disposition. Missing or unresolved items fail. If no feedback was received, record that explicitly with reviewer and scope." Update the fixture and add a missing-log regression. |

## Part B — Mi'mar addition (single reviewer; not seen by GPT)
| # | Sev | file:line | Problem | Evidence | Fix |
|---|---|---|---|---|---|
| B4 | P2 | release/tools/handoff-contract.mjs:155; release/references/critic-rubric.md:16,18; release/FANNAN-PLAN.md:77,79 | R14-MIMAR-02..05 (emphasis order, type measure/line height/1.4.12, colour roles + contrast matrix, per-width grid) are "checked by the critic's rows", but the contract only needs ≥1 `designChecks` entry with PASS and evidence. Checks aren't keyed to rubric rows, so all four can be skipped silently. Same gap as B3. | handoff-contract.mjs:155 validates `designChecks.length > 0` and decisions only; no row IDs. | Either add manual IDs `emphasis-order`, `type-measure`, `colour-roles`, `grid-per-width` (Step 6/handoff phase, DEFERRED allowed in wireframe), or require `critic.rounds.at(-1).designChecks` to carry one PASS per critic-rubric row ID. Add a missing-row regression. |

## Rejected
None. All six GPT findings were confirmed against the code, five of them by execution.

## Disputed and Mi'mar's tiebreak
No reviewer disagreements this round (one model only). Tiebreak calls made:
- **A1-A3 are P2, not ENH:** each is an ordinary authoring pattern (unbounded app-shell wrapper, camelCase keys in a pasted JSON, fade-in reveal), not obfuscation.
- **B1 fix:** either option is acceptable. Prefer GPT's (run the full wireframe gate inside Step 5 after the tests), because it keeps one gate run with real results.
- **B2:** P2, because the wording contradicts an owner hard rule.

## Verdict
**Not zero issues: 7 P2 open** (A: 3, B: 4). No P0 or P1. Round 15 does not pass.

## Untested (labelled)
- A1/A3 repro: Chrome 155 headless only. A2 executed in-process only.
- Mi'mar didn't re-run the full suites (only the R14-relevant node files and the package tests), the fixture or Node 20.
- B4 is Mi'mar-only; no second model reviewed it.

## Cost
Opus: $0 (health call rejected before inference). GPT: no cost reported; 75,504 tokens. Grok: none.
