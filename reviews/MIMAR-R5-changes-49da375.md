# Mi'mar R5 changes: Codex round-2 findings CODEX-R2-01..05

Branch `mimar-r4-fixes`, from c661547. Last code/package commit: 49da375. Written Oct 17 2026, about 6:55 AM Gaza (UTC+3). This record is the required last commit and is excluded from the registry under the rule documented in `release/PACKAGING.md`.

## Commits

| Finding | Commit | Change | Test (fails before, passes after) | Evidence |
|---|---|---|---|---|
| CODEX-R2-01 (P1) | 1ad7ae0 | `focusStyleProbe` counts an outline, border, underline or shadow change only when the indicator is painted: alpha > 0 (`transparent` = 0) and contrast >= 3 against the element's unfocused background composited over white. Unparseable colours still count as painted, so this is never weaker than R3. | `release/tests/focus-screen.test.mjs`: transparent outline (rgba and keyword), border, underline, transparent shadow ring, near-white and near-background rings rejected; blue ring and 0.9-alpha blue outline accepted | `test-results/r5/R5-01-before.log` (1 fail), `R5-01-after.log` (4/4); real Chrome probe `R5-01-chrome-before/after.log`: transparentRing and transparentOutline true -> false, blueOutline stays true |
| CODEX-R2-02 (P2) | 008d745 | `isComponentDimensionKey` types `rounded`, `gap`, `rowGap`, `columnGap` and `padding`/`margin`/`inset`/`scrollPadding`/`scrollMargin` with every side/logical suffix as dimensions in the shared validator; the converter requires units for nonzero numbers on those keys. | `release/tests/token-validation.test.mjs`: 15 keys, bare `8` rejected, `0` and `8px` accepted; converter and hand-JSON build rejections; converter + real Style Dictionary build of `8px`, `0`, `1rem`, `4px` | `R5-02-before.log` (0/3), `R5-02-after.log` (3/3) |
| CODEX-R2-03 (P3) | 758a3a3 | Raw logs are kept byte-for-byte. `release/PACKAGING.md` defines the whitespace gate as the range-qualified, source-only check. Both results are recorded. | `scripts/test_package_r3.py` `WhitespacePolicyTests` | `R5-03-before.log`, `R5-03-after.log`, `R5-03-diff-check.log` |
| CODEX-R2-04 (P3) | 383bd42 | `release/PACKAGING.md` lists every allowed exclusion in a table with its limit; `scripts/package-r3.py` allows exactly one `reviews/MIMAR-R<n>-changes-<sha>.md` per round (exact name pattern only) and one `CODEX-R3-response`; none of them is in the ZIP. | `FinalRecordTests`: per-round exclusion, duplicate rejection, exact-name only, ZIP has no records, doc lists all | `R5-04-before.log` (3 fail), `R5-04-after.log` (8/8) |
| CODEX-R2-05 | 49da375 | All suites, offline lint, `test-results/r5` added to the archive, package rebuilt. | see Results | `test-results/r5/*.log` |

## Correction to the R4 record

`reviews/MIMAR-R4-changes-4489e7a.md` listed `git diff --check` as exit 0. That was the working-tree check. The range check `git diff --check eb2d540..c661547` exits 2, caused only by trailing spaces in raw test logs. The R4 record is left as written; this is the correction.

Also: the 758a3a3 commit itself added a blank line at the end of `release/PACKAGING.md`. The new source-only gate caught it (`R5-04-before.log`), and 383bd42 removed it.

## Results (Node v22.23.3 and Python 3.13.5 unless noted)

| Suite | Result | Log |
|---|---|---|
| Node, pinned test-only deps | 19/19 pass | `node.log` |
| Node, no deps | 18 pass, 1 skipped (needs deps), 0 fail | `node-without-deps.log` |
| Node v20.19.2 | 17 pass, 2 fail: the intended `Node 22.12+ required` refusal (style-dictionary needs Node >=22); same as R4 | `node20.log` |
| Python guard tools | 10/10 OK | `python.log` |
| R2 Node / R2 Python | 4/4, 4/4 | `r2-node.log`, `r2-python.log` |
| Package tests | 8/8 OK in the git checkout (2 skip in the no-git scratch copy) | `package-tests-git.log`, `package-tests.log` |
| Package self-test | PASS | `package-self-test.log` |
| Syntax | mjs=20 sh=4 py=4, 0 failures (R4 counted 21/5 with a different file walk; not compared) | `syntax.log` |
| Google design.md lint 0.4.0, offline (`unshare -rn`) | example-DESIGN.md: 0 errors, 1 warning; fixture-DESIGN.md: 0 errors, 2 warnings | `designmd-lint-offline.log` |
| Whitespace, source-only `git diff --check eb2d540..HEAD -- . ':(exclude)test-results/**/*.log'` | exit 0 | this record |
| Whitespace, full range `git diff --check eb2d540..HEAD` | exit 2, only raw logs: r4 R4-1/2/3/4/6-before, r4 node20, r5 R5-01/02-before, r5 node20 | this record |

## Package

- `build --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3`: release manifest `5190e2f01612a747287cb1ed4851751c0b60d5790761f86076ecc038728c2e6b` (66 files), archive `cddbe80cf5285ac20b35893f7daf3fb96fd27519f0dcc46d710a6c17933fc158` (199 entries, includes 23 `test-results/r5` files, no review records).
- Registry: `--registry-sha256 4c677276011f35a6a0ca51365d3548fa605339bb0bf34ad92ff2722153a28fd7`. 115 changed files, 112 covered, 0 uncovered; exclusions are the registry, `reviews/CODEX-R3-response-f42bc27.md` and `reviews/MIMAR-R4-changes-4489e7a.md` (plus this record once committed).
- Anchored verify in an isolated clone at 49da375, with `trust/MANIFEST.sha256` and `trust/R3-CHANGES.sha256` at 0444: PASS, `registryPin: external`. A wrong pin is refused (exit 1, `registry pin mismatch`).
- GNU `release/tools/verify-manifest.sh`: `MANIFEST OK (66 files)`.
- Coverage: every path in `git diff --name-only eb2d540..HEAD` (75) and `c661547..HEAD` (36) is in the registry or a documented exclusion.
- Secret grep (token, key and private-key patterns) over `git diff c661547..HEAD` and the extracted ZIP: 0 hits.
- No `reviews/GROK-*` or `reviews/CODEX-*` file changed since eb2d540.

## Untested

- Real-browser focus checks beyond the probe page; manual focus evidence is still required.
- Node 22 on the original target host (Mi'mar's box only).
