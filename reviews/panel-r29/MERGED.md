# R29 panel — MERGED (head 564e31b, review range 9cc38f1..564e31b) — NOT PUSHED

Times are Asia/Gaza (UTC+3), Oct 19, 2026.

## Verdict
**NOT CONVERGED: 9 P2 (R29-GPT-01…08 + R29-MIMAR-01), 0 P0, 0 P1, 0 new P3.** All of them are in Part A (the two-step loss accounting); Part B: 0.
The **full fixture is red** at 564e31b (R21 `menuDeclared` = false). This is R29-GPT-01 running through the real checker.

## Gate runs
| Check | Result | Time |
|---|---|---|
| Anchored verify (`--registry-sha256 a776ebf0… --start 9ee1ca6a…`) | PASS rc 0 | 12:26:34 AM |
| Opus health (claude-opus-5-5) | 403 Insufficient account balance, $0 | 12:27:20–12:27:21 AM |
| Grok | skipped (per instruction) | — |
| GPT-6.1-Sol review, high reasoning, read-only | 8 P2, 217,737 tokens | 12:27:44–12:36:24 AM |
| Chrome/mutation suites (panel-r18…r28, width-screen, integrity, handoff-contract, designer-process) | head 102/102; 9cc38f1 code 94/102 (the 8 R28 tests fail as intended) | 12:29–12:33 AM |
| Package tests | head 49 OK; old package-r3.py 16 failures (as intended: section/record checks) | 12:33 AM |
| No-git copy: package tests / self-test / no-deps node suite | OK (5 skipped) / rc 0 / 88 pass, 104 skipped, 0 fail | 12:33 AM |
| Syntax sweep (no-git) | mjs=109, sh=22, py=7, all clean | 12:33 AM |
| Node 22 full suite | 192/192 | 12:34–12:36 AM |
| Node 20 (v20.19.2) full suite | 186/192; the 6 known Style Dictionary failures only | 12:36–12:39 AM |
| **Full fixture** | **FAIL rc 1**: `R21 full-run expectations failed: menuDeclared:false` (2 unresolved reveals, vs 4 when undeclared). Later fixture sections were not reached. | 12:39:45–12:48:50 AM |
| Honest sets R18–R28 + real site en/ar, JS on/off, new vs old | R18–R27 unchanged; pages28 h1/h4/s1 now fail (intended); real site unchanged in the 1-default shape | 12:52 AM–1:08 AM |
| Real site in the full checker's input shape | **head FAIL in en and ar** (5 nav links each); 9cc38f1 PASS | ~1:09 AM |
| Old repro scripts R19–R28, after vs before | all rc 0. Changes: R27/R28 intended fixes; **r26 g01 sloppy menu-open now PASSES (regression, R29-MIMAR-01)**; r23 exportToMenuitem still fails (More menu at 1440 is a duplicate, as ruled) | 1:13:42–1:20:12 AM |

Note: the first old-repro run got ERR_CONNECTION_REFUSED because I had stopped the site server too early. It was rerun from scratch with the server up; the numbers above come from that rerun.

## R28 items
| Item | Status |
|---|---|
| R28-GPT-01, 02, 03, R28-MIMAR-01, R28-GPT-06 | FIXED (confirmed by the suites and the old repro logs) |
| R28-GPT-04 | PARTIAL: the last section of an article escapes into an aside (R29-GPT-02) |
| R28-GPT-05 | PARTIAL: it passes only when each state is supplied once; the full checker supplies default twice (R29-GPT-01) |
| R28-MIMAR-02 | PARTIAL: any Help disclosure in the form brings the rescue back (R29-GPT-03) |

## Findings
Every finding was reproduced by me in headless Chrome against head 564e31b and against the 9cc38f1 code (repro/repro29.mjs, repro29b.mjs, site-dup.mjs; logs in out/).

| ID | Sev | Plain words | head | 9cc38f1 |
|---|---|---|---|---|
| R29-GPT-01 | P2 | The full checker gives the default state twice: once as the positional page and once as the declared default state. The menu-open state's links get used up by the first copy, so the second copy fails. This breaks the standard declared menu-open fix, including the real site's `details.mnav` (en and ar), and it turns the full fixture red. | FAIL (synthetic nav, details, real site en/ar, fixture R21) | PASS |
| R29-GPT-02 | P2 | In an `<article>` with Sales/Costs headings, the last section (Costs) is not bounded by the article. So a Download button in an aside after the article counts as Costs' own. A missing Costs Download passes; a missing Sales Download fails. | missing Costs + aside: PASS | FAIL |
| R29-GPT-03 | P2 | An `aria-expanded` Help button with no `aria-controls` is treated as revealing its whole parent (the form). In an error state that hides Save at 320, the default state's Save then covers the loss, even with only default and error declared. R28-MIMAR-02 is back as soon as the form has a Help toggle. | PASS (should fail) | PASS |
| R29-MIMAR-01 | P2 | Same mechanism, standing R26 ruling broken: a lone Menu button with `aria-expanded` and no `aria-controls` "reveals" all of `<main>`, footer included. A sloppy menu-open state that never opens the nav passes again, because the footer's About/Work copies stand in. Footer copies must not count (R26-GPT-01). | PASS (r26 g01, maxHeight and display:none) | FAIL |
| R29-GPT-04 | P2 | A control that is already visible in the region is not set aside. In a list with two Remove buttons, the second is hidden at 320 in both states, and the first (still visible) Remove covers it. | PASS (should fail) | FAIL |
| R29-GPT-05 | P2 | Nested regions keep separate "used" sets. One Remove button in the all-open state covers two lost Removes, one from the outer region and one from the inner `<details>`. The same page without nesting fails correctly. | nested PASS / flat FAIL | FAIL / FAIL |
| R29-GPT-06 | P2 (false positive) | The opener's name is part of its key. **Menu → Close in the open state fails** in every variant: with aria-controls, without it, and with aria-label "Open menu"→"Close menu". Two separate menus both named "Menu" also fail. Both are common honest patterns, and listing them in UNTESTED.md does not excuse them. | FAIL | PASS |
| R29-GPT-07 | P2 (false positive) | Openers not recognised: native `<button popovertarget>`, and a menu button with **`aria-haspopup` but no `aria-expanded`** and no aria-controls, both fail. `aria-haspopup` without aria-expanded passes only when aria-controls is present. | popover FAIL; haspopup-only FAIL; haspopup+controls PASS | PASS |
| R29-GPT-08 | P2 (false positive) | **Carousels without aria-controls**: the fallback region key (tag, role, label…) must be unique. An unlabelled carousel with every slide declared passes alone, but fails when the page also has one cropped-image wrapper, or a second unlabelled carousel. Labelled carousels (role=region, aria-roledescription, aria-label) pass in both cases. | unlabelled + crop FAIL; two unlabelled FAIL | PASS |

### Specifically requested tests
- **Menu renamed in the open state (Menu → Close):** fails at head in all three variants (R29-GPT-06, P2). It passed at 9cc38f1.
- **aria-haspopup menus without aria-expanded:** pass with aria-controls and fail without it (R29-GPT-07, P2). popovertarget also fails.
- **Carousel controls without aria-controls:** these pass alone, labelled or not. Unlabelled ones fail beside an image crop or a second carousel (R29-GPT-08, P2).

## Tiebreaks (mine, for the fixer)
1. **GPT-01:** run loss accounting once per distinct rendering. When the declared state's page is the positional page, account once and copy the result to both records. Add a fixture-shape test with [positional default, declared default, menu-open].
2. **GPT-03 + MIMAR-01:** stop inferring "reveals its parent". An `aria-expanded` button with no aria-controls reveals only its next sibling, and only when that sibling is hidden or collapsed in the closed state and shown in the open state. Anything else fails closed. That keeps the R25/R26 aria-expanded menus (a button next to its nav) passing and footers out.
3. **GPT-04/05:** use one shared pool per (source state, target state, width) across all regions. In that pool, set aside the source's own still-visible occurrences first.
4. **GPT-06:** match openers across states by the region they control: the aria-controls target, or the next sibling or details for structure, plus the path. Do not match by name. Two same-named openers with different regions are two openers.
5. **GPT-07:** add `popovertarget` and `aria-haspopup` buttons as openers, with the same region rules as tiebreak 2.
6. **GPT-08:** a clipping box with no ledger items (a pure image crop) never takes part in the uniqueness check. Fallback boxes are matched by structural path, not by tag, role and label alone.
7. **GPT-02:** apply the containing section or article as the outer bound for every heading in it.
Mandatory before the next round: the **full fixture** and a run of the real site in the checker's input shape.

## Ruflo
- Using only Ruflo's own CLI on the local store (`/workspace/ruflo-home`), I created a parent task "R29 round" and step tasks for verify, opus, gpt, crosscheck and merge. Statuses were set with `task assign` (in_progress) and `mcp exec task_complete/task_update` (in-process, local store; no daemon, no mods, no doctor, no paid model).
- I added `issues claim/status` claims so the **Claims** page showed per-step progress. Plain frames at 12:44 AM show verify completed 100%, gpt completed 100%, opus blocked, crosscheck active 55%, round active 20%, and merge as an "open task".
- **Missing:** the **Missions** page needs the `ruflo-goals` mod ("n/a — ruflo-goals is not installed"), and installing mods is forbidden. The **Events** page keeps nothing because `eventsPersist` is off ("not kept: the eventsPersist option is off"), and changing that is a settings change. The `task` command has no complete or update subcommand, and `hooks pre/post-task` do not change status.
- Honesty note: the verify task was marked completed by a test call at 12:27:07 AM. That is after the verify itself passed (12:26:34 AM), but before I had confirmed it.
- At 1:12 AM the parent told me to stop using the task CLI and to update `/workspace/ruflo-home/bridge/panel-status.json` instead. From then on I only updated that JSON (the bridge mirrors it to the Swarm page). The Ruflo tasks were left as they were: crosscheck in_progress, merge pending, round in_progress.
- Frames: out/ruflo-frames-1.txt, out/ruflo-frames-2.txt.
