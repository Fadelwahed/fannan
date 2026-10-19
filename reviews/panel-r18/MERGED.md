# Fannan panel, round 18: merged review (Mi'mar cross-check)

Head: `e0362e6` (Fadelwahed/fannan, mimar-r4-fixes), fresh clone at /workspace/panel-r18/fannan (status clean after the run).
Scope: `git diff 86e2a31..e0362e6`, reviews/MIMAR-R17-changes-5888851.md, release/UNTESTED.md, reviews/panel-r17/MERGED.md. Threat model: honest but sloppy authors; deliberate obfuscation = ENH. Convergence: a pass needs zero P0/P1/P2. A false positive that blocks an honest, well-built page is also graded P2.
Guard: run.sh exits 99 unless every path contains `panel-r18` and the clone HEAD is e0362e6. Self-test with the panel-r17 prompt: rc 99. ID line R18-GPT-NN; GPT used it.

## Participants (Gaza time, UTC+3)
| Reviewer | Window | Result | Cost |
|---|---|---|---|
| Grok CLI (one test) | 9:18:46–9:18:56 AM | 402: Grok Build usage balance exhausted | none |
| Opus 5.5 (one health call) | 9:18:56–9:18:57 AM | 403: Insufficient account balance, so no review | $0 |
| GPT-6.1-Sol (codex-dce, read-only, high) | 9:18:57–9:23:37 AM (280 s) | 7 findings | 104,041 tokens (ChatGPT plan, no $ reported) |

## Mi'mar re-checks (box, scratch copies only)
- At e0362e6: panel-r17, r16, r15, handoff-contract, designer-process, integrity and width-screen tests are 39/39 pass. Package tests are 39 OK.
- The R17 tests bite. Run against the 86e2a31 sources with visibility.mjs removed, 7 of 25 fail: R17 docs, plus all six R17 Chrome tests (including "healthy pages pass", which fails because nothing is measured). There are 14 ERR_ASSERTION lines and 0 load or export errors; the 18 passing tests are older ones. With the 86e2a31 package-r3.py, 2 package tests FAIL (zip contents for r17 evidence, test_r17_sections).
- Chrome probes (repro/repro18.mjs, repro18b.mjs) and full pre-handoff fixture runs (out/mimar-fixture-r18.log, mimar-fixture-r18b.log). The fixture baseline is integrity PASS.
- Honest patterns that came out clean (no false positive):
  - sticky header and fixed header over long content;
  - white text over a noisy photo with an rgba scrim, and a figcaption with a gradient scrim over an `<img>`;
  - Arabic with full diacritics, mixed RTL/LTR digits, emoji;
  - a 160 px heading spanning lines;
  - inline SVG icon in a link, an underline, an icon-only button with aria-label;
  - an overlapping "New" badge;
  - a tooltip hidden by visibility;
  - an infinite CSS marquee.
- A fixed cookie banner covers the last paragraph in every band, so that paragraph is obscured. I judge that a true positive (the content really is covered) and did not file it.

## Status of R17 items
| Item | GPT | Mi'mar |
|---|---|---|
| R17-GPT-01 value vs accessible name | FIXED | **FIXED** (tests bite) |
| R17-GPT-02 placeholder opacity | FIXED | **FIXED** |
| R17-GPT-03 native copy | PARTIAL | **PARTIAL.** Screening and deck matching work, but deck matching has a false positive (R18-GPT-01). |
| R17-MIMAR-01 visibility backstop | PARTIAL | **PARTIAL.** The original clip-path, scale and preloader cases are caught. It misses display:contents text and partial clips (R18-GPT-03/07), and raises false positives on honest pages (R18-GPT-04/05/06, R18-MIMAR-01/02). |
| R17-MIMAR-02 text-fill / overlay fade | PARTIAL | **PARTIAL.** Text-fill is read and a hit-testable overlay is caught. A partially hidden multi-line element still passes (R18-GPT-07). |

## Findings (every row was run in Chrome 155 through the full pre-handoff checker unless noted)
| ID | Part | Kind | GPT | Mi'mar verification | Final |
|---|---|---|---|---|---|
| R18-GPT-01 | A | false positive | P2 | **Confirmed.** `<input type=submit data-copy-slot=button value=Start aria-label=Start>` gives "copy slot button differs from deck", because slotText concatenates to "Start Start". `<button data-copy-slot=button aria-label="Start the service">Start</button>` gives "native copy … differs from deck: Start the service", although an expanded name that contains the visible label is good practice (WCAG 2.5.3). The deck has no way to approve a separate accessible name. | **P2 agreed** |
| R18-GPT-02 | A | miss | P2 | **Confirmed.** `<option label="[placeholder]">Basic plan</option>` displays "[placeholder]" but `placeholders=false`; only "Basic plan" is seen. | **P3 (tiebreak).** The `label` attribute on `<option>` is rarely authored; not an ordinary pattern. |
| R18-GPT-03 | A | miss | P2 | **Confirmed.** A `<section style="clip-path:inset(0 100% 0 0)">` reveal holding `<span style="display:contents">text</span>`, with the clip removed by script, is integrity **PASS**. The same reveal with a normal span is a `textUnreadable/js-off` mismatch. visibility.mjs:107 requires `getClientRects().length`. The threat model names display:contents wrappers explicitly. | **P2 agreed** |
| R18-GPT-04 | A | false positive | P2 | **Confirmed.** A sibling `position:absolute;inset:0;background:rgba(255,255,255,.03)` layer over card text is a `textObscured/rendered` integrity mismatch (FAIL), though pixels are ~unchanged. The rule at visibility.mjs:95 is alpha > 0.02. | **P2 agreed** |
| R18-GPT-05 | A | false positive | P2 | **Confirmed.** An app shell (`html,body{height:100%;overflow:hidden} main{height:100%;overflow:auto}`) with 30 paragraphs gives 8 elements "cannot measure" in both worlds, plus `textUnreadable/rendered`, so FAIL. Chrome direct scan of a horizontal `overflow-x:auto` tab strip: 8 of 18 tabs "clipped to nothing", so INCOMPLETE. Only the document is scrolled. | **P2 agreed** |
| R18-GPT-06 = pre-identified band cap | A | false positive + miss | P2 | **Confirmed, two-sided.** (a) Static text at 40,000 px: scan stops at 60 bands (~11 s), text "never wholly inside one viewport", so INCOMPLETE. That fails closed, but on a healthy page. (b) A footer that IntersectionObserver inserts when scrolled near, beyond the cap: never created, never counted, so integrity **PASS** (full run). This is the "uncounted rather than INCOMPLETE" case. | **P2 agreed.** Parent tiebreak applied: a capped scan must report INCOMPLETE (never PASS) until coverage is complete; static text beyond the cap must be reached, not just flagged. |
| R18-GPT-07 | A | miss | P2 | **Confirmed.** A 3-line `<p style="clip-path:inset(0 0 66% 0)">` reveal removed by script is integrity **PASS** with JS off (2 of 3 lines hidden). Pixels are pooled per element and the 90th-percentile ink of the one visible line decides. | **P2 agreed** |
| R18-MIMAR-01 | A | false positive | new | **Confirmed.** Two standard patterns are integrity **INCOMPLETE** in both worlds (2 and 1 elements "cannot measure"): a carousel (`overflow:hidden` track, inactive slides beside it) and an accordion collapsed with `max-height:0;overflow:hidden`. Direct scan, with or without autoplay: "clipped to nothing". Any page with a slider or a CSS accordion can never pass. Not covered by GPT-05, because these regions are not scrollable. | **P2** |
| R18-MIMAR-02 | A | false positive | new | **Confirmed.** `font:300 14px Lato; color:#767676` (4.54:1, passes AA by colour and passes the CSS pass) measures 2.58 in pixels, so it is a `textUnreadable/rendered` integrity mismatch (FAIL). Matrix in out/mimar-repro-r18-thin.log, 59 of 180 combos below the floor: Inter/Inter Tight 200 at 16 px #767676 (2.96–2.99), Lato 300 at 12 px #595959, Lato 100/200 at 48 px grey, Inter 100 at 24 px. Weights 300–400 at ≥16 px pass. The 3:1 floor on the 90th-percentile antialiased ink fails WCAG-compliant light weights, contradicting the backstop's own comment that "AA stays with the CSS pass". | **P2** |

Agreed: R18-GPT-01, 03, 04, 05, 06, 07. Downgraded: R18-GPT-02 to P3. Added by Mi'mar: R18-MIMAR-01, R18-MIMAR-02 (P2). Rejected: none.

## Fix direction (for the implementer)
1. **Grading.** When the CSS pass resolved a text element (known colours, no effects, AA met) and the hit test is clear, pixels must not fail it. Fail on pixels only when the CSS pass could not resolve the element, or when the measured ratio is far below the CSS-predicted ratio (for example under half of it). This fixes MIMAR-02 without losing the R17 cases.
2. **Coverage by line.** Measure per line box or text run, so a hidden line fails (GPT-07). Choose targets from text-node ranges, not element boxes (GPT-03).
3. **Clipped content.**
   - Scroll reachable inner scrollports, vertically and horizontally (GPT-05).
   - Text that is clipped to nothing identically in both worlds, inside a non-scrollable `overflow:hidden` region (inactive slides, collapsed panels), is not displayed. Count it like display:none and grade it through declared states. A JS-off loss stays a mismatch (MIMAR-01).
4. **Translucent covers.** Treat a translucent cover as compositing: decide by pixels, or INCOMPLETE if unresolvable, never automatically obscured (GPT-04).
5. **Long pages.** Use target-directed sampling (scroll each unvisited target into view) instead of a fixed 60-band cap. Report INCOMPLETE whenever the scan stops before the document end (GPT-06).
6. **Copy deck.** Approve the displayed text and the accessible name separately (`ariaLabel` field per slot), and deduplicate identical strings (GPT-01). Use the effective option label (P3, GPT-02).

## Verdict
**8 ISSUES (A: 8 P2, B: 0; 0 P0, 0 P1). Not ZERO ISSUES, so the round does not converge.** Batched P3: R18-GPT-02.
Six of the eight are false positives or completeness gaps in the new backstop itself. Part B is clean (GPT found no B items).

## Untested
- Opus and Grok gave no review because both balances are exhausted.
- GPT ran only in-memory and DOM-model repros; I re-ran every row in Chrome as described.
- R18-GPT-05's `textUnreadable/rendered` in the app shell was not traced to its element.
- The thin-font matrix used only the installed Inter, Inter Tight and Lato at device scale 1. Other fonts, hinting and DPR 2 were not tried.
- Not probed: popovers and top layer, `<dialog>` open states, video and canvas text, sticky table headers, very slow lazy images.
