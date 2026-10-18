# Mi'mar R25 changes (panel round 25), package commit 48cf795

Start dc1338f (R24 record). Review copied from `/workspace/panel-r25/out/MERGED.md` after a secret scan (`reviews/panel-r25/MERGED.md`).

Registry: `trust/R3-CHANGES.sha256` sha256 `9dd8468c9b18c0ff217736434fcf9e866bac74f2e938a756465733dbdf3c2b71`. Verify: `python3 -B scripts/package-r3.py verify --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3 --registry-sha256 9dd8468c9b18c0ff217736434fcf9e866bac74f2e938a756465733dbdf3c2b71`.

## Fixes (Mi'mar's tiebreaks, confirmed by Fadel)
- R25-GPT-01 (P2, R24 regression): cut items carry their owning control; a hidden control counts once, as one name per control, also across overlapping clipping ancestors. Regressions: button>span and a link with nested spans in a collapsed accordion with an expanded state (pass); two real same-name buttons with one shown (fail).
- R25-GPT-02 (P2): one shared one-to-one pool per source screen, state and width across all clipping boxes; each target state keeps its own pool (carousel slides). Regressions: sibling panels with one Download shown (fail) or both (pass); a carousel (pass).
- R25-GPT-03 (P2): a whole cut at a narrow width by a box with zero visible area (max-height or height 0, overflow hidden) is resolved by a declared state like display:none; a partial cut or a box with visible area still fails (Fadel's tightening). Regressions: max-height:0 and height:0 navs with menu-open (pass), alone (fail), a partial cut with menu-open (fail); full-gate fixture cases.
- R25-GPT-04 (P2): one added swap on the closed list: tabs becoming headed sections, each tab with one shown heading of the same name, panel content and actions by the ordinary rules. Regressions: h2 sections and role=heading (pass); missing heading, renamed heading, dropped panel action, plain paragraphs (fail). Documented in design-quality.md and handoff-contract.md.
- R25-GPT-05 (P3): chart encoding added to the backlog in `FANNAN-PLAN.md` and `UNTESTED.md`; no code.
- R25-GPT-06 (P3): the R24 record, VERIFICATION and the panel-r24 test comment now say R24-GPT-02 and 03 timed out in the recorded before-log; clean rerun in `test-results/r25/R24-chrome-before-rerun-r25.log` (3 assertion failures, 0 timeouts).

## Evidence
Node 174/174; R25 tests 4 assertion failures before (dc1338f), 66/66 after; Node 20 168/6 (the same six Style Dictionary tests); fixture expected stop with the R25 nav cases; package, Python, r2, self-test, syntax, lint pass; real site identical to R24; honest R18-R24 identical to R24 except the R18 autoplay carousel's JS-on 320 rendering (partly clipped vs reveal, captured mid-transition).
