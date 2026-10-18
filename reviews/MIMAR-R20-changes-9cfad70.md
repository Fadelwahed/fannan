# Mi'mar R20 changes: panel round 20 (GPT plus Mi'mar cross-check; 5 P2, 2 P3)

Branch `mimar-r4-fixes`, from 613f489 (draft PR #1). Last code/package commit: 9cfad70. Written Oct 18 2026, about 2:20 PM Gaza (UTC+3). This is the latest round record: the only file besides the registry that may stay unhashed. The R19 record (`reviews/MIMAR-R19-changes-5890da8.md`, with its R19b note) is now hashed.

Inputs: `reviews/panel-r20/MERGED.md` and `r1-gpt.md`, plus Mi'mar's clipping tiebreak (12:48 PM). Starting state: the box checkout was at b4747e3, equal to `origin/mimar-r4-fixes`, clean tree. The work was interrupted once (about 1:38 PM); my own "R20 after" fixture run was let finish, and nothing else was stopped.
- `panel-r20/out` was copied after a secret scan (strict credential patterns plus the package's `secret_content()`/`junk_or_secret()`; 23 files, no hits): `.runner` and `.time` files as `.txt`, raw `.log` files in `test-results/r20/panel-r20-raw/`, repro scripts in `reviews/panel-r20/repro/`. The generated html and png repro files stay on the box.

Registry: `trust/R3-CHANGES.sha256` sha256 `9c9d2857c31c05a53c150960834288e89d88063f88667519f3aef535e5f9bca6`. Threat model and convergence rule unchanged. Fadel's floors unchanged: desktop first at 1440, WCAG 2.2 AA, no glass (the glass hard fail is untouched), spacing units, 320 px reflow plus `desktopWidths` with 1440.

## P2 fixes

| Item | Fix |
|---|---|
| R20-GPT-01 and R20-MIMAR-01 (Mi'mar's clipping tiebreak; the 320 px floor restored) | The R19 exemption is removed. `width-screen.mjs`: each hidden/clip box reports the content elements it cuts (`whole`, `partial`, by composed path); `screenWidths` gives each clip a `rule`: content shown at 1440 and cut at another width ("shown at 1440, lost at this width") fails; any partial cut ("partly clipped") fails; content cut wholly at 1440 is a `reveal` clip, resolved by `resolveReveals` only when another declared state of the same screen and language shows every cut element at 1440 (`revealedBy`), otherwise it fails the state and the page (DEFERRED in wireframes). Documented in `handoff-contract.md` and `design-quality.md`: designers must declare reveal states. |
| R20-GPT-03 | The contrast resolver grades the faintest text: `glyphContrast` captures the element's text box painted and with the text transparent; each glyph pixel is graded against the pixel underneath; clusters of at least 25 glyph pixels count their best pixel; the ratio is the 10th percentile of the clusters; not separable is INCOMPLETE. The 90th-percentile ink ratio is no longer used for AA. Measured in both renderings inside the integrity run. |
| R20-GPT-05 | A valid `requiresScript` state is re-measured with the default state's JavaScript-off rendering as its baseline; content the scripted state adds is removed only when it belongs to an approved copy slot placed in that state (slot text, and headings and controls the slot owns, recorded by `contentProbe` as `owners`). Full run: a slotted dialog is whole-state PASS. |
| R20-GPT-06 | `screens[].type` is required (`marketing`, `landing`, `functional`); `generic-hero` is required only for marketing and landing screens. Rubric and design-quality wording: the swap test applies to promotional hero copy and claims of distinction; functional screens use clear task headings. Every fixture and test handoff now declares a type. |

## P3 fixes (both cheap)

- R20-GPT-02: the truncation-fade label needs text that actually overflows its clipping ancestor and a gradient at the cut edge that leaves the opposite edge uncovered; any other gradient pseudo-element (a veil over fitting card text) is a cover graded by pixels. The R19 honest fade test now uses text that really overflows.
- R20-GPT-04: the `requiresScript` claim compares counted text fingerprints, not composed paths, so a script that only shifts element indices cannot make a static state look script-only.

## Behaviour changes to note (intended by the tiebreak, not false positives)

- A collapsed accordion or a carousel alone is no longer a pass: it needs its open or slide states declared. Partly cut content fails whatever the pattern, so a marquee (R18 set) and a fade-truncated "read more" clamp now fail the width screen.
- Text under a gradient that does not cut overflowing text (R19 `pseudoFade`, R20 `c-fade`, whose text fits) is graded by pixels: its faded last line is unreadable.

## False positives

- R18 honest set, R19 and R20 repro pages (both renderings, backstop plus width screen): 0 false positives under the tiebreak rule. Clips reported are only reveal clips without their declared states, the partly cut patterns above, and true positives (card below the edge, table and nav cut at 320, the clipped card).
- Real built bilingual site (English and Arabic, JavaScript on and off): backstop 0 obscured, 0 unreadable, 0 unmeasured, same counts as R19. Width screen: English passes; the Arabic page fails as it did with the R19 code (b4747e3 checked side by side): a section crops an image (partly clipped) and five links sit 134 px past the left edge at 320. Pre-existing, not changed in R20; reported for the panel.

## Run time

- Glyph measure: two clipped screenshots per axe contrast-incomplete element per rendering (tens of milliseconds each). The width screen's per-clip classification adds no measurable time on the repro pages (0.42-0.5 s per rendering with the backstop); real site 6.3-11.2 s per rendering.
- Fixture script: about 7-12 min on a loaded box (9 more R20 runs). Full suites: about 25 min including the fixture.

## Tests and evidence

- Before/after (`test-results/r20/R20-*-{before,after}.log`; before = b4747e3 sources, documents included):
  - Chrome (panel-r20, panel-r19, width-screen, integrity, handoff-contract): 19 of 32 before (13 assertion failures, 0 load or export errors), 32 of 32 after.
  - Docs: 13 of 14 before, 14 of 14 after. Package: `test_r20_sections` and the r20 archive test FAIL before, 42 OK after.
  - Fixture: fails before at the R20 expectation on collapsed content without reveal states (assertion); exit 0 after.
- Full suites: node 141/141; without deps 78 + 63 SKIPPED; Python guard 10; r2 4 + 4; package 42 (git) / 37 + 5 SKIPPED; self-test PASS; syntax mjs=46, 0 failures; offline lint 0 errors; fixture exit 0 (expected stop on the absent pinned Impeccable binary); Node 20: 135 PASS, 6 FAIL (the same six Style Dictionary tests as R11-R19).
- Headless Chrome 155.0.8059.84 only. The local server for the real site was started and stopped by me (its own PID). Only my own PIDs were stopped; no `pkill`.

## Untested

See `release/UNTESTED.md` (R20). In short: content revealed only at a width other than 1440, vertical writing modes, `clip-path`/mask cuts, reveal states for one language only; `background-clip:text`, blend modes, animated backgrounds and text under about 10 px for the glyph measure, shadow-root text colours; script-only states without a default rendering; a screen's declared type is not checked against the page.

Only GPT reviewed this round; these fixes had no second-model review.
