# Mi'mar R32 changes (head f09d7df)

**Branch:** `fannan/r32-reveal-fixes` (stacked on `fannan/r31-reveal-fixes` / 89ead15)
**Registry:** `1474da1588cc73683fbfc2b821547d385195715d0a1e83c3ca745a8d5e7f11ba`
**Verify:** `python3 -B scripts/package-r3.py verify --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3 --registry-sha256 1474da1588cc73683fbfc2b821547d385195715d0a1e83c3ca745a8d5e7f11ba`

## Purpose
Implement Sol's accepted R32 fix specs M-01..M-11. M-12..M-17 rejected. Standing rejections unchanged.

## Carousel note (M-03/M-04)
Structural/role-based only: `aria-roledescription="carousel"` or a multi-slide flex/grid track inside an overflow clip. **No English/Arabic word lists** were added (removed R31 name-token shortcut).

## Per M-ID
| ID | Status |
|---|---|
| M-01..M-11 | done |
| M-12..M-17 | skipped (REJECT) |

## Tests
Node 245/245; panel-r32 11/11; honest sets R18-R28: 223/582 pass, 0 diffs vs R31, 0 new false failures.
