# Panel round 25: merged review (Mi'mar cross-check)

- **Head:** `dc1338f` (Fadelwahed/fannan, branch mimar-r4-fixes). Fresh clone at /workspace/panel-r25/fannan, left clean.
- **Scope:** `git diff ec977f2..dc1338f` (R24: controls checked before the media crop, one-to-one reveal matches, tabs-to-accordion and menubar-to-menu equivalence), reviews/MIMAR-R24-changes-56642d5.md, release/UNTESTED.md, plus a full-gate regression look.
- **Path guard:** run.sh exits 99 unless every path contains `panel-r25` and the clone is at dc1338f. Self-test with the panel-r24 prompt returned rc 99.
- **Times:** Gaza time (UTC+3), 12-hour clock.
- **Not pushed** (as instructed). The fixer brings this file in with the next registry rebuild.

## Anchored verify (run first)
`chmod 0444` on trust/MANIFEST.sha256 and trust/R3-CHANGES.sha256, then `python3 -B scripts/package-r3.py verify --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3 --registry-sha256 9b4835212ca0aeacbd4e4992a402ee9fe30d722cfbd99e6b39597a82de007ec6`.
**Result: PASS** (rc 0) at 7:46:33 PM.

## Participants
| Reviewer | Result | Time | Cost |
|---|---|---|---|
| Grok | Skipped as instructed | — | none |
| Opus (one health call) | 403 "Insufficient account balance", so skipped | 7:46:54–7:46:55 PM | $0 |
| GPT-6.1-Sol (`codex-dce exec`, read-only sandbox, high reasoning) | 6 findings: 5 rated P2 (4 Part A, 1 Part B), 1 P3 | 7:46:55–7:53:06 PM (371 s, rc 0) | 137,801 tokens |
| Mi'mar cross-check | Every finding checked in Chrome 155 against dc1338f and ec977f2; mutation proof; the fixer's unfinished checks | 7:47–8:17 PM | box only |

## Load
| Time | Load average (1 / 5 / 15 min) |
|---|---|
| 7:46:31 PM (start) | 1.33 / 8.67 / 22.40 |
| 7:47:22 PM (before the mutation runs) | 1.83 / 7.64 / 21.33 |
| 7:50:34 PM (before the package and syntax checks) | 2.63 / 5.61 / 18.01 |
| 7:53:20 PM (before the full fixture) | 4.55 / 5.14 / 15.80 |
| 8:16:03 PM (before the Chrome checks) | 0.92 / 1.49 / 4.89 |
Only the 15-minute average was over 20 at the start, left over from before this round. The current (1-minute) load never went over 5, so no `ps` snapshot was needed and nobody else's processes were touched. All heavy runs were serial. No timeouts, so no retries were needed.

## Re-checks
**Tests at dc1338f** (panel-r24, r23, r22, r21, r20, r19, width-screen, integrity, handoff-contract, designer-process, concurrency 2): **74/74**.
**The R24 tests bite.** With the ec977f2 code and docs: 4 of 74 fail, **4 ERR_ASSERTION, 0 timeouts, 0 load errors**: the R24 docs test and R24-GPT-01, 02 and 03 in real Chrome. (This is the assertion-level proof that the R24 record's own before-log lacks; see R25-GPT-06.)
**Package tests:** 46 OK. With the ec977f2 package-r3.py: 2 FAIL (the zip contents test and `test_r24_sections`).
**Full suite with test deps:** 169/169, 0 skipped (the load-sensitive R18 autoplay test passed this time).

## Checks the fixer could not finish (all run at dc1338f)
| Check | Result | Log (out/) |
|---|---|---|
| Full-run fixture (`node release/tests/local-fixture.mjs`, real deps copy) | **PASS, rc 0**, 8:00:52–8:14:21 PM. The R20–R23 expectations all hold, ending with "LOCAL FIXTURE: … passed; full gate correctly blocked by absent pinned Impeccable binary". | fixture-full.log |
| clampControl reason (R24-MIMAR-02) | **Holds:** default state fails at 1440, `expanded` is declared, and the 1440 cut is `partly clipped`, truncation true, controls `button:Download`. | fixture-full.log |
| Suite without test-only deps (git archive export, no runtime-deps) | **169 tests: 85 pass, 0 fail, 84 skipped** (need deps or Chrome), rc 0 | node-without-deps.log |
| Package tests on a no-git copy | **46 tests OK, 5 skipped**, rc 0 | pkg-nogit.log |
| `python3 -B scripts/package-r3.py self-test` | **PASS** (tamper, extra file, symlink, writable manifest rejected) | self-test.log |
| Syntax sweep (`node --check`, `sh/bash -n`, `ast.parse`) | **mjs=105, sh=22, py=7, 0 failures** | syntax.log |
Note: my first fixture launch was started in the background from a shell that ended. I wrongly thought it had died, so I started a second run, then stopped the first (my own PID) after noticing it was still going. The "rc=143 / END 8:01:10 PM" line in fixture.time comes from that stopped duplicate. The result above is from the second, complete run.

## Status of the R24 items
| Item | Status | Basis |
|---|---|---|
| R24-GPT-01 (controls before the media crop) | FIXED | Test bites; borderless cases fail as intended |
| R24-GPT-02 (one-to-one reveal matches) | PARTIAL | Fixed within one panel; a regression with nested labels, and no fix across sibling panels (R25-GPT-01, 02) |
| R24-GPT-03 (closed equivalence list) | FIXED as designed | tabs→details now passes in Chrome (it failed on ec977f2); limits in R25-GPT-03, 04 |
| R24-MIMAR-01 (collapsed pagination) | P3 backlog, still listed in UNTESTED.md | not re-counted |
| R24-MIMAR-02 (clampControl reason) | FIXED, and now run in the full fixture | see above |

## Findings
| ID | Part | GPT | Mi'mar | In plain words | Chrome check (out/repro25-*.log) |
|---|---|---|---|---|---|
| R25-GPT-01 | A | P2 | **P2 (agreed), regression** | Put a normal `<button><span>Download</span></button>` inside a collapsed accordion and declare the expanded state that shows it: the page now fails. The button and its inner span are each counted as a hidden "Download", but the expanded state only has one button, so one stays "unresolved". A plain `<button>Download</button>` passes. | dc1338f: fails (1440 and 320 "reveal" unresolved, Download). ec977f2: passes. **Confirmed; new in R24.** |
| R25-GPT-02 | A | P2 | **P2 (agreed)** | Two separate collapsed panels each have a Download button. An expanded state that shows both panels' text but only one Download still clears both, because the one-to-one count is reset for each panel. | dc1338f and ec977f2: both pass (should fail). **Confirmed.** |
| R25-GPT-03 | A | P2 | **P2 (agreed), older than R24** | A nav that collapses at 320 with `max-height:0; overflow:hidden` (a common CSS menu) fails even when the menu-open state is declared, because this cut is labelled "shown at 1440, lost at this width", and that label is never checked against declared states. The same nav hidden with `display:none` passes with menu-open. This goes against the standing remedy ("declaring menu-open fixes it"). The real Arabic site is not affected because its menu works differently. | dc1338f and ec977f2: default fails at 320, and menu-open does not rescue it. **Confirmed; not a regression.** |
| R25-GPT-04 | A | P2 | **P2 (agreed)** | Tabs at 1440 that become plain headed sections at 320, with every panel's content shown, fail: the tablist and its tabs count as "lost". It is an honest, common pattern with nothing actually lost, and the only way out is a reviewer exception. | dc1338f: fails at 320 with `tablist:Plan details`, `tab:Overview`, `tab:Pricing` lost. tabs→details passes. **Confirmed.** |
| R25-GPT-05 | B | P2 | **P3 (Mi'mar tiebreak)** | The design guidance does not ask for honest chart encoding (bars from zero, labelled axes, missing vs zero, a shared scale). | Not a browser item. **Downgraded:** no gate or rubric claims to check chart encoding, nothing honest is rejected, and it adds a new requirement rather than fixing an existing one. Backlog: add the paragraph to design-quality.md and the dashboard-tropes check. |
| R25-GPT-06 | A | P3 | **P3 (agreed)** | The R24 record and the test comment say all three R24 tests "fail at their assertions" before the fix. The recorded before-log actually shows R24-GPT-02 and 03 ending in `page.goto` timeouts. | Log lines 445–472 checked. My own before-run gives real assertion failures for all three (4 ERR_ASSERTION, 0 timeouts), so only the record needs fixing: replace the log or relabel it. |

## Tiebreaks (Mi'mar, final)
1. **R25-GPT-01 fix:** count each hidden control once per owning control (button, link or input), not once per text node inside it. Test: a collapsed accordion with a nested-label button and its expanded state passes; two real same-name buttons with only one shown still fail.
2. **R25-GPT-02 fix:** one shared capacity pool per source screen, state and width, across all clipping boxes (removing duplicates from overlapping ancestors). Carousel slide states stay separate pools. Tests: sibling panels with one Download shown fail; with both shown they pass.
3. **R25-GPT-03 fix:** a whole cut at a narrow width ("shown at 1440, lost at this width") goes through the same declared-state resolution as a `display:none` loss at that width, with the same name and count rules. Partial cuts still block; with no declared state it still fails. Tests: a max-height nav with and without menu-open, at full-gate level.
4. **R25-GPT-04 fix:** add exactly one entry to the closed list: **content tabs → stacked sections**. It is covered only when every tab has one shown heading with the same name at that width and every panel's content and actions are still shown (by the existing one-to-one rules). A missing heading, panel or action fails. Document it in design-quality.md and handoff-contract.md. No other role swaps.
5. **R25-GPT-05:** P3 backlog (above).

## Verdict
**NOT CONVERGED: 4 P2, all in Part A (R25-GPT-01, 02, 03, 04). Part B: 0 P2. P3: 2 (R25-GPT-05, R25-GPT-06); collapsed pagination (R24-MIMAR-01) carried as backlog.** No P0 or P1. R25-GPT-01 is a regression from R24; 02 is an incomplete R24 fix; 03 and 04 are older false positives on honest pages.

## Untested
- Chrome checks used the width-screen and resolveReveals tools directly (test-only HTML in /workspace/panel-r25/repro), not a full handoff gate run of each pattern.
- The full fixture ran without the pinned Impeccable binary (blocked as designed). Live readiness was not tested.
- Opus and Grok gave no review this round.
