# Mi'mar R23 changes: panel round 23 (GPT plus Mi'mar cross-check; 4 P2, 2 P3)

Branch `mimar-r4-fixes`, from 613f489 (draft PR #1). Last code/package commit: 94da97c. Written Oct 18 2026, about 6:55 PM Gaza (UTC+3). This is the latest round record: the only file besides the registry that may stay unhashed. The R22 record (`reviews/MIMAR-R22-changes-698734d.md`) is now hashed.

Inputs: `reviews/panel-r23/MERGED.md` and `r1-gpt.md`, plus Fadel's R23 tiebreaks (6:00 PM). Starting state: the box checkout was at eeeb371, equal to `origin/mimar-r4-fixes`, with a clean tree. The fixes were pushed at about 6:15 PM, once the full Node suite passed (91f418b). The work was interrupted at about 6:50 PM, which cut off the "fixture before" run; that run's process had already stopped and nothing else was killed. The panel-r23 output was copied after a secret scan (strict patterns plus the package's `secret_content()` and `junk_or_secret()`; 21 files, no hits).

Registry: `trust/R3-CHANGES.sha256` sha256 `e468e0dd4ab6b1084ad83a4670c1a9a0d1fe73d2b8278184bc915fd9e4949c0d`. The threat model, the convergence rule and Fadel's floors are unchanged.

## Fixes

| Item | Fix |
|---|---|
| R23-GPT-02, R23-MIMAR-01 (P2/P3) | Prefix and abbreviation matching is retired. A control matches only by the same accessible name, one to one, and is counted once per control element. Button, link, menuitem, menuitemcheckbox and menuitemradio form one action family. A declared state resolves a loss only when it shows as many same-name actions at that width. Save/"Save as", Cancel/"Cancel subscription", Compare/"Compare all plans", a second Remove button and an unlabelled shortened label all fail. "Export report" moved into a declared More menu as a menuitem passes, and so does a shortened label that keeps an `aria-label`. This is documented. |
| R23-GPT-03 | A control is measured by its box and its own text ranges, so a label cut by its box or wrapper is `partly clipped`, not a media crop. Confirmed: the regression test passes against the d9e1049 width screen and failed at eeeb371. |
| R23-GPT-04 | Every ARIA 1.2 widget role and composite widget role is a control, plus native inputs, select, textarea, summary, progress and meter. `tabpanel` is excluded, and `separator` counts only when it is focusable. Each widget hidden at 320 fails, and all of them shown pass. |
| R23-GPT-05 | A clamp or ellipsis box whose cut set holds a control fails, even with an expanded state. An accordion reveal that holds a link still passes. |
| R23-GPT-01 (P3) | An unmeasured faintest glyph in either rendering is zone (c): it resolves only with a citing PASS review that has `worstRegion`. A value measured below 3:1 (less the margin) in either rendering fails. |

## Behaviour changes and false positives

- **Footer links no longer count for the nav (judgement for Fadel).** Under one-to-one matching, footer copies of nav links do not stand in for hidden desktop nav links.
  - Real site, default state alone: the width screen now fails at 320 in both languages.
  - With the declared menu-open state: both languages pass with 0 unresolved.
  - Visibility backstop: 0 obscured, 0 unreadable, 0 unmeasured, JavaScript on and off.
- **Panel's More-menu repro (judgement for Fadel).** The `k-tb-o` open state shows its menu at 1440 as well as at 320. That gives two Export actions at 1440 and one at 320, so the state fails. A menu hidden at 1440 passes, as the test and the fixture show.
- **Short-label pages.** `e-shortLabel` now fails, as the tiebreak intends; `e-shortLabelAria` passes.
- **Honest sets R18 to R23.** Apart from the items above, results are identical to R22. The R23 failures are true positives. **0 false positives, with those two judgements as made.**

## Tests and evidence

- **Before/after (`test-results/r23/`):**
  - Chrome: 52 of 59 before (7 assertion failures), 59 of 59 after.
  - Docs: 16 of 17 before, 17 of 17 after.
  - Package: 2 FAIL before, 45 OK after.
  - Fixture after: exit 0, and the R23 full-gate expectations hold.
  - The "fixture before" run was cut off by the interruption and is not completed.
- **Full suites:**
  - Node 165/165; without deps 84 + 81 skipped.
  - Python 10; r2 4 + 4.
  - Package 45 (git) / 40 + 5 skipped; self-test PASS.
  - Syntax mjs=49, 0 failures; lint 0 errors.
  - Fixture exit 0 (expected stop).
  - Node 20: 158 PASS, 7 FAIL. Six are the known Style Dictionary failures. The seventh is the R18 autoplay carousel test, which was timing-sensitive on the loaded box and passes on rerun.

## Untested

See `release/UNTESTED.md` (R23). In short:
- **Name matching:** same-name controls with different destinations count as interchangeable.
- **Composites:** a composite widget without item roles is matched as one print.
- **Labels:** pseudo-element labels and icon fonts.
- **Clamps:** an inert or `visibility:hidden` control inside a clamp.
- **Full gate:** the unmeasured-glyph path, which was checked on the resolver only.
- **Fixture before:** the R23 fixture expectations were not run against eeeb371.

Only GPT reviewed this round.
