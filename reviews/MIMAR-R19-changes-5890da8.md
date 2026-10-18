# Mi'mar R19 changes: panel round 19 (GPT plus Mi'mar cross-check; 5 P2, 3 P3)

Branch `mimar-r4-fixes`, from 613f489 (draft PR #1). Last code/package commit: 5890da8. Written Oct 18 2026, about 12:05 PM Gaza (UTC+3). This is the latest round record: the only file besides the registry that may stay unhashed. The R18 record (`reviews/MIMAR-R18-changes-0a9fee3.md`) is now hashed in the registry.

Inputs: `reviews/panel-r19/MERGED.md` and `r1-gpt.md`. Starting state at 10:41 AM: the box checkout was at 613f489, equal to `origin/mimar-r4-fixes`, clean tree, no processes of mine running. The work was interrupted twice (about 11:31 AM the last time); an orphaned "R19 after" fixture run of mine was left to finish (exit 0) and nothing else was stopped.
- `panel-r19/out` was copied after a secret scan (strict credential patterns plus the package's `secret_content()`/`junk_or_secret()`; 18 files, no hits): `.runner` and `.time` files as `.txt`, raw `.log` files in `test-results/r19/panel-r19-raw/`, repro scripts in `reviews/panel-r19/repro/`. The generated repro pages and the photo stay on the box.

Registry: `trust/R3-CHANGES.sha256` sha256 `e32df0e1db7be1254e11948963893bb2534c7f88cc80bbae1c39f342352b6ca3`. Threat model and convergence rule unchanged. Fadel's floors unchanged: desktop first at 1440, WCAG 2.2 AA, no glass (the glass/backdrop-filter hard fail is untouched), spacing units, 320 px reflow plus `desktopWidths` with 1440.

## P2 fixes

| Item | Fix |
|---|---|
| R19-GPT-01 (false positive) | `width-screen.mjs`: a hidden/clip box that cannot scroll does not record a clip when all its overflowing content is wholly outside its inner box and either the box is collapsed (no inner width or height: a max-height:0 accordion) or the content lies beyond the inline-end or block-end edge (the next carousel slides; left in RTL). Content cut partly, and content pushed wholly past the start edge (left in LTR, above the top), still fail; the R12 M02 and R13 N03 cases stay failures (the first version exempted them too and broke two width tests in the full suite; fixed and an RTL carousel and a start-edge case added). Full run: carousel plus accordion `widths.pass` true on the page and its state. |
| R19-GPT-02 (miss) | Covers the hit test cannot see. A positioned `::before`/`::after` that paints, on the text's element or any ancestor, and a positioned `pointer-events:none` layer that paints (not an ancestor or descendant of the text) are possible covers: a line under one at more than half its points is CSS-unknown and graded by pixels at 3:1. Negative z-index layers are skipped. A gradient pseudo-element on an ancestor that clips its content is a truncation fade: the lines under it are not displayed (keeps the "read more" clamp PASS). Full runs: script-removed `::after` veil `textUnreadable/js-off`; pointer-events:none 70% veil `textUnreadable/rendered`. |
| R19-GPT-04 (miss) | After the document bottom look, every visible inner scrollport is scrolled to its end and looked at; new content starts another pass (same 4-pass / 300-step bounds, INCOMPLETE if still growing). Full run: `#eee` text an IntersectionObserver (root = main) adds is `textUnreadable/rendered`. |
| R19-MIMAR-01 (false positive; Fadel's tiebreak) | `resolveContrastIncomplete` (visibility.mjs). The backstop records, per element (composed path), the lowest 90th-percentile pixel ratio of its lines and whether every line was measured uncovered. An axe `color-contrast` incomplete node is resolved only if both the scripted and the JavaScript-off scans measured that exact element complete at 4.5:1 (3:1 large) or above and a PASS `wcag-review` record for the scope cites the screenshot (artifact = the state's frame or the checker's screenshot, or the note names one). Any other incomplete rule or failing node stays blocking. State pass and the positional page's `axe.pass` use it (`axeIncompleteUnresolved`, `contrastNodes` in the evidence). Full runs: photo hero with scrim plus citing record resolved; dark text (1.63:1) and an uncited record stay blocking. |
| R19-MIMAR-02 (false positive; Fadel's tiebreak) | On a declared state other than `default`, the scan respects the top layer: with a `:modal` dialog (or a shown `aria-modal="true"` element) the rest of the page is inert and counted as hidden; page text an open popover covers is not graded; the dialog's and popover's own text are graded. A non-modal `<dialog open>` is not inert: covered text stays graded (obscured). Full runs: modal state integrity PASS (`textHidden` 3); non-modal dialog over the page `textObscured/rendered`. |

## P3 fixes (all cheap)

- R19-GPT-03: an SVG over text is a translucent cover (graded by pixels) rather than opaque; the decorative wave is PASS.
- R19-GPT-05: a name taken by `aria-labelledby` from a hidden or undisplayed element is an accessible name the copy deck must approve; references to displayed text stay displayed copy.
- R19-GPT-06: the contract requires an approved `ariaLabel` (slot or variant) to appear in its cited source. The fixture brief gained the line "Start the service" so the R18 approved-name run still has no contract error; a new run with an uncited name reports `copy button: ariaLabel absent from cited source`.

## Open decision for Fadel

A declared modal-dialog state opened by script is now integrity PASS, but in the fixture run axe still reports `color-contrast` incomplete on the dialog's own text, and the JavaScript-off rendering cannot show the dialog, so "measured at AA in BOTH renderings" cannot hold: under the MIMAR-01 rule it stays blocking. I kept the rule as written. Options: accept the scripted rendering alone for text that exists only in a declared top-layer state, or keep it blocking.

## False positives

- R18 honest set and R19 repro pages (both renderings): 0 false positives. Problems reported are only true positives (fixed cookie banner, the 70% veil, dark text on a dark image) and the round's misses, now caught (pseudo veil with JS off, pointer-events:none veils, inner and document lazy light text, R18 display:contents and partial-clip reveals with JS off). The dialog and popover repros report obscured text only as a default state; as declared states they are clean. Honest R19 additions PASS: read-more fade, SVG wave, PNG sticker, focus ring, sticky table header, pseudo-element underline and accent bar, z-index -1 scrim. Log: `test-results/r19/R19-honest-patterns.log`; also in `tests/panel-r19.test.mjs`.
- Real built bilingual site (English and Arabic, JavaScript on and off): 0 obscured, 0 unreadable, 0 unmeasured, same counts as R18 (`test-results/r19/R19-real-site.log`).

## Run time

- Backstop per rendering: 0.36-0.4 s on small pages (unchanged), about 1.1 s with an inner scrollport that loads content; real site 6.4-11.2 s (8-12 steps, as in R18).
- Fixture script: about 5.7 min (10 more R19 runs). Full suites: about 8 min.

## Tests and evidence

- Before/after (`test-results/r19/R19-*-{before,after}.log`; before = 613f489 sources, documents included):
  - Chrome (panel-r19, r18, r17, integrity, handoff-contract): 19 of 26 before (all 6 R19 tests and the contract test with the GPT-06 assertion fail; assertion failures only, no load or export errors), 26 of 26 after.
  - Docs: 11 of 12 before, 12 of 12 after. Package sections: `test_r19_sections` FAIL before, OK after.
  - Fixture: the R19 expectations fail before at the assertion (only the non-modal guard was already true); exit 0 after.
- Full suites:
  - node 132/132; without deps 75 + 57 SKIPPED; Python guard 10; r2 4 + 4.
  - package 41 (git) / 36 + 5 SKIPPED; self-test PASS; syntax mjs=45, 0 failures; offline lint 0 errors.
  - fixture exit 0 (expected stop on the absent pinned Impeccable binary).
  - Node 20: 126 PASS, 6 FAIL (the same six Style Dictionary tests as R11-R18).
- Headless Chrome 155.0.8059.84 only. The local server for the real site was started and stopped by me (its own PID). Only my own PIDs were stopped; no `pkill`.

## Untested

See `release/UNTESTED.md` (R19). In short: vertical writing modes and carousels with inactive slides before the active one (width screen); pseudo-elements positioned with percentages, calc() or transforms, masks on layers; nested scrollports; nested modals, script-set `inert`, fullscreen and other UA top-layer surfaces; axe targets inside shadow roots or frames (stay blocking); the resolver uses the 90th-percentile ratio of each line, not a per-glyph minimum; dark text over a photo the CSS pass resolves against the page background passes the backstop when its peak is at least 1.5:1 (axe's incomplete keeps it blocked).

Only GPT reviewed this round; these fixes had no second-model review.
