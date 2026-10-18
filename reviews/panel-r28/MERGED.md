# Panel round 28: merged review (Mi'mar cross-check)

- **Head:** `9cc38f1` (Fadelwahed/fannan, branch mimar-r4-fixes). Fresh clone at /workspace/panel-r28/fannan, left clean.
- **Scope:** `git diff 99f4d97..9cc38f1`:
  - the stable identity key (id, otherwise landmark + role family + name + target + order);
  - tab panels as their own key scope, and the tabs swap counted inside the tablist's sections;
  - role-family identity, and items the source state already shows set aside before matching.
  - Plus a hunt for regressions against the R17–R27 rulings and a full-gate look.
- **Path guard:** run.sh exits 99 unless every path contains `panel-r28` and the clone is at 9cc38f1. Self-test with the panel-r27 prompt returned rc 99.
- **Times:** Gaza time (UTC+3), 12-hour clock. **Not pushed.**

## Anchored verify (run first)
`chmod 0444` on both trust files, then `verify --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3 --registry-sha256 0b6b8e13aa000ad50bdb978ad09a1c525390daf718d2408418a380f882fc9b0e`.
**PASS** (rc 0) at 10:54:22 PM.

## Participants
| Reviewer | Result | Time | Cost |
|---|---|---|---|
| Grok | Skipped as instructed | — | none |
| Opus (one health call) | 403 "Insufficient account balance" | 10:54:44–10:54:45 PM | $0 |
| GPT-6.1-Sol (read-only, high reasoning) | 5 rated P2 (Part A), 1 P3 (Part B) | 10:54:45–11:00:55 PM (370 s, rc 0) | 111,888 tokens |
| Mi'mar cross-check | Everything the fixer skipped, plus every finding in Chrome on 9cc38f1 and 99f4d97 | 10:55–11:42 PM | box only |

## Load and timeouts
Uptime before each heavy run:

| Time | Load average (1 / 5 / 15 min) |
|---|---|
| 10:54:21 PM | 1.83 / 7.16 / 5.64 |
| 10:55:03 PM | 1.67 / 6.44 / 5.47 |
| 10:57:05 PM | 6.37 / 6.43 / 5.56 |
| 10:59:18 PM | 6.78 / 6.64 / 5.76 (the highest; my own test runs) |
| 10:59:42 PM | 5.12 / 6.26 / 5.66 |
| 11:05:39 PM | 4.62 / 5.58 / 5.55 |
| 11:19:52 PM | 1.16 / 2.30 / 3.65 |
| 11:21:18 PM | 1.14 / 1.95 / 3.40 |
| 11:27:57 PM | 2.39 / 2.37 / 3.09 |
| 11:34:31 PM | 1.93 / 2.46 / 2.91 |
| 11:41:13 PM | 1.37 / 2.27 / 2.70 |

The load never came near 20. All runs were serial, with no load timeouts and so no retries. Starting the Node 20 run, my shell tool aborted (11:03 PM), but the test process kept running and finished normally.

## What the fixer skipped (all at 9cc38f1)
| Check | Result | Log (out/) |
|---|---|---|
| Chrome suites (panel-r18 to r27, width-screen, integrity, handoff-contract, designer-process; concurrency 2) | **95/95**. Against the 99f4d97 code and docs, 5 fail with **5 ERR_ASSERTION, 0 timeouts** (R27 docs, R27-GPT-01 to 04) | chrome-after.log, chrome-before.log |
| Full Node 22 suite with test deps | **185/185** (10:59–11:02 PM). The R18 inner-scroll test passed this time | node22-full.log |
| **Full fixture** (real deps copy) | **PASS, rc 0**, 11:05:40–11:17:25 PM. The R20–R25 full-run expectations hold; the full gate is blocked by the absent Impeccable binary, as designed | fixture-full.log |
| Suite without test-only deps | 185 tests: **88 pass, 0 fail, 97 skipped** | node-without-deps.log |
| Package tests | **49 OK**. With the 99f4d97 packager, 2 FAIL (zip contents, `test_r27_sections`) | pkg-after.log, pkg-before.log |
| Package tests on a no-git copy | **49 OK, 5 skipped** | pkg-nogit.log |
| Self-test | **PASS** (tamper, extra file, symlink, writable manifest) | self-test.log |
| Syntax sweep | **mjs=108, sh=22, py=7, 0 failures** | syntax.log |
| Node 20 (v20.19.2, for information) | **179/185**. The 6 failures are the same known Style Dictionary tests | node20-full.log |
| **Real site** (en and ar × JavaScript on/off × default only / with menu-open), 11:19–11:21 PM | Default only: fails at 320 (the nav links are lost). With menu-open: **PASS** in all 4, with 0 unresolved and 0 obscured, unreadable or unmeasured. **Identical to 99f4d97.** Served under my own PID, stopped at 11:41 PM | R28-real-site-testrun.log, -testbefore.log |
| **Honest sets R18–R27** (223 pages × JavaScript on/off = 536 renderings), new code, then old, 11:21–11:34 PM | 0 errors. **One change:** pages27/r1.html (the same-node toolbar → menu) now passes with JavaScript on, as intended | R28-honest-new.log, R28-honest-old.log |
| Earlier repro scripts R19–R27 (state pairs), new code vs old, 11:34–11:40 PM | Intended changes: the R27 fixes for 01, 03, 04 and the sticky-Download case. **Two regressions found:** R28-MIMAR-01 and 02 below | oldrepro-diff.txt |

## Status of the R27 items
| Item | Status |
|---|---|
| R27-GPT-01 (Close button inserted) | FIXED for that case; regressions in R28-GPT-01, 03 and 05 |
| R27-GPT-02 (sticky Download) | FIXED for that case; R28-GPT-04 and R28-MIMAR-01 remain |
| R27-GPT-03 (role family) | FIXED |
| R27-GPT-04 (footer "Shop now") | FIXED |
| R27-GPT-06 (docs) | PARTIAL: the old sentences are still there (R28-GPT-06) |

## Findings (Chrome checks in out/repro28.log and out/oldrepro-diff.txt)
| ID | Part | GPT | Mi'mar | In plain words | Chrome check |
|---|---|---|---|---|---|
| R28-GPT-01 | A | P2 | **P2 (agreed), regression** | Any element with an `id` is treated as the same element whatever happens to it. A heading `id="headline"` that a script rewords at 320 now passes, though reworded headings must fail. The same goes for a button with an id that is renamed. | Reworded id heading: **passes** (99f4d97 failed it). Renamed id button: **passes** (99f4d97 failed it). Without an id it still fails. A changed link target passes on both versions. **Confirmed.** |
| R28-GPT-02 | A | P2 | **P2 (agreed), older** | Tab panels linked to their tabs only by `aria-labelledby` (no panel id) share one scope. When the Costs state hides its Download at 320, the Sales state's Download covers it. | `g02_labelledbyCostsHides` **passes** on both versions (should fail). **Confirmed.** |
| R28-GPT-03 | A | P2 | **P2 (agreed), regression** | Two copies of the same component, each in its own open shadow root with `<button id="download">`. Hiding one at 320 passes, because the bare id is not scoped to its shadow root. | Declarative shadow DOM: **passes** (99f4d97 failed it). **Confirmed.** |
| R28-GPT-04 | A | P2 | **P2 (agreed), worse than reported** | Tabs that become sections inside one flat `<article>` (h2 Sales … h2 Costs … one Download). The Sales section's missing Download passes, because the first heading's section spans the whole article. GPT needed a sticky extra Download for this; in Chrome it passes **even without one**. | `g04_flatArticle_missingSales_noSticky` **passes** (99f4d97 failed it). **Confirmed.** |
| R28-GPT-05 | A | P2 | **P2 (agreed), regression** | Default and menu-open pages exported with different generated ids on the same nav links now fail. The id mismatch means they don't count as the same links. | `g05_regeneratedIds_open` **fails** (99f4d97 passed it). With identical ids it passes; still closed, it fails. **Confirmed.** |
| R28-MIMAR-01 | A | — | **P2, regression (false positive)** | A page with two independent tabsets (Reports: Sales/Costs; Archive: Q1/Q2) turned into headed sections, every panel declared and every Download kept, now fails. Last round's R27 two-tabset page passed. | r27 `g02_twoTabsets`, `g02_fourStates` and `g02_sameNames_all`: passed on 99f4d97, **fail** on 9cc38f1. **Confirmed.** |
| R28-MIMAR-02 | A | — | **P2, regression (miss)** | An error state whose Save button is hidden at 320 by mistake passes again, because the default state shows "the same" Save (same stable key). The positional identity of 99f4d97 caught this; it was the R27-GPT-05 case I withdrew last round because it failed then. Same root as R28-GPT-02: an item that is simply hidden, with nothing on the page to reveal it, is rescued by another state. | r27 `g05_errorHidesSave`: failed on 99f4d97, **passes** on 9cc38f1. **Confirmed.** |
| R28-GPT-06 | B | P3 | **P3 (agreed)** | design-quality.md and handoff-contract.md still say "a footer link" and "the closed swap list alone", next to the new rules. | Docs only. |

## Tiebreaks (Mi'mar, final)
1. **Identity vs. equivalence (R28-GPT-01, 03, 05).** Bare `#id` is never an identity key on its own.
   - The key is: scope chain (the shadow-host chain + the nearest landmark + the tab-panel scope) + role family + accessible name, or the normalized text for text items + normalized link target + order among same-key elements.
   - Ids are only used to work out associations (aria-labelledby, aria-controls, tab ↔ panel). They are never compared across state pages.
   - A reworded or renamed element, or a link with a different target, is therefore a different element.
   - Tests:
     - reworded id heading fails; renamed id button fails;
     - two shadow components with repeated ids, one hidden, fail; both kept pass;
     - regenerated ids on the default and menu-open pages pass; still closed, they fail.
2. **Tab-panel scope (R28-GPT-02).** A panel's scope comes from its tab: aria-labelledby, aria-controls or the panel id, otherwise the selected tab's name in that state. If the link is ambiguous, fail closed. Tests: the aria-labelledby Sales/Costs case fails when Costs hides Download and passes when both keep it.
3. **Section bounds (R28-GPT-04) and several tabsets (R28-MIMAR-01).**
   - A heading's section ends at the next heading of the same or higher rank. Each physical control is counted once.
   - Each tablist is matched one to one to its own sections by heading names. A section used by one tablist cannot be used by another.
   - Tests:
     - flat article missing the Sales Download fails, with or without a sticky Download; both kept pass;
     - two independent tabsets, every panel declared and all actions kept, pass;
     - one Download dropped in either tabset fails.
4. **Cover across states needs something that reveals it (R28-MIMAR-02, and the root of R28-GPT-02).** An item lost at a narrow width in state S may be covered by another state only when, in S at that width, the item sits inside a hidden container that a visible trigger controls. That trigger is a button with aria-expanded or aria-haspopup, a `summary`, a tab, or a carousel control. A carousel slide clipped as a reveal keeps its existing rule. An item hidden directly with nothing to reveal it must be shown in S itself. Tests:
   - an error state hiding Save at 320 fails;
   - a real menu-open (details/summary or an aria-expanded button) still passes;
   - the real site with menu-open still passes;
   - the fixture menu cases are unchanged.
5. **R28-GPT-06:** P3. Remove "(a footer link)" and "alone", then consolidate the wording as GPT suggests.

## Verdict
**NOT CONVERGED: 7 P2, all in Part A (R28-GPT-01, 02, 03, 04, 05, R28-MIMAR-01, 02). Part B: 0 P2. P3: 1 (R28-GPT-06).** No P0 or P1.
- Five of the seven are regressions from the R27 stable-key change: GPT-01, 03, 05 and MIMAR-01, 02. GPT-04 also gets worse than on 99f4d97: its missing-action page now passes even without the extra Download.
- GPT-02 is older.
- The honest sets and the real site show no regressions; the regressions only show up in state pairs.

## Untested
- The Chrome checks call the width tools and resolveReveals directly on test pages (repro/pages28, repro/old/pages-r*), not a full handoff gate run of each.
- The full fixture still stops before Impeccable (pinned binary absent).
- Opus and Grok gave no review.
