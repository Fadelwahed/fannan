# Mi'mar R17 changes: panel round 17 (GPT plus Mi'mar cross-check; 4 P2, 1 P3)

Branch `mimar-r4-fixes`, from 86e2a31 (draft PR #1). Last code/package commit: 5888851. Written Oct 18 2026, about 9:17 AM Gaza (UTC+3). This is the latest round record: the only file besides the registry that may stay unhashed. The R16 record (`reviews/MIMAR-R16-changes-5980d2e.md`) is now hashed in the registry.

Inputs: `reviews/panel-r17/MERGED.md` and `r1-gpt.md`. Opus (403) and Grok (402) had no balance and gave no review. Starting state at 8:14 AM: the box checkout was at 86e2a31, equal to `origin/mimar-r4-fixes`, with a clean tree. The work was interrupted once (about 9:04 AM) while a before/after run was being spawned; nothing had been pushed; at 9:05 AM no processes of mine were left over and the run was redone from scratch.
- `panel-r17/out` was copied after a secret scan (strict credential patterns plus the package's `secret_content()`/`junk_or_secret()`; no hits): `.runner` and `.time` files as `.txt`, raw `.log` files in `test-results/r17/panel-r17-raw/`, repro scripts in `reviews/panel-r17/repro/`. The repro screenshots stay on the box (`.png` is not an allowed suffix).

Registry: `trust/R3-CHANGES.sha256` sha256 `7dd565c100cce4122da1db62eaed38e06c3242aef1dd59a4bbc3c6043039dc2e`. Threat model and convergence rule unchanged. Fadel's floors unchanged: desktop first at 1440, WCAG 2.2 AA, no glass (the glass/backdrop-filter hard fail is untouched), spacing units, 320 px reflow plus `desktopWidths` with 1440.

## Root cause and the backstop (R17-MIMAR-01 P2, R17-GPT-02 P2, R17-MIMAR-02 P3)

Rounds 15-17 each found one more CSS way to hide text. Instead of another property, `tools/visibility.mjs` adds a rendered-visibility backstop; the CSS computation in `contrastProbe` stays the first pass. In both renderings (JavaScript on and off) every element with its own rendered text, every control showing text (value, placeholder, chosen option) and every named element without painted text (accessible name, hit test only) is measured per half-viewport band, after finite animations end and the painted state of every element is unchanged about 100 ms apart (2 s bound).
- (a) hit test: `elementsFromPoint` (document and shadow roots) at up to three points per line; a different element that paints there covers the text; more than half covered = obscured.
- (b) pixels: viewport screenshot of the band; background = modal colour of the text boxes; ink = pixels more than 24 off in a channel; ratio = 90th percentile ink contrast. Unreadable below 3:1 (1.5:1 for under 30 ink pixels, a single thin glyph), with fewer than 3 ink pixels, or text under 4 px high.
- Unmeasurable (no box, clipped to nothing, off-screen, too few pixels, never wholly in one viewport) = INCOMPLETE. sr-only text and off-screen skip links (same rules as the width screen) and disabled controls are counted, not graded.
- New vector fields `textMeasured` (coverage), `textObscured`, `textUnreadable`, `textUnmeasured`. Obscured or unreadable with JavaScript on fails (`integrity mismatch`); worse with JavaScript off is a `js-off` mismatch, and a reviewed `jsOffDifferences` entry never makes it PASS. The scan runs once per rendering in the probe world and feeds both world vectors.
- CSS pass: `::placeholder` opacity is composited with its own font size and weight; `-webkit-text-fill-color` is read.
- **Chrome and full pre-handoff runs:** clip-path, `scale(.02)`, a white preloader, `::placeholder` opacity, text-fill colour and a gradient fade, each removed by script, are JavaScript-off mismatches; a permanent fade and a faint fill fail with JavaScript on; text clipped to nothing is INCOMPLETE.

## Other P2

| Item | Result |
|---|---|
| R17-GPT-01 | FIXED (`contentProbe`). A control's displayed value is recorded apart from its accessible name (button-type inputs show their value or the browser default label). The aria-labelled submit whose value only script sets: on `['input:submit','Start now','Start now']`, off `[…,'']`, `content/js-off`, pass false (Chrome and full run). |
| R17-GPT-03 | FIXED. `designProbe` screens button values, placeholders, every option label, datalist options, `aria-label`, `alt` and `title` for placeholders and filler; `copyProbe` requires values, placeholders, option labels and `aria-label` to sit in a slot whose deck text contains them. Full run: `[placeholder]` and `Lorem ipsum` native strings fail the deck and set `placeholders`. |
| Filter decision | Kept fail-closed. GPT's sentence is in `design-quality.md` and mirrored in `handoff-contract.md`; the pixel-measured exception is listed there as ENH backlog, not built. |

## False positives on healthy pages

- First version (cc052a8) on a built bilingual company site (GSAP reveals, served locally, external requests blocked): false positives for a closed `<details>` menu, a `display:none` menu, an off-screen skip link, script-driven tweens measured mid-way, and footer text never measured because the page grew while scrolling. Fixed in 6cf06d8, plus disabled controls and thin single glyphs (seen on draft pages). The regression with these patterns failed against cc052a8 (`test-results/r17/R17-healthy-real-site-patterns-first-version.log`) and passes now.
- After the fixes: that site (English and Arabic, JavaScript on and off) has no findings; the fixture page stays PASS; the Chrome healthy, animated and real-pattern pages pass. Twenty draft section pages showed only text the CSS pass also fails (light grey labels, faded placeholders) — true positives.

## Run time

Backstop per rendering: about 0.2 s on the fixture page (1.2 s with a scroll reveal), about 2.6 s on a 13-band synthetic page, about 9-13 s on the real site (13 bands; most of it is Chrome screenshots after scrolling and GSAP settle). A full checker run on the fixture went from about 5.8 s to 6.5 s; the whole fixture script from 136 s (before) to 175 s (after, same R17 runs).

## Tests and evidence

- Before/after (`test-results/r17/R17-*-{before,after}.log`, before = 86e2a31 sources, `visibility.mjs` removed): Chrome 0/6 then 6/6 (6 AssertionError, 0 load or export errors); docs 9/10 then 10/10; package sections FAIL then OK; fixture before `{"clipPath":false,…,"nativeCopy":false,"healthyReveal":true}`, after exit 0.
- Test-only update: `integrity.test.mjs`'s hand-written vector carries the four new fields; JavaScript-off unmeasurable text is INCOMPLETE (mismatch still recorded), like `contrastEffects`.
- Full suites: node 119/119; without deps 73 + 46 SKIPPED; Python guard 10; r2 4 + 4; package 39 (git) / 34 + 5 SKIPPED; self-test PASS; syntax mjs=42, 0 failures; offline lint 0 errors; fixture exit 0 (expected stop on the absent pinned Impeccable binary); Node 20: 113 PASS, 6 FAIL (the same six Style Dictionary tests as R11-R16).
- Headless Chrome 155.0.8059.84 only; browsers closed by the scripts; only my own PIDs were ever stopped; no `pkill`.

## Untested

See `release/UNTESTED.md` (R17). In short: text over photos, video or canvas; very thin or tiny fonts near the floors; pseudo-element, SVG and closed-shadow-root text; horizontally scrolled containers (clipped text is INCOMPLETE); autoplay carousels (measured mid-motion at the 2 s bound); other viewports and device scales; very long pages (60-band cap, then INCOMPLETE); `pointer-events:none` covers are caught by pixels only; datalist, `aria-description`, file and date pickers. Only GPT reviewed this round; these fixes had no second-model review.
