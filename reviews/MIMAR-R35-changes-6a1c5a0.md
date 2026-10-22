# Mi'mar R35 changes (head 6a1c5a0)

**Branch:** `fannan/r35-carousel-fixes` (base `main` 90e1298)
**Head:** `6a1c5a0715ecc5dd60dda1c82a27695dcb175074`
**Registry:** `e886862bad30bcb808f5493f316d23fd623b9fe9517ede86af278db66bf1deb7`
**Verify:** `chmod 0444 trust/MANIFEST.sha256 trust/R3-CHANGES.sha256 && python3 -B scripts/package-r3.py verify --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3 --registry-sha256 e886862bad30bcb808f5493f316d23fd623b9fe9517ede86af278db66bf1deb7`

## Purpose
Round 35 fixes for accepted R35-M-01..M-09 and Sol's GROK-03 ruling (C, P2), fixed at the root.

## Root causes and fixes
| Item | Root cause (first wrong step) | Fix there |
|---|---|---|
| R35-M-01 | Slide observability tested clipping only against the declared root box (root assumed to be the viewport) | Walk the composed clip chain from slide to root |
| R35-M-02 | Mapped-scroll cleanup dropped scroll diagnostics by label/text-sample match | Diagnostics carry overflow DOM paths; drop only if every path is wholly cut inactive payload |
| R35-M-03 | Observed slides summed per source/target pair | Distinct observed slide indices across the screen/language inventory |
| R35-M-04 | Region slide taken from the first matched reveal region | Every matched region must sit in a registered slide |
| R35-M-05 | R34 verified-step exemption from opener existence | Exemption removed; dialog/popover exception kept |
| R35-M-06 | Opener check never recorded control type | Role-first eligibility: button/tab roles, native button (not reset), input[type=button] |
| R35-M-07 | Synthetic mapped-scroll clip got the hard "shown at 1440, lost" rule at graded widths | At classification, wholly cut mapped-scroll payload becomes an ordinary coverable loss |
| R35-M-08 | Build hashed a transient PENDING record that was renamed before commit | Build refuses non-final record names; registry rebuilt |
| R35-M-09 | Stale skill example | SKILL.md, handoff-contract.md, VERIFICATION.md superseded marker |
| GROK-03 | A carousel mapping was only evidence for cover; its validity never decided pass/fail | resolveReveals validates each inventory independently (declarationIntegrity) |
| Sibling: nested clips | Clip cut sets used raw rects, blaming an outer clipper for an inner clipper's cut | Intersect with intermediate clip boxes first |

## Breaking changes (intended)
- Links, plain elements, summary, reset and role-overridden buttons are no longer carousel controls.
- Carousel targets must contain their opener; reveals must lie inside registered slides; ghost/missing members fail even when nothing is lost (contract tightening recorded in handoff-contract.md).
- package-r3.py build refuses transient review record names.

## Tests
See the PR description for counts. Honest sets R18-R28 582 rows unchanged (223 pass).
