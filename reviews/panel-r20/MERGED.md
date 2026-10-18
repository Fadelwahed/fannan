# Panel round 20: merged review (Mi'mar cross-check)

Head: `b4747e3` (Fadelwahed/fannan, branch mimar-r4-fixes), fresh clone at /workspace/panel-r20/fannan; clone left clean.
Scope: `git diff 613f489..b4747e3`, reviews/MIMAR-R19-changes-5890da8.md, reviews/MIMAR-R19-changes-301ac59.md (R19b), release/UNTESTED.md, reviews/panel-r19/MERGED.md.
Path guard: run.sh exits 99 unless every path contains `panel-r20` and the clone is at b4747e3. Self-test with the panel-r19 prompt: rc 99.
Times below are Gaza time (12-hour clock).

## Participants
| Reviewer | Result | Time | Cost |
|---|---|---|---|
| Grok (tested once) | HTTP 402, did not run | 12:28:05–12:28:15 PM | none |
| Opus (one free health call) | 403 "Insufficient account balance", did not run | 12:28:15–12:28:16 PM | $0 |
| GPT-6.1-Sol (read-only, high reasoning) | 6 findings (5 Part A, 1 Part B), all P2 | 12:28:16–12:33:36 PM (320 s, rc 0) | 135,398 tokens |
| Mi'mar cross-check | Checked every finding in Chrome, ran the gate on 6 cases, proved the R19 tests bite | about 12:30–12:47 PM | box only |

## Re-checks (Mi'mar, scratch clones)
- Tests at b4747e3: panel-r19, r18, r17, handoff-contract, designer-process, integrity and width-screen pass **50/50** (out/mimar-tests-after.log).
- **The R19 tests bite.** The same tests run against the 613f489 code fail **10 of 50**: 10 are ERR_ASSERTION and 0 are load errors (out/mimar-tests-before.log). The failures are the R19 docs, the R19b docs, the complete-handoff contract test, and Chrome tests 34–40 (GPT-01, GPT-02/03, GPT-04, MIMAR-02, MIMAR-01, GPT-05, R19b).
- Package tests: OK at b4747e3. Against 613f489 there are 2 failures: the r19 zip contents and test_r19_sections.

## R19 item status
| Item | Status | Mi'mar evidence |
|---|---|---|
| R19-GPT-01 (clipping exemption) | PARTIAL | The exemption opens real holes: R20-GPT-01 and R20-MIMAR-01. |
| R19-GPT-02 (pseudo-element and pointer-events covers) | FIXED, with one P3 | Covers are detected. A gradient on a clipping ancestor is wrongly labelled "hidden", but in a gate run axe still blocks with color-contrast incomplete (R20-GPT-02). |
| R19-GPT-03 (SVG counts as translucent) | FIXED | Test bites. |
| R19-GPT-04 (inner scroll containers) | FIXED | Test bites. |
| R19-GPT-05 (aria-labelledby names) | FIXED | Test bites. |
| R19-GPT-06 (ariaLabel must be in the cited source) | FIXED | Test bites. |
| R19-MIMAR-01 (resolving contrast incomplete) | PARTIAL | The pixel measure can read the photo instead of the text (R20-GPT-03). |
| R19-MIMAR-02 (modal / top layer) | FIXED | Test bites. I did not probe for new holes in the inert handling (UNTESTED). |
| R19b (requiresScript) | PARTIAL | It does not work with the copy deck (R20-GPT-05). The path-based claim test is fragile (R20-GPT-04, P3). |

## Findings
| ID | Part | GPT | Mi'mar final | Location | Evidence (Mi'mar, Chrome 155) | Fix direction |
|---|---|---|---|---|---|---|
| R20-GPT-01 | A | P2 | **P2 (agreed)** | width-screen.mjs:69–90 (`nothingShownCut`) | **Miss (gate run):** a fixed-height card whose last paragraph lies wholly below its bottom edge passes everything (page and state integrity PASS, widths true/true; the paragraph is only counted as "hidden"). **False positives (probe):** a collapsed `max-height:0` accordion holding bare text still gives clipped 1 at both widths. A carousel showing its middle slide also gives clipped 1, because slide one lies before the start edge. Logs: mimar-fixture-r20b.log, mimar-repro-r20c.log. | Exempt only an identified component (an `aria-expanded` control that owns the panel, or a carousel with controls or roledescription) whose hidden content is shown in one of its declared states. Include the box's own text. Allow inactive slides on either side once the component is identified. Any other content cut wholly at an edge is a clip. Add regression tests for all three cases. |
| R20-MIMAR-01 | A | (missed) | **P2 (new, a regression)** | width-screen.mjs:85–86 (the inline-end branch) | At the 320 reflow width an `overflow:hidden` table wrapper (table 900 px wide) hides the Seats, Support and Storage columns entirely, and Price is partly cut. **The gate still passes:** widths true/true, reflow PASS (mimar-fixture-r20.log). A nav with `overflow:hidden; white-space:nowrap` hides About us, Careers and Contact. The probe screen passes it at 320 (mimar-repro-r20.log, screenshots navOverflow-320.png and tableCut-320.png). In my gate run the nav failed only because the fixture page overflowed sideways for an unrelated reason. **At 613f489 both cases failed at 320** (clipped 1, mimar-repro-r20-before.log), so R19-GPT-01 reopened Fadel's 320 px hard floor. | Any text or media that is shown at the 1440 reference width but cut off or hidden at another screened width is a reflow loss and fails. The inline-end exemption applies only to the component rule in R20-GPT-01. Add regression tests for the table wrapper and the nowrap nav at 320. |
| R20-GPT-02 | A | P2 | **P3 (downgraded)** | visibility.mjs:223–224, 259–260 | Probe: a full-card gradient `::after` (white at 80–90%) on an `overflow:hidden` card marks the text that fits as "hidden". **But a full gate run fails closed:** axe reports color-contrast incomplete, the resolver cannot measure the hidden text, so the page fails. The text is labelled wrongly, but nothing gets through. A fade-truncated clamp with no "read more" also cannot be resolved, which matches the no-cut-copy rule (that case was checked by probe only; the gate run is UNTESTED). | Treat a gradient as a cover graded by its pixels. Apply the "truncation fade" label only where text actually overflows and the fade sits at the edge where the text is cut. Low priority. |
| R20-GPT-03 | A | P2 | **P2 (agreed)** | visibility.mjs:296–307 (`pixelContrast`) | Chrome: pale text (#d0d0d0 on #f0f0f0, 1.35:1) over a light image that has a dark band inside the line box measures **16.57:1** (`complete` true) with bands 40–320 px wide (mimar-repro-r20d.log). Placed outside the line box, the same text measures 1.35:1 and fails (mimar-repro-r20c.log). With a citing wcag-review, the resolver would then clear the axe incomplete for an ordinary photo hero, which is the exact case R19-MIMAR-01 targets. I did not run the full resolution through a gate run (UNTESTED). | Separate glyph pixels from background pixels: compare the rendering with the text against the same rectangle with the text hidden, and use the local background under each glyph. Keep the result INCOMPLETE when they cannot be separated. Add a negative photo-with-dark-detail fixture. |
| R20-GPT-04 | A | P2 | **P3 (downgraded)** | visibility.mjs:438–442 (`requiresScriptCheck`) | Chrome: script that wraps unchanged copy in a span makes the claim `valid:true` on a state that renders without script. Script that replaces text inside an existing paragraph makes the claim "false" (`rendersWithoutScript:true`). Both are real, but harm needs an unusual combination: a non-default state, a contrast incomplete in that state, and a JS-off rendering that is worse. The default state always needs both renderings, so the hero is still checked there. | Compare text fingerprints, not DOM paths. Shared nodes keep the check on both renderings. |
| R20-GPT-05 | A | P2 | **P2 (agreed)** | integrity.mjs:250–275; pre-handoff-check.mjs:250–259; local-fixture.mjs:286–301 | Gate run: a dialog opened by `showModal()` that holds an approved copy slot, declared `requiresScript` with a trigger. The claim is valid, but the **state is INCOMPLETE (content/js-off)** (mimar-fixture-r20b.log). So a script-only state with approved copy can never pass. The R19b fixture uses an unslotted `<p>` and never checks the full state result. | **Tiebreak (Mi'mar):** keep Fadel's N14 rule for the default state and for shared content. For a valid non-default `requiresScript` state, the JS-off baseline is the default state's JS-off rendering. Content shared with it must be equivalent. Content only in the state passes only as approved slots placed in that state. No blanket waiver. Fix the fixture to use slots and assert the full state result. |
| R20-GPT-06 | B | P2 | **P2 (agreed)** | critic-rubric.md:30; design-quality.md:45, 66; handoff-contract.mjs:165–171 | `generic-hero` is required for every screen and state, and the rubric says to "quote its actual hero line". Functional screens are in scope ("conversion or task goal", the functional dashboards in design-quality.md:72). A task heading like "Settings" fails the swap test as the rule is written, so an honest app screen is blocked or pushed toward marketing copy. | Use GPT's wording: apply the swap test to promotional hero copy and claims of distinction. Functional screens use clear task headings; record `generic-hero` PASS with the screen's purpose and the fact that it has no hero. |

## Tiebreaks (Mi'mar, final)
- R20-GPT-02: P3, because the gate fails closed through axe. R20-GPT-04: P3, because the harm needs an unusual-author combination.
- R20-MIMAR-01 is its own item rather than part of R20-GPT-01. It is a regression of an owner hard floor, and the fix (a reflow-loss rule) is different.
- R20-GPT-05: the fix keeps N14 as Fadel ruled it. Only content unique to the state may differ, and only through approved slots.

## Verdict
**NOT CONVERGED: 5 P2 (Part A: R20-GPT-01, R20-MIMAR-01, R20-GPT-03, R20-GPT-05; Part B: R20-GPT-06) and 2 P3 (R20-GPT-02, R20-GPT-04).** No P0 or P1.

## Untested
- R20-GPT-03: full gate resolution with a citing wcag-review. Only the measurement was checked in Chrome.
- Gate run for a fade-truncation clamp (checked by probe only). The partial cut of "Case studies" and Price at 320 was seen in screenshots; I did not trace the mechanism.
- New holes in the R19-MIMAR-02 inert/modal handling were not probed.
- The nav case in a gate run: the fixture's own page overflowed sideways, so the nav result there came from that unrelated cause.
- Opus and Grok did not take part (403 and 402).
