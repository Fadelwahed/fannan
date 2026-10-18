# Mi'mar R18 changes: panel round 18 (GPT plus Mi'mar cross-check; 8 P2, 1 P3)

Branch `mimar-r4-fixes`, from e0362e6 (draft PR #1). Last code/package commit: 0a9fee3. Written Oct 18 2026, about 10:21 AM Gaza (UTC+3). This is the latest round record: the only file besides the registry that may stay unhashed. The R17 record (`reviews/MIMAR-R17-changes-5888851.md`) is now hashed in the registry.

Inputs: `reviews/panel-r18/MERGED.md` and `r1-gpt.md`. Opus (403) and Grok (402) had no balance and gave no review. Starting state at 9:33 AM: the box checkout was at e0362e6, equal to `origin/mimar-r4-fixes`, clean tree, no processes of mine running.
- `panel-r18/out` was copied after a secret scan (strict credential patterns plus the package's `secret_content()`/`junk_or_secret()`; no hits): `.runner` and `.time` files as `.txt`, raw `.log` files in `test-results/r18/panel-r18-raw/`, repro scripts in `reviews/panel-r18/repro/`. The generated repro pages and the photo stay on the box.

Registry: `trust/R3-CHANGES.sha256` sha256 `5211daabb3ade04652e7402e0ad023f7bef7b436e396f8ab5ef5ff42ccc93921`. Threat model and convergence rule unchanged. Fadel's floors unchanged: desktop first at 1440, WCAG 2.2 AA, no glass (the glass/backdrop-filter hard fail is untouched), spacing units, 320 px reflow plus `desktopWidths` with 1440.

## The backstop's role (Fadel's tiebreak; R18-MIMAR-02, R18-GPT-04)

Pixels decide VISIBILITY, not AA. `contrastProbe({ record: true })` now keeps its verdict per element for the backstop (called without arguments it is unchanged).
- CSS pass resolved the colours and no translucent layer covers the line: pixels fail it only when it is effectively not painted, i.e. fewer than 3 ink pixels or a strongest ink pixel under **1.5:1**. Colours that resolve to at least 3:1 but paint under 1.5:1 are hidden by something the CSS pass cannot see. Light and thin weights that pass AA by colour stay with the CSS pass. The strongest pixel (not the 98th percentile I tried first) was chosen because Lato 100/200 at 12 px in #767676 still measured 1.49 at the 98th percentile.
- CSS pass unknown (background image or gradient, filter, blend, mask, translucent cover): the pixels grade readability at 3:1 on the 90th percentile (1.5:1 under 30 ink pixels), as in R17.
- Covers: only an OPAQUE cover (a replaced element, or a background colour whose alpha times opacity is at least 0.9) obscures. A translucent cover (lighter background, background image or gradient, backdrop filter, other text) makes that line CSS-unknown, so it is graded by its pixels. The 3% layer passes; the gradient fade and the white preloader are still caught.
- Result: the thin-font matrix (Inter, Inter Tight, Lato; 100-400; 12-48 px; three greys) has 0 of 180 failing (59 in R17); the 3% layer is PASS.

## Coverage and clipping (R18-GPT-03, 05, 06, 07, R18-MIMAR-01)

| Item | Fix |
|---|---|
| R18-GPT-07, GPT-03 | Targets are text nodes; each node's word ranges are grouped into line boxes and every line is measured on its own (middle 60% of the line box, so neighbouring descenders do not count). A display:contents wrapper is judged by its nearest ancestor with a box. Full runs: both reveals are `textUnreadable/js-off` mismatches (were PASS). |
| R18-GPT-05 | Lines outside a scrollable ancestor's scrollport are scrolled into view (vertical and horizontal), then the document; every scrolled ancestor is restored afterwards. App shell and tab strip: PASS, 0 unmeasured. |
| R18-MIMAR-01 | A line clipped to nothing by an ancestor that cannot be scrolled is not displayed: new vector field `textHidden`, counted like display:none and graded through the declared states. More hidden text with JavaScript off is a js-off mismatch (script-opened accordion, full run). Absolute and fixed descendants escape clippers as in CSS. Carousel (static and autoplay) and max-height accordion: PASS. |
| R18-GPT-06 | No band cap. A target-directed scan: one look at the top, then each line not yet measured is scrolled into view (a quarter down the viewport; one centred retry for a line measured covered or unpainted). The page bottom is then collected again for at most 4 passes. Early stop at 300 steps, or new content after the last pass, is INCOMPLETE. 40,000 px page: PASS with the far text measured; IntersectionObserver footer: measured; endless list: INCOMPLETE. |

The R17 Chrome test's third case changes accordingly: text clipped to nothing in both renderings was INCOMPLETE and is now PASS with `textHidden` 1 (`tests/panel-r17.test.mjs`, comment in place). `integrity.test.mjs`'s hand-written vector carries `textHidden` (test-only).

## Copy deck (R18-GPT-01 P2, R18-GPT-02 P3)

The copy-deck check moved, unchanged apart from the fix, from `pre-handoff-check.mjs` into `tools/copy-deck.mjs` (`copyDeckProbe`), so it can be tested directly. Displayed native strings and the accessible name are now approved separately:
- a slot's optional `ariaLabel` (or a variant's) approves a name that differs from the displayed text;
- without one, the name must be contained in the approved text;
- a name identical to the displayed value counts once;
- an icon-only control's slot text is its name.
- The contract refuses a placeholder or filler `ariaLabel`.
- Option labels (`label` attribute) are screened (P3, cheap).
- Full runs: `aria-label="Start the service"` with an approved `ariaLabel` gives no copy errors, and `value=Start aria-label=Start` gives none. Without an approved `ariaLabel` the run still reports "accessible name in slot button differs from deck (no ariaLabel approved)".

## False positives

- Honest-pattern set (both renderings): 0 false positives. Covered: sticky and fixed headers, a scrim over a photo, an image with a gradient caption, Arabic with diacritics and emoji, a 160 px heading, icons and underline, a badge overlap, a hidden tooltip, a marquee, the carousels, the accordion, the app shell and the tab strip. Logs: `test-results/r18/R18-honest-patterns.log`; also in `tests/panel-r18.test.mjs` with a generated noise photo.
- The fixed cookie banner still obscures the last paragraph: a true positive, as in the merge.
- The real built bilingual site (English and Arabic, JavaScript on and off): 0 problems (`test-results/r18/R18-real-site.log`).
- One case of my own: a scratch app-shell page with `padding` on a `height:100%` main really cut its last line off below the viewport and was reported. That was correct; the test uses the merge's CSS.

## Run time

- Backstop per rendering: about 0.4 s on the fixture page (two looks minimum; 0.2 s in R17), 0.6-0.9 s with JavaScript-off losses, 1.2 s with a scroll reveal.
- On the real site: 6.3-11.1 s (8-12 steps; R17 took 9-13 s).
- A full checker run takes about 7-8 s (6.5 s in R17). The whole fixture script takes 276 s, against 175 s in R17, because of 9 more R18 runs.
- Full suites: 6 min 29 s.

## Tests and evidence

- Before/after (`test-results/r18/R18-*-{before,after}.log`; before = e0362e6 sources, `copy-deck.mjs` removed):
  - Chrome: 13 of 19 before (all 5 R18 tests and the changed R17 case fail; 6 AssertionError, 0 load or export errors), 19 of 19 after.
  - Docs: 10 of 11 before, 11 of 11 after.
  - Package sections: `test_r18_sections` FAIL before, OK after.
  - Fixture: every R18 expectation false before; exit 0 after.
- Full suites:
  - node 125/125; without deps 74 + 51 SKIPPED; Python guard 10; r2 4 + 4.
  - package 40 (git) / 35 + 5 SKIPPED; self-test PASS; syntax mjs=44, 0 failures; offline lint 0 errors.
  - fixture exit 0 (expected stop on the absent pinned Impeccable binary).
  - Node 20: 119 PASS, 6 FAIL (the same six Style Dictionary tests as R11-R17).
- Headless Chrome 155.0.8059.84 only. The local server for the real site was started and stopped by me (its own PID). Only my own PIDs were stopped; no `pkill`.

## Untested

See `release/UNTESTED.md` (R18). In short:
- other fonts and device scale 2;
- pale photos under thin text where the CSS pass is unknown;
- covers between 3% and 90% opacity other than the gradient fade;
- vertical writing, ruby, overlapping lines, pseudo-element and SVG text;
- `overflow:hidden` panels moved by script (treated as hidden);
- virtualised lists; pages that add content on every step (they stop at the bound);
- `aria-labelledby` and `aria-description` in the copy deck.

Only GPT reviewed this round; these fixes had no second-model review.
