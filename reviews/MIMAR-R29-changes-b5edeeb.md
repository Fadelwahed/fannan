# Mi'mar R29 changes (panel round 29, 19 October 2026)

Branch `fannan/r29-declared-reveals`, stacked on `fannan/18-package-trust` (1ffb89c, tree equal to 564e31b). Code: declared reveals and gate verification; tests, docs and evidence in `test-results/r29/`.
Registry: `trust/R3-CHANGES.sha256` sha256 `84ab040cfb65290e449f109db7a2b6ff08897072c8ca1795ad3e8070a0653166`. Verify: `python3 -B scripts/package-r3.py verify --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3 --registry-sha256 84ab040cfb65290e449f109db7a2b6ff08897072c8ca1795ad3e8070a0653166`.

- Reveals are declared, never inferred: a non-default state that rescues hidden content declares `opener` and `reveals`; the contract requires both together (handoff-contract.mjs).
- The gate verifies each declaration at each width: losing state: region hidden, every matched opener visible and operable (hit test); declared state: region visible, opener open (aria-expanded, open details, :popover-open, selected tab or slide control). Invalid declarations rescue nothing and report why. Opener names never compared (R29-GPT-06/07/08).
- Cover only inside the declared region, same role family and name (or text), one to one; the pool is one per losing state and width, shared across every declared state and region (Mi'mar's ruling; round 30 to review). Visible items cover nothing (R29-GPT-04); nested regions never double count (R29-GPT-05); no declaration, no cross-state cover (R29-GPT-03, MIMAR-01).
- Identical renderings of a state accounted once (R29-GPT-01, the checker's exact shape). Sections end at the next heading of equal or higher rank or at their sectioning ancestor; asides outside never join (R29-GPT-02).
- Undeclared carousels clipped at 1440 fall back to the same clipping box (one by signature, or the same structural path).
- Fixtures changed (declarations only): panel-r21, r23, r24, r25, r26, r27, r28 tests; local-fixture r20 faq-open, r21 menu-open, r23 more-open, r25 navMenuOpen and navPartial.
- Before/after: chrome (panel-r29 + width-screen) 9/20 to 20/20; docs 21/22 to 22/22; package 2 failures to OK; Node 203/203 (one file at a time); full fixture passes. Real site (en/ar, JS on/off, checker shape): declared menu-open fails on old code and passes on new; default-only fails in both. Honest sets R18-R29 old vs new: not rerun (UNTESTED).
