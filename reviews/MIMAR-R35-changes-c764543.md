# Mi'mar R35 changes (head c764543)

**Branch:** `fannan/r35-carousel-fixes` (stacked on `fannan/r34-declared-carousels` / 9d3c2a3)
**Head:** `c764543e5a998ebfbb6207d77492d9144653bcbb`
**Registry:** `2bbc65f1db4f32275129071b328881a27325d0b645bd454ed86ddd104bfe7f33`
**Verify:** `python3 -B scripts/package-r3.py verify --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3 --registry-sha256 2bbc65f1db4f32275129071b328881a27325d0b645bd454ed86ddd104bfe7f33`

## Purpose
Implement Sol's R35-M-01..M-09 fix specs from panel MERGED.md / r2-sol-lead.md (accepted 0/0/8/1). No design decisions beyond the specs.

## Breaking changes
None intended beyond enforcing the R34 declared-carousel contract more strictly (ghost siblings, broad reveals, missing/ineligible openers, active scroll overflow).

## What changed
| Item | Status | Change |
|---|---|---|
| R35-M-01 | done | Composed clipping ancestors under declared root; payload not box size |
| R35-M-02 | done | scrolledText retains path identity; strip only wholly cut inactive payload; icon controls covered |
| R35-M-03 | done | ≥2 distinct observed slide indices across inventory before carousel alternative |
| R35-M-04 | done | Every reveal region must sit in a registered slide |
| R35-M-05 | done | Remove verifiedStep exemption for missing target opener |
| R35-M-06 | done | Carousel alternative only for buttons/button-roles/tabs |
| R35-M-07 | done | Mapped-scroll inactive desktop payload → coverable ordinary loss at graded width |
| R35-M-08 | done | Registry lists real R34 record; PENDING removed; anchored verify PASS |
| R35-M-09 | done | SKILL Harden mapped example + first-slide guidance; VERIFICATION R31 SUPERSEDED |

## Tests
- panel-r35 M-01..M-09 (see suite)
- panel-r20/r29/r30..r34 regressions PASS on fixer box
- Anchored verify: PASS with registry above

## Untested / deferred
- Full local fixture and honest-set survey: not re-run in this fix PR unless requested
- Offline carousel libraries beyond existing Bootstrap coverage
