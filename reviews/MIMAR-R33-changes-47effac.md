# Mi'mar R33 changes (head 47effac)

**Branch:** `fannan/r33-carousel-fixes` (stacked on `fannan/r32-reveal-fixes` / 70cfd77)
**Registry:** `ba2e93afed492ad96cf951a2a3a790cef5335dacffabc1b59e671484cd717ea4`
**Verify:** `python3 -B scripts/package-r3.py verify --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3 --registry-sha256 ba2e93afed492ad96cf951a2a3a790cef5335dacffabc1b59e671484cd717ea4`

## Purpose
Implement Sol's accepted R33 fix specs M-01..M-08 from `/workspace/panel-r33/out/MERGED.md`. M-09..M-20 rejected. Standing rejections unchanged. Corrected stale R32 record to head 70cfd77 / registry 53cc339e….

## What changed by M-ID
| M-ID | Status | Change |
|---|---|---|
| R33-M-01 | done | multiSlideTrackOf requires side-by-side peer slides cut by a constraining viewport (ordinary flex/grid under distant overflow no longer shortcuts) |
| R33-M-02 | done | Any display family + localized aria-roledescription via structure; display:none/block peers under carousel root |
| R33-M-03 | done | Auxiliary panels under a carousel root need an ordinary open signal (not the slide shortcut) |
| R33-M-04 | done | Graded-width checks opener existence/visibility/enabled/hit only; teaser visibility does not invalidate desktop baseline |
| R33-M-05 | done | Docs: only aria-expanded=false blocks haspopup/step (pressed/selected false do not) |
| R33-M-06 | done | Twin captures share clip decisions; pass recomputed from each twin's passExceptReveal |
| R33-M-07 | done | Undeclared fallback: pure-horizontal evidence only (no name/copy-slot/sig substrings) |
| R33-M-08 | done | Sole native :modal stays active without self-hit (width-screen + visibility) |
| R33-M-09..M-20 | skipped | REJECT |

## Tests run
- Node 22, one file at a time: **253/253** pass (panel-r33 **8/8**, panel-r32 **11/11**)
- Full local fixture: exit 0 (`test-results/r33/local-fixture.log`)
- Honest sets R18–R28: **223/582** pass, **0** rows changed vs R32/main, **0** errors
- Anchored verify: PASS with registry above
- Head: `47effacb0bfd6eef19154b04a90bded6da6e6dd2`
- Registry: `ba2e93afed492ad96cf951a2a3a790cef5335dacffabc1b59e671484cd717ea4`

## Review order
MERGED.md fix specs → width-screen.mjs → visibility.mjs → panel-r33.test.mjs → UNTESTED.md (M-05) → R32 record correction → package registry.

## Untested
- Carousel libraries offline-only (Swiper/Splide/Embla/Slick/Flickity) — not on the box; Bootstrap 5.0.0-beta3 exercised in panel repro for M-02.
- Real-site en/ar cells already logged by the panel in MERGED (not re-run in this fix PR).
- Opener operable only off-centre; purely visual open state (standing UNTESTED).
