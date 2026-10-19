# Mi'mar R30 changes record

**Branch:** fannan/r30-reveal-fixes (stacked on fannan/r29-declared-reveals / PR #20)
**Head:** e6300cd43490efb3901d67427982ecd51e67f5e4
**Base:** 0d3c13c (PR #20 head)
**Registry:** `408ff2bb0871ce02e893dbf2d724b174806fe7c3c47792f23cbeb1d94f5f01b5` (`trust/R3-CHANGES.sha256`)
**When:** 2026-10-19 05:48 AM Gaza (UTC+3)

## Purpose
Implement Sol's accepted R30 fix specs (18 P2 + 1 P3). R30-M-10 and R30-M-21 remain REJECTED and were not implemented.

## What changed (by merged ID)
| ID | Severity | Change |
|---|---|---|
| R30-M-01 | P2 | Native `dialog[open]` / `:modal` certify open state |
| R30-M-02 | P2 | `aria-haspopup` + shown declared panel certifies open (R29 haspopup expectation updated) |
| R30-M-03 | P2 | Disabled / fieldset-disabled / aria-disabled / inert openers fail operability |
| R30-M-04 | P2 | Effective opacity 0 (inherited) is not visible |
| R30-M-05 | P2 | Truncation only via verified declared expanded payload |
| R30-M-06 | P2 | Carousel fallback: path correspondence + reserve source-visible slides |
| R30-M-07 | P2 | One physical target spend across nested clip regions and clip+loss |
| R30-M-08 | P2 | Twin equivalence includes declaration probes / headings / composites |
| R30-M-09 | P2 | Distinct source renderings get independent cover pools |
| R30-M-10 | — | REJECTED (R27 ruling a); not implemented |
| R30-M-11 | P2 | `reveals` must agree with `aria-controls` / `popovertarget` |
| R30-M-12 | P2 | Docs use `state` not `id`; nonempty state name required |
| R30-M-13 | P2 | Checked checkbox/radio (/ARIA) certifies open |
| R30-M-14 | P2 | Only visible headings terminate sections |
| R30-M-15 | P3 | Declaration selectors resolve across open shadow roots |
| R30-M-16 | P2 | Opener excluded from revealed-payload items |
| R30-M-17 | P2 | Unmounted opener OK when dialog independently open |
| R30-M-18 | P2 | Next/Previous carousel steps need no persistent expanded state |
| R30-M-19 | P2 | Undeclared vertical text FAQ no longer uses box fallback |
| R30-M-20 | P2 | Active `:modal` background out of width ledger |
| R30-M-21 | — | REJECTED; not implemented |

## Tests
- Node 22, one file at a time: 222/222 after r20–r22 fixture updates (was 219 + 3 fixed by declaring opener/reveals on accordion/clamp cases).
- panel-r30: 19/19. panel-r29: 10/10.
- Package self-test PASS; build PASS; verify with --registry-sha256 408ff2bb0871ce02e893dbf2d724b174806fe7c3c47792f23cbeb1d94f5f01b5.

## Review order
1. release/tools/width-screen.mjs
2. handoff-contract.mjs + docs (M-12)
3. release/tests/panel-r30.test.mjs (and r20–r22/r29 updates)
4. Package rebuild and this record

## Status
Draft PR stacked on fannan/r29-declared-reveals. Awaits panel round 31. Do not merge without Fadel's yes (3:14 AM merge yes covered only #2–#19).
