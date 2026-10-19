# Mi'mar R34 changes (head 6536d6c)

**Branch:** `fannan/r34-declared-carousels` (stacked on `fannan/r33-carousel-fixes` / 47effac)
**Head:** `6536d6c1ea6aab128ed513b889438352c6ac76cc` (package rebuild tip; this record commit sits immediately above)
**Registry:** `4f8cf3feaaa211be4a75957bfacbc1f2171c7dfb84f2e613d54a4747b185343f`
**Verify:** `python3 -B scripts/package-r3.py verify --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3 --registry-sha256 4f8cf3feaaa211be4a75957bfacbc1f2171c7dfb84f2e613d54a4747b185343f`

## Purpose
Implement Sol's root-cause carousel design from `/workspace/panel-r34/out/r3-sol-carousel-design.md` + MERGED-addendum.md, plus MERGED.md R34-M-05 docs. Optional `carousel:{root,slides}` on reveal declarations; delete geometric/description inference and undeclared horizontal box fallback; prove steps by target slide hidden in source / fully shown in declared state; keep `aria-expanded=false` veto; record slide visibility before probe scrolling; same-state cover/media-crop first. Corrected stale R33 record to head 47effac.

## Breaking changes (intentional)
1. Undeclared horizontal clips no longer receive cross-state box/signature fallback — they fail closed without a valid declaration.
2. Carousel declarations that need the slide shortcut must include `carousel:{root,slides}`.
3. Every slide including the first needs its own declared state (reciprocal cover).

## What changed
| Item | Status | Change |
|---|---|---|
| R34 design (Sol) | done | Explicit mapping; verifiedStep cross-capture; delete carouselRootOf/multiSlideTrackOf/inGenuineCarousel/one-capture carouselStep/carouselLike/undeclared box matching |
| R34-M-05 docs | done | handoff-contract.md, design-quality.md, UNTESTED.md (SUPERSEDED markers) |
| Contract validation | done | carousel shape + consistent ordered slides per root/lang |
| panel-r34 C-01..C-11 | done | New regression suite |
| panel-r30..r33 carousel tests | done | Amended with mapping + complete slide inventory |
| Older panel carousel positives (r20/r24–r27/r29) | done | Amended for deleted undeclared fallback |
| local-fixture R20 revealDeclared | done | Mapped carousel + slide-1..3 |
| R33 record | done | Renamed/fixed to MIMAR-R33-changes-47effac.md |

## Tests run
- Node 22 suite: re-run after this record (see PR report)
- Full local fixture + honest R18–R28 survey: **deferred to round 35 panel**
- Anchored verify: **PASS** with registry above
- Package tip: `6536d6c1ea6aab128ed513b889438352c6ac76cc`
- Registry: `4f8cf3feaaa211be4a75957bfacbc1f2171c7dfb84f2e613d54a4747b185343f`

## Review order
design.md + addendum → width-screen.mjs → handoff-contract.mjs / pre-handoff-check.mjs → docs → panel-r34 + amended tests → package registry → R33 record correction.

## Untested
- Offline carousel libraries (Swiper/Splide/Embla/Slick/Flickity) not on the box; Bootstrap exercised in panel-r34 C-07.
- Real-site en/ar matrix not re-run in this fix PR.
- Opener operable only off-centre; purely visual open state (standing UNTESTED).
- Capture-time scroll snapshot edge cases beyond C-06 scroll variant.
