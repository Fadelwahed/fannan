# Mi'mar R9 changes: Codex round 4 (CODEX-R4-01..05)

Branch `mimar-r4-fixes`, from 44daaea (draft PR #1). Last code/package commit: e88cf69. Written Oct 18 2026, about 12:30 AM Gaza (UTC+3). This record is the latest round record: the only file besides the registry left unhashed (OPUS-R2-03 rule, `release/PACKAGING.md`). `reviews/MIMAR-R8-changes-c7df69a.md` is now hashed in the registry and left unchanged. No `GROK-*` or `CODEX-*` file was added or changed. `main`, `grok-review`, `codex-r3-fixes` and `codex/fannan-r3-review` were not touched. No force push.

## Decisions recorded

- **320 px reflow is a hard fail.** Fadel decided on Oct 18 2026 at 12:09 AM Gaza, in Mi'mar's chat. The code already worked that way; nothing changed.

## Root-cause approach

Codex kept finding partial fixes in the same areas, so each area was audited as a whole, not just the reported line:

- **Units and references:** there is now ONE rule function, `checkValue(path, type, value)` in `token-references.mjs` (type allowed for the consuming path, valid value with units, sign, and percent only for a typography `lineHeight`). `inferTokenType` (converter) and `validateTokens` (validator, both for literals and for the resolved literal of every reference) all call it. No second copy of the rule is left that could drift.
- **Measuring through page CSS:** the spacing probe no longer measures anything through an element in the page. The audit found one sibling, `design-probe.mjs`, which normalised the accent colour through a `<span>` appended to the page (a `span{color:…!important}` rule could hide the accent area). It now uses a detached canvas. No other probe measures through a page element (`grep createElement release/tools`).
- **Package writes:** every output now goes through one atomic writer, and all inputs are checked before the first write.

## Fixes (each test fails before and passes after; logs in `test-results/r9/`)

| Finding | Commit | Change | Before / after |
|---|---|---|---|
| CODEX-R4-01 P1 `package-r3.py` build | a525a56 | `build()` lists release files and `archive_paths()` once, runs the git range check and checks every named input exists as a regular file, all **before any write**. The combined document, both manifests and the ZIP are built in memory (generated files are packaged from memory), then each output is replaced by `os.replace` from a sibling temp file. The same list is reused by the archive verify. | before: 5 tests, 2 fail + 3 errors (old build rewrote `FANNAN-REWRITE.md` and truncated the ZIP before failing) / after: 5/5. Cases: symlink in `release/`, cache in `input/`, missing named input, bad `--start`; each keeps all six previous outputs byte-for-byte and leaves no temp file |
| CODEX-R4-02 P1 `spacing-scale.mjs` | cbebc4a | Measuring div removed. Approved values are converted numerically: px directly, rem by the root computed font size, em by each inspected element's own computed font size (0.05 px tolerance). | before: fail (`div{padding-top:13px!important}` turned the scale into 13px) / after: pass. The override cannot change the scale and is still off-scale; `1em` is accepted on 16, 24 and 12 px text; 16px on 24px text is refused for `1em`; rem follows `html{font-size:20px}` |
| Sibling of CODEX-R4-02 `design-probe.mjs` | 6977c99 | Accent colour normalised by a detached canvas, not an element in the page. An invalid accent matches nothing. | before: fail (span override hid the accent area) / after: pass |
| CODEX-R4-03 P1 `token-references.mjs` | 7508478 | One `checkValue` per consuming path for literals and resolved references. Percent is allowed only on `typography.*.lineHeight` and `components.*.typography.lineHeight`. | before: fail (`spacing.md: {typography.body.lineHeight}` with 150% passed) / after: pass. Aliases to 150% refused for spacing, component padding, gap and width, component typography fontSize, letterSpacing, rounded and breakpoints, both as alias and as literal; component lineHeight alias still allowed; number aliased into spacing refused; valid aliases pass. All earlier literal cases unchanged (full suite) |
| CODEX-R4-04 P2 `width-screen.mjs` | cb579a5 | A clip is recorded only when `x \|\| y`; `ellipsis = x && textOverflow === 'ellipsis'`. Docs (`design-quality.md`, `UNTESTED.md`) updated. | before: fail (fitting text with ellipsis styling flagged) / after: pass. Fitting text passes; overflowing ellipsised text is clipped with `ellipsis: true`; overflow without ellipsis is clipped with `ellipsis: false` |
| CODEX-R4-05 P3 rerun | 27554b5 | All suites and the fixture rerun; `VERIFICATION.md` R9 section lists executed results, SKIPs and the fixture's expected stop separately. | see Results |

## Results (Node v22.23.3, Python 3.13.5, Chrome 155 test-only)

Executed:

| Suite | Result |
|---|---|
| Node, pinned test-only deps | 54/54 pass, 0 fail |
| Node, no deps | 41 pass, 0 fail |
| Node v20.19.2 | 48 pass, 6 fail: the intended `Node 22.12+ required` refusals (same six as R7/R8) |
| Python guard tools | 10/10 |
| R2 Node / R2 Python | 4/4, 4/4 |
| Package tests | 18/18 in the git checkout; 15 pass in a no-git copy |
| Package self-test | PASS |
| design.md lint 0.4.0 offline | example 0 errors/1 warning; fixture 0/2; OPUS-04 sample 0/0 |
| Syntax | mjs=28 sh=4 py=4 plus the launcher `.internal`, 0 failures |
| `git diff --check eb2d540..HEAD` (logs excluded) | exit 0 |

SKIPPED (not run, not counted): 13 Node tests without deps (need deps or Chrome); 3 package tests in the no-git copy.

Fixture, expected stop: `local-fixture.mjs` exit 0; browser, contract, spacing, widths (1440 + 320, page and state) and state checks pass, then every gate run stops at launcher exit 3 `pinned binary missing; no download fallback` (asserted). This is **not** a gate PASS; the real detector never ran.

## Package

- `build --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3`: release manifest `0b3f1904d3b08a23aeb5d5d6fd347553915400166da6800d24a33ac73db14288` (74 files), archive `8b6a35530f23fe03d88f0505526efa7abaeb978360195508d505486833d9b380` (337 entries, including `test-results/r9`, and no Mi'mar or CODEX records).
- `--registry-sha256 59a74e082ce746676469f48584cef0e93571c0f14b6355eb973683c98bdcf876`. 261 changed, 260 hashed, 0 uncovered; at build only the registry is excluded. The R8 record is now hashed.
- Anchored verify in a separate clone at e88cf69, trust files at 0444: PASS, `registryPin: external`. Wrong pin: exit 1 (`registry pin mismatch`). No pin: exit 1 (`unanchored registry`). `verify-manifest.sh`: `MANIFEST OK (74 files)`.
- Secret pattern grep over `git diff 44daaea..HEAD` and the extracted ZIP: 0 hits.

## Effects to know

- Spacing in `em` is now judged at each element's own font size (as CSS resolves it), so `1em` on a heading is its heading size. Spacing that matched only through the old body-size conversion may now show as off-scale.
- A design.md that aliases a percent lineHeight into any non-lineHeight path now fails conversion and the token check.
- Ellipsis styling on text that fits is no longer a failure.

## Untested

- Spacing: `calc()`, `clamp()` and viewport units in approved tokens are ignored (spacing that uses them shows as off-scale); em on state-dependent font sizes.
- Accent: colours outside sRGB may round differently. Chrome 155 only.
- Package: atomic per file; a crash between the four renames can leave a mix of old and new files, which `verify` detects.
- Still not tested: the real Impeccable binary, a full gate PASS, real zoom and text spacing, the production browser pin and the target host. Installation stays BLOCKED pending Amin's review and Fadel's yes in Fannan's chat.
