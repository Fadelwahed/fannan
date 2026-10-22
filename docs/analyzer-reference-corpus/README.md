# Analyzer reference corpus

This corpus is the reference set for the 320px width screen in `release/tools/width-screen.mjs` (`REFLOW_WIDTH = 320`) and for the calls to it from `release/tools/pre-handoff-check.mjs`. It has two parts:

- the 320px reflow fixtures in the committed tests
- the honest sets from panel rounds R18 through R28

The checker screens every declared desktop width and then 320 CSS px. That width stands in for a 1280px desktop at 400% zoom. It is not a mobile-design approval. See the note in `release/tools/width-screen.mjs`.

These files live on the workbench branch, under `docs/`. They do not change anything under `release/` or `trust/`.

## What it is for

The fixtures and the honest sets are the pages the width screen is judged against. A change to `width-screen.mjs` or to the width part of `pre-handoff-check.mjs` is compared with the recorded verdicts. The corpus is not edited so that the checker passes. If a verdict changes, the change is written into that round's record (`reviews/MIMAR-R<n>-changes-<sha>.md` and the matching section of `release/VERIFICATION.md`), with the before and after logs.

## 320px reflow fixtures

These pages are not standalone files. The short cases are HTML strings passed to `page.setContent` inside `release/tests/width-screen.test.mjs`. The full-gate page is the string exported by `fixturePage` in `release/tests/fixture-page.mjs`. `release/tests/local-fixture.mjs` writes that string to a temporary `home.html` and asserts that the page and its declared state are screened at 1440 and at 320.

`width-screen.test.mjs` does not read `FANNAN_DEPS` or `FANNAN_TEST_CHROME`. It looks for Playwright under `runtime-deps` next to `release/`, and for Chrome at `/usr/bin/google-chrome` (on macOS, the application path in that file). If either is missing, the Chrome cases skip with `test-only deps or local Chrome absent`.

| Fixture (test name) | Where the page lives | What it checks at 320 |
|---|---|---|
| R8 PORT-02, fluid page (`max-width:60rem`) | inline `setContent` in `release/tests/width-screen.test.mjs` | declared widths, then 320, pass; viewport restored to 1440 |
| R8 PORT-02, fixed `width:1400px` main | same | horizontal overflow at 1280 and at 320 |
| R8 PORT-02, nowrap ellipsis sentence | same | one clipped element |
| R8 PORT-02, `lang=ar` / `dir=rtl` | same | language and direction must match the declared state |
| CODEX-R4-04, ellipsis on text that fits, and on text that overflows | same, via `inspectLayout` | fitting ellipsis is not a clip; overflowing ellipsis is |
| ARGON-R5-02, `overflow` hidden or clip on `html` and `body` | same | those two together cannot hide a wide layout |
| ARGON-R5-05, content past the left edge, and skip-link patterns | same | off-screen-left content fails; a visually hidden or off-screen skip link does not |
| R11 S3 / panel B, sideways scroller | same | at 320, ordinary text or media in a sideways scroller fails; two-dimensional content is a recorded candidate, not an automatic pass |
| R12 M01/M02/M10/M11/M14 | same | bare and direct text, content past either scroller edge, shadow scrollers, keyboard reach, hidden content |
| `fixturePage` | string in `release/tests/fixture-page.mjs`, written by `release/tests/local-fixture.mjs` | full pre-handoff run; the log must show widths `1440,320` on the page and the state |

When a round ran the full fixture, the checker dump is `test-results/rNN/local-fixture-evidence.json`. The `page` field points at a temporary directory (`/tmp/fannan-browser-fixture-…/design-output/test/home.html`), not at a committed HTML file. That JSON is present for R18, R19, R20, R21, R22, R23, R25 and R26. It is not in `test-results/r24/`, `test-results/r27/` or `test-results/r28/`. R24's verification record says the full-run fixture was not run that round (`release/VERIFICATION.md`).

`test-results/local-fixture/` is an older copied tree (tools, runtime, and one `design-output/test/home.html`). It is not the R18–R28 honest-set pages.

## Honest sets R18–R28

Each round adds repro pages and re-runs the earlier rounds. The committed regression tests are `release/tests/panel-r18.test.mjs` through `release/tests/panel-r28.test.mjs`. Inside those files the HTML is a string. The helper writes it to a temporary file (`mkdtempSync` under the OS temp directory), opens it, and deletes the directory. Those pages are not committed.

The survey logs name another set of paths, such as `panel-r18/repro/case-accordion.html`, `scratch/r18/cases/case-accordion.html`, `panel-r27/repro/pages27/r1.html` and `panel-r28/repro/pages28/h1.html`. Those HTML files are not in this worktree. No `*.html` file is committed under `reviews/`. Some rounds do commit the generator that writes the HTML, and the generator's output directory is outside the repo:

| Round | Generator committed here | Output path in the generator |
|---|---|---|
| R18 | `reviews/panel-r18/repro/repro18.mjs`, `repro18b.mjs` | `/workspace/panel-r18/repro/case-<name>.html` |
| R19 | `reviews/panel-r19/repro/repro19.mjs`, `repro19c.mjs` | `/workspace/panel-r19/repro/` |
| R20 | `reviews/panel-r20/repro/repro20.mjs` and `repro20-before.mjs`, `repro20b.mjs`, `repro20c.mjs`, `repro20d.mjs` | `/workspace/panel-r20/repro/` |
| R21 | `reviews/panel-r21/repro/*.mjs` | `/workspace/panel-r21/repro/` |
| R22 | `reviews/panel-r22/repro/repro22.mjs`, `repro22b.mjs` | `/workspace/panel-r22/repro/` |
| R23 | `reviews/panel-r23/repro/repro23.mjs`, `repro23b.mjs` | `/workspace/panel-r23/repro/` |
| R24 | none (`reviews/panel-r24/` is `MERGED.md` only) | new pages in `test-results/r24/R24-honest-patterns.log` are `panel-r24/repro/…`; the `h-r18` section of that same log is `scratch/r18/cases/…` |
| R25 | none (`reviews/panel-r25/` is `MERGED.md` only) | pages appear in the R25 log as `panel-r25/repro/…` |
| R26 | none (`reviews/panel-r26/` is `MERGED.md` and `r1-gpt.md`) | pages appear in the R27 and R28 logs as `panel-r26/repro/…` |
| R27 | none | `panel-r27/repro/pages27/*.html` in `test-results/r27/R27-honest-new.log` |
| R28 | none | `panel-r28/repro/pages28/*.html` in `test-results/r28/R28-honest-r28-new.log` |

That missing HTML is a gap. The verdicts are in the logs. The pages themselves cannot be opened from this worktree.

### Round table

| Round | Test file | Evidence log(s) | What the set covers |
|---|---|---|---|
| R18 | `release/tests/panel-r18.test.mjs` | `test-results/r18/R18-honest-patterns.log` | Rendered-visibility backstop, copy-deck accessible name, option label. `release/VERIFICATION.md` describes the survey as the round's 21 repro pages plus four GPT repros, both renderings. The test's own honest strings include a sticky header, a fixed header, photo scrims, Arabic text, a large heading, icons, a badge, a hidden tooltip and a marquee, plus the shell, tab strip, carousel, autoplay carousel, accordion and fixed cookie banner. |
| R19 | `release/tests/panel-r19.test.mjs` | `test-results/r19/R19-honest-patterns.log` | Width-screen hidden content, covers a hit test cannot see, lazy content in an inner scrollport, the colour-contrast incomplete resolver, declared top-layer dialog and popover states, and a hidden `aria-labelledby` name. The log sections are `h-r18` and `h-r19` (veils, fade, SVG, sticky table header, dialog, popover, and the other `case-*.html` names in that file). |
| R20 | `release/tests/panel-r20.test.mjs` | `test-results/r20/R20-honest-patterns.log` | One clipping rule by states and widths (320 included), faintest-glyph contrast, `requiresScript` compared with the default state's JavaScript-off rendering, text fingerprints, and a gradient veil over text that fits. Log sections `h-r18`, `h-r19`, `h-r20`. |
| R21 | `release/tests/panel-r21.test.mjs` | `test-results/r21/R21-honest-patterns.log` | Cropped media is not clipped content; a closed `<details>` menu; text or a control `display:none` at 320; read-more clamps; reveal matched by text; glyph contrast on a light patch; script-only slot replacement. Sections `h-r18` through `h-r21`. |
| R22 | `release/tests/panel-r22.test.mjs` | `test-results/r22/R22-honest-patterns.log` | Three contrast zones on the faintest glyph cluster, media fallback content not counted as rendered text, typed lost prints, shortened labels, a read-more state that must show every text print, and `content-visibility` / closed popover content. Sections `h-r18` through `h-r22`, plus a glyph-measure section. |
| R23 | `release/tests/panel-r23.test.mjs` | `test-results/r23/R23-honest-patterns.log` | Same accessible name, one to one, inside an action family; a cut label is a clip, not a media crop; WAI-ARIA widget roles are controls; a clamp may only hide text; an unmeasured faintest glyph is zone (c) in the resolver test (no honest page produced one). Sections `h-r18` through `h-r23`. |
| R24 | `release/tests/panel-r24.test.mjs` | `test-results/r24/R24-honest-patterns.log` | Controls checked before the media branch; reveal matches are one to one; the closed list of role swaps. Sections `h-r18` through `h-r24`. The full-run fixture was not run this round. |
| R25 | `release/tests/panel-r25.test.mjs` | `test-results/r25/R25-honest-patterns.log` | A hidden control counts once; the one-to-one count is shared across clipping boxes; a nav collapsed by `max-height:0` is rescued only by a real menu-open state; tabs that become headed sections. Sections `h-r18` through `h-r25`. `release/VERIFICATION.md` names the passing state pages `p-mh-o`, `p-dn-o`, `p-n-e`, `p-p-e`, `p-s-e`, `p-ts`, `p-ta`, and says the default-only pages fail without declared states. The same record says the R18 autoplay carousel's JavaScript-on rendering at 320 was `partly clipped` instead of `reveal` in this log (slide captured mid-transition). |
| R26 | `release/tests/panel-r26.test.mjs` | no `R26-honest-patterns.log`. The R26 survey was not finished that round (`release/VERIFICATION.md`). The pages are in `test-results/r27/R27-honest-r18-r26-new.log` and `test-results/r28/R28-honest-r18-r26-new.log` under `## panel-r26` | Loss accounting by element identity: one ledger per screen, footer copies never cover nav items, tab headings, carousel slides by element, motion settled before the width is measured. `test-results/r26/local-fixture-evidence.json` is the full-gate fixture, not the honest survey. |
| R27 | `release/tests/panel-r27.test.mjs` | `test-results/r27/R27-honest-new.log`, `R27-honest-old.log`, `R27-honest-r18-r26-new.log`. R28 re-logged pages27 in `test-results/r28/R28-honest-r27-new.log` | Stable identity key rather than sibling position; tab panels scope keys; the action family keeps identity across role changes; what the source state shows is set aside before name matching. The new-code log is headed `## panel-r27 pages27`. `release/VERIFICATION.md`: R18–R26 (436 page renderings) match the previous verdict; `pages27/r1.html` with JavaScript on passes (toolbar buttons become menu items). |
| R28 | `release/tests/panel-r28.test.mjs` | `test-results/r28/R28-honest-r18-r26-new.log`, `R28-honest-r27-new.log`, `R28-honest-r28-new.log`, `R28-honest-r28-old.log` | Same-state identity is the DOM node; cross-state cover only through a visible opener's revealed region. `release/VERIFICATION.md`: R18–R27 (536 renderings) had no verdict changes against the 9cc38f1 code; four pages28 renderings then fail (`h1`, `h4` with JavaScript on; `s1` both renderings), the panel's R28-GPT-01 and R28-GPT-03 pages. `reviews/panel-r28/MERGED.md` also cites `R28-honest-new.log` and `R28-honest-old.log`; those two names are not in `test-results/r28/`. |

Later cumulative logs repeat earlier sections. Use the round's own log for that round's new pages, and say which file you compared.

## Verdict totals

`README.md` in this worktree does not state a 582-run or 223-pass total. `release/VERIFICATION.md` does not use those two numbers either. Whether the main-branch README states them is UNTESTED from this worktree.

The numbers that are in the workbench files:

- `reviews/panel-r28/MERGED.md`: honest sets R18–R27 are 223 pages × JavaScript on/off = 536 renderings.
- `release/VERIFICATION.md` (R28): honest sets R18–R27, 536 renderings, no verdict changes against the 9cc38f1 code.
- `release/VERIFICATION.md` (R27): honest sets R18–R26, 436 page renderings, matching the previous verdict.
- `reviews/MIMAR-R32-changes-70cfd77.md`: honest sets R18–R28, 223/582 pass, 0 diffs against R31, 0 new false failures.
- `reviews/MIMAR-R33-changes-47effac.md`: honest sets R18–R28, 223/582 pass, 0 rows changed against R32/main, 0 errors.
- `reviews/MIMAR-R35-changes-6a1c5a0.md`: honest sets R18–R28, 582 rows unchanged (223 pass).

R32, R33 and R35 each report the same 223 passing rows out of 582, with no row changes in that comparison. R29 did not rerun the honest sets (`release/VERIFICATION.md`: "NOT rerun this round"). Do not treat 223 as the page count. The page count 223 in the R28 panel record is R18–R27 pages, and 223 pass in the later records is the passing-row count out of 582.

## How to rerun

Run one test file at a time, on Node 22 (the records use Node v22.23.3). `FANNAN_DEPS` is the directory that contains `node_modules/playwright-core`. `FANNAN_TEST_CHROME` is the Chrome binary. If either is unset, the panel tests use `runtime-deps` next to `release/` and `/usr/bin/google-chrome`.

```sh
FANNAN_DEPS=/path/to/runtime-deps \
FANNAN_TEST_CHROME=/usr/bin/google-chrome \
node --test release/tests/panel-r18.test.mjs
```

Repeat for `panel-r19.test.mjs` through `panel-r28.test.mjs`, and for the reflow fixtures:

```sh
node --test release/tests/width-screen.test.mjs
node release/tests/local-fixture.mjs
```

The second command does not take `FANNAN_TEST_CHROME`. It sets `FANNAN_DEPS` itself to the checkout's `runtime-deps` directory.

If Playwright or Chrome is missing, the panel tests and the Chrome cases in `width-screen.test.mjs` skip. The skip text is `test-only deps or local Chrome absent`. A skip is not a pass. Counts of skips are in `test-results/r18/node-without-deps.log` and `test-results/r19/node-without-deps.log`.

This command reruns the HTML that is inlined in the test file. It does not rebuild `R18-honest-patterns.log` or the later survey logs. Those logs were produced from the panel repro directories, which are not committed as HTML. Reproducing a survey log means running that round's generator where it still exists, against a checkout of the tools, and keeping the new log next to the old one. A verdict that moves is a round-record entry, not a quiet edit of the page.

## Rules

- Do not edit a fixture or an honest page so that the checker passes.
- Do not delete a failing row from a log.
- A real verdict change is recorded in the round record, with the log path and what changed.
- Adding this document does not change `release/` or `trust/`, and it does not retune the checker.
