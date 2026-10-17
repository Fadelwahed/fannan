# Mi'mar R4 changes: `mimar-r4-fixes` (base eb2d540)

**This is a local review candidate only.** It is not an approval, not Amin's review and not permission to install. Live installation remains **BLOCKED**.

## 1. Summary

| Item | Value |
|---|---|
| Base | `eb2d540a2a70045d41321a642e4bc2992f420bcb` (`origin/codex-r3-fixes`). |
| Source of findings | `reviews/GROK-R4-eb2d540.md` on `grok-review` (commit `07d9c889`). |
| Last commit before this file | `5c874e9` (package freeze). This file is the required last commit. |
| Implemented | R4-1, R4-2, R4-3, R4-4, R4-5. **Skipped:** R4-6 (unitless spacing), waiting on Fadel's decision between requiring units and treating values as scale steps. |
| Process change | The GROK-HANDOFF.md update for Fadel's new split (6:00 AM Gaza time) is in its own commit. |
| Runtime | Mi'mar's box: Linux x86_64, Debian glibc 2.41, Node v22.23.3, Python 3.13.5. **Not the target bot host.** |
| Dependencies | An existing locked tree (lock sha256 `55a645b1…8710`, which matches the pin) was linked into scratch copies as test evidence only. No install, no network, no new dependency. |
| Overall tests | All suites pass on Node 22 (details in section 5). Node 20 fails 2 tests by design. |

**Commits** (one per finding, then the handoff, then the package):

| Commit | Message |
|---|---|
| `c2e9adc` | R4-1: map DTCG font-weight aliases to numbers; reject non-CSS weight keywords |
| `0795ac4` | R4-2: accept unitless zero as a CSS dimension; keep units required for other numbers |
| `ad69799` | R4-3: settle focus transitions and ignore weak colour-only or unrendered focus changes |
| `e95c08e` | R4-4: compare runtime browser version with the pin and verify the browser support tree |
| `d73e404` | R4-5: add --registry-sha256 anchor and document read-only mode for both trust files |
| `59a1862` | Update GROK-HANDOFF.md: reviewers list findings, Mi'mar implements on mimar-* branches, Fadel merges to main |
| `5c874e9` | R4 package: regenerate manifest, pin, ZIP and registry; record R4 evidence and doc corrections |

## 2. Changes per finding

### R4-1 (P2): DTCG font-weight aliases produced invalid CSS

**Changes:**
- `release/tools/token-references.mjs:8` exports `fontWeightAliases`: thin/hairline 100, extra-light/ultra-light 200, light 300, normal/regular/book 400, medium 500, semi-bold/demi-bold 600, bold 700, extra-bold/ultra-bold 800, black/heavy 900, extra-black/ultra-black 950.
- `token-references.mjs:9,15`: the fontWeight validator now accepts only 1–1000, `normal` and `bold`, which are the values valid in CSS.
- `release/tools/designmd-to-sd.mjs:10,32`: the converter maps a DTCG alias to its number before typing and validation.

**Effect:** hand-edited JSON with `"semi-bold"` is now rejected by `sd-build.mjs` before any dependency loads or any output is written.

**Before → after:** `fontWeight: semi-bold` used to build `--typography-body-font-weight: semi-bold;`. It now builds `--typography-body-font-weight: 600;`.

**Test:** `release/tests/token-validation.test.mjs` covers the shared rejection, `normal`/`bold` acceptance, the sd-build hand-JSON rejection, the converter mapping for all 18 aliases, and a real Style Dictionary build asserting `600`.
- **Before** (`test-results/r4/R4-1-before.log`): 3 tests, 0 pass, 3 fail ("Missing expected exception").
- **After** (`R4-1-after.log`): 3 / 3 pass.

### R4-2 (P3): unitless 0 rejected (regression from d2c36c1)

**Change:** `release/tools/token-references.mjs:3`. `dimension` now accepts the number `0`; every other unitless dimension still fails.

**Effect:**
- `rounded.none: 0` and `components.button.padding/gap/margin: 0` convert again and build as `--rounded-none: 0;` and `--components-button-padding: 0;`.
- `rounded.sm: 4` still fails with `unknown token type`.
- `fontSize: 16` and `breakpoints.desktop: 1440` still fail with `units required`.
- Hand JSON with `dimension: 4` or `-0.5` is still rejected.

**Test:** `token-validation.test.mjs`, covering unit cases, converter caller compatibility, a real build and the negatives.
- **Before** (`R4-2-before.log`): 1 pass, 2 fail (`expected 'dimension'`; converter rc 3 instead of 0).
- **After** (`R4-2-after.log`): 3 / 3 pass.

### R4-3 (P3): focus screen was timing-dependent and counted invisible changes

**Changes:**
- `release/tools/focus-screen.mjs:7` adds a new `focusSettle({maxMs = 1000})`. It waits for finite animations on the focused element (subtree, including pseudo-elements) and on its ancestors, ignores infinite animations, and is capped at 1 s.
- `focus-screen.mjs:17-78` updates `focusStyleProbe`:
  - colours are compared by contrast between the unfocused and focused state (composited over white); a colour-only change below `minContrast = 3` does not count;
  - outline, border and text-decoration changes count only when the feature is rendered before or after;
  - box-shadow geometry changes count, and a colour-only shadow change uses the contrast rule;
  - pseudo-elements count only when rendered (`content` not `none`/`normal`, line 73);
  - unparseable colours still count as a change, so this is never weaker than R3.
- `release/tools/pre-handoff-check.mjs:16,130,178`: both tab loops now run `await p.evaluate(focusSettle)` between `Tab` and the probe. The evidence note describes the screening rule, and manual focus evidence stays mandatory.

**Tests:** `release/tests/focus-screen.test.mjs` adds 3 tests: weak/unrendered cases, settle behaviour (waits for finite animations, ignores infinite ones, capped), and both checker loops calling settle. Two fixtures in the existing test were made realistic: the border-colour case now has a rendered border, and the pseudo case has `content`.
- **Before:**
  - `R4-3-before.log`: import fails, because `focusSettle` doesn't exist.
  - `R4-3-before-behaviour.log`, using a scratch-only no-op `focusSettle` export: 1 pass, 3 fail ("near-identical text colour…", "must still be waiting…", "focusSettle must run between Tab and the probe").
- **After** (`R4-3-after.log`): 4 / 4 pass.

**Real Chrome 154 headless** (test-only, unpinned box browser; `R4-3-chrome-before.log` / `R4-3-chrome-after.log`, probe in `R4-3-chrome-probe.mjs`):

| Case | eb2d540 | R4 | Expected |
|---|---|---|---|
| 2 s background transition | false | **true** | true |
| #000 → #010101 text colour | true | **false** | false |
| #fff → #eee background (about 1.1:1) | true | **false** | weak, screened out |
| 9 other cases: static shadow, strong background, none, default UA, animated ancestor, 150 ms shadow, outline transition, `:focus-within` wrapper, `::after` ring | unchanged | unchanged | correct |

### R4-4 (P3): browser version and support tree were not verified

**Changes:**
- `release/tools/pre-handoff-check.mjs:59-61`: if `b.version()` ≠ the pin's `version`, the checker logs, closes the browser, exits 2 and records no evidence.
- `release/tools/executable-trust.mjs:40` adds `supportTreeDigest(root, protectedStorage)`. It uses the same entry format as `inventoryDigest`, walks protected entries, and refuses any symlink that escapes the tree.
- `executable-trust.mjs:59` adds `verifyBrowserPin(pin, protectedStorage)`, which requires `version` and a 64-hex `supportTreeSha256` and verifies both the executable and its directory.
- `executable-trust.mjs:74-75`: the browser must sit in its own directory under `/opt/fannan/bin/`.
- `release/runtime/browser-trust.json` stays `"status": "blocked"` and now documents the required fields.

**Tests:**
- `release/tests/checker-boundaries.test.mjs`: a version-mismatch refusal; the existing fixture now carries `version`.
- `release/tests/host-trust.test.mjs`: support tree is deterministic; a missing pin, a tampered file, an injected file and an escaping symlink are all refused.
- **Before:**
  - `R4-4-before.log`: 2 pass, 2 fail (the host-trust import fails, and the mismatch is not refused).
  - `R4-4-before-behaviour.log`, using scratch-only stubs: 6 pass, 2 fail.
- **After** (`R4-4-after.log`): 8 / 8 pass.

**Real-tree probe** (`R4-4-real-tree-probe.log`): the digest of the box's `/opt/google/chrome` is stable. Protected mode correctly refuses that stock install, because its files are owner-writable.

### R4-5 (P3): registry pin was self-referential; docs named only one read-only file

**Changes:**
- `scripts/package-r3.py:151-165` adds `require_hex_digest` and `check_registry_pin`. `verify(start, registry_sha256)` checks the pin **first**; a mismatch raises `registry pin mismatch`. Without the option, the report says `registryPin: self (unanchored …)`.
- `package-r3.py:208-216` adds the CLI `--registry-sha256`, which applies to verify only and must be 64 lowercase hex characters.
- `release/PACKAGING.md`: `chmod 0444 trust/MANIFEST.sha256 trust/R3-CHANGES.sha256` and the anchored verify command. The read-only requirement is kept, not loosened.

**Test:** `scripts/test_package_r3.py` (3 tests): helper match, mismatch and format; the CLI refuses bad hex and, in a temporary clone, refuses a wrong pin; the docs name both files and the option.
- **Before** (`R4-5-before.log`): 2 failures, 1 error.
- **After** (`R4-5-after.log`): 3 / 3 OK.

### Packaging support and doc corrections (commit 5c874e9)

- `scripts/package-r3.py:96-101`: `reviews/MIMAR-R4-changes-*.md` (exactly one) is treated like the Codex response, as the required last commit after the freeze.
- `scripts/package-r3.py:112-113`: `test-results/r4/` evidence is included in the ZIP.
- `release/CHANGELOG.md`, `release/VERIFICATION.md` and `release/UNTESTED.md` gained R4 sections.
- **Found during the work:** the `git diff --check` row in `release/VERIFICATION.md` wrongly said "BLOCKED: runtime dependencies absent". `test-results/r3/diff-check.log` shows exit 0, and the row is corrected.

## 3. GROK-HANDOFF.md (commit 59a1862)

The "Division of work" section now reads:
- **Implementer:** Mi'mar only, on `mimar-*` branches, one commit per finding with a before/after test.
- **Reviewers:** Codex (CLI on Fadel's Mac), Argon (Gemini app), Opus 5.5 (Claude app) and Mi'mar's own review. They only list findings, with file:line, evidence and the exact fix.
- **Merging:** only Fadel merges to `main`.
- `reviews/GROK-*` and `reviews/CODEX-*` stay unedited.
- The approval and installation gates are unchanged.

## 4. Manifest, coverage and verification (after commit 5c874e9, isolated clone `/tmp/r4v`)

**Build:** `python3 -B scripts/package-r3.py build --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3`. Hashes were generated, not hand-edited.

| Item | Value |
|---|---|
| Release manifest | `trust/MANIFEST.sha256` sha256 `6e930cf2fe35c34058449ec87cb25a47b395d28018f3eb4911d92f1f8eda6f82` (66 files) |
| ZIP | `artifacts/FANNAN-R3.zip` sha256 `6eae3aa760913cb2186bc37fce9d4bb0318cf82ae5db0679420faa8cd1f41dba` (174 members, CRC PASS) |
| Registry | `trust/R3-CHANGES.sha256` sha256 **`b98b69a485331b0ff5201646429d68fba9bd8d87f9eceecef7183b23581d65d5`**. Use this value for `--registry-sha256`. |

**Commands run:**
- `chmod 0444 trust/MANIFEST.sha256 trust/R3-CHANGES.sha256`
- `python3 -B scripts/package-r3.py verify --start 9ee1ca6… --registry-sha256 b98b69a4…65d5`
  - Result: exit 0, `registryPin: external`, 89 changed, 87 covered, `uncoveredChangedFiles: []`.
  - Exclusions: the registry itself and `reviews/CODEX-R3-response-f42bc27.md`. This file becomes the third exclusion once committed.
- The same command with `--registry-sha256 000…0` fails with `ValueError: registry pin mismatch`.
- `release/tools/verify-manifest.sh "$PWD/trust/MANIFEST.sha256" "$PWD/release" "$(cut -d' ' -f1 trust/PINNED.sha256)"` gives `MANIFEST OK (66 files)`, exit 0.

**Coverage:** `git diff --name-only eb2d540..HEAD` lists 49 paths. The only one not in the registry is `trust/R3-CHANGES.sha256` (it can't contain its own hash). Every changed `release/` file is in the 66-file release manifest.

**Other checks:**
- `git diff --stat eb2d540..HEAD -- reviews/` is empty before this file, so no `reviews/GROK-*` or `reviews/CODEX-*` file changed.
- Secret grep (GitHub, OpenAI, AWS, Slack, Google key, PEM private key, generic `key|secret|token|password = <16+ chars>`) over the added lines of `git diff eb2d540..HEAD` and over every file in the extracted ZIP: **0 matches**.

## 5. Full test results (logs in `test-results/r4/`)

| Command | Exit | Result |
|---|---|---|
| `node --test release/tests/*.test.mjs` (Node 22.23.3, test-only deps) | 0 | **19 pass / 0 fail / 0 skip** |
| same, without deps | 0 | 18 pass / 0 fail / 1 skip (dependency-backed conversion) |
| `python3 -B release/tests/test_guard_tools.py -v` | 0 | **10 / 10 OK, 0 skipped** |
| `node --test revisions/r2/release/tests/*.test.mjs` | 0 | 4 / 4 |
| `python3 -B revisions/r2/release/tests/test_guard_tools.py -v` | 0 | 4 / 4 OK |
| `python3 -B scripts/test_package_r3.py -v` | 0 | 3 / 3 OK |
| `python3 -B scripts/package-r3.py self-test` | 0 | PASS |
| Node 20.19.2, same suite | 1 | 17 pass, 2 fail. sd-build refuses Node < 22.12 **by design**. |
| Syntax: `node --check` (21 .mjs), `bash -n` (5 shell files), `ast.parse` (4 .py) | 0 | 0 failures |
| `git diff --check` | 0 | clean |

## 6. Untested

- The full `pre-handoff-check.mjs` gate: the browser pin is BLOCKED by design, and the real Impeccable binary and `/opt/fannan` don't exist.
- The protected-mode positive paths (root-owned read-only `/opt/fannan/bin/<browser-dir>`, deps and launcher): this box has no root.
- The R4-3 contrast rule composites over white, so a translucent focus background on a dark page can be under-measured. That gives a false fail, never a false pass relative to R3. **Reviewers should confirm the 3:1 screening threshold.** Real browsers other than Chrome 154 are untested.
- R4-4 on a real provisioned browser tree: untested. A setuid `chrome-sandbox` would need mode 4555 to pass the read-only rule.
- semgrep, shellcheck and gitleaks are not installed, so they were not run.

## 7. Remaining open items and blockers

- **R4-6 (P3):** unitless spacing numbers emit `--spacing-sm: 8;`. **Fadel's decision is needed:** require units, or treat the values as scale steps.
- **Protected storage and identity** (G-4, G-11, G-16, B1): Fadel chooses a dedicated non-root user or a reviewed sandbox, and the system owner provisions root-owned `/opt/fannan/{bin,deps}`, `/workspace` and `/workspace/design-output`.
- **Detector (B2):** the binary at `/opt/fannan/bin/impeccable-linux-x64`, sha256 `3d31ec1a664ac35c815ea1d7c10abad1155ce364d0f461157eb837a34368efb6`.
- **Deps (B5):** `npm ci --ignore-scripts` into `/opt/fannan/deps`, inventory `0f7891db…a031`.
- **Browser identity:** a reviewed path, version, sha256 and supportTreeSha256.
- **Full gate:** a PASS on the target host.
- **Amin's review** of the final digest.
- **B3 proof method and Jabr's evidence.**
- **Activation and rollback (B6).**
- **Missing records (P2-E).**
- **Fadel's written yes in Fannan's own chat (B7).**
