# Mi'mar R7 changes: Codex round 3 (CODEX-R3-01..05)

Branch `mimar-r4-fixes`, from 6754792. Last code/package commit: 8bd2dc6. Written Oct 17 2026, about 11:50 PM Gaza (UTC+3). This record is the latest round record: the only file besides the registry left unhashed (OPUS-R2-03 rule, `release/PACKAGING.md`). `reviews/MIMAR-R6-changes-9a83f44.md` is now hashed in the registry and left unchanged; its fixture claim is corrected here (CODEX-R3-03). The Codex review is not saved as a file (no new `CODEX-*` files); its IDs are quoted below.

## Fadel's decisions (17 Oct 2026, 10:58 AM Gaza)

1. Stock glass (`backdrop-filter`) is a hard fail in both phases (already in code since 051e00f; unchanged).
2. Negative spacing tokens are refused; negatives stay allowed only where CSS allows them (margins, insets, scroll margins, letter spacing), per R6. R7 extends the same rule to numeric values, to references, and to component typography.
3. The ZIP carries its packaging script and tests (since 87dbdbc; R7 adds `test-results/r7`).

## Findings, commits and tests (each test fails before and passes after)

| Finding | Commit | Change | Evidence in `test-results/r7/` |
|---|---|---|---|
| CODEX-R3-01 P1 | b4de1fb | `negative()` now treats numbers too (`lineHeight: -1` refused). A reference is checked against the consuming path's rule using the resolved literal (`padding: "{typography.body.letterSpacing}"` with `-1px` refused; chains too; `marginTop` may still reference it). The negative check runs after the type check, so `-0.5` typed dimension still reads `invalid dimension value`. Converter reports `negative length` for numeric negatives. | CODEX-01-before (0/2)/after (2/2): validator, builder (`sd-build.mjs` refuses before writing CSS) and converter with real Style Dictionary 5.6.1 |
| CODEX-R3-02 P1 | 4946710 | New `approvedSpacing(handoff)` reads `tokens.json` once, checks those bytes against the handoff SHA-256 and the build evidence `inputSha256`, validates them and returns every `spacing.*` value (references resolved). Both probe calls pass that list; `spacingProbe` no longer reads page `--spacing-*` declarations and takes only plain px/rem/em lengths. Evidence gains `checks.spacingTokens`; a missing or mismatched token source fails the handoff phase. | CODEX-02-before (3 fail)/after (6/6); real Chrome: an extra `--spacing-offscale:13px` no longer legitimises `13px` padding |
| CODEX-R3-03 P1 | 635a71a | The fixture now relocates the root in the temporary launcher copy as well (`launcher-impeccable.sh.internal`, the `/workspace/design-output/$FANNAN_PROJECT` case, line 56), every relocation must apply or the fixture stops, and each of the four checker runs must stop at launcher exit 3 with exactly `impeccable (Fannan launcher): pinned binary missing; no download fallback` (line 65; Codex cited :55). The fixture also checks the production launcher still has its `/workspace/design-output` boundary; release/tools is unchanged. | CODEX-03-local-fixture-before (old relocation + new assertion: exit 4 `detect path outside project output`, fixture fails); local-fixture (exit 0, launcher exit 3 on every run) |
| CODEX-R3-04 P2 | 8fbdd5d | `components.<name>.typography.<property>` uses the typography table (fontSize/letterSpacing dimension, lineHeight number or dimension, fontWeight 1-1000/normal/bold, fontFamily), the no-negative rule for fontSize/lineHeight, and the font-weight alias mapping in the converter. Other component keys under `typography` keep the component rules. | CODEX-04-before (0/2, rerun at b4de1fb)/after (2/2): validator, builder and converter + real build (`--components-button-typography-font-weight: 600`) |
| CODEX-R3-05 P3 | 2c11de3, 92d37bc | All suites rerun with the pinned test-only deps; full logs committed; VERIFICATION and UNTESTED R7 sections. | Results table below |
| R7 ZIP evidence | a462797 | The ZIP carries `test-results/r7` like R4-R6. | R7-zip-evidence-before (1 fail)/after (11/11) |

## Corrections to R6 claims (CODEX-R3-03)

- `MIMAR-R6-changes-9a83f44.md` (Results, "Local fixture end to end") and `VERIFICATION.md` R6 row said the full gate was blocked by the absent Impeccable binary. The R6 log (`test-results/r6/local-fixture.log`, lines 4-8) shows the launcher stopped earlier, exit 4 `detect path outside project output`. That claim was wrong. The R6 browser, contract, spacing and state results stand. `VERIFICATION.md` now carries the correction on that row; the R6 record stays unchanged because it is hashed.
- `UNTESTED.md` line 9 (local fixture) and line 14 (R5 note saying the fixture was blocked by the browser-version pin) contradicted each other. Both are rewritten: R5 was blocked by the version pin, R6 by the launcher root, and R7 stops only at the missing binary.

## Results (Node v22.23.3, Python 3.13.5, Chrome 155.0.8059.84 test-only)

| Suite | Result |
|---|---|
| Node, pinned test-only deps | 42/42 pass (`node.log`) |
| Node, no deps (`git archive` copy) | 33 pass, 9 skipped (need deps or Chrome), 0 fail |
| Node v20.19.2 | 36 pass, 6 fail: all the intended `Node 22.12+ required` refusal |
| Python guard tools | 10/10 |
| R2 Node / R2 Python | 4/4, 4/4 |
| Package tests | 11/11 in the git checkout; 8 pass, 3 skipped in a no-git copy |
| Package self-test | PASS |
| Local fixture end to end | exit 0; launcher exit 3, missing binary (asserted) |
| Syntax | mjs=24 sh=4 py=4 plus the launcher `.internal`, 0 failures. R6 reported mjs=25, most likely counting `test-results/r6/ARGON-01-root-probe.mjs`; R7 counts `release/tools` and `release/tests` only |
| design.md lint 0.4.0 offline (`unshare -rn`) | example 0 errors/1 warning; fixture 0/2; OPUS-04 sample 0/0; convert + build rc 0 for all three |
| Whitespace, source-only `git diff --check eb2d540..HEAD -- . ':(exclude)test-results/**/*.log'` | exit 0 |

## Package

- `build --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3`: release manifest `9f4e889ed8c587bf9341b7170f9c75abb0866c140a613af3a5a78fb5737f952b` (71 files), archive `d83a360c947adedebc06559b42a0af26d0c3372b10ebb541e1d2e5983026a519` (290 entries, including `test-results/r7`, both package scripts, and no Mi'mar or CODEX records).
- `--registry-sha256 569932239d3cb6a723d353d8a49dcecb95e06ce94ac7cc383a08f3ffd9262d90`. 210 changed, 209 hashed, 0 uncovered; at build only the registry is excluded. The R6 record is now hashed.
- Anchored verify in an isolated clone at 8bd2dc6, trust files at 0444: PASS, `registryPin: external`. Wrong pin: exit 1. No pin: exit 1 (`unanchored registry`). GNU `verify-manifest.sh`: `MANIFEST OK (71 files)`.
- Secret pattern grep over `git diff 6754792..HEAD` and the extracted ZIP: 0 hits. No `reviews/GROK-*` or `reviews/CODEX-*` file changed or added. `main`, `grok-review` and `codex-r3-fixes` untouched.

## Effects to know

- CODEX-R3-02: the handoff spacing check now needs the handoff's `tokens.json` and build evidence to match; a page that only declares `--spacing-*` in its own CSS gets an empty scale (all nonzero spacing off-scale) and `checks.spacingTokens.pass: false`.
- CODEX-R3-01/04: DESIGN.md files with `lineHeight: -1`, a padding/gap/spacing reference to a negative token, or unitless/invalid component typography (`components.button.typography.fontSize: 16`) now fail conversion.
- `local-fixture.log` and `CODEX-03-local-fixture-before.log` have the random temp-directory names replaced with `XXXX`; every other log is raw.

## Untested

- The real Impeccable binary, a full gate PASS, a provisioned root-owned `/opt/fannan/bin` browser, the production browser pin and the target host.
- Spacing in `calc()` or between token steps, and negatives reached through page CSS rather than tokens (outside token validation).
- The focus, spacing and design probes are screens; manual focus, rhythm and layout review stay required.
- Installation stays BLOCKED pending Amin's review and Fadel's yes in Fannan's chat.
