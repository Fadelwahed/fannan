# Mi'mar R6 changes: Argon round 2 (ARGON-R2-01..09) and the fixture page (OPUS-R2-10 follow-up)

Branch `mimar-r4-fixes`, from efcb569. Last code/package commit: 9a83f44. Written Oct 17 2026, about 10:55 AM Gaza (UTC+3). This record is the latest round record: the only file besides the registry left unhashed (OPUS-R2-03 rule, `release/PACKAGING.md`). `reviews/MIMAR-R5-changes-3ac7ea5.md` is now hashed in the registry and left unchanged.

Argon (Gemini app) could not open the repository (its sandbox refused the folder) and reviewed `/tmp` copies from about c661547. Each finding was rechecked at efcb569 before any change.

## Findings, commits and tests (each test fails before and passes after unless noted)

| Finding | Status at efcb569 | Commit | Change | Evidence in `test-results/r6/` |
|---|---|---|---|---|
| ARGON-R2-01 P1 | still held | 127a563 | Protected mode checks the support root as given (absolute, normalised, not a symlink, not `/opt/fannan/bin` or above, root-owned up the chain, canonical) before `realpathSync`, and refuses every symlink inside the tree. | ARGON-01-before (2 fail)/after (8/8); ARGON-01-root-probe: real root-owned tree, old code accepted an internal symlink and a symlinked root, new code refuses both and still hashes a clean tree |
| ARGON-R2-02 P1 | still held | e1cb546 | `verify` refuses without `--registry-sha256` (`unanchored registry`), unless `--allow-unanchored-registry` (verify only) is given. Build runs its own consistency check internally. Docs updated. | ARGON-02-before (2 fail)/after (10/10) |
| ARGON-R2-03 P1 (process) | not a code finding | none | Argon could not run any suite. Our own results are below. Next round, Argon gets the code in the prompt. | Results table |
| ARGON-R2-04 P2 | part fixed, part held | 5f0a206 | Transparent or near-white outline and transparent ring: already fixed by 1ad7ae0 (CODEX-R2-01) and a7aff42 (OPUS-R2-02); the new test confirms it. Percentage `rgb()` parsing still divided channels by 100: now channel % x 2.55, alpha % x 0.01. | ARGON-04-before (white to black in % read as no change)/after (7/7) |
| ARGON-R2-05 P2 | still held | d22cc6b | New `focusBaseline` (blurs any focused element); both tab loops take one unfocused capture before the loop instead of one per stop. | ARGON-05-before (2 fail)/after (9/9); real Chrome: per-stop capture gives `[true, false]` for two buttons in a `:focus-within` box, the baseline gives `[true, true]` |
| ARGON-R2-06 P2 | still held | 7c3b7f7 | `chromium.launch` gets `env: browserLaunchEnv(home)` = `PATH=/usr/bin:/bin`, `LANG=C.UTF-8`, `HOME`=a fresh private temp dir removed on exit. | ARGON-06-before (2 fail)/after (15/15); real Chrome `/proc/<pid>/environ`: sentinel absent |
| ARGON-R2-07 P2 | rule held; one gap | f145a68 | Bare numbers other than 0, numeric strings (`"8"`), NaN, Infinity, exponents, `pt`/`%`/uppercase units were already refused (R4-2, R4-6, CODEX-R2-02, OPUS-R2-01); tests now pin them. The string `"0"` is now accepted as the same bare zero. Gap fixed: negative lengths were accepted everywhere. They are now refused where CSS forbids them (spacing scale, rounded, breakpoints, font size, line height, padding, gaps, sizes). Margins, insets, scroll margins and letter spacing may still be negative. | ARGON-07-before (2 fail)/after (4/4, includes real Style Dictionary build) |
| ARGON-R2-08 P3 | hashing fixed; ZIP part held | 87dbdbc | Hashing: already fixed by b23bede (OPUS-R2-03); the CODEX response and the R4/R5 records are in `trust/R3-CHANGES.sha256`. ZIP: now carries `scripts/package-r3.py`, `scripts/test_package_r3.py` and `test-results/r6/`. Review records stay out of the ZIP: they are review correspondence, not release content, and Git keeps them (documented in `PACKAGING.md`). | ARGON-08-before (1 fail)/after (11/11) |
| ARGON-R2-09 ENH | still held | 051e00f | `designProbe` moved to `release/tools/design-probe.mjs` (testable). Accent reads `--accent`, then `--colors-accent`, then `--colors-primary`, and records `accentVar`. Stock glass (`backdrop-filter`) is gated at `stockGlass: 0` in both phases and every state (design-quality.md: "zero stock glassmorphism", "Both"). Centred icon trios are counted in any wrapper (three icon-led items centred on the row or on every item), plus the R3 section rule. Wireframe grayscale/zero-shadow: not applicable; design-quality.md and critic-rubric.md treat grayscale as a manual review, with no machine rule. | ARGON-09-before (2 fail)/after (2/2, real Chrome) |
| OPUS-R2-10 follow-up | fixture failed | 5ce3b08 | The fixture page (`release/tests/fixture-page.mjs`) links the built `variables.css`, resets margins and paddings, and spaces from `--spacing-*`. The check is unchanged. | OPUS-10-fixture-before/after; OPUS-10-fixture-old-page (old page: scale empty, 32px, 21.44px, 16px, 1px and 6px off-scale) |
| R6-A (new, found by the fixture run) | false fail | 5ebf833 | The focus screen measured every outline and ring against the element's own background, so a black outline around a dark button on a white page failed, and a white outline on a white page around a dark button passed. Now outlines with offset >= 0 and outer rings are measured against the backdrop, and inset rings and negative-offset outlines against the element. | R6-A-focus-backdrop-before (1 fail)/after (10/10); R6-A-chrome-regression: every R5 real-Chrome focus case gives the same result |
| Fixture shim | blocked since R4 | bd71796 | The test-only browser shim now carries the local Chrome version, so the R4-4 version check passes in the fixture. `local-fixture.mjs` runs end to end for the first time. | local-fixture-before (version mismatch, crash)/local-fixture (exit 0) |

## Results (Node v22.23.3, Python 3.13.5, Chrome 155.0.8059.84 test-only)

| Suite | Result |
|---|---|
| Node, pinned test-only deps | 36/36 pass (`node.log`) |
| Node, no deps | 30 pass, 6 skipped (need deps or Chrome), 0 fail |
| Node v20.19.2 | 34 pass, 2 fail: the intended `Node 22.12+ required` refusal |
| Python guard tools | 10/10 |
| R2 Node / R2 Python | 4/4, 4/4 |
| Package tests | 11/11 in the git checkout; 8 pass, 3 skipped in a no-git copy |
| Package self-test | PASS |
| Local fixture end to end | exit 0: browser, contract, spacing and state checks pass; full gate blocked by the absent Impeccable binary (expected) |
| Syntax | mjs=25 sh=4 py=4, 0 failures |
| design.md lint 0.4.0, offline (`unshare -rn`) | example 0 errors, 1 warning; fixture 0 errors, 2 warnings; OPUS-04 sample 0 errors, 0 warnings; convert + build rc 0 for all three |
| Whitespace, source-only `git diff --check eb2d540..HEAD -- . ':(exclude)test-results/**/*.log'` | exit 0 |

## Package

- `build --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3`: release manifest `042bc9da040be9a9e0ad3c3fc543c8caf0bea4c38252a887677744a15e2e978f` (71 files), archive `39d2b555bc6738a894937898136006e2430b19d4a8eca4aae9d023bdbb739ded` (269 entries, including `test-results/r6`, both package scripts, and no Mi'mar or CODEX records).
- `--registry-sha256 2bfd8f1047f9839fa2f0fc6b61b105f0e34b8edba653ade7011e8ecc9b9dd7b3`. 188 changed, 187 hashed, 0 uncovered; at build only the registry is excluded. The R5 record `MIMAR-R5-changes-3ac7ea5.md` is now hashed.
- Anchored verify in an isolated clone at 9a83f44, trust files at 0444: PASS, `registryPin: external`. Wrong pin: exit 1. No pin: exit 1 (ARGON-R2-02). GNU `verify-manifest.sh`: `MANIFEST OK (71 files)`.
- Secret grep over `git diff efcb569..HEAD` and the extracted ZIP: 0 hits. No `reviews/GROK-*` or `reviews/CODEX-*` file changed.

## Effects to know

- ARGON-R2-09: any `backdrop-filter` now fails the gate in both phases. `quality-checks.json` used to call backdrop filters "signals for the critic"; design-quality.md says zero, so the gate now follows design-quality.md.
- ARGON-R2-07: a DESIGN.md with a negative spacing, radius, font size, padding, gap or size now fails with `negative length`.
- ARGON-R2-02: every verify must quote the registry digest from the latest record.
- The test-only deps tree (`runtime-deps/`, ignored by Git) was lost in the box restore. It was copied back from the existing `/workspace/fannan-testdeps`, whose lock matches the pinned lock byte for byte. No install, no network.
- In `local-fixture.log` and `local-fixture-before.log` the random temp-directory names were replaced with `XXXX`. Nothing else in those logs changed; every other log is raw.

## Untested

- A provisioned root-owned `/opt/fannan/bin` browser (the root probe used `/root` on the box), the production browser pin, the Impeccable binary, and the target host.
- The `/proc` environment test runs on Linux only.
- The focus, spacing and design probes are screens. Manual focus, rhythm and layout review stay required.
