# Mi'mar R15 changes: panel round 15 (GPT plus Mi'mar cross-check; 7 P2)

Branch `mimar-r4-fixes`, from 67f3577 (draft PR #1). Last code/package commit: 2ab5663. Written Oct 18 2026, about 7:23 AM Gaza (UTC+3). This is the latest round record: the only file besides the registry that may stay unhashed. The R14 record (`reviews/MIMAR-R14-changes-0004f70.md`) is now hashed in the registry.

Inputs: `reviews/panel-r15/MERGED.md` and `r1-gpt.md` (R15-GPT-01 to 06, which GPT labelled R14-GPT-04/06/12-15) plus B4 (Mi'mar only). Opus (403, no balance) and Grok (402, no balance) gave no review. All of `panel-r15/out` was copied after a secret scan (pattern grep and the package's own `secret_content()`/`junk_or_secret()`: no hits). `.runner` and `.time` files are stored as `.txt`. Raw `.log` files are in `test-results/r15/panel-r15-raw/`, because of the whitespace rule. The cross-check repro scripts are in `reviews/panel-r15/repro/`.

Registry: `trust/R3-CHANGES.sha256` sha256 `e3a95cd5144eb42a6ae7df55441d829415d0b25ad0c549a4577f2ee203611961`. The threat model and convergence rule in `release/FANNAN-PLAN.md` are unchanged. All of Fadel's floors are unchanged: desktop first at 1440, WCAG 2.2 AA, no glass, spacing units, 320 px reflow plus `desktopWidths` with 1440.

## Starting state and the 6:57 AM path mix-up

At 7:08 AM I fetched `mimar-r4-fixes`. The box checkout was at 67f3577, equal to `origin/mimar-r4-fixes`, with a clean tree. I did not run the 6:57 AM panel setup (it happened before this task started at 7:07 AM), and I have no log of the mix-up itself. Here is what the box shows, without guessing:
- The `/workspace` directory entry changed at 6:56:59 AM: something was created, renamed or removed directly under `/workspace`. The panel clone `/workspace/panel-r15/fannan` was created at 6:57:00 AM. Today there is no stray entry from that minute under `/workspace`.
- The restore holds:
  - `/workspace/panel-r15/fannan` is at 67f3577 with a clean status.
  - In my checkout, no file changed after my last R14 commit (6:55:59 AM).
  - The reflog has no entry between that commit and this round.
  - The fetch matched origin.
- So whatever was mis-pathed at 6:57 AM left neither the review clone nor the working branch changed. What exactly went to the wrong path, and how it was moved back, is not visible in the box state, so it is not described here.

## Part A (gate), all P2

| Item | Result |
|---|---|
| A1 (R15-GPT-01) | FIXED (`width-screen.mjs`). Under a viewport that cannot scroll, an `overflow-y: auto/scroll` ancestor holds lower text only if both hold: its scrollport ends inside the visible viewport (at or above `innerHeight` and every clipping ancestor's bottom), and its scroll range reaches the text. Chrome regressions at 1440 and 320, all three FAIL: an auto-height wrapper, a scroller taller than the viewport, and a bounded scroller cut by a short hidden ancestor. Two cases PASS: the bounded app shell, and an unbounded wrapper inside a bounded scroller. |
| A2 (R15-GPT-02) | FIXED (`package-r3.py`). JSON files are parsed. Every key in every dict and list is screened with `credential_key()` (any case or separator, camelCase), with 8+ character string values. The regex remains for other text and now also names access/refresh tokens and secret/access keys, case-insensitive. In-process regressions cover package input and changed paths (`Access_Token`, `accessToken`, `refreshToken`, `Refresh-Token`, `CLIENT_SECRET`, `Api-Key`). **Real package build:** a clone of the checkout with the working files on top runs `package-r3.py build`. A camelCase `accessToken` stops it in a changed path and in package input, and the registry is untouched. With an empty value it builds. Before the fix the build accepted the credential. |
| A3 (R15-GPT-03) | FIXED (`integrity.mjs`). `contrastProbe` composites CSS `opacity` on the text and its composed ancestors as premultiplied groups. The walk only stops at an opaque background when nothing above it is translucent. A `mix-blend-mode` on the chain is counted as unknown. Chrome regressions cover element opacity, ancestor opacity and an ancestor with its own background, each faded to .1 and raised to 1 by script. JavaScript-off fails and the cross-check reports `integrity mismatch` / `contrastFailures` / `js-off`. Text at .9 and .95 still passes. |

## Part B (designer quality), all P2

| Item | Result |
|---|---|
| B1 (R15-GPT-04) | FIXED with GPT's option. Step 4 now reads "At Step 4, check grayscale structure, copy and provenance and record issues for testing." Step 5 carries, after the `task-test` paragraph: "Within the existing Step 5 gate, after the task and navigation-findability tests and necessary retests, run the complete wireframe quality gate; require PASS before structure approval and Step 6." `skills/design-prototype` (See step) and `design-quality.md` follow. The nine steps are unchanged (a test asserts headings 1-9), and no approval gate was added. |
| B2 (R15-GPT-05) | FIXED with the exact wording. "each value is a spacing-scale token" is replaced by "Column counts are positive unitless integers recorded beside the grid spec, not spacing tokens. Gutters, outer margins and maximum content widths reference approved dimension tokens with units (bare 0 allowed, no negative spacing tokens). Document recomposition between widths as behaviour." The package refuses the old clause if it returns (`RETIRED_SECTIONS`). |
| B3 (R15-GPT-06) | FIXED. Added the manual ID `feedback-log`, required PASS in both phases. `design-quality.md` carries the exact feedback-log text, and `handoff-contract.md` names the check. The fixture's handoff includes it, and a missing-log regression fails the contract. |
| B4 (Mi'mar) | FIXED both ways, as asked. (1) Added the manual IDs `emphasis-order`, `type-measure`, `colour-roles` and `grid-per-width`: PASS or DEFERRED in the wireframe phase, PASS at handoff (a DEFERRED one fails). `accent-area`/`palette` stay always-DEFERRED in wireframes, and `task-test` cannot be DEFERRED. (2) `quality-checks.json` `criticRows` lists the eight rubric-row IDs, which are also shown in the rubric table. Every critic copy/design check must name its `row`, and the final round needs a passing, evidenced check for each row. Missing-row, unkeyed-check and earlier-failing-round regressions are covered. |

## Tests and evidence

- Before/after: `test-results/r15/R15-*-{before,after}.log`. "Before" means the R15 tests against the 67f3577 sources, with documents and runtime JSON restored. Every before run failed at an assertion (`ERR_ASSERTION` / `AssertionError`). I grepped them for TypeError, SyntaxError, AttributeError, ImportError and "does not provide an export": none. After: all pass.
- Full suites (`test-results/r15/`):
  - node 109/109
  - without deps 71 PASS + 38 SKIPPED
  - Python guard 10
  - r2 4 + 4
  - package 37 (git) / 32 + 5 SKIPPED (no git)
  - self-test PASS
  - syntax mjs=39 sh=4 py=4, 0 failures
  - offline lint 0 errors
  - fixture exit 0, an expected stop on the absent pinned Impeccable binary; contract and browser checks pass (evidence `local-fixture-evidence.json`)
  - Node 20: 103 PASS, 6 FAIL. These are the same six Style Dictionary tests as R11-R14 (they need Node 22), informational only.
- Headless Chrome 155.0.8059.84 only. Only processes I started were stopped (browsers closed by the tests); no `pkill`.

## Untested

- A1: scrollers moved by transforms, scroll-snap or scroll-driven animation; a scrollport covered by a sibling overlay rather than clipped by an ancestor.
- A2: YAML/TOML/`.env`-style credentials under keys the regex does not name; JSON with comments falls back to the regex.
- A3: `filter: opacity()/brightness()`, `mask`, Web Animations mid-animation opacity, colours that do not compute to `rgb()` (counted unknown).
- B1-B4: the contract checks that the records exist with evidence. The quality of a real feedback log, emphasis check, type measure, colour matrix, grid or critic judgment is reviewer judgment, and no real project was run through the new Step 5 order.
- B4 and the fixes were not reviewed by a second model. Only GPT reviewed this round, and Opus and Grok had no balance.
