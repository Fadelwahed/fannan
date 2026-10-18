# Mi'mar R22 changes: panel round 22 (GPT plus Mi'mar cross-check; 7 P2, 3 P3)

Branch `mimar-r4-fixes`, from 613f489 (draft PR #1). Last code/package commit: 698734d. Written Oct 18 2026, about 5:45 PM Gaza (UTC+3). This is the latest round record: the only file besides the registry that may stay unhashed. The R21 record (`reviews/MIMAR-R21-changes-c344c5b.md`) is now hashed.

Inputs: `reviews/panel-r22/MERGED.md` and `r1-gpt.md`, plus Fadel's R22 three-zone tiebreak (4:36 PM). Starting state: the box checkout was at d9e1049, equal to `origin/mimar-r4-fixes`, clean tree. The fixes were pushed at about 5:20 PM, once the full Node suite passed (32410f3). The work was interrupted once, at about 5:26 PM. My suite run's fixture (PID 3374269) was allowed to finish (exit 0).
- `panel-r22/out` was copied after a secret scan: strict credential patterns, plus the package's `secret_content()` and `junk_or_secret()` on every copied file. There were no hits; the `.time` and `.runner` files were copied as `.txt`. Raw logs are in `test-results/r22/panel-r22-raw/`; MERGED, the GPT report and the repro scripts are in `reviews/panel-r22/`. The site-server files and the generated html repro pages stay on the box.

Registry: `trust/R3-CHANGES.sha256` sha256 `cb7a044d7e863c79811ac1c7dc27ce0e6d423154d40df7238da745be3ac2bb6d`. The threat model and convergence rule are unchanged. Fadel's floors are unchanged: desktop first at 1440, WCAG 2.2 AA, no glass, spacing units, and 320 px reflow plus `desktopWidths` with 1440.

## Fadel's three zones (text over images, `resolveContrastIncomplete`)

The measure is taken on the faintest real glyph cluster, in either rendering:
- (a) At or above AA × 1.05: PASS, with no review needed.
- (b) Below 3 × 0.95: FAIL. No review overrides it.
- (c) Between the two, or unmeasured: INCOMPLETE. It resolves only with a PASS `wcag-review` that cites the screenshot and has a non-empty `worstRegion`.

The 5% margin is my reading of "clearly". Each node records its `zone`.

## P2 fixes

| Item | Fix |
|---|---|
| R22-GPT-01 | Coverage is geometric. The black and white shots force opacity 1 on the element, its descendants and every ancestor, and strip text-shadow. The composited colour is recovered from the painted shot. A 70% opacity caption measures 7.93:1 (zone a). This holds for opacity on the text, on a span and on an ancestor, and it is resolved through the full gate. |
| R22-GPT-02 | A cluster is dropped only if its box is at most 0.25 em in both directions AND its background is solid. Thin letters are always kept. "ill fill lilt" at 12 and 14 px over a #e6e6e6 patch measures 1.25:1 (zone b) and stays blocked through the full gate, even with `worstRegion`. |
| R22-MIMAR-01 | The transparent (background) shot keeps the author's text-shadow, so each glyph core is graded against the halo. A strong-halo hero resolves through the full gate. A weak shadow fails. |
| R22-GPT-03 | Fallback content inside video, audio, object and canvas is not width-screen content and not a visibility-backstop target. The panel's video page went from `partly clipped` and 1 unmeasured to pass. |
| R22-GPT-04 | Links, summary and the ARIA widget roles are content, measured by their box and accessible name. Names come from aria-labelledby, aria-label, labels, rendered content with alt text, title, placeholder and value. An icon-only link hidden at 320 fails. |
| R22-GPT-05 | Prints are typed: `text:<text>` and `<role>:<name>`. A heading no longer saves a lost button. A hidden aria-labelledby checkbox fails. |
| R22-GPT-06 | A truncation needs one declared state that shows every whole and partial item at that width. A control inside a clamp is `partly clipped` and is never excused. |

## P3 fixes

- **R22-MIMAR-02:** text inside a control belongs to the control. A shown name whose words are in-order prefixes of the 1440 name's words matches ("Demo" for "Request a demo"). A wordmark link left with no name still fails.
- **R22-GPT-07:** the contract now uses GPT's measure wording, plus `worstRegion` and the zones. A docs test rejects percentile acceptance wording. I added the content-visibility and popover regressions: they pass at d9e1049 and fail against the 700297d width screen.
- **R22-GPT-08:** GPT's read-more qualifications are now in the plan, the quality matrix and the contract.

## Behaviour changes to note

- **Clear passes no longer need a review.** Zone (a) passes without one, so the R19 "uncited review" scrim hero now resolves. The two R19 tests and the fixture expectation were updated to match.
- **A nowrap nav cut at 320** is now reported as `partly clipped`, because links are controls. It used to be `shown at 1440, lost at this width`, and it still fails.
- **Exact #767676 small text** (4.54:1) lands in zone (c) when axe returns incomplete. It needs a review that names the worst region.

## False positives

- **R18 to R22 honest sets** (both renderings): backstop and width results are identical to R21 on every R18-R21 page, apart from the two notes above. The other differences are typed lost prints, and the video page no longer counting its fallback text. On the R22 pages, the remaining failures are true positives, the panel's misses, and fixed-width (1200 px) repro pages.
  - The true positives are: icon link, aria-labelledby checkbox, button under a heading, wordmark, clamp with paragraph two hidden.
  - **Two calls are left to Fadel:**
    - `e-shadowCaption` measures 2.52:1 at the letters over the light end of its gradient, so it is zone (b), FAIL. The halo is graded under each glyph core; halo pixels outside the glyph get no credit.
    - `e-rewordHeading` fails, because text matches only text.
  - With those two as judged, there are **0 false positives**.
- **Real built bilingual site** (English and Arabic, JavaScript on and off): 0 obscured, 0 unreadable, 0 unmeasured. The width screen passes in both languages, including with a declared menu-open state.

## Tests and evidence

- **Before/after** (`test-results/r22/`; before means the d9e1049 sources, documents included):
  - Chrome: 46 of 54 before (8 assertion failures), 54 of 54 after.
  - Docs: 15 of 16 before, 16 of 16 after.
  - Package: 2 FAIL before, 44 OK after.
  - Fixture after: exit 0.
  - The R22 unit test for `glyphRatio` bites before only on dot dropping and `zoneOf`. The thin-letter bite is in the Chrome test, where R21 measured 14.64:1.
- **Full suites:**
  - Node: 159 of 159 pass. Without deps: 82 pass, 77 skipped.
  - Python guard: 10. r2: 4 + 4.
  - Package tests: 44 (git) / 39 + 5 skipped. Self-test passes.
  - Syntax: mjs=48, 0 failures. Offline lint: 0 errors.
  - Fixture: exit 0, the expected stop on the absent pinned Impeccable binary.
  - Node 20: 153 pass, 6 fail (the same six Style Dictionary tests).
- **Environment:** headless Chrome 155.0.8059.84 only. I started and stopped the local real-site server myself (its own PID). I stopped only my own PIDs, with no `pkill`.

## Untested

See `release/UNTESTED.md` (R22). In short:
- **Contrast measure:** text-stroke outlines, drop-shadow filters, blend modes, background-clip text, animated opacity, fonts other than the box default, and sizes under 11 px.
- **Content checks:** `object` with failed data, and the simplified accessible-name walk.
- **Fadel's rules not enforced:** the content of `worstRegion` is not validated, and a clamp whose full content is split across states fails by design.

Only GPT reviewed this round; these fixes had no second-model review.
