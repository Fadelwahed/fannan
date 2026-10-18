# Panel round 27: merged review (Mi'mar cross-check)

- **Head:** `99f4d97` (Fadelwahed/fannan, branch mimar-r4-fixes). Fresh clone at /workspace/panel-r27/fannan, left clean.
- **Scope:** `git diff 49169df..99f4d97`, the big width-screen rewrite:
  - the element-identity loss ledger, the closed swap list and one cover per element;
  - collapsed boxes treated like display:none, carousels matched by element;
  - motion settled in the probe world.
  - Plus a hunt for regressions against the R17–R26 rulings and a full-gate look.
- **Path guard:** run.sh exits 99 unless every path contains `panel-r27` and the clone is at 99f4d97. Self-test with the panel-r26 prompt returned rc 99.
- **Times:** Gaza time (UTC+3), 12-hour clock. **Not pushed.**

## Anchored verify (run first)
`chmod 0444` on both trust files, then `verify --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3 --registry-sha256 9a492e0b9c4f9a71cf683f4a769aa7c1f6a16fa6893f9c8994690bfa406323ee`.
**PASS** (rc 0), registryPin "external", at 9:47:25 PM.

## Participants
| Reviewer | Result | Time | Cost |
|---|---|---|---|
| Grok | Skipped as instructed | — | none |
| Opus (one health call) | 403 "Insufficient account balance" | 9:47:57–9:47:58 PM | $0 |
| GPT-6.1-Sol (read-only, high reasoning) | 5 rated P2 (Part A), 1 P3 (Part B) | 9:47:58–9:54:48 PM (410 s, rc 0) | 140,520 tokens |
| Mi'mar cross-check | Chrome after-log, real site, honest sets R18–R26, earlier repro scripts before and after, each finding in Chrome | 9:49–10:14 PM | box only |

## Load and timeouts
Uptime before each heavy run:

| Time | Load average (1 / 5 / 15 min) |
|---|---|
| 9:47:24 PM | 2.15 / 3.72 / 11.25 |
| 9:49:00 PM | 0.77 / 2.87 / 10.22 |
| 9:50:56 PM | 3.65 / 3.13 / 9.44 |
| 9:53:25 PM | 3.20 / 3.26 / 8.55 |
| 9:54:11 PM | 2.38 / 3.04 / 8.22 |
| 9:59:36 PM | 3.64 / 2.93 / 6.59 |
| 10:05:31 PM | 2.24 / 2.49 / 5.21 |
| 10:08:24 PM | 2.49 / 2.84 / 4.91 |
| 10:12:15 PM | 2.50 / 2.60 / 4.34 |

All runs were serial. There were no timeouts, so nothing was retried.

## The checks the fixer could not finish
### Chrome after-log (out/chrome-after.log)
- 13 suites at concurrency 2: panel-r18 to r26, width-screen, integrity, handoff-contract and designer-process.
- **90/90 at 99f4d97** (9:49–9:50 PM). The R18 autoplay test passed.
- **The R26 tests bite.** With the 49169df code and docs, 7 of 90 fail with **7 ERR_ASSERTION and 0 timeouts**. They are the R26 docs test, R26-GPT-01 to 04 and R26-MIMAR-01, plus R25-GPT-04. R25-GPT-04 fails because its default-only expectation changed under the "every tab panel declared" ruling.

### Real site (out/R27-real-site-after.log)
The built site was served on 127.0.0.1:8931 under my own PID, stopped at 10:13 PM. Run at 9:53–9:54 PM.

| Language | Rendering | Default state only | With menu-open | Obscured / unreadable / unmeasured |
|---|---|---|---|---|
| English | JavaScript on | fails at 320 (5 nav links lost) | **PASS**, 0 unresolved | 0 / 0 / 0 (88 measured) |
| English | JavaScript off | fails at 320 | **PASS** | 0 / 0 / 0 |
| Arabic | JavaScript on | fails at 320 (4 links and the CTA lost) | **PASS** | 0 / 0 / 0 (75 measured) |
| Arabic | JavaScript off | fails at 320 | **PASS** | 0 / 0 / 0 |

This is the same as R23–R25, so ruling 1 stands. The Arabic page records 10 settled transitions at 320 (`motionAtCapture`). Its results did not change.

### Honest sets R18–R26 (out/R27-honest-after.log and -before.log)
- 218 pages, JavaScript on and off, 436 renderings, each run with the new tools and the 49169df tools. Done 9:54–10:04 PM, with no errors.
- **30 renderings changed, all as intended:**
  - tabs → headed sections pages with only the default state now fail (ruling b);
  - repeated "Shop now" carousels now resolve as reveals;
  - collapsed navs are now reported as display:none losses;
  - the R23 More-menu page that is visible at 1440 still fails, now reported as a button loss.
- No honest page that passed before fails now. The marquee still fails, and the autoplay carousels give `reveal` at 320 in both renderings.

### Earlier repro scripts (R19–R26) on both versions (out/oldrepro-diff.txt)
25 scripts ran on both versions. Every difference is an intended fix (R25 and R26 cases), plus one tiny fade-contrast pixel jitter (13.7 vs 13.9). A proper More menu hidden at 1440 passes (ruling 2).

## Status of the R26 items
| Item | Status |
|---|---|
| R26-GPT-01 (a declared menu-open that doesn't open; footer copies) | FIXED in Chrome: the sloppy menu-open now fails, the real one passes |
| R26-GPT-02 (a panel's own heading) | FIXED |
| R26-GPT-03 (actions counted across the tab panels) | FIXED; a narrower problem remains (R27-GPT-02) |
| R26-GPT-04 (repeated "Shop now") | FIXED for the honest case; a miss remains (R27-GPT-04) |
| R26-MIMAR-01 (motion settle) | FIXED; the marquee still fails |

## Findings
**R27-GPT-01. GPT: P2. Mi'mar: P2 (agreed), regression.**
- *In plain words:* a declared menu-open page fails if its DOM differs a little from the default page. For example, the open menu adds a Close button before the links. Element identity is a positional path, so the shifted links count as different elements and cannot rescue the default state.
- *Chrome check (out/repro27.log):* `g01_openInsertsClose` fails at 320 (About and Work lost), and the same with a max-height nav. With an identical DOM it passes, and on 49169df it passed. **Confirmed.**

**R27-GPT-02. GPT: P2. Mi'mar: P2 (confirmed through a variant).**
- *In plain words:* the tabs → headed sections swap needs the narrow page's count of each action to *equal* the panels' total. One unrelated mobile-only button with the same name, such as a sticky "Download", breaks the swap.
- *Chrome check (out/repro27c.log):* `g02_mobileOnlyExtraDownload` fails, while the same page without it passes. GPT's exact case (two separate tabsets) **did not reproduce**: two tabsets pass with every panel kept and fail when one Download is dropped (out/repro27b.log).

**R27-GPT-03. GPT: P2. Mi'mar: P2 (agreed, by the false-positive rule), regression.**
- *In plain words:* a toolbar whose script changes the same buttons into menu items at 320 now fails, though nothing is lost. The new identity key includes the role.
- *Chrome check:* `g03_sameNodeRole` fails at 320 (Save and Export report lost). It passed on 49169df. **Confirmed.**

**R27-GPT-04. GPT: P2. Mi'mar: P2 (agreed), miss.**
- *In plain words:* a carousel whose slides hold only an image and a "Shop now" link, with one slide left undeclared, passes when the footer also has a "Shop now". The footer's link is used as the missing slide's cover.
- *Chrome check:* `g04_imageOnly_missing_footer` **passes** (it should fail). Without the footer it fails correctly, and with all slides declared it passes. **Confirmed.** Slides that also hold their own text fail correctly.

**R27-GPT-05. GPT: P2. Mi'mar: withdrawn (did not reproduce).**
- *In plain words:* GPT's claim was that an error state hiding Save at 320 is rescued by the default state.
- *Chrome check:* `g05_errorHidesSave` **fails** at 99f4d97 (the error state's Save is unresolved), which is correct. On 49169df it passed. The new ledger actually fixed this.

**R27-GPT-06. GPT: P3. Mi'mar: P3 (agreed).**
- *In plain words:* design-quality.md and handoff-contract.md still say "never by position" and "the closed swap list alone". They leave out the two approved extra coverage rules.
- *Check:* docs only; text checked.

## Tiebreaks (Mi'mar, final)
1. **R27-GPT-01:** element identity across state pages must survive ordinary DOM differences. Match a state page's element to the default page's element by a stable key (id when present; otherwise landmark + role + accessible name + href/target + order among same-name siblings), not by sibling index. Footer copies stay excluded, because the landmark is part of the key. Tests: a menu-open page that inserts a Close button passes; one that is still collapsed fails.
2. **R27-GPT-02:** the narrow page must show **at least** the panels' total of each action, counted only inside the sections matched to that tablist. Extra same-name actions elsewhere neither help nor hurt. Tests: a mobile-only extra Download passes; a dropped panel Download still fails; two tabsets keep passing.
3. **R27-GPT-03:** the same element keeps its identity when its role changes within the action family (button ↔ menuitem family, link ↔ menuitem), with the same name. Tests: a same-node toolbar → menu passes; an action really removed at 320 fails.
4. **R27-GPT-04:** before falling back to name matching, controls visible in the source state (the footer "Shop now") are reserved. A hidden slide's control is covered only by its own element in a declared state, or by an allowed distinct cover that was not shown at 1440. Tests: image-only slides plus a footer CTA with a missing slide fail; with all slides declared they pass.
5. **Mi'mar's rulings (a) and (b)** stand. I found no harm from either in the honest sets or on the real site.
6. **R27-GPT-06:** P3. Fix the wording when the identity change lands.

## Verdict
**NOT CONVERGED: 4 P2, all in Part A (R27-GPT-01, 02, 03, 04). Part B: 0 P2. P3: 1 (R27-GPT-06). R27-GPT-05 withdrawn.** No P0 or P1. Two of the four (01, 03) are regressions from the identity rewrite.

## Untested
- The checks call the width tools and resolveReveals directly on test pages (repro/pages27), not a full handoff gate run.
- The honest-set survey ran with no declared states, as in the fixer's earlier logs. The state pairs were covered by the earlier repro scripts.
- I did not rerun the full fixture, the no-deps suite or the package tests; the R26 record says the fixer ran them.
- Opus and Grok gave no review.
