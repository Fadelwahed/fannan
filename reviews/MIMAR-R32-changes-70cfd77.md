# Mi'mar R32 changes (head 70cfd77)

**Branch:** `fannan/r32-reveal-fixes` (stacked on `fannan/r31-reveal-fixes` / 89ead15)
**Registry:** `53cc339e27bc4955538dd34c417190bb7207367fda17b7333f94582b80ccf217`
**Verify:** `python3 -B scripts/package-r3.py verify --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3 --registry-sha256 53cc339e27bc4955538dd34c417190bb7207367fda17b7333f94582b80ccf217`

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
