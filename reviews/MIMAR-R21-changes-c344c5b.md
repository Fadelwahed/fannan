# Mi'mar R21 changes: panel round 21 (GPT plus Mi'mar cross-check; 5 P2, 3 P3)

Branch `mimar-r4-fixes`, from 613f489 (draft PR #1). Last code/package commit: c344c5b. Written Oct 18 2026, about 4:19 PM Gaza (UTC+3). This is the latest round record: the only file besides the registry that may stay unhashed. The R20 record (`reviews/MIMAR-R20-changes-9cfad70.md`) is now hashed.

Inputs: `reviews/panel-r21/MERGED.md` and `r1-gpt.md`, plus Fadel's R21 tiebreaks (2:38 PM). Starting state: the box checkout was at 700297d, equal to `origin/mimar-r4-fixes`, clean tree. The work was interrupted once (about 3:28 PM). After it I stopped only my own "R21 after" fixture run (PID 2937713 and its children), because I then changed the fixture's one-word-patch run to the panel's one-line caption, and ran that fixture again before and after.
- `panel-r21/out` was copied after a secret scan (strict credential patterns plus the package's `secret_content()`/`junk_or_secret()`; 26 files, no credential hits; only the `.time`/`.runner` names were flagged as junk by extension, so they were copied as `.txt`): raw `.log` files in `test-results/r21/panel-r21-raw/`, repro scripts in `reviews/panel-r21/repro/`. The site-server files and the generated html/png repro files stay on the box.

Registry: `trust/R3-CHANGES.sha256` sha256 `3929602859db9488d002b4682f6b58b95dcf17012a32d353ac83b5601c0ce566`. Threat model and convergence rule unchanged. Fadel's floors unchanged: desktop first at 1440, WCAG 2.2 AA, no glass, spacing units, 320 px reflow plus `desktopWidths` with 1440.

## P2 fixes

| Item | Fix |
|---|---|
| R21-MIMAR-01 (= R21-GPT-01) | `width-screen.mjs`: the clipping rules apply to text and controls only. Media (img, svg, video, canvas) is left out of every cut set; a hidden/clip box whose cut set is empty or only media and decoration is not a clip (recorded in `mediaCrops`, information only). Text and controls inside a cropped media wrapper are still checked; iframe/object/embed stay content. A marquee still fails. |
| R21-MIMAR-02 | `shown` requires `checkVisibility()` (display:contents boxes are judged by their nearest boxed ancestor), so the links of a closed `<details>` menu, `content-visibility: hidden` and closed popovers are not on screen. Found on the way: in right-to-left pages content past the right (start) edge is lost too; it is now reported in `offscreenLeft` with `side: 'right'`. Off-screen and unreachable content does not count as shown. |
| R21-GPT-04 | Each width records the prints (normalised text, or a control's accessible name) it shows; text or a control shown at 1440 and not shown at a width is `lost` there and fails unless the same print is shown at that width in the same state or in a declared state (`reachableIn`, resolved by `resolveReveals`; DEFERRED in wireframes). |
| Read-more clamp (Fadel's note) | A partial cut by `line-clamp` or `text-overflow: ellipsis` is rule `truncated` and passes only when a declared state shows the full text at that width; other partial cuts still fail. |
| R21-GPT-02 | `glyphContrast` takes four shots (painted, transparent, black and white text). Coverage comes from black versus white, so it does not depend on the text's contrast. The text colour is recovered in every glyph-core pixel (coverage of at least 75%) and graded against its own background. Each cluster counts its median pixel, and the element's ratio is the minimum over clusters. Punctuation-size clusters (under 12 core pixels) over a solid background are dropped only while larger clusters remain. Documented in `design-quality.md`. The one-word 1.67:1 case fails through the full gate with the authored PASS `wcag-review`. |
| R21-GPT-05 | `stateOnlyContent` keeps N14. A default slot that the scripted state no longer shows is dropped from the JavaScript-off baseline only when the copy deck does not place it in that state. New content passes only as approved slots that are placed in the state and absent from the baseline. Changes to shared copy, and a replaced slot still placed in the state, stay INCOMPLETE. |

## P3 fixes (all cheap)

- R21-GPT-03: reveals (and truncations and losses) are matched by print, not DOM path: an expanded state with an extra wrapper reveals the answer; an unrelated sentence at the same position does not.
- R21-GPT-06: the `requiresScript` claim compares counted word tokens, so `Static <span>state</span> text` is still static.
- R21-GPT-07: `copy-truth` is stated for every screen type in the rubric, design-quality and the contract (`functional` is for task screens without promotional hero copy; `generic-hero` adds the swap test on marketing and landing screens).

## Behaviour changes to note (intended by the tiebreaks, not false positives)

- An `overflow:hidden` box that cuts nothing is no longer a clip (R20 reported the R20 panel's `case-cardPartial` as `clip` with an empty cut set; its text sits fully inside the padding box, so it now passes at 1440). The R5 wide-layout test (`ARGON-R5-02`) now carries right-aligned content past 1280, so the layout is still caught by what it cuts.
- A responsive page that hides desktop text at 320 with nothing equivalent fails; a mobile menu needs its `menu-open` state declared unless the same link texts are shown elsewhere at 320 (the real site's footer repeats them).
- The R20 10th-percentile glyph measure is retired, along with its sentence in `design-quality.md`. The R20 `glyphRatio` unit test now passes coverage shots and asserts the minimum.

## False positives

- R18 honest set and R19-R21 repro pages (both renderings): backstop counts are identical to R20 on every R18-R20 page. Width failures are only reveal clips without their declared states, partly cut text (marquee, clipped cards), true positives (table and nav cut at 320, the hidden Subscribe line), and fixed-width repro pages wider than 320 (horizontal overflow, the same as R20). All the R21 media-crop pages pass. **0 false positives.**
- Real built bilingual site (English and Arabic, JavaScript on and off): backstop 0 obscured, 0 unreadable, 0 unmeasured. The width screen passes in both languages, and **the Arabic page now passes** (the image crop is a media crop; the closed-menu links are not on screen, and the footer shows the same link texts at 320). With the menu opened as a declared state, both languages pass too. Nothing to report to the website team.

## Run time

- Glyph measure: four clipped screenshots per axe contrast-incomplete element per rendering (tens of milliseconds each). Width screen: no measurable change on the repro pages; real site 6.4-11.4 s per rendering, with the backstop.
- Fixture script: about 12-13 min (8 more R21 runs). Full suites: about 30 min, including the fixture.

## Tests and evidence

- Before/after (`test-results/r21/R21-*-{before,after}.log`; before = 700297d sources, documents included):
  - Chrome (panel-r21, panel-r20, panel-r19, panel-r13, width-screen, integrity, handoff-contract): 37 of 47 before (10 assertion failures, 0 load or export errors), 47 of 47 after.
  - Docs: 13 of 15 before, 15 of 15 after. Package: `test_r21_sections` and the archive test FAIL before, 43 OK after.
  - Fixture: fails before at the R21 expectations (image crop, hidden CTA, menu declared and undeclared, one-word patch, slot replacement; assertion); exit 0 after.
- Full suites: node 151/151; without deps 80 + 71 SKIPPED; Python guard 10; r2 4 + 4; package 43 (git) / 38 + 5 SKIPPED; self-test PASS; syntax mjs=47, 0 failures; offline lint 0 errors; fixture exit 0 (expected stop on the absent pinned Impeccable binary); Node 20: 145 PASS, 6 FAIL (the same six Style Dictionary tests as R11-R20).
- Headless Chrome 155.0.8059.84 only. The local server for the real site was started and stopped by me (its own PID). Only my own PIDs were stopped; no `pkill`.

## Untested

See `release/UNTESTED.md` (R21). In short: `clip-path`/mask crops, canvas text, pseudo-element text, `aria-labelledby` names, a control renamed at 320, `content-visibility: auto` and `hidden="until-found"`, vertical writing modes; for the glyph measure, `background-clip:text`, blend modes, animated backgrounds, emoji and icon fonts, text-shadow halos and shadow-root text colours; slot replacement inside shadow roots; tokenising scripts without spaces between words.

Only GPT reviewed this round; these fixes had no second-model review.
