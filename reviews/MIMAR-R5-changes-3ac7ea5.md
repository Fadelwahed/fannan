# Mi'mar R5 changes: Codex round 2 (CODEX-R2-01..05) and Opus 5.5 round 2 (OPUS-R2-01..10)

Branch `mimar-r4-fixes`, from c661547. Last code/package commit: 3ac7ea5. Written Oct 17 2026, about 7:05 AM Gaza (UTC+3). This record is the latest round record: the only file besides the registry left unhashed (OPUS-R2-03 rule, `release/PACKAGING.md`). It supersedes `reviews/MIMAR-R5-changes-49da375.md` (pushed at 2b91869 before the Opus findings arrived), which is now hashed in the registry and left unchanged.

## Findings, commits and tests (each test fails before and passes after unless noted)

| Finding(s) | Commit(s) | Change | Evidence in `test-results/r5/` |
|---|---|---|---|
| CODEX-R2-01 P1 | 1ad7ae0 | Focus outline/border/underline/shadow counts only when painted (alpha > 0, at least 3:1 against the backdrop). | R5-01-before/after, R5-01-chrome-before/after |
| OPUS-R2-02 P3 (merges with CODEX-R2-01) | a7aff42 | Composite over the nearest opaque ancestor background, captured unfocused, through translucent layers; white fallback. `UNTESTED.md` wording corrected. Fixture: #111 page with a 3% white or black indicator gives false, a white outline gives true. | OPUS-02-before (1 fail)/after (5/5); real Chrome OPUS-02-chrome-*: darkPageBlackOutline true -> false (was a false pass), darkPageWhiteOutline false -> true (was a false fail); all other cases unchanged |
| CODEX-R2-02 P2 | 008d745 | padding/margin/inset/scroll variants, gap, rowGap and columnGap typed as dimensions. | R5-02-before/after |
| OPUS-R2-01 P2 (merges with CODEX-R2-02) | 1e1db4b | Adds size, width, height and min/max Width/Height. The converter says `units required` wherever only a length is valid (`expectsDimension`), so `rounded.sm: 4` now gives `units required` and `components.button.height: 40` is refused. | OPUS-01-before (fail)/after (3/3) |
| CODEX-R2-03 P3 | 758a3a3 | Raw logs kept byte-for-byte; the whitespace gate is range-qualified and source-only; the R4 "exit 0" claim is corrected. | R5-03-*, R5-03-diff-check |
| CODEX-R2-04 P3 | 383bd42 | First version: one record per round excluded. Replaced by OPUS-R2-03. | R5-04-* |
| OPUS-R2-03 P3 (merges with CODEX-R2-04) | b23bede | Build hashes everything but the registry, including `reviews/CODEX-R3-response-f42bc27.md` and the earlier records. Verify allows at most one late `reviews/MIMAR-R<n>-changes-<sha>.md`, which must not be older than any frozen record. The doc no longer says "exactly two". | OPUS-03-before (3 fail)/after (9/9) |
| OPUS-R2-04 P3 | dc17951 | The pinned spec (`@google/design.md` 0.4.0 `spec.md`: "Within the components section, references to composite values (e.g., {typography.label-md}) are permitted") allows it, so `components.<x>.typography: "{typography.<group>}"` is accepted and expanded to per-property references (JSON and CSS stay primitive). Composite references are refused anywhere else (colors, spacing, component colours), as is a non-typography or missing target. | OPUS-04-before/after; OPUS-04-lint (0 errors, 0 warnings) |
| OPUS-R2-05 P3 | f74c8d4 | `normal` -> 400 and `bold` -> 700 conversion cases. Test-only; there is no fail-before because the code was already correct. A mutation check (aliases removed in scratch) makes the test fail. | OPUS-05-after, OPUS-05-mutation |
| OPUS-R2-06 P3 | 65344d3 | Exported `assertBrowserPinLocation`: `/opt/fannan/bin/chrome-154/chrome` accepted; `/opt/fannan/bin/chrome`, `..` paths, relative paths and other roots refused (normalisation is new and stricter). `supportTreeDigest(tree, true)` throws `unprotected`. | OPUS-06-before (import fails)/after (6/6) |
| OPUS-R2-07 = CODEX-R2-05 | 49da375, 3ac7ea5 | All suites, offline lint, package rebuilt, anchored verify. | see Results |
| OPUS-R2-08 ENH | 36fd3c7 | The stitch-design-md skill says every spacing, rounded, breakpoint and component size token carries px/rem/em, with only 0 bare; it also documents the component typography group reference. | OPUS-08-before/after |
| OPUS-R2-09 ENH | 38683c9 | `quality-checks.json` `focusStateContrast: 3`, with a rationale (2.4.13-derived screening; 1.4.11 AA 3:1 floor). The loader refuses values below 3. Both probe calls pass it. | OPUS-09-before/after |
| OPUS-R2-10 ENH | 9a92873 | New `spacing-scale.mjs` `spacingProbe` counts distinct computed padding, vertical margins and row/column gaps not on the built `--spacing-*` scale. `spacingOffScale: 0` applies at handoff for the page and for every declared state. | OPUS-10-before (2 fail)/after (2/2, real Chrome); OPUS-10-fixture-page |

## Results (Node v22.23.3 and Python 3.13.5 unless noted)

| Suite | Result |
|---|---|
| Node, pinned test-only deps | 25/25 pass (`node.log`) |
| Node, no deps | 23 pass, 2 skipped (need deps or Chrome), 0 fail |
| Node v20.19.2 | 23 pass, 2 fail: the intended `Node 22.12+ required` refusal, same as R4 |
| Python guard tools | 10/10 |
| R2 Node / R2 Python | 4/4, 4/4 |
| Package tests | 9/9 in the git checkout (2 skipped in the no-git scratch copy) |
| Package self-test | PASS |
| Syntax | mjs=22 sh=4 py=4, 0 failures |
| design.md lint 0.4.0, offline (`unshare -rn`) | example 0 errors, 1 warning; fixture 0 errors, 2 warnings; OPUS-04 sample 0 errors, 0 warnings |
| Convert + build regression | example, fixture and OPUS-04 sample: rc 0 / rc 0 |
| Whitespace, source-only `git diff --check eb2d540..HEAD -- . ':(exclude)test-results/**/*.log'` | exit 0 |
| Whitespace, full range | exit 2, raw logs only (R4 before-logs, r4/r5 node20, R5/OPUS before-logs, OPUS-05-mutation) |

## Package

- `build --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3`: release manifest `bfd83d1e8021a135e23dcce5360f1123446bd2a362787311961199a1522b5c51` (68 files), archive `fcccae0e78c258282786bd519e95945670d8c915bf8dd4b5222bded419481e53` (227 entries, 49 `test-results/r5` files, no review records).
- `--registry-sha256 d0d9b9bfab677c5317b01857203f52691913d35bdfa7866dd2a0a97a06462887`. 147 changed, 146 hashed, 0 uncovered; the only exclusion at build is the registry. The CODEX response and both earlier records are hashed.
- Anchored verify in an isolated clone at 3ac7ea5, with `trust/MANIFEST.sha256` and `trust/R3-CHANGES.sha256` at 0444: PASS, `registryPin: external`. A wrong pin is refused (exit 1). GNU `verify-manifest.sh`: `MANIFEST OK (68 files)`.
- Coverage: every path in `git diff --name-only` from eb2d540 (107), c661547 (73) and 2b91869 (58) to HEAD is hashed, apart from the registry.
- Secret grep over `git diff c661547..HEAD` and the extracted ZIP: 0 hits. No `reviews/GROK-*` or `reviews/CODEX-*` file changed since eb2d540.

## Effects to know

- OPUS-R2-10 tightens the handoff gate. Pages that keep browser default margins or button padding, or that do not load the built spacing tokens, now fail. The bundled fixture page (`test-results/local-fixture/.../home.html`) would fail (scale empty; 32px, 21.44px, 16px, 1px and 6px off-scale). The fixture is left unchanged as evidence.
- OPUS-R2-01: a DESIGN.md with a bare nonzero `rounded`, size or min/max number now fails with `units required` (it was `unknown token type` for rounded).

## Untested

- End-to-end `release/tests/local-fixture.mjs` checker run: blocked before any probe, at both c661547 and R5 (`browser version 155.0.8059.84 does not match reviewed pin undefined`); pre-existing.
- Focus and spacing probes beyond the probe pages; manual focus and rhythm review remain required. Background images, opacity, filters, cross-origin stylesheets and calc() spacing are not modelled.
- A provisioned root-owned `/opt/fannan/bin` browser; Node 22 on the original target host.
