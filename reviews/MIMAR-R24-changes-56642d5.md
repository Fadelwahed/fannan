# Mi'mar R24 changes (panel round 24), package commit 56642d5

Start ec977f2 (R23 record). Review copied from scratch commit e48e483 after a secret scan (`reviews/panel-r24/MERGED.md`).

Registry: `trust/R3-CHANGES.sha256` sha256 `9b4835212ca0aeacbd4e4992a402ee9fe30d722cfbd99e6b39597a82de007ec6`. Verify: `python3 -B scripts/package-r3.py verify --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3 --registry-sha256 9b4835212ca0aeacbd4e4992a402ee9fe30d722cfbd99e6b39597a82de007ec6`.

## Fixes (Mi'mar's tiebreaks)
- R24-GPT-01 (P2): `width-screen.mjs` checks controls before the media-crop branch; a control's box and its own text ranges are measured whatever its border. Regressions: a borderless button and a nested label (fail, partly clipped), a fitting borderless button (pass).
- R24-GPT-02 (P2): reveal and truncation matches to a declared state are one to one for controls (each hidden control consumes one shown control of the same name in that state); text keeps any-copy matching. Regressions: two hidden Downloads with one shown (fail) or two (pass); a carousel's slides shown by different slide states (pass).
- R24-GPT-03 (P2): a closed list of equivalence groups (`coverByEquivalents`): a tablist adapted into an accordion (`summary` or a button with `aria-expanded`, same names, one to one; the tablist is covered only when every tab is matched) and a menubar adapted into a menu in a declared state (covered only when the menu's items match every menubar item one to one). No other role swap. Regressions: tabs to details (pass), a missing tab, tabs to plain buttons, tabs to listbox options (fail), menubar to menu (pass), a menu missing an item (fail).
- R24-MIMAR-02 (P3): the full-run fixture asserts the specific clampControl reason (a `partly clipped` truncation at 1440 holding `button:Download`, expanded state declared).
- R24-MIMAR-01 (P3): no change; noted in `release/UNTESTED.md` as backlog: collapsed pagination fails at 320, and the designer lets the links wrap.

## Evidence
Node suite 168/169 (the R18 autoplay timing test fails on the overloaded box and passes in isolation); R24 tests fail before (ec977f2 sources) and pass after; Node 20 163/6 (the same six Style Dictionary tests); package tests 46 OK; real site en/ar unchanged from R23 (menu-open state PASS); honest R18-R23 identical to R23, R24 repro pages behave as expected (pager fails: P3 backlog; breadcrumb fails: true positive). Not run (time limit): full-run fixture, no-deps suite, no-git package copy, self-test and syntax sweep, the glyph measure.
