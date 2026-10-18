# Mi'mar R27 changes (panel round 27, 18 October 2026)

Code: 0c93822 (stable key, reservation, section-local actions, panel-r27 tests); docs 2e8e0b4; evidence in `test-results/r27/`.
Registry: `trust/R3-CHANGES.sha256` sha256 `0b6b8e13aa000ad50bdb978ad09a1c525390daf718d2408418a380f882fc9b0e`. Verify: `python3 -B scripts/package-r3.py verify --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3 --registry-sha256 0b6b8e13aa000ad50bdb978ad09a1c525390daf718d2408418a380f882fc9b0e`.

- R27-GPT-01: identity key = `#id`, else nearest landmark (tab panels scope their own content) + role family + accessible name + link target + order among same-key elements. Menu-open with a Close button inserted before the links passes; footer stand-in fails.
- R27-GPT-02: tabs to headed sections requires at least each panel's actions, counted inside that tablist's sections only; sticky mobile Download neither breaks nor rescues.
- R27-GPT-03: action-family role changes keep identity (toolbar to menu items at 320 passes; removed action fails).
- R27-GPT-04: what the source state shows is reserved before name matching (undeclared slide fails even with footer Shop now).
- R27-GPT-06: design-quality.md and handoff-contract.md: stable key, not position; two approved extra coverage rules.
- Before/after: chrome 71/75 to 75/75; docs 20/21 to 21/21; package 2 failures to OK. Node suite 184/185 (R18 inner-scroll load flake, passes in isolation). Real site and honest sets R18-R26 unchanged; R27 pages27 r1.html (JS on) now passes.
