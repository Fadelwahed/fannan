# Panel round 26: merged review (Mi'mar cross-check)

- **Head:** `49169df` (Fadelwahed/fannan, branch mimar-r4-fixes). Fresh clone at /workspace/panel-r26/fannan, left clean.
- **Scope:** `git diff dc1338f..49169df` (R25: one count per control, the one-to-one count shared across panels, fully collapsed boxes rescued by declared states, tabs to headed sections), reviews/MIMAR-R25-changes-48cf795.md, release/UNTESTED.md, plus a full-gate regression look and the R18 autoplay carousel.
- **Path guard:** run.sh exits 99 unless every path contains `panel-r26` and the clone is at 49169df. Self-test with the panel-r24 prompt returned rc 99.
- **Times:** Gaza time (UTC+3), 12-hour clock. **Not pushed** (as instructed).

## Anchored verify (run first)
`chmod 0444` on trust/MANIFEST.sha256 and trust/R3-CHANGES.sha256, then `python3 -B scripts/package-r3.py verify --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3 --registry-sha256 9dd8468c9b18c0ff217736434fcf9e866bac74f2e938a756465733dbdf3c2b71`.
**Result: PASS** (rc 0), registryPin "external", at 8:50:23 PM.

## Participants
| Reviewer | Result | Time | Cost |
|---|---|---|---|
| Grok | Skipped as instructed | — | none |
| Opus (one health call) | 403 "Insufficient account balance", so skipped | 8:50:46–8:50:50 PM | $0 |
| GPT-6.1-Sol (`codex-dce exec`, read-only sandbox, high reasoning) | 4 findings, all P2, Part A; Part B clean | 8:50:53–8:57:24 PM (391 s, rc 0) | 166,828 tokens |
| Mi'mar cross-check | Every finding checked in Chrome 155 on 49169df and dc1338f; mutation proof; R18 autoplay repeated | 8:51–9:03 PM | box only |

## Load (uptime before each heavy run)
8:50:17 PM 1.39 / 1.83 / 3.33; 8:51:08 PM 1.55 / 1.81 / 3.24; 8:52:43 PM 4.71 / 2.75 / 3.44 (between the mutation runs); 8:55:09 PM 2.73 / 3.07 / 3.48; 8:57:54 PM 2.40 / 2.87 / 3.34; 9:02:33 PM 2.02 / 2.49 / 3.06. Never near 20, so no `ps` snapshot was needed. Everything ran serially, and nothing timed out.

## Re-checks
- **Tests at 49169df** (panel-r25, r24, r23, r22, r21, r20, r19, width-screen, integrity, handoff-contract, designer-process; concurrency 2): **79/79**.
- **The R25 tests bite.** With the dc1338f code and docs, 5 of 79 fail: **5 ERR_ASSERTION, 0 timeouts**. They are the R25 docs test and R25-GPT-01, 02, 03 and 04 in real Chrome.
- **Package tests:** 47 OK. With the dc1338f package-r3.py: 2 FAIL (the zip contents test and `test_r25_sections`).
- **The R25 fixes in Chrome:**
  - nested-label button: fixed in R25;
  - sibling panels sharing one Download: now fail;
  - max-height nav with a real menu-open: now passes (it failed on dc1338f);
  - tabs → headed sections without a panel heading: now passes (it failed on dc1338f).

## R18 autoplay carousel at 320 (Fadel's request)
Page: the R18 test's autoplay carousel (800 px box, a 0.6 s transform transition, one slide every 700 ms). Script: repro/autoplay26*.mjs. Logs: out/autoplay-320*.log and out/r18-repeat.log.
- **It is only timing.**
  - Plain runs give `partly clipped` at 320 in **1 of 68** captures; every other capture gives `reveal`.
  - The failing capture was taken 682 ms after load, right as the 700 ms timer fired. The track's transform read **-30.6 px**, so the slide was caught at the start of its slide. The cut items were "Slide one | Slide two".
  - The same carousel **without the transition** gave `reveal` 8 of 8 times; the static carousel gave 8 of 8.
  - `panel-r18.test.mjs` run alone 5 times: **5/5 pass** (8:58–9:01 PM). The earlier failure ("unreadable: Slide three") only showed up on a loaded box.
- **It is flaky,** so the gate should settle moving content before measuring.
  - **Pausing alone is wrong.** Freezing the document timeline (CDP `Animation.setPlaybackRate 0`) froze the track mid-slide and gave `partly clipped` in **2 of 20**.
  - **Finishing alone is not enough.** Calling `document.getAnimations().forEach(a => a.finish())` once before measuring still gave **1 of 40**, because the timer fired again during the measurement.
  - **Pause, then finish: 0 of 40.** First set the playback rate to 0 so nothing new moves, then finish every running finite animation and transition so each one lands on its end state. Keep both in place for both widths.
  - Leave infinite animations (marquee) alone; they are already graded under the 2.2.2 ruling on the unpaused page.
  - Also record when anything was mid-animation at capture, so a result taken mid-transition is never final.
- **Classified R26-MIMAR-01, P3.** It is an intermittent false positive (about 1–3% of captures) on autoplaying carousels. A rerun clears it and nothing honest is permanently blocked. The fix is the settle rule above, plus a test that runs the autoplay page at many delays.

## Status of the R25 items
| Item | Status | Basis |
|---|---|---|
| R25-GPT-01 (one count per control) | FIXED | test bites; button>span passes in Chrome |
| R25-GPT-02 (shared pool) | FIXED | test bites; sibling panels with one Download fail |
| R25-GPT-03 (collapsed boxes rescued) | PARTIAL | the rescue works, but it now counts footer copies (R26-GPT-01) |
| R25-GPT-04 (tabs → headed sections) | PARTIAL | works without a panel heading; R26-GPT-02 and 03 |
| R25-GPT-05 (charts backlog) | DONE (P3 backlog) | plan and UNTESTED |
| R25-GPT-06 (R24 record wording) | FIXED | rerun log in test-results/r25 |

## Findings
| ID | Part | GPT | Mi'mar | In plain words | Chrome check (out/repro26.log) |
|---|---|---|---|---|---|
| R26-GPT-01 | A | P2 | **P2 (agreed), new in R25** | A nav collapsed with max-height:0 at 320 now passes when a "menu-open" state is declared, even if that state never actually opens the menu. The footer's copies of the same links are counted as the menu. This breaks the standing ruling that footer copies don't count. | 49169df: the sloppy menu-open **passes**. The same mistake with `display:none` correctly **fails**. dc1338f failed it. **Confirmed.** |
| R26-GPT-02 | A | P2 | **P2 (agreed)** | Tabs that become headed sections fail if the selected tab's panel already had its own heading with the tab's name (a normal pattern). That heading is subtracted from the count, so one heading looks missing. | `g02_panelHeading`: fails at 320 (tablist and tabs lost). The same page without the panel heading passes. **Confirmed.** |
| R26-GPT-03 | A | P2 | **P2 (agreed), new in R25** | Two report tabs, each declared as a state with its own "Download". At 320 the stacked sections show both reports' text but only one Download, and it passes. Each state is compared on its own, so the one Download satisfies both. | `g03_droppedAction`: **passes** at 49169df (should fail). **Confirmed.** |
| R26-GPT-04 | A | P2 | **P2 (agreed), older than R25** | A normal fluid carousel whose slides all say "Shop now", with every slide declared as a state, fails at 320. The hidden slides' "Shop now" matches the visible one by name, so their cut counts as "lost" instead of "reveal". The same carousel with different button names passes. | `g04_repeatedCta`: all three slide states fail at 320 on both 49169df and dc1338f; `g04_distinctCta` passes. **Confirmed.** UNTESTED.md admits it, but it is an ordinary pattern. |
| R26-MIMAR-01 | A | — | **P3** | The autoplay carousel is sometimes caught mid-slide and graded `partly clipped`. | See above: 1 of 68 plain runs; 0 of 40 with pause-then-finish. |

## Tiebreaks (Mi'mar, final)
1. **R26-GPT-01:** content that a collapsed box cuts wholly at a narrow width is resolved exactly like a `display:none` loss. The declared state must show, at that width, as many controls of that name as 1440 shows (nav plus footer = 2). Same-name controls that are still visible count toward that number and cannot stand in. Tests: a sloppy menu-open that is still collapsed fails; a real menu-open passes; a nav with no footer copy behaves the same.
2. **R26-GPT-02:** a heading inside the lost tablist's own tabpanel at 1440 is not subtracted from the heading pool. Only headings outside that tablist's panels are. Tests: a panel heading kept passes; a missing heading or a duplicated, renamed one fails.
3. **R26-GPT-03:** when the headed-sections swap covers a tablist, the narrow width must show each control name at least as many times as the declared tab states' 1440 panels show it in total. If a tab has no declared state, its panel's controls cannot be checked, so the swap does not apply and the ordinary loss rules stay. Tests: two tabs with repeated Download, both kept passes; one dropped fails.
4. **R26-GPT-04:** deciding whether a narrow-width cut is "shown at 1440, lost at this width" or "reveal" uses the element itself (was this element visible at 1440?), not its name. Resolution keeps name and count matching with a separate pool per slide state. Tests: repeated "Shop now" with every slide declared passes; a missing slide state fails.
5. **R26-MIMAR-01:** P3 backlog. Settle moving content as described before measuring each width.

## Verdict
**NOT CONVERGED: 4 P2, all in Part A (R26-GPT-01, 02, 03, 04). Part B: 0. P3: 1 (R26-MIMAR-01); collapsed pagination and the chart backlog carried.** No P0 or P1. R26-GPT-01 and 03 come from the R25 exemptions, 02 is a limit of the R25 swap, and 04 is older.

## Untested
- The Chrome checks call the width-screen and resolveReveals tools directly on test pages (repro/), not a full handoff gate run of each pattern.
- The autoplay settle rule was tried in a script only, not inside the gate.
- I did not rerun the full fixture, the no-deps suite or the no-git package tests this round; the R25 record says the fixer ran them.
- Opus and Grok gave no review.
