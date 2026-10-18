# Mi'mar R28 changes (panel round 28, 19 October 2026)

Code: 9eec1e6 (two-step loss accounting, key code deleted) and the R28-MIMAR-01 panel-to-tablist fix; tests and docs 38712e6; evidence in `test-results/r28/`.
Registry: `trust/R3-CHANGES.sha256` sha256 `a776ebf0030d855ed99631c3f5f241be40b6376746dfa398dd5f19b62400a592`. Verify: `python3 -B scripts/package-r3.py verify --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3 --registry-sha256 a776ebf0030d855ed99631c3f5f241be40b6376746dfa398dd5f19b62400a592`.

- (A) Same-state identity is the DOM node, tagged (data-fannan-ws) at 1440 in the session; a reworded or renamed node is lost (R28-GPT-01), repeated shadow ids are two nodes (R28-GPT-03), regenerated ids across states do not matter (R28-GPT-05).
- (B) Cross-state cover only through a visible opener's revealed region, one to one per region; no ids compared across states (R28-GPT-02, R28-MIMAR-02; reveals by opener region or clipping box).
- Sections end at the next heading of the same or higher rank and inside their section/article; the shown panel matches only its own tab's section (R28-GPT-04); an unlinked panel belongs to the nearest tablist before it (R28-MIMAR-01).
- R28-GPT-06: stale sentences removed, A and B documented. Superseded doc assertions (R26 "Carousel slides are tracked by element", R27 stable key, test_r27_sections) replaced by R28 ones.
- Before/after: chrome 75/82 to 82/82; docs 20/21 to 21/21; package 2 failures to OK; Node 192/192. Real site unchanged; honest sets R18-R27 unchanged; pages28 h1, h4, s1 now fail as intended.
