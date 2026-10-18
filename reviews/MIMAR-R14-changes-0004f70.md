# Mi'mar R14 changes: panel round 14 (GPT only; Mi'mar as second Part B reviewer)

Branch `mimar-r4-fixes`, from 7fc0d6f (draft PR #1). Last code/package commit: 0004f70. Written Oct 18 2026, about 6:56 AM Gaza (UTC+3). This is the latest round record: the only file besides the registry that may stay unhashed. The R13 record (`reviews/MIMAR-R13-changes-e886611.md`) is now hashed in the registry.

Inputs: `reviews/panel-r14/MERGED.md` and `r1-gpt.md` (R14-GPT-01 to 11). Opus gave no usable reply and Grok had no balance, so nothing was cross-checked; every item is single-reviewer. All of `panel-r14/out` was copied after a secret scan (no hits). The `.runner` and `.time` files are stored with a `.txt` suffix, because the package allows only listed suffixes. The raw runner transcripts (`*.log`, about 2.3 MB) are in `test-results/r14/panel-r14-raw/`, so the documented whitespace policy keeps them byte-for-byte.

Registry: `trust/R3-CHANGES.sha256` sha256 `0666de345a8ea58fd20e30c341c08f08d4693e1d3a2c2c8ee66cfa9c05ee35e0`. The threat model and convergence rule in `release/FANNAN-PLAN.md` are unchanged.

## Part A (gate), all P2

| Item | Result |
|---|---|
| R14-GPT-01 | FIXED. `contentProbe` treats a slot or heading as rendered when its computed style shows it and it has a box with area or text ranges with area. A `display: contents` slot, or a zero-size one, is therefore compared by its text. A slot that scripts fill and that is empty with JavaScript off now gives INCOMPLETE (Chrome regression). |
| R14-GPT-02 | FIXED. `contrastProbe` walks open shadow roots and resolves backgrounds through slots and shadow hosts; text counts when its text ranges have area. Declarative-shadow regression: shadow text that is white on white only with JavaScript off is counted, and the cross-check fails as `integrity mismatch` (contrastFailures, js-off). |
| R14-GPT-03 | FIXED. Closed shadow roots are counted at each width after the resize, with a bounded settle (two animation frames or 250 ms). Regression: a closed root that a media-query listener creates at 320 px is an unscanned scope at 320 only. |
| R14-GPT-04 | FIXED. If the viewport cannot scroll vertically (html, or a body whose overflow propagates, set to `overflow: hidden` or `clip`), shown text or media below the bottom edge is `clipped` (viewport), unless a real inner scroller holds it. Regressions at 1440 and 320: three failing cases (fixed-height hidden html, propagated hidden body, `overflow-y: clip`). An app shell with an inner scroller and a normal long page still pass. |
| R14-GPT-05 | FIXED. The reduced-motion snapshot is the exported `integrity.motionSnapshot`: the composed tree, with each element keyed by its composed path. `motionChanges` compares two snapshots. Chrome regression, plus two executed checker runs in the fixture: timer motion in an open shadow root fails reduced motion on the positional page, and on a declared state while the page and the default state pass. |
| R14-GPT-06 | FIXED. In `tokens.json`, credential keys are refused anywhere in every dict and list before structure is validated: metadata beside `$value`, `$extensions`, composite `$value` arrays, and any case or separator. The content screen also refuses JSON credential keys with values of 8+ characters. Credential-free `$extensions` and composite values still pass. Package-input and changed-path regressions. |

## Part B (designer quality), all P2

The exact panel text was added at the places the panel named. Each item is also a required manual check (`runtime/quality-checks.json`), so a handoff without the reviewer's record fails the contract.

| Item | Result |
|---|---|
| R14-GPT-07 | ADDED after Step 1's first paragraph and in `design-research` (linked to the plan); manual check `discovery-evidence`. |
| R14-GPT-08 | ADDED before the Step 3 exit (and the exit now names the navigation model); manual check `navigation-findability`. |
| R14-GPT-09 | ADDED after the component-state guide in `handoff-contract.md` and echoed in `design-canvas`; the critic rubric's interaction row fails an unspecified reachable state; manual check `interaction-states`. |
| R14-GPT-10 | ADDED in the same places; manual check `form-behavior` (a justified N/A goes in the note). |
| R14-GPT-11 | ADDED after Step 5's first paragraph; manual check `task-test`. |

## Mi'mar's own Part B review (second reviewer): R14-MIMAR items

I reviewed the plan, skills, references and memory for: visual hierarchy, typography scale, colour system, grid, component inventory, motion, content design, critique and folding in Fadel's feedback. These gaps were real P2s, because each left a design decision unspecified or unchecked at handoff:

| Item | Sev | Gap | Fix |
|---|---|---|---|
| R14-MIMAR-01 | P2 | No defined way to fold in the approver's feedback, so items could be lost, misread, applied against a rule, or carried silently into other projects. | New plan section "Folding in the approver's feedback": one feedback log. Each item records the exact words, scope and version, interpretation, decision (apply, clarify or conflict), the change and the confirmation. A conflict with the floor, a rule, a fact or an approved decision is reported, never applied. Re-present only once every item is resolved or deferred. A reusable preference becomes a memory save only with Fadel's yes. Echoed in the handoff contract's approval row, `design-share` and memory save 6 (still a proposal). |
| R14-MIMAR-02 | P2 | Visual hierarchy was asserted, never verified: no intended emphasis order and no check that the screen shows it. | Step 6: record the first, second and third reads and one primary action per viewport. Verify on a small, blurred 1440 screenshot (grayscale at Step 4/5), and fix with size, weight, position, contrast or space, not copy. The critic's hierarchy row checks it. |
| R14-MIMAR-03 | P2 | The type scale had a ceiling but no scale rationale, measure or line height, and nothing about WCAG text spacing. | Step 6: a documented scale; a body measure of about 45 to 75 characters; body line height of at least 1.5 (a project rule); no loss under the SC 1.4.12 overrides; no long-form text across the full 1440; checked per script. |
| R14-MIMAR-04 | P2 | The colour system was "neutrals plus one accent", with no named roles and no contrast check of state colours before use. | Step 6: named colour roles in the token JSON (surfaces, text, borders, accent, focus, semantic states), and a token-level contrast matrix including hover, focus, selected, error and disabled. Only passing pairs are used, and no colour outside the roles appears. |
| R14-MIMAR-05 | P2 | The grid was specified at 1440 only, though the checker renders every declared desktop width; behaviour at the others was left to the engineer. | Step 6: columns, gutter, margin, maximum width and recomposition for each width in `settings.desktopWidths`, all as spacing tokens. |

I found no further P0-P2 gaps in component inventory (already a validated inventory with N/A rules), motion (already job, trigger, timing, fallback, no-JS and reduced motion) or content design (copy deck, provenance and placeholders). Desktop first, the WCAG 2.2 AA floor, zero glass, the spacing scale, and 320 px reflow plus `desktopWidths` including 1440 are unchanged, and a test asserts them. The new text names no client, country or design tool (tested).

The tests check that the required sections exist:
- `release/tests/designer-process.test.mjs` checks the exact text and its location, the manual IDs, the floors, and genericness.
- `scripts/package-r3.py` refuses to build a tree missing any required section, before writing anything (`RequiredSectionTests`).

## Verification

- **Suites:**
  - Node 22: 104/104 with test-only deps; 68 PASS + 36 skipped without deps.
  - Python guard tests: 10. `revisions/r2`: 4 + 4.
  - Package tests: 34 (git checkout), or 30 + 4 skipped (no-git copy). Self-test passes.
  - Syntax: mjs=38, sh=4, py=4, plus the launcher. design.md lint: 0 errors.
  - Node 20 (informational): 98 PASS plus the same 6 Style Dictionary failures.
- **Fixture:** exit 0, the expected stop (pinned Impeccable binary absent). Its R12/R13 claims, the R13 negative runs and the R14 shadow-motion runs are all asserted.
- **Before/after:** `test-results/r14/R14-*-{before,after}.log`. The before runs are the R14 tests against the 7fc0d6f sources, with documents and runtime JSON restored too. Every before failure is an assertion failure; I checked each log for TypeError, SyntaxError and AttributeError. The fixture before run reaches its R14 assertion. In the docs before run, the "floors kept" test passes, as expected, because the floors are unchanged.
- **Fresh-clone checks:** the anchored verify, manifest check and secret grep run after the push; results are in the final report for this round.

## UNTESTED (labelled)

- Every Part A browser item is tested in Chrome 155 headless only. The panel's own reproductions were in-memory or mock only.
- Closed shadow roots stay out of the contrast and content probes; they fail only as unscanned scopes in the width screen.
- A closed root created after the settle, motion inside closed roots or frames, motion starting after 700 ms, and sticky content on a non-scrolling viewport.
- Credentials under keys outside the list, or with values under 8 characters.
- Part B is text plus enforced manual-check IDs. No real project has gone through the ledger, navigation test, task test, state and form specifications, feedback log, emphasis check, type measure, colour matrix or per-width grid, so their usefulness is untested.
- No cross-check: round 14 findings and my Part B review are each single-reviewer.
