# CI troubleshooting

`.github/workflows/workbench-checks.yml` and `.github/workflows/main-checks.yml` are proposed. They are not in this worktree. The pull requests that would add them are not pushed; that push is blocked on a GitHub token scope. Nothing below is a log from GitHub Actions. The symptoms are the messages already recorded in this repo. Where a proposed job has no captured Actions log, the Actions annotation text is UNTESTED.

Proposed jobs:

| Workflow | Branch | Jobs |
|---|---|---|
| `workbench-checks.yml` | workbench | `node-tests`, `package-tests`, `anchored-verify` |
| `main-checks.yml` | main | `manifest`, `gitleaks` |

`main` holds the installable bot. `workbench` holds the tests, `scripts/package-r3.py`, the reviews and `test-results/`. Release files sync from workbench to main. Do not merge main into workbench.

The checker suite is Node 22. The records use Node v22.23.3. Chrome cases need the test-only dependency tree and a local Chrome. See `docs/analyzer-reference-corpus/README.md` for `FANNAN_DEPS` and `FANNAN_TEST_CHROME`.

## R18 autoplay carousel fails only under load

**Job:** `node-tests`.

**Symptom:** `node --test` exits 1. The failing test is `R18-GPT-05, R18-MIMAR-01` in `release/tests/panel-r18.test.mjs`. The assertion error shows `autoplay.hidden` of `1` against the expected `2`, status `integrity mismatch` against `PASS`, and the problem `unreadable: Slide three` (`test-results/r24/node.log`). The R26 record states the same failure as "the R18 autoplay integrity test (121 s, hidden 1 vs 2)" (`release/VERIFICATION.md`, log `test-results/r26/node.log`).

**Cause:** The page is an autoplay carousel: an 800px box, a 0.6s transform, one slide every 700ms (the string in `panel-r18.test.mjs`). On a loaded box the slide is captured mid-transition. R24's record says the shared box reached a load average of 77 and ran out of memory. R26's record says the load spiked to 93 during the first suite run. `release/VERIFICATION.md` for R25 says the honest-set JavaScript-on rendering at 320 recorded `partly clipped` instead of `reveal` for this carousel, and that R25 did not change partial-cut classification.

**Fix:** Rerun that one file on a quiet box. A pass in isolation means the suite failure was the timing, not a new width-screen result. Do not change the carousel page so the loaded run passes.

**Evidence:**

- `test-results/r24/node.log` (fail) and `test-results/r24/node-r18-rerun.log` (pass in isolation)
- `test-results/r26/node.log` and `test-results/r26/node-r18-rerun.log`
- `test-results/r27/node.log` (184/185; the R18 inner-scroll test fails only under full-suite load) and `test-results/r27/R18-isolated-rerun.log`
- `test-results/r25/R25-honest-patterns.log` and the R25 paragraph in `release/VERIFICATION.md`
- `test-results/r23/node20.log` also records this test timing out on Node 20 (88s) and `test-results/r23/node20-r18-rerun.log` passing 5 of 5. That extra failure is still the carousel, not one of the six Style Dictionary failures below.

## `page.goto` times out on a loaded box

**Job:** `node-tests` (Chrome tests).

**Symptom:** `page.goto: Timeout 30000ms exceeded.` with `name: 'TimeoutError'`. The same R24 before-log also has `browserType.launch: Timeout 180000ms exceeded.`

**Cause:** The box was shared and out of memory. `release/VERIFICATION.md` (R24) says some Chrome runs timed out on `page.goto` at a load average up to 77. Those before/after logs are not clean. R26's Chrome-before run hit a `page.goto` timeout on R25-GPT-04 while the other new tests failed at their assertions.

**Fix:** Rerun the one test file on a quiet box. A timeout is not an assertion failure. The R25 rerun of the R24 Chrome-before tests, on a quiet box, failed at the assertions (3 `ERR_ASSERTION`, 0 timeouts).

**Evidence:**

- `test-results/r24/R24-chrome-before.log` and `test-results/r24/R24-chrome-after.log`
- `test-results/r25/R24-chrome-before-rerun-r25.log`
- `test-results/r26/R26-chrome-before.log`
- the R24 and R26 sections of `release/VERIFICATION.md`

## Node 20 fails six Style Dictionary tests

**Job:** `node-tests`, if the runner is Node 20.

**Symptom:** Exit 1. Six tests fail with `code: 'ERR_ASSERTION'`. The actual output is:

```text
Node 22.12+ required
```

The test expected a Style Dictionary error (for example `/invalid dimension value/`) and instead received that line. In `test-results/r26/node20.log` the six tests are:

- CSS build rejects hand-edited malformed token JSON before dependencies or writes
- token conversion validates types, dimensions and references before writing
- CODEX-R3-01: numeric negatives and references to negative values are refused where CSS forbids negatives (validator and builder)
- CODEX-R3-01: the converter refuses numeric negatives and references to negative values, and still builds allowed negatives (real Style Dictionary, test-only deps)
- CODEX-R3-04: component typography follows the typography type rules (validator and builder)
- CODEX-R3-04: the converter applies the typography rules to component typography and builds valid values (real Style Dictionary, test-only deps)

The R26 count is 174 pass, 6 fail, on `/usr/bin/node` v20.19.2.

**Cause:** `release/tools/sd-build.mjs` exits 2 when the major version is below 22, or the minor version is below 12, and prints `Node 22.12+ required`. Node 20 never reaches Style Dictionary.

**Fix:** Run `node-tests` on Node 22. The verification records use Node v22.23.3. Node 20 is recorded as informational and is not a gate (`release/VERIFICATION.md`, from R11 onward).

**Evidence:** `test-results/r26/node20.log`, the same six failures in `test-results/r18/node20.log` through `test-results/r25/node20.log`, and `release/tools/sd-build.mjs`.

## Chrome or test dependencies missing: tests skip

**Job:** `node-tests`.

**Symptom:** Chrome tests are skipped. The skip string is `test-only deps or local Chrome absent`. A without-deps run exits 0 and reports skips. R18 recorded 74 pass, 0 fail, 51 skipped. R19 recorded 75 pass, 0 fail, 57 skipped. Those skips need dependencies or Chrome. They are not passes.

**Cause:** The panel tests require `node_modules/playwright-core` under `FANNAN_DEPS` (default `runtime-deps` next to `release/`) and a Chrome binary at `FANNAN_TEST_CHROME` (default `/usr/bin/google-chrome`). See `release/tests/panel-r18.test.mjs`. `width-screen.test.mjs` uses the same default paths and does not read those two variables.

**Fix:** Point `FANNAN_DEPS` at the locked test-only tree and `FANNAN_TEST_CHROME` at Chrome, then rerun one file. Do not treat a green run of skips as a width-screen result. There is no network install in the recorded procedure.

**Evidence:** `release/tests/panel-r18.test.mjs`, `test-results/r18/node-without-deps.log`, `test-results/r19/node-without-deps.log`.

## Manifest is writable

**Jobs:** `package-tests` and `anchored-verify` on workbench; `manifest` on main.

**Symptom:** `python3 -B scripts/package-r3.py verify` raises:

```text
manifest must be a real read-only file
```

The production script `release/tools/verify-manifest.sh` prints:

```text
MANIFEST: must be read-only
```

and exits 1. A symlink prints `MANIFEST: missing or a symlink`.

**Cause:** `verify_hashes` in `scripts/package-r3.py` rejects a symlink or any mode with a write bit (`0o222`). A clone keeps executable bits and does not keep mode `0444`. `release/PACKAGING.md` says to apply `0444` locally without changing bytes.

**Fix:** From the repository root, before verify:

```sh
chmod 0444 trust/MANIFEST.sha256 trust/R3-CHANGES.sha256
```

On main, the trust files are `trust/MANIFEST.sha256` and `trust/PINNED.sha256`. Set `0444` on the files that job verifies. Do not rewrite the digest rows to clear the error.

**Evidence:** `scripts/package-r3.py` (`verify_hashes`), `release/tools/verify-manifest.sh`, `release/PACKAGING.md`. The package self-test lists `writable manifest` among its negative cases.

## Anchored verify: inventory mismatch after the freeze

**Job:** `anchored-verify`.

**Symptom:**

```text
manifest inventory mismatch
```

Related freeze errors from the same verifier:

```text
unanchored registry: pass --registry-sha256 <digest quoted in the latest record> (or --allow-unanchored-registry for a self-consistency check only)
expected at most one record after the freeze: …
record reviews/MIMAR-R<n>-changes-<sha>.md is older than the latest frozen record
transient review record among the changed paths (rename it to its final head sha first): …
```

**Cause:** `verify_hashes` compares the names listed in the manifest with the live file list. A file added or removed under the covered tree after the manifest was written makes the two sets differ. Verify also hashes every path that changed since `--start`, except the registry itself and at most one later `reviews/MIMAR-R<n>-changes-<sha>.md`. Anything else that changed and is not in `trust/R3-CHANGES.sha256` fails. The start commit used in `release/PACKAGING.md` is `9ee1ca6aaa4a257cb84fb7381056005f48554bf3`. The registry digest is the value quoted in the latest Mi'mar record.

**Fix:** The proposed job verifies that anchor commit and checks that `release/`, `trust/` and `scripts/` are unchanged from the package freeze. A docs-only or review-record commit on workbench must not add or edit those three trees. If a release file really has to change, rebuild the package on workbench, re-pin the manifest, and quote the new registry digest in the round record. Do not pass `--allow-unanchored-registry` in CI. That flag is a self-consistency check, and `release/PACKAGING.md` says it is never a review pass.

The exact shell test the proposed workflow will use to compare `release/`, `trust/` and `scripts/` with the anchor is UNTESTED: the workflow file is not in this worktree.

**Evidence:** `scripts/package-r3.py` (`verify_hashes`, `coverage`, `verify`), `release/PACKAGING.md`.

## Manifest changed-file and extra-file errors

**Jobs:** `manifest` on main; the same checks inside `anchored-verify` and `package-tests` on workbench.

**Symptom:** `release/tools/verify-manifest.sh` exits 1 with one of:

```text
MANIFEST: changed or missing files
MANIFEST: unexpected files: <paths>
MANIFEST: its own sha256 does not match the pinned value
MANIFEST: must live outside the checked root
MANIFEST: no '# covers:' line
MANIFEST: symlinks are not allowed: <paths>
```

`scripts/package-r3.py` uses these strings for the same situations:

```text
manifest bytes mismatch: <name>
manifest pin mismatch
invalid or duplicate manifest path
```

The self-test's negative cases are `tamper`, `extra file`, `symlink` and `writable manifest`.

**Cause:** A covered file's bytes no longer match its row (`changed or missing files`, or `manifest bytes mismatch`). A file is on disk under a covered directory but is not named in the manifest (`unexpected files`). The manifest's own sha256 does not match the pin passed in (`PINNED.sha256` on main, or the digest argument to `verify-manifest.sh`).

**Fix:** Do not hand-edit digest rows. On workbench, rebuild with `scripts/package-r3.py` so `trust/MANIFEST.sha256` and `trust/PINNED.sha256` are regenerated from the bytes, then set mode `0444`. On main, the manifest job should match the tree that was synced from that freeze. An extra file in a covered folder is a failed sync or an untracked file, not a warning.

**Evidence:** `release/tools/verify-manifest.sh`, `scripts/package-r3.py`, `release/PACKAGING.md`.

## gitleaks and the old commit 2733317

**Job:** `gitleaks` on main. Proposed to scan new commits only.

**Symptom:** A full-history gitleaks run fails on commit `2733317`. The exact gitleaks rule line is not stored in this worktree. UNTESTED as an Actions log.

**Cause:** `release/VERIFICATION.md` records that commit as the Codex cloud port (`codex/fannan-r3-review` 2733317). `FANNAN-OPEN-ITEMS.md` records Amin's check of the Node release signature, key `5BE8A3F6C8A5C01D106C0AD820B1A390B168D356`. That is a key fingerprint, not a credential this repo uses. The current `release/runtime/node-runtime.json` still has `"releaseSignatureVerified": false` and does not contain the fingerprint. `FANNAN-OPEN-ITEMS.md` item P3-C is the note that asked for the fingerprint to be added; this worktree does not show that edit as done. `release/VERIFICATION.md` also says gitleaks was not available for the R3 local runs. Those runs are not a gitleaks pass.

**Fix:** The proposed main job scans only commits that are new to the pull request, so historical `2733317` is not a current failure. Do not delete the fingerprint from history to satisfy a full-history scan. A finding on a new commit is a real stop: read it, and do not suppress the rule to get green.

**Evidence:** `release/VERIFICATION.md` (the R8 port paragraph, and the note that gitleaks was absent), `FANNAN-OPEN-ITEMS.md` (items B4 and P3-C), `release/runtime/node-runtime.json`.

## Pinned action SHA updates

**Jobs:** any job in the two proposed workflows.

**Symptom:** No Actions log is in this worktree. UNTESTED.

**Cause:** The proposed workflows pin third-party actions by commit SHA. A moving tag would run different code without a diff in the job's own steps. Changing a pin is a change to the workflow file.

**Fix:** Update the pin in the workflow pull request and review that diff on its own. Do not replace a SHA with a floating tag to clear a failure. Do not treat a pin bump as a failure of `node-tests`, `package-tests`, `anchored-verify`, `manifest` or `gitleaks`.

**Evidence:** the workflow files are not in this worktree, so there is no pin to quote.
