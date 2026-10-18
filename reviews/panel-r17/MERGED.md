# Fannan panel, round 17: merged review (Mi'mar cross-check)

Head: `86e2a31` (Fadelwahed/fannan, mimar-r4-fixes), fresh clone at /workspace/panel-r17/fannan (status clean after the run).
Scope: `git diff 5fe9101..86e2a31`, reviews/MIMAR-R16-changes-5980d2e.md, reviews/panel-r16/MERGED.md. Threat model: honest but sloppy authors; deliberate obfuscation = ENH. Convergence: a pass needs zero P0/P1/P2.
Guard: run.sh exits 99 unless every path contains `panel-r17` and the clone HEAD is 86e2a31. The self-test with a panel-r16 prompt aborted correctly (rc 99). Prompt ID line updated to R17-GPT-NN, and GPT used those IDs.

## Participants (Gaza time, UTC+3)
| Reviewer | Window | Result | Cost |
|---|---|---|---|
| Grok CLI (one test) | 7:59:59–8:00:09 AM | 402: Grok Build usage balance exhausted | none |
| Opus 5.5 (one health call) | 8:00:09–8:00:13 AM | 403: Insufficient account balance, so no review | $0 |
| GPT-6.1-Sol (codex-dce, read-only, high) | 8:00:16–8:05:46 AM (330 s) | 3 findings + panel answer | 174,895 tokens (ChatGPT plan, no $ reported) |

## Mi'mar re-checks (box, scratch copies only)
- R16 and earlier suites at 86e2a31 (panel-r16, panel-r15, panel-r14, handoff-contract, designer-process, integrity, width-screen): 37/37 pass. Package tests: 38 OK. (out/mimar-tests-after.log, mimar-pkg-after.log)
- The R16 tests bite. Run against the 5fe9101 sources, 4 of 20 fail: R16-GPT-03/04 docs, complete-handoff contract, R16-GPT-01 Chrome, R16-GPT-02 Chrome. Every failure is an assertion (8 AssertionError lines), with 0 TypeError/SyntaxError/export errors. The 16 passing tests are older ones. With the 5fe9101 package-r3.py, 2 package FAILs: zip contents (r16 evidence) and test_r16_sections. (mimar-tests-before.log, mimar-pkg-before.log)
- R16 Chrome cases now behave (repro/repro17.mjs, mimar-repro-r17.log):
  - filter-opacity reveal with JS off: contrastFailures=1.
  - Blur reveal with JS off, screen-blend ancestor, mask, drop-shadow: contrastEffects=1, so INCOMPLETE.
  - Faded submit with JS off: failures=1.
  - Scripted submit value with JS off: controls differ.
  - Faded select with JS off: failures=1.
- Full pre-handoff fixture runs (`local-fixture.mjs` harness, scratch copy with real deps): the R16 runs reproduce (filter INCOMPLETE, faded submit integrity mismatch, scripted label INCOMPLETE, wireframe coverage errors).

## Status of R16 items
| R16 item | GPT | Mi'mar |
|---|---|---|
| R16-GPT-01 filters/blend/mask in contrast | FIXED | **FIXED.** My Chrome and full-run cases agree. The panel question covers the policy. A related gap (clip-path, transform scale, covering layers) is filed separately as R17-MIMAR-01. |
| R16-GPT-02 native control text | PARTIAL | **PARTIAL.** The stated scope ("a button value … that only script supplies gives a JS-off content mismatch") fails when the input also has aria-label (R17-GPT-01). Placeholder opacity is ignored (R17-GPT-02). |
| R16-GPT-03 wireframe coverage | FIXED | **FIXED.** The contract requires existing pages, a default rendering per locale and per-locale manual records. The runner renders every screen×locale (fixture confirms). |
| R16-GPT-04 component consistency | FIXED | **FIXED.** Shared inventory, repeated-field equality, `component-consistency`, critic `componentComparison`. Tests bite. |

## Findings
| ID | Part | Source | Mi'mar verification | Final |
|---|---|---|---|---|
| R17-GPT-01 | A | GPT P2 | **Confirmed in Chrome and a full run.** `<input type=submit aria-label="Start now" value="">` with the value set by script renders an empty button with JS off (repro17b: dark pixels 776 to 76). Both worlds record controls `["input:submit","Start now",""]`, because `nameOf` prefers aria-label and `shownValue` excludes button types (integrity.mjs:151/158). Contrast coverage drops from 2 to 1 unnoticed, since only zero coverage is flagged (line 237). Full fixture run: integrity **PASS**, copy PASS. | **P2 agreed.** Tiebreak P2 over P3: it breaks the stated scope of the R16-GPT-02 fix. |
| R17-GPT-02 | A | GPT P2 | **Confirmed in Chrome and a full run.** `::placeholder{color:#000;opacity:.05}` renders near-invisible (inner pixel min luminance 241), yet contrastProbe reports checked=2, failures=0 (it reads only `::placeholder` colour, integrity.mjs:104). Full fixture run, both the permanent and the JS-restored variants: integrity **PASS**. Placeholder opacity is an ordinary styling choice. | **P2 agreed** |
| R17-GPT-03 | A | GPT P2 | **Confirmed by a full run.** `<input placeholder="[placeholder]">` and `<input placeholder="Lorem ipsum dolor sit amet">` at handoff: design `placeholders=false` and `filler=false`. The copy probe reports only my unrelated label, never the placeholder text. The same "Lorem ipsum" as a `<p>` sets placeholders=true. copyProbe walks text nodes only (pre-handoff-check.mjs:105-116), and design-probe reads `innerText` (design-probe.mjs:77). Native button values, placeholders and option labels are never matched to the copy deck. | **P2 agreed** |
| R17-MIMAR-01 | A | Mi'mar, new | **Confirmed by full pre-handoff runs.** Each of these is invisible with JS off, and integrity is **PASS** (the same as baseline): (a) a text reveal `clip-path:inset(0 100% 0 0)` removed by script; (b) a `transform:scale(.02)` scale-in removed by script; (c) a full-viewport preloader `position:fixed;inset:0;background:#fff` removed by script. For comparison, a translateX(-3000px) slide-in is caught (offscreenLeft/reflowFail). Chrome screenshots of (a)/(b) with JS off contain no dark pixels. Content equivalence compares text and boxes, not whether the text is painted and on top. These are ordinary reveal and preloader patterns, the same class as R15 A3 (opacity) and R16-GPT-01 (filter). | **P2** |
| R17-MIMAR-02 | A | Mi'mar, new | `-webkit-text-fill-color` is ignored (a faint fill over a black `color` measures as black). Text faded by an overlaying gradient layer (a "read more" fade) is not measured; full run integrity PASS. Both are rarer or arguably intentional truncation. | **P3** (batched) |

Fix directions:
- **R17-GPT-01:** record a button-type input's displayed value separately from its accessible name. Also treat a JS-off drop in contrastChecked as INCOMPLETE, not only a drop to zero.
- **R17-GPT-02:** composite the `::placeholder` opacity and use its font size and weight.
- **R17-GPT-03:** extract native authored strings (values, placeholders, option labels) for copy-deck matching and placeholder/filler screening.
- **R17-MIMAR-01:** in both worlds, hit-test sample points of each text range with `elementsFromPoint`. The text element (or its own subtree) must be on top. Treat a non-`none` clip-path, or a transform with a determinant below ~0.5, on the chain as unknown unless resolved. Compare the set of painted, unobscured text between worlds; any loss with JS off is a content mismatch.
- **R17-MIMAR-02:** read `webkitTextFillColor` when it differs from `currentcolor`, and count text covered by a painted overlay as unknown.

Agreed: R17-GPT-01, 02, 03. Added by Mi'mar: R17-MIMAR-01 (P2), R17-MIMAR-02 (P3). Rejected: none. Disputed: R17-GPT-01 only on severity (tiebreak P2).

## Panel question: permanent INCOMPLETE for non-opacity filters and blend modes
- GPT: keep as is. A token-pair proof cannot establish a spatial or backdrop-dependent composite, and an approver does not close a measurement gap. Severity of leaving it: ENH.
- **Mi'mar tiebreak: keep fail-closed, no token-level waiver. Severity ENH.**
  - A reflowExceptions-style waiver fits reflow because the human is approving a design trade-off the tool measured. Here nothing was measured, and token contrast for blur, drop-shadow, mask or blend is not a proof of the rendered result. Adding such a waiver would reopen exactly the silent-pass hole R16-GPT-01 closed.
  - The cost is real but small. In my Chrome runs, honest effects that hit it are a mask fade on text and a drop-shadow on a heading; both are INCOMPLETE. The workaround is design-level: put the effect on a non-text layer, or drop it.
  - That workaround interacts with R17-MIMAR-01/02. An overlay layer is currently not measured at all, so the hit-test fix should land before anyone relies on "move the effect to another layer".
  - Batch as ENH: a future exception is acceptable only with a pixel-measured proof per rendering (screenshot text-pixel contrast with the effect on, a named approver, evidence hash), never with token pairs. Add GPT's sentence to design-quality.md so designers know up front.

## Verdict
**4 ISSUES (A: 4 P2, B: 0; 0 P0, 0 P1). Not ZERO ISSUES, so the round does not converge.** Batched P3: R17-MIMAR-02. ENH: the panel-question exception.
Part B is clean this round (GPT found no B items; I confirmed R16-GPT-03/04).

## Untested
- Opus and Grok gave no review because both balances are exhausted.
- GPT ran only in-memory repros for its findings; I confirmed all three in Chrome and/or full fixture runs.
- The preloader case (R17-MIMAR-01c) was confirmed via the full run only, not screenshotted. The cover is opaque white by construction.
- The proposed hit-test fix was not prototyped.
- Not probed: SVG text, pseudo-element text, `content-visibility`, `<details>` closed states, file and date pickers.
