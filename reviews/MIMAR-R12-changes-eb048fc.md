# Mi'mar R12 changes: panel round 12 (Opus 5.5 and GPT-6.1-Sol)

Branch `mimar-r4-fixes`, from d8408d4 (draft PR #1). Last code/package commit: eb048fc. Written Oct 18 2026, about 5:15 AM Gaza (UTC+3). This is the latest round record: the only file besides the registry that may stay unhashed. The R11 record is now hashed in the registry.

Inputs: `reviews/panel-r12/MERGED.md` (18 agreed items M01-M18, 3 disputed M19-M21) plus the round-1 and cross-check reports (`r1-*.md`, `x-*.md`; the raw `.log` runner transcripts were not copied, and the copied files were secret-scanned with no hits). Every agreed item was fixed at the HIGHER of the two severities. Each finding was first checked against the code at d8408d4; browser items were reproduced in real Chrome 155 (`test-results/r12/R12-chrome-repro-before.log`), then a failing test was written and run against the d8408d4 sources (`test-results/r12/R12-*-before.log`) before the fix (`-after.log`).

Registry: `trust/R3-CHANGES.sha256` sha256 `3cb271abb63fd867b8b8a78694079ecfebc931da6c9b6edf3d2b20c58dfeb259`.

## Items

| Item | Severity used | Result |
|---|---|---|
| M01 | P1 | FIXED. Each auto/scroll scroller is measured with its own text nodes, a direct `pre`, open shadow content, regardless of scrollWidth; fails closed as `unmeasured` when it scrolls with visible text and nothing was measured. An empty overflowing spacer does not fail. |
| M02 | P1 | FIXED. Content outside a scroller's reachable range (LTR 0..max, RTL -max..0), also in overflow-y-only scrollers, is recorded as `unreachable` at every width and fails; hidden/clip boxes are checked on both edges. RTL content reachable by scrolling stays exempt. |
| M03 | P1 | FIXED. Any frame (same-origin, `data:`, sandboxed, cross-origin) fails the final handoff (`checks.frames`, page and every state) and is DEFERRED in wireframes. UNTESTED.md's R11 word "blocked" corrected: such frames were recorded, not gated. |
| M04 | P1 | FIXED. Served HTML/JS/SVG count `backdropFilter`/`webkitBackdropFilter` identifiers and any `(-webkit-)backdrop-filter` mention not followed by `: none` (setProperty, bracket forms), no colon needed. |
| M05 | P2 | FIXED. CSS escapes are resolved before matching (node side and in page); ordinary CSSOM sheets are read in page, so an escaped `html{backdrop\2d filter}` that computes to `none` is counted. |
| M06 | P1 | FIXED. The full hard-fail vector (18 fields incl. contrast via a custom diagnostic, axe cannot run with JS off) is compared page world vs probe world and with JS off, over the declared widths. |
| M07 | P1 | FIXED. The cross-check runs on the positional page and on every declared state, with screen/state/lang scope; it is part of each state's pass. |
| M08 | P1 | FIXED. JS-off content (visible copy slots, h1 count, lang, dir) must match; otherwise INCOMPLETE, never PASS. JS-off uses `waitForLoadState('load')`. |
| M09 | P1 | FIXED. Reflow candidates carry screen/state/lang; dedupe and exception matching are on scope + id; a later blank-reason occurrence is kept; one id naming different elements in a scope fails. |
| M10 | P1 | FIXED. Keyboard use means an explicit `tabindex >= 0` (not inert) scroller, or usable targets (shown, enabled, not inert) that step across the whole extent. Hidden disabled buttons and a single first-cell link no longer count. |
| M11 | P1 | FIXED. The screen walks the composed tree (open shadow roots, slots); same-origin frames that overflow at 320 fail; unreadable frames are `unscannedScopes` and fail closed. |
| M12 | P1 | FIXED. `.env*`, `.#*`, `.ssh`/`.gnupg`/`.aws`, and credentials/secrets/service-account/token/.npmrc/.netrc/.pypirc/.git-credentials with any suffix, plus `*.key.*`-style names, are refused in input and changed paths (temp-tree tests). Deviation: plural `tokens` stays allowed because design-token files are `tokens.json` (two are tracked). |
| M13 | P2 | FIXED. The rAF counter is a private closure behind a non-configurable getter; `requestAnimationFrame` is a non-writable wrapper; a non-finite or decreasing reading counts as a loop. Real-Chrome tamper fixture (reset `__raf`, replace rAF) still sees the loop. |
| M14 | P2 | FIXED. Hidden, display:none and sr-only descendants are not measured (Chrome: hidden text no longer a false FAIL). |
| M15 | P2 | FIXED. The spacing scan includes `html` and `body`. |
| M16 | P3 | FIXED. `spacingOffScaleReason` now says horizontal margins (and html/body) are screened and exceptions need an approver entry. |
| M17 | ENH | FIXED. Each run is schema-checked (non-negative integer counts, booleans, accent string/null, content shape); missing, malformed or old-shape vectors and a native check that did not run give INCOMPLETE. |
| M18 | ENH | FIXED. The fixture asserts and logs integrity (page and state), `glassSource`, accent (page and state), frames and spacingExceptions, and the evidence JSON is kept (`test-results/r12/R12-fixture-evidence-valid.json`). VERIFICATION.md reworded. |
| M19 | disputed | CLOSED (Mi'mar tiebreak). Panel A said accent area is approximate and is decided by screenshots and manual review; failing every off-palette colour would be a new rule. design-quality.md and UNTESTED.md now say explicitly that area/coverage and stray colours are not auto-failed. |
| M20 | disputed | FIXED (Mi'mar tiebreak). Every `data-fannan-spacing-exception` is listed in `checks.spacingExceptions` with element, id, reason, values and screen/state/lang, and needs a matching handoff `spacingExceptions` entry naming the approver, or the handoff is blocked (DEFERRED in wireframes). The contract validates the entries. |
| M21 | disputed | FIXED (Mi'mar tiebreak). `jsOffDifferences` entries need check (any integrity field or `content`), screen/state/lang, a reason and a qaGate or approver reviewer; a reason alone excuses nothing. `reflowExceptions` now need the scope as well. |

## Corrections of earlier claims

- **M04 overclaim (R11 record, line 94):** "Any `backdrop-filter` text in served CSS/HTML/SVG/JS fails, even in ... a script string" was not true at d8408d4: the scan needed `backdrop-filter\s*:`, so `el.style.webkitBackdropFilter=`, `style.backdropFilter=` and `setProperty('-webkit-backdrop-filter', ...)` passed (reproduced in Chrome 155, before log). It is true from R12 for those forms. Glass built from strings at run time is still not detected.
- **M18 overclaim (R11 VERIFICATION entry):** accent, integrity and `glassSource` were stated as PASS on the fixture, but the fixture did not assert them. The values were PASS in that run's evidence (the before log reruns the R11 sources and prints them) but were an unasserted claim. From R12 the fixture fails if any of them is not PASS.
- **M03 (UNTESTED.md, R11):** frames were described as blocked; they were only recorded.

## Executed (Node 22.23.3, Chrome 155.0.8059.84, about 5:05-5:10 AM Gaza)

- Node with test-only deps: 88 PASS, 0 FAIL, 0 skipped. Without deps: 60 PASS, 28 SKIPPED.
- Python guard tools 10 PASS; package tests 27 PASS (git) / 23 PASS + 4 SKIPPED (no git); revisions/r2 4 + 4 PASS; package self-test pass; syntax mjs=35 sh=4 py=4, 0 failures; design.md lint 0 errors; local fixture exit 0 with the R12 claims asserted.
- Node 20 (informational): 82 PASS, 6 FAIL, the same six Style Dictionary tests that fail on Node 20 in R11.
- Before/after: every R12 group fails on the d8408d4 sources and passes on R12 (`test-results/r12/R12-*-{before,after}.log`).

## UNTESTED

- Accent area/coverage and off-palette colours: approximate, decided by screenshots and manual review (M19, by design).
- Frame content is not inspected; a frame is a stop.
- Glass assembled from strings at run time; sheets the page cannot read (left to the served-file scan).
- Contrast diagnostic: text over images or gradients is counted as unknown, not failed; axe is not run with JavaScript off.
- Closed shadow roots, `overflow: overlay`, scroll snapping; whether a resolved 2D candidate genuinely needs 2D layout.
- Reduced motion: animation started after the 700 ms window, or driven by timers.
- Spacing exceptions on pseudo-elements; secrets inside ordinarily named files.
- Only Chrome 155 headless on Linux; no Safari, Firefox or real devices. The native-function check stays a heuristic.
