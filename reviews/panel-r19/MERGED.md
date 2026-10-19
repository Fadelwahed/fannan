# Fannan panel, round 19: merged review (Mi'mar cross-check)

Head: `613f489` (Fadelwahed/fannan, mimar-r4-fixes), fresh clone at /workspace/panel-r19/fannan (status clean after the run).
Scope: `git diff e0362e6..613f489`, reviews/MIMAR-R18-changes-0a9fee3.md, release/UNTESTED.md, reviews/panel-r18/MERGED.md.
Threat model, strictly applied:
- honest but sloppy authors;
- deliberate obfuscation = ENH;
- edge cases only an unusual author would hit = P3;
- P2 = an ordinary pattern or an ordinary mistake, including a false positive on an honest, well-built page.

Convergence: a pass needs zero P0/P1/P2.
Guard: run.sh exits 99 unless every path contains `panel-r19` and the clone HEAD is 613f489. Self-test with the panel-r18 prompt: rc 99. ID line R19-GPT-NN; GPT used it.

## Participants (Gaza time, UTC+3)
| Reviewer | Window | Result | Cost |
|---|---|---|---|
| Grok CLI (one test) | 10:22:41–10:22:51 AM | 402: Grok Build usage balance exhausted | none |
| Opus 5.5 (one health call) | 10:22:51–10:22:52 AM | 403: Insufficient account balance, so no review | $0 |
| GPT-6.1-Sol (codex-dce, read-only, high) | 10:22:52–10:29:42 AM (410 s) | 6 findings | 155,599 tokens (ChatGPT plan, no $ reported) |

## Mi'mar re-checks (box, scratch copies only)
- At 613f489: panel-r18, r17, r16, handoff-contract, designer-process, integrity and width-screen tests are 43/43 pass. Package tests are 40 OK.
- The R18 tests bite. Run against the e0362e6 sources with copy-deck.mjs removed, 7 of 31 fail:
  - R18 docs;
  - the changed R17 case;
  - all five R18 Chrome tests.

  There are 7 ERR_ASSERTION and 0 load or export errors; the 24 passing tests are older ones. With the e0362e6 package-r3.py, 2 package tests FAIL (zip contents for r18, test_r18_sections).
- Chrome probes go through the probe world (`isolatedPage`), as the gate does. (A first attempt without it hung with JS off; I killed my own PID 1927447 and its child 1927453.) Logs: out/mimar-repro-r19.log, mimar-repro-r19c.log. Full pre-handoff fixture runs: out/mimar-fixture-r19.log, baseline integrity PASS, widths PASS, axe clean.
- Clean on honest patterns:
  - a sticky table header inside a scroller;
  - a focus ring;
  - a small clipped PNG sticker;
  - a photo `<img>` sibling with a scrim: the backstop and integrity PASS, but see R19-MIMAR-01 for axe;
  - dark text over a dark photo without a scrim: correctly caught (1.17 is under 1.5).
- A fixed-height card that cuts its text by mistake is caught by the width screen (clipped=1). No miss there.

## Status of R18 items
| Item | GPT | Mi'mar |
|---|---|---|
| R18-GPT-01 copy-deck ariaLabel | PARTIAL | **FIXED as scoped.** The aria-labelledby and provenance gaps are P3 (R19-GPT-05/06). |
| R18-GPT-02 option label | FIXED | **FIXED** |
| R18-GPT-03 display:contents | FIXED | **FIXED** |
| R18-GPT-04 translucent layer | FIXED | **FIXED** |
| R18-GPT-05 inner scrollports | FIXED | **FIXED** for existing text. Lazy content inside a panel is missed (R19-GPT-04). |
| R18-GPT-06 long pages | PARTIAL | **FIXED for the document.** The 40,000 px page and the document-level IntersectionObserver are measured (my lazy light-grey text is caught with JS on). The inner-scrollport lazy case is missed (R19-GPT-04). |
| R18-GPT-07 per line | FIXED | **FIXED** |
| R18-MIMAR-01 carousel/accordion | PARTIAL | **PARTIAL.** Integrity is now PASS, but the width screen still blocks them (R19-GPT-01). |
| R18-MIMAR-02 thin/light fonts | FIXED | **FIXED** |
| Role split (pixels = visibility, CSS = AA when resolved) | PARTIAL | **PARTIAL.** One hole: a cover that hit-testing cannot see leaves the line "CSS-known", so only the 1.5:1 paint floor applies (R19-GPT-02). The split itself does not bring back the R18 false positives. |

## Findings (Chrome 155 via the probe world; "full run" = the complete pre-handoff checker)
| ID | Part | Kind | GPT | Mi'mar verification | Final |
|---|---|---|---|---|---|
| R19-GPT-01 | A | false positive | P2 | **Confirmed, full run.** A `max-height:0;overflow:hidden` accordion and an `overflow:hidden` carousel track: integrity PASS, but `widths.pass=false` (clipped 1 at 1440 and 320) on the page and on its state. State pass requires `widths.pass`, so every page with these patterns is blocked. The R18 fix reached only the backstop; width-screen.mjs still counts them as clipped. | **P2 agreed** |
| R19-GPT-02 | A | miss (role-split hole) | P2 | **Confirmed.** `.loading::after{position:absolute;inset:0;background:rgba(255,255,255,.8)}`, class removed by script: full run integrity **PASS** with JS off. Black text paints at about 1.6:1; the pseudo-element hits as its own ancestor, so the line stays CSS-known with only the 1.5 floor. A `pointer-events:none` 70% white div is also PASS in both worlds (direct Chrome); the same div without pointer-events:none is caught (unreadable 1.94). A stuck loading veil drawn with `::after` is an ordinary honest mistake. | **P2 agreed** (the pseudo-element half). The pointer-events:none div half alone would be P3. |
| R19-GPT-03 | A | false positive | P2 | **Confirmed, direct Chrome.** A full-section decorative SVG (a mostly transparent wave), placed after the text with no z-index or pointer-events:none, is obscured 3/3. Every SVG or replaced element counts as opaque over its whole box. | **P3 (tiebreak).** A decorative overlay above live text without pointer-events:none also blocks clicks, and authors put such layers behind content or make them pointer-transparent. This is an unusual author's case. |
| R19-GPT-04 | A | miss | P2 | **Confirmed, full run and direct.** An app shell (`html,body{height:100%;overflow:hidden} main{overflow:auto}`) whose IntersectionObserver (root=main) adds `#eee` text beyond a spacer: never created, integrity **PASS**. The same lazy text at document level is caught (unreadable, ratio 1). Same class as R18-GPT-06, inside the panel. | **P2 agreed** |
| R19-GPT-05 | A | miss | P2 | **Confirmed by reading.** copy-deck.mjs:33 `nameOf` reads only `aria-label`; `aria-labelledby` is ignored. A reference to a *visible* heading or sr-only text is already slotted or reported as unlisted copy. Only a reference to a `hidden`/`display:none` element escapes. | **P3 (tiebreak).** Hidden-reference naming is uncommon, and the visible-reference cases are covered. |
| R19-GPT-06 | B | enforcement gap | P2 | **Confirmed by reading.** handoff-contract.mjs:99 checks `ariaLabel` only for non-empty, placeholder and filler text. There is no cited-source or claimRefs check, unlike `text` (line 96). | **P3 (tiebreak).** Fact-bearing accessible names are rare; the slot's displayed claim still needs claimRefs. Cheap fix, batch it. |
| R19-MIMAR-01 | A | false positive | new | **Confirmed, full run.** Text over a photo `<img>` with a proper 60% scrim: backstop and integrity PASS, but axe reports `color-contrast` incomplete on the page and state. State pass requires `a.incomplete.length === 0`, and design-quality.md:56 says "no … unresolved automated incomplete result" with no route to resolve it. So every honest hero with text over a photo or gradient image is blocked. This predates R18, but it is now the binding block and has an obvious resolver. | **P2** |
| R19-MIMAR-02 | A | false positive | new | **Confirmed.** A declared "dialog open" state: page text behind a modal `<dialog>` is `textObscured/rendered`, so integrity mismatch (full run). An open popover menu over the page heading: obscured (direct). Open dialogs, menus and popovers are ordinary declared states ("every additional reachable state"); text behind the top layer or an aria-modal is inert and is not required to be readable. | **P2** |

Agreed P2: R19-GPT-01, 02, 04. Downgraded to P3: R19-GPT-03, 05, 06. Added by Mi'mar: R19-MIMAR-01, R19-MIMAR-02 (P2). Rejected: none.

## Fix direction
1. **R19-GPT-01:** the width screen uses the same rule as the backstop's `textHidden`. Text clipped to nothing by a non-scrollable `overflow:hidden` ancestor, identically with JS on and off, is not displayed, so it is not clipped. Partly clipped displayed text still fails.
2. **R19-GPT-02:** treat `::before`/`::after` of the target's ancestors that have a background, as well as `pointer-events:none` layers found geometrically (absolute or fixed boxes intersecting the line), as possible covers. That makes the line CSS-unknown, so pixels grade it at 3:1.
3. **R19-GPT-04:** after the document pass, run the end-of-content collection for every discovered inner scrollport. INCOMPLETE if it is still growing at the bound.
4. **R19-MIMAR-01:** an axe `color-contrast` incomplete node is resolved only when:
   - the backstop measured that node's lines with CSS-unknown pixel grading at or above the AA threshold for its size (4.5:1, or 3:1 large), and
   - a `wcag-review` manual record cites the screenshot.

   Otherwise it stays blocking. Other incomplete rules stay blocking.
5. **R19-MIMAR-02:** when a modal dialog, `aria-modal` or an open popover/top-layer element is present, text outside it that it covers is counted as not displayed (like `textHidden`) on that state. It is still graded on the default state.

## Verdict
**5 ISSUES (A: 5 P2, B: 0; 0 P0, 0 P1). Not ZERO ISSUES, so the round does not converge.**
- Batched P3: R19-GPT-03, R19-GPT-05, R19-GPT-06 (Part B).
- 3 of the 5 are false positives that block well-built pages (accordion/carousel width, photo hero, open-dialog state).
- 2 are honest-mistake misses (a stuck `::after` loading veil, lazy content inside an app panel).

## Untested
- Opus and Grok gave no review because both balances are exhausted.
- GPT ran only in-memory and DOM-model repros; I re-ran its A findings in Chrome. R19-GPT-03 was direct Chrome only, not a full run. R19-GPT-05/06 were confirmed by reading.
- A non-modal `<dialog open>` state (no script) was not run; the reasoning is that the same obscured rule applies wherever it overlaps.
- Not tried:
  - the R19-MIMAR-01 resolver;
  - virtualised lists;
  - a video background with text;
  - device scale 2.
