# Panel round 24: merged review (Mi'mar cross-check)

- **Head:** `ec977f2` (Fadelwahed/fannan, branch mimar-r4-fixes). Fresh clone at /workspace/panel-r24/fannan, left clean.
- **Scope:** `git diff eeeb371..ec977f2`, reviews/MIMAR-R23-changes-94da97c.md, release/UNTESTED.md, reviews/panel-r23/MERGED.md.
- **Path guard:** run.sh exits 99 unless every path contains `panel-r24` and the clone is at ec977f2. Self-test with the panel-r23 prompt returned rc 99.
- **Times:** Gaza time (UTC+3), 12-hour clock.

## Anchored verify (run first)
I ran `chmod 0444` on trust/MANIFEST.sha256 and trust/R3-CHANGES.sha256, then `python3 -B scripts/package-r3.py verify --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3 --registry-sha256 e468e0dd4ab6b1084ad83a4670c1a9a0d1fe73d2b8278184bc915fd9e4949c0d`.

**Result: PASS** (rc 0), registryPin "external", at 6:52:32 PM.

## Participants
| Reviewer | Result | Time | Cost |
|---|---|---|---|
| Grok | Skipped as instructed (402 in every earlier round) | — | none |
| Opus (one free health call) | 403 "Insufficient account balance", so skipped | 6:53:03–6:53:05 PM | $0 |
| GPT-6.1-Sol (`codex-dce exec`, read-only sandbox, high reasoning) | 3 findings, all P2, Part A | 6:53:05–6:58:45 PM (340 s, rc 0) | 105,900 tokens |
| Mi'mar cross-check | Every finding checked in Chrome 155, the rulings rechecked, mutation proof, and the R23 fixture run on eeeb371 | 6:53 PM to about 7:10 PM | box only |

## Re-checks
**Tests at ec977f2.** The suites (panel-r23, r22, r21, r20, r19, width-screen, integrity, handoff-contract and designer-process), run at concurrency 2, give **70/70**.

**The R23 tests bite.** With the eeeb371 code and documents:
- 8 of 70 fail: 8 ERR_ASSERTION, 0 load errors, 0 timeouts.
- The failing tests are R23 docs, R21-MIMAR-02 (as updated by R23), R22-MIMAR-02 (as narrowed), and R23-GPT-02, 03, 04, 05 and 01.

**Package tests:** 42 OK. With the eeeb371 package-r3.py, 2 FAIL: the zip contents test and `test_r23_sections`.

**The R23 fixture against eeeb371** (the run that was cut off last round), 6:53 PM–7:04 PM, out/fixture-before-eeeb371.log:
- The R20, R21 and R22 full-gate expectations still hold on the old code.
- The fixture then stops at **"R23 full-run expectations failed"**. These expectations fail, as they should: `saveAs`, `exportMenu`, `shortLabel`, `labelCut` and `slider` are all false.
- `shortLabelAria` and `clampControl` were already true on the old code. So the full-run `clampControl` expectation does not tell the old code apart; only unit test 59 (R23-GPT-05) bites for that fix (see R24-MIMAR-02).
- The "after" fixture run (exit 0) comes from the R23 record. I did not rerun it.

**Mi'mar's rulings, rechecked in Chrome.** Both stand; no counterexample was found.
1. **Ruling 1 (real site, default state only).** I served the real-site build from the box on a local server under my own PID, since stopped.
   - Default state alone: the Arabic page fails at 320. It loses the five nav links and the CTA (`link:…`), because the footer copies don't count.
   - With a declared menu-open state: pass, with 0 unresolved.
2. **Ruling 2 (More menu):** stands as decided. GPT raised no counterexample. R24-GPT-03 is a different pattern: there the menu is hidden at 1440.

**Honest patterns that still pass:**
- Three cards each with a "Learn more" link.
- A sticky CTA that appears only at 320.
- A table with per-row Edit buttons that becomes cards.

## R23 item status
| Item | Status |
|---|---|
| R23-GPT-01 (unmeasured glyph is zone c) | FIXED |
| R23-GPT-02 (one-to-one matching, action family) | PARTIAL: reveal matching reuses a single control (R24-GPT-02) |
| R23-GPT-03 (label text measured) | PARTIAL: native button labels are still skipped (R24-GPT-01) |
| R23-GPT-04 (all widget roles) | FIXED, but composite roles cannot adapt between widths (R24-GPT-03) |
| R23-GPT-05 (clamps never hide controls) | FIXED in the unit test. The full-run expectation does not bite (R24-MIMAR-02, P3) |
| R23-MIMAR-01 (prefix matching removed) | FIXED |

## Findings
| ID | Part | GPT | Mi'mar final | In plain words | Repro (Chrome 155) | Suggested fix |
|---|---|---|---|---|---|---|
| R24-GPT-01 | A | P2 | **P2 (agreed)** | A button whose own label is cut off still passes when the button has no border. | `<button style="border:0;padding:0;background:none;width:90px;overflow:hidden;white-space:nowrap">Download the annual report</button>` passes at 1440 and 320 and is logged as a media crop. With the default border it fails as "partly clipped", and a fitting label passes (mimar-repro-r24b.log). The existing test passes only because the default border makes the box overflow. | width-screen.mjs:53: check controls before the media branch, and measure a native button's box together with its text ranges. Add regressions for a borderless button and a nested label, and assert a text or control cut. |
| R24-GPT-02 | A | P2 | **P2 (agreed)** | When a collapsed panel hides two buttons with the same name, an expanded state that shows only one of them still clears both. | A collapsed (max-height:0) "Downloads" panel holds two "Download" buttons. The expanded state shows only one. resolveReveals returns pass with 0 unresolved (mimar-repro-r24b.log). This is the same class of mistake as R22-GPT-06 (an expanded page that omits content). | width-screen.mjs:343: count reveal matches one to one, as cross-width losses already are. Each hidden control consumes one shown control. Carousel slides shown by different states keep working. Add regressions for an accordion with repeated names and for carousels. |
| R24-GPT-03 | A | P2 | **P2 (agreed)** | Ordinary responsive adaptations of composite widgets fail because the composite role must stay identical. | (a) Tabs at 1440 that become `<details>` accordions at 320, with the same names and panel text, fail at 320: `tablist:Plan details`, `tab:Overview` and `tab:Pricing` are lost. (b) A `menubar` "Document actions" at 1440 that becomes a `menu` with the same items in a declared menu-open state, hidden at 1440, fails with `menubar:Document actions` unresolved. Every menuitem resolves (mimar-repro-r24b.log). Tabs becoming an accordion is a standard responsive pattern. | width-screen.mjs:242: add equivalence families for composites. Treat tablist/tab and summary/details as one family, and menubar/menu as one family, matched by the same name one to one with all descendant items covered. Missing items or panels still fail. Add positive adaptation regressions and negatives with a missing item. |
| R24-MIMAR-01 | A | (new) | **P3** | Collapsed pagination fails at 320 even though Previous/Next still reach every page. | A pager with links 1–10 at 1440 shows 1, 2, …, 10, Previous and Next at 320, and fails with `link:3`…`link:9` lost. A breadcrumb that hides its middle crumbs with no expander also fails, which is a true positive. The pagination case keeps the function, and the designer can let the links wrap, so P3. This behaviour has existed since R21. | Optionally treat a pagination landmark (`nav` named "pagination") as satisfied when Previous and Next remain. Otherwise document that pagination wraps at 320. |
| R24-MIMAR-02 | A | (new) | **P3** | The R23 full-run fixture's `clampControl` expectation is already true on the old code, so it doesn't show that the fix works. | The R23 fixture run against eeeb371 gives `clampControl: true` (out/fixture-before-eeeb371.log). The unit test does bite (test 59 fails on eeeb371). | Make the fixture's clamp case assert the specific failure reason: a control cut by a clamp, with the expanded state declared. |

## Tiebreaks (Mi'mar, final)
- **R24-GPT-02 stays P2:** an expanded page that omits content was P2 in R22.
- **R24-GPT-03 stays P2:** tabs becoming an accordion is ordinary. The menubar half alone would be P3 (app chrome).
- **Pagination collapse is P3:** the function is kept and the remedy is simple.

## Verdict
**NOT CONVERGED: 3 P2, all in Part A (R24-GPT-01, 02, 03). Part B: 0. P3: 2 (R24-MIMAR-01, 02).** No P0 or P1.

## Untested
- The GPT findings are confirmed with width-screen and resolveReveals probes in Chrome; no full gate run was done for them.
- I did not rerun the R23 "fixture after" at ec977f2 (the record reports exit 0).
- Opus and Grok did not take part.
