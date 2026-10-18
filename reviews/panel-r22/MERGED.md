# Panel round 22: merged review (Mi'mar cross-check)

Head: `d9e1049` (Fadelwahed/fannan, branch mimar-r4-fixes), fresh clone at /workspace/panel-r22/fannan, left clean.
Scope: `git diff 700297d..d9e1049`, reviews/MIMAR-R21-changes-c344c5b.md, release/UNTESTED.md, reviews/panel-r21/MERGED.md.
Path guard: run.sh exits 99 unless every path contains `panel-r22` and the clone is at d9e1049. Self-test with the panel-r21 prompt: rc 99.
Times are Gaza time (UTC+3), 12-hour clock. Whole run: 4:19–about 4:37 PM.

## Anchored verify (run first)
`python3 -B scripts/package-r3.py verify --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3 --registry-sha256 3929602859db9488d002b4682f6b58b95dcf17012a32d353ac83b5601c0ce566` gives **PASS (rc 0), registryPin "external"** (out/anchored-verify.log, 4:19:56 PM).
- `sha256(trust/R3-CHANGES.sha256)` equals the digest given and the one quoted in the R21 record.
- **Attempt 1:** without `--start`, argparse rejected the call (rc 2).
- **Attempt 2:** with `--start`, it failed with "manifest must be a real read-only file", because a clone does not keep the 0444 modes.
- **Attempt 3:** I applied the step documented in release/PACKAGING.md:27 (`chmod 0444` on the two trust files), and the verify passed. Git does not track that mode change; `git status` is clean.

## Participants
| Reviewer | Result | Time | Cost |
|---|---|---|---|
| Grok (tested once) | 402 "usage balance exhausted"; did not run | 4:20:20–4:20:30 PM | none |
| Opus (one free health call) | 403 "Insufficient account balance"; did not run | 4:20:30–4:20:31 PM | $0 |
| GPT-6.1-Sol (read-only, high) | 8 findings: 6 P2 (A), 2 P3 (B) | 4:20:31–4:27:12 PM (401 s, rc 0) | 134,247 tokens |
| Mi'mar cross-check | Every finding in Chrome 155, 1 full gate run (2 cases), mutation proof | about 4:21–4:37 PM | box only |

## Re-checks
- Tests at d9e1049 (panel-r21, r20, r19, width-screen, integrity, handoff-contract, designer-process): **56/56 pass**.
- **The R21 tests bite.** With the 700297d code and documents, **12 of 56 fail**: 12 ERR_ASSERTION, 0 load errors.
- Package tests: 42 OK. With the 700297d package-r3.py, 2 FAIL (zip contents and `test_r21_sections`).
- My R21 repro pages rerun on d9e1049 (Chrome):
  - **Media:** every crop passes (img, picture, hover zoom, avatar, video, decorative svg, blob div). The marquee still fails as "partly clipped".
  - **Real site:** Arabic and English both pass at 1440 and 320.
  - **Glyph measure:** the one-word patch fails at 1.67, and the near-white patch at 1.23.
  - **Reveals:** a wrapper passes; unrelated text fails.
  - **Hidden Subscribe:** fails at 320.
  - **Inline span:** treated as static.

## R21 item status
| Item | Status | Evidence |
|---|---|---|
| R21-MIMAR-01 (media crops) | PARTIAL | Crops pass. Video or canvas with fallback text still fails (R22-GPT-03). |
| R21-MIMAR-02 (unrendered content) | FIXED | Closed-details menu: the Arabic site passes. The test bites. |
| R21-GPT-02 (minimum-glyph measure) | PARTIAL | It misses thin letters (R22-GPT-02) and returns INCOMPLETE for opacity text (R22-GPT-01). Text-shadow is stripped (R22-MIMAR-01). |
| R21-GPT-03 (reveal by print) | FIXED | Chrome results match. |
| R21-GPT-04 (lost at a width) | PARTIAL | Icon links are missed (R22-GPT-04). Text and controls share one print namespace (R22-GPT-05). |
| R21-GPT-05 (slot replacement) | FIXED | GPT read the code; the test bites. |
| R21-GPT-06 (word tokens) | FIXED | Chrome. |
| R21-GPT-07 (copy-truth scope) | FIXED | GPT-confirmed. |
| Read-more clamp | PARTIAL | A whole paragraph cut inside a clamp is excused (R22-GPT-06). |

## Findings
| ID | Part | GPT | Mi'mar final | Location | Evidence (Chrome 155) | Fix direction |
|---|---|---|---|---|---|---|
| R22-GPT-01 | A | P2 | **P2 (agreed)** | visibility.mjs:455, 462–479 (`coreAlpha 0.75`) | A white 28 px caption at `opacity:.7` over a dark photo gives `ratio null`, "no glyph coverage measured (INCOMPLETE)". The axe contrast incomplete can then never be resolved, so a readable, honest caption stays blocked (fails closed). | Measure coverage geometrically, independent of opacity: compare black and white shots with opacity forced to 1 on the element and its ancestors. Then grade the actual composited pixel. Add regressions for passing and failing translucent captions. |
| R22-GPT-02 | A | P2 | **P2 (agreed)** | visibility.mjs:473–478 (`punctPixels` 12) | Real font: 14 px "ill fill lilt" with its first letters over a near-white patch gives **14.64** (51 clusters dropped). The same at 12 px gives 14.64 (85 dropped). The failing thin letters are discarded. | Drop a small cluster only when it maps to a punctuation character of the source text (range/character boxes). Always keep a low-ratio cluster. If unsure, the result is INCOMPLETE. |
| R22-GPT-03 | A | P2 | **P2 (agreed)** | width-screen.mjs:84, 97–100 (`kindOf` checks text before `MEDIA`) | A cropped `<video>` with the standard "Your browser does not support…" fallback text fails at 1440 and 320 as "partly clipped: text". | Classify native media (video, canvas, object fallback) before reading its text. Add positive regressions with fallback text. |
| R22-GPT-04 | A | P2 | **P2 (agreed)** | width-screen.mjs:19, 50, 83–89 | An icon-only link (`aria-label="Your profile"`, svg) hidden below 600 px passes at 320, with nothing recorded as lost. | Treat links and named semantic controls as content by their box and accessible name. A pure image crop inside a link that is fully available stays exempt. |
| R22-GPT-05 | A | P2 | **P2 (agreed)** | width-screen.mjs:86–87, 201, 255–258 | Both pass at 320: (a) the Subscribe button is hidden while a "Subscribe" heading remains; (b) the second of two checkboxes named by `aria-labelledby` is hidden. | Use separate keys for text (`text:`) and controls (`role:name`). Resolve names with the existing integrity name logic, including `aria-labelledby`. |
| R22-GPT-06 | A | P2 | **P2 (agreed)** | width-screen.mjs:256–258, 282–285 | A line-clamp cuts paragraph one partly and hides paragraph two wholly. The expanded state shows only paragraph one. The clamp counts as "truncated" (whole=1, partial=1); resolveReveals passes with 0 unresolved, and both widths pass. Paragraph two is never shown in any state. | A truncation must resolve every whole and partial item at that width. Controls are never excused by a truncation. Add an omission regression. |
| R22-MIMAR-01 | A | (missed) | **P2 (new; this code dates from R20)** | visibility.mjs:504 (glyph shots force `text-shadow:none`) | **Full gate run:** a white 48 px hero line on a photo with a strong dark text-shadow halo, no scrim, and a citing PASS wcag-review still leaves the axe color-contrast incomplete **unresolved** (stateWhy includes `axe`). The same hero with a scrim resolves. Probe: white text with a dark halo over a light-grey gradient measures 1.37:1, because each glyph is graded against the raw background with the halo removed. WCAG 1.4.3 Understanding accepts a halo or outline as the text's background, and shadowed hero captions are an ordinary pattern. | Keep the author's text-shadow in the transparent (background) shot. Strip it only in the black and white coverage shots. Grade each glyph core against the background including the halo. Add regressions for a passing shadowed caption and a failing weak shadow. |
| R22-MIMAR-02 | A | (missed) | **P3** | width-screen.mjs (print loss at a width) | A responsive shortened label, a button showing "Request a demo" at 1440 and "Demo" at 320, fails at 320 because "Request a demo" is lost. An `aria-label="Request a demo"` makes it pass, and so does declaring a state. The author has a simple remedy, so P3. A wordmark that is hidden at 320 and leaves an empty link name also fails; that one is a **true positive**. | Optionally match a control by role when its 320 name is a word subset of its 1440 name. Batch. |
| R22-GPT-07 | B | P3 | **P3 (agreed)** | handoff-contract.md:47 | It still says "10th percentile", which contradicts the minimum measure. | Use GPT's replacement text; extend the docs test. |
| R22-GPT-08 | B | P3 | **P3 (agreed)** | FANNAN-PLAN.md:41; design-quality.md:60; handoff-contract.md:45 | The blanket "do not ellipsize / no truncation" rule contradicts the read-more exception that is now allowed. | Use GPT's qualifying sentences. |

## Tiebreaks (Mi'mar, final)
- **R22-GPT-01 stays P2.** The gate fails closed, but on an honest, readable caption, so a good design is blocked.
- **R22-GPT-05 stays P2:** text and controls sharing one namespace lets functionality loss pass. The checkbox half alone would be P3.
- **R22-MIMAR-01 is P2:** WCAG accepts halos, and shadowed hero captions are common.
- **R22-MIMAR-02 is P3:** a one-attribute remedy exists.

## Verdict
**NOT CONVERGED: 7 P2, all in Part A** (R22-GPT-01 through 06, R22-MIMAR-01). **Part B has 0 P2. 3 P3** (R22-MIMAR-02, R22-GPT-07, R22-GPT-08). No P0 or P1.

## Untested
- R22-GPT-01 through 06 in a full gate run (Chrome probes and the resolver only).
- The opacity-on-ancestor variant: the probe path filter did not select it.
- content-visibility and popover regressions (GPT notes they are absent).
- Opus and Grok did not take part.
