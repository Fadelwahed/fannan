# Mi'mar R31 changes (head 89ead15)

**Branch:** `fannan/r31-reveal-fixes` (stacked on `fannan/r30-reveal-fixes` / b6edafb)
**Registry:** `9150eb75e5145f12f8c0d486e68aa1fedce46b003e62b4d614c8aa6b0fdac2e4` (`trust/R3-CHANGES.sha256`)
**Verify:** `python3 -B scripts/package-r3.py verify --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3 --registry-sha256 9150eb75e5145f12f8c0d486e68aa1fedce46b003e62b4d614c8aa6b0fdac2e4`

## Purpose
Implement Sol's accepted R31 fix specs (M-01..M-13 except M-06 withdrawn by Mi'mar override: not reproduced in Chrome). Standing rejections unchanged (R27 ruling a, R30-M-10, R30-M-21).

## What changed by M-ID
| M-ID | Status | Change |
|---|---|---|
| R31-M-01 | done | Cover pools keyed by losing state, rendering and evaluation width |
| R31-M-02 | done | Truncation allows already-visible introduction (`allowVisibleRegion`) |
| R31-M-03 | done | Carousel steps via horizontal-track transition / broad name tokens |
| R31-M-04 | done | Supplied aria-controls / popovertarget ids must all resolve |
| R31-M-05 | done | Undeclared fallback requires horizontal carousel evidence only |
| R31-M-06 | skipped | REJECTED (not reproduced in Chrome) |
| R31-M-07 | done | Native `:disabled` (fieldset first-legend exception); drop blanket fieldset closest |
| R31-M-08 | done | `:modal` discovery across open shadow roots |
| R31-M-09 | done | Topmost modal via self hit-test among `:modal` matches |
| R31-M-10 | done | Truncation spends targets into the shared per-width physical ledger |
| R31-M-11 | done | Docs: open signals, per-width pools, supersede haspopup-invalid claim |
| R31-M-12 | done | Only true/menu/listbox/tree/grid/dialog haspopup; explicit false open-state fails (incl. stuck aria-expanded) |
| R31-M-13 | done | Disabled/inert reason distinct from obstruction |

## Tests run
- Node 22, one file at a time: **234/234** pass (includes new panel-r31 12/12)
- panel-r30 19/19, panel-r29 10/10, designer-process 22/22
- Package self-test PASS; build PASS; anchored verify with registry above

## Review order
Read MERGED.md fix specs → width-screen.mjs → panel-r31.test.mjs → docs (M-11) → package registry.

## Untested
Panel R31 UNTESTED items 1–2 (honest-set survey and real-site en/ar) were already run by the panel and are outside this fix PR.
