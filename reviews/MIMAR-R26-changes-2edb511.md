# Mi'mar R26 changes (panel round 26), package commit 2edb511

Start 49169df (R25 record). Review copied from `/workspace/panel-r26/out/` (MERGED.md, r1-gpt.md) after a secret scan.

Registry: `trust/R3-CHANGES.sha256` sha256 `9a492e0b9c4f9a71cf683f4a769aa7c1f6a16fa6893f9c8994690bfa406323ee`. Verify: `python3 -B scripts/package-r3.py verify --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3 --registry-sha256 9a492e0b9c4f9a71cf683f4a769aa7c1f6a16fa6893f9c8994690bfa406323ee`.

## Root-cause fix (Fadel's instruction, resolving R26-GPT-01..04)
`width-screen.mjs` accounts losses by element identity (`accountLosses`): one ledger per screen and language of every control and text item shown at 1440, keyed by composed DOM path plus print. At a narrow width an item is covered by the same element shown in any state of the screen, or, only through the closed swap list (action family, tabs to accordion, tabs to headed sections, menubar to menu), by a distinct element that was not itself shown at 1440, each cover used once across the screen. A collapsed box at a narrow width is display:none for the ledger. Carousel slides resolve by element first. A tab panel's own heading is never subtracted; tabs to headed sections needs every tab panel declared as a state and the panels' total count of each action. Two calls beyond the strict list are recorded in UNTESTED (same role and name, same text, distinct non-ledger elements). R25-GPT-04's default-only headed-sections expectations now fail by Fadel's rule.

## P3 (R26-MIMAR-01)
Before each width: running finite animations and transitions are paused and finished in the same task as the measure, recorded as `motionAtCapture`; infinite animations are left alone.

## Tests
`tests/panel-r26.test.mjs`: one per finding (GPT-01 includes the declared menu-open that does not open, max-height and display:none, with and without footer copies) plus the motion test through the probe world. Before (49169df): the five fail at their assertions. After: Node 179/180 (the known R18 autoplay timing test; passes in isolation), fixture exit 0, Node 20 the same six Style Dictionary failures.

## Found during the round
7eca59a (first push) ran settle-and-measure as a string, which the gate's isolated probe world cannot evaluate; f6ff685 fixes it and the motion test now covers that path.

## Left (45-minute limit)
Real site after the fix, honest sets R18-R26, a separate Chrome after-log.
