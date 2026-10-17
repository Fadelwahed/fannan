# R3 executed verification — 17 October 2026

## R7 executed verification (Mi'mar's box, 17 October 2026, about 11:50 PM Gaza)

Linux x86_64, Node v22.23.3, Python 3.13.5, local Chrome 155.0.8059.84 (test-only, unpinned). Test-only deps: the existing locked tree (lock identical to `release/runtime/package-lock.json`); no install, no network.

| Command | Exit | Result | Log |
|---|---|---|---|
| `node --test release/tests/*.test.mjs` (with test-only deps) | 0 | 42 PASS, 0 FAIL, 0 SKIP | `test-results/r7/node.log` |
| same, without deps (committed tree exported with `git archive`, no `runtime-deps`) | 0 | 33 PASS, 0 FAIL, 9 SKIP (need deps or Chrome) | `test-results/r7/node-without-deps.log` |
| Node 20.19.2, same | 1 | 36 PASS, 6 FAIL: every failure is the intended `Node 22.12+ required` refusal by `sd-build.mjs` | `test-results/r7/node20.log` |
| `python3 -B release/tests/test_guard_tools.py -v` | 0 | 10 PASS | `test-results/r7/python.log` |
| R2 Node / R2 Python | 0 / 0 | 4 / 4 PASS | `test-results/r7/r2-node.log`, `r2-python.log` |
| `python3 -B scripts/test_package_r3.py -v` | 0 | 11 PASS in the git checkout; 8 PASS, 3 SKIP in a no-git copy | `test-results/r7/package-tests-git.log`, `package-tests.log` |
| `python3 -B scripts/package-r3.py self-test` | 0 | PASS | `test-results/r7/package-self-test.log` |
| `node release/tests/local-fixture.mjs` | 0 | browser, contract, spacing (approved scale from the hash-checked tokens.json) and state checks PASS; every run stops at launcher exit 3 `pinned binary missing; no download fallback`, asserted (CODEX-R3-03) | `test-results/r7/local-fixture.log` |
| design.md lint 0.4.0 offline (`unshare -rn`), convert + build | 0 | 0 errors on example, fixture and OPUS-04 sample; convert/build rc 0 | `test-results/r7/designmd-lint-offline.log` |
| Syntax (`node --check`, `bash -n`/`sh -n`, `ast.parse`) | 0 | mjs=24 sh=4 py=4 plus the launcher `.internal`, 0 failures | `test-results/r7/syntax.log` |
| `git diff --check eb2d540..HEAD -- . ':(exclude)test-results/**/*.log'` | 0 | clean | (this table) |

Per-finding before/after logs are in `test-results/r7/`. Package build and the anchored verify (trust files at 0444) are in the latest `reviews/MIMAR-R7-changes-*.md`.

## R6 executed verification (Mi'mar's box, 17 October 2026, about 11 AM Gaza)

Linux x86_64, Node v22.23.3, Python 3.13.5, local Chrome 155.0.8059.84 (test-only, unpinned). Test-only deps: the existing locked tree (lock identical to `release/runtime/package-lock.json`), copied in after the box restore; no install, no network.

| Command | Exit | Result | Log |
|---|---|---|---|
| `node --test release/tests/*.test.mjs` (with test-only deps) | 0 | 36 PASS, 0 FAIL, 0 SKIP | `test-results/r6/node.log` |
| same, without deps | 0 | 30 PASS, 0 FAIL, 6 SKIP (need deps or Chrome) | `test-results/r6/node-without-deps.log` |
| Node 20.19.2, same | 1 | 34 PASS, 2 FAIL: the intended `Node 22.12+ required` refusal | `test-results/r6/node20.log` |
| `python3 -B release/tests/test_guard_tools.py -v` | 0 | 10 PASS | `test-results/r6/python.log` |
| R2 Node / R2 Python | 0 / 0 | 4 / 4 PASS | `test-results/r6/r2-node.log`, `r2-python.log` |
| `python3 -B scripts/test_package_r3.py -v` | 0 | 11 PASS in the git checkout; 8 PASS, 3 SKIP in a no-git copy | `test-results/r6/package-tests-git.log`, `package-tests.log` |
| `python3 -B scripts/package-r3.py self-test` | 0 | PASS | `test-results/r6/package-self-test.log` |
| `node release/tests/local-fixture.mjs` | 0 | browser, contract and state checks PASS; full gate blocked, but **R7 correction (CODEX-R3-03):** the log shows the launcher stopping with exit 4 `detect path outside project output` (the fixture had not relocated the launcher's root), not the missing-binary stop this row claimed. Corrected run: R7 below | `test-results/r6/local-fixture.log` |
| design.md lint 0.4.0 offline, convert + build | 0 | 0 errors on example, fixture and OPUS-04 sample; convert/build rc 0 | `test-results/r6/designmd-lint-offline.log` |
| Syntax | 0 | mjs=25 sh=4 py=4, 0 failures | `test-results/r6/syntax.log` |

Per-finding before/after logs are in `test-results/r6/`. Package build/verify results are in the latest `reviews/MIMAR-R6-changes-*.md`.

## R4 executed verification (Mi'mar's box, 17 October 2026)

Linux x86_64, Debian glibc 2.41, Node v22.23.3, Python 3.13.5. Not the target bot host. Node runs used an existing locked dependency tree (lock sha256 `55a645b1…8710`, matches the pin) copied in as **test evidence only**; no install, no network.

| Command | Exit | Result | Log |
|---|---|---|---|
| `node --test release/tests/*.test.mjs` (with test-only deps) | 0 | 19 PASS, 0 FAIL, 0 SKIP (re-run after R4-6) | `test-results/r4/node.log` |
| same, without deps | 0 | 18 PASS, 0 FAIL, 1 SKIP (dependency-backed conversion) | `test-results/r4/node-without-deps.log` |
| `python3 -B release/tests/test_guard_tools.py -v` | 0 | 10 PASS, 0 SKIP (Linux runs the GNU/openat2 cases) | `test-results/r4/python.log` |
| `node --test revisions/r2/release/tests/*.test.mjs` | 0 | 4 PASS | `test-results/r4/r2-node.log` |
| `python3 -B revisions/r2/release/tests/test_guard_tools.py -v` | 0 | 4 PASS | `test-results/r4/r2-python.log` |
| `python3 -B scripts/test_package_r3.py -v` | 0 | 3 PASS | `test-results/r4/package-tests.log` |
| `python3 -B scripts/package-r3.py self-test` | 0 | PASS (tamper, extra, symlink, writable) | `test-results/r4/package-self-test.log` |
| Node 20.19.2 `node --test release/tests/*.test.mjs` | 1 | 17 PASS, 2 FAIL: sd-build refuses Node < 22.12 by design (Node 22 is a hard prerequisite) | `test-results/r4/node20.log` |
| Syntax (`node --check`, `bash -n`, `ast.parse`) | 0 | 0 failures | `test-results/r4/syntax.log` |
| Before/after per finding | — | each R4 test fails on the pre-fix code and passes after | `test-results/r4/R4-*-before*.log`, `R4-*-after.log` |

The package build/verify, GNU `verify-manifest.sh` and coverage results are recorded in `reviews/MIMAR-R4-changes-*.md` (written after the package freeze).


**Overall: local unit/syntax/content/package checks pass with explicit skips; dependency-backed fixtures and live readiness remain BLOCKED.** This is Darwin/macOS with Node v22.22.3 and Python 3.15.0, not the independent review's Linux box or a proven live bot host. Exact commands and complete stdout/stderr are committed in `test-results/r3/` and repeated in the final `reviews/CODEX-R3-response-*.md`. R2 evidence elsewhere is historical.

| Exact command (globs expanded) | Exit | Observed result | Full output |
|---|---|---|---|
| `node --test release/tests/checker-boundaries.test.mjs release/tests/copy-signals.test.mjs release/tests/dependency-trust.test.mjs release/tests/focus-screen.test.mjs release/tests/handoff-contract.test.mjs release/tests/host-trust.test.mjs release/tests/local-file-boundary.test.mjs release/tests/token-validation.test.mjs` | 0 | 13 PASS, 0 FAIL, 1 SKIP (14 tests) | `test-results/r3/node.log` |
| `python3 -B release/tests/test_guard_tools.py -v` | 0 | 6 PASS, 0 FAIL, 4 SKIP (10 tests) | `test-results/r3/python.log` |
| `node --test revisions/r2/release/tests/copy-signals.test.mjs revisions/r2/release/tests/dependency-trust.test.mjs revisions/r2/release/tests/handoff-contract.test.mjs revisions/r2/release/tests/local-file-boundary.test.mjs` | 0 | 4 PASS, 0 FAIL, 0 SKIP (4 tests) | `test-results/r3/r2-node.log` |
| `python3 -B revisions/r2/release/tests/test_guard_tools.py -v` | 0 | 3 PASS, 0 FAIL, 1 SKIP (4 tests) | `test-results/r3/r2-python.log` |
| `node release/tests/local-fixture.mjs` | 2 | BLOCKED: runtime dependencies absent; not a PASS | `test-results/r3/browser-fixture.log` |
| `node /private/tmp/fannan-r2-suites-fof65rhb/release/tests/local-fixture.mjs` | 1 | BLOCKED: runtime dependencies absent; not a PASS | `test-results/r3/r2-browser-fixture.log` |
| `python3 -B scripts/package-r3.py self-test` | 0 | PASS; four negative tamper/inventory/link/mode cases rejected | `test-results/r3/package-self-test.log` |
| `git diff --check` | 0 | PASS: no whitespace errors (R4 correction: this row previously repeated the fixture BLOCKED text by mistake) | `test-results/r3/diff-check.log` |

Current R3 totals: **Node 13 PASS / 0 FAIL / 1 SKIP; Python 6 PASS / 0 FAIL / 4 SKIP**. Historical R2 rerun: Node 4 PASS; Python 3 PASS / 1 SKIP. Combined unit suites: **26 PASS / 0 FAIL / 6 SKIP**. The package self-check is separate, with four meaningful negative cases. Two browser-fixture commands are blocked, not counted as unit passes. The archived fixture is copied unchanged into an isolated temporary tree before running because its historical runner removes its own evidence folder; no archived/source bytes were changed.

The token converter/build success case is skipped because the pinned packages are absent. An offline-only `npm ci --offline --ignore-scripts --no-audit --no-fund --prefix runtime-deps` from unchanged lockfiles failed ENOTCACHED for zwitch-2.0.4. It made no registry request in offline cache-only mode. No network/global/live install ran; no dependency, lock or inventory pin changed. Actual sd-build rejection tests still execute before dependency loading and prove invalid JSON cannot write CSS.

Python production Linux openat2, GNU manifest, launcher environment and direct negative-path tests have real SKIP reasons on Mac. Exact wrapper argv and canonical detector parser tests execute using temporary copied tools with narrowly labelled platform adapters. The dedicated-user/shared-owner rejection test mocks metadata only; it does not claim real host enforcement. The new dependency verifier requires protected root-owned `/opt/fannan/deps` and complete tree/ancestor metadata; content/tamper tests use synthetic unprotected trees solely through the lower-level verifier, never production entrypoints.

The checker invocation block test records actual caller argv/environment and the browser launch block test proves a denied pin prevents launch. These are boundary unit tests, not a stubbed full-gate PASS. The production browser trust record remains explicitly BLOCKED without a reviewed target identity. A separate actual Chrome headless focus attempt with a fresh temporary profile aborted signal 6 in sandbox; no no-sandbox retry or browser-rendering PASS is claimed. The focus screen tests computed-style comparisons, including static decoration, background, borders, outlines, wrappers and pseudo-elements. Manual visibility, contrast and WCAG evidence remain mandatory.

Additional executed checks:

- `node --check` for all 43 .mjs files plus Node syntax checking of two historical Node shebang `.sh` adapters: **45 JavaScript checks PASS**. `/bin/sh -n` or `/bin/bash -n` per shebang: **17 shell files PASS**. Python `ast.parse` without bytecode artifacts: **6 Python files PASS**. Initial extension-based dispatch wrongly tried shell parsing on the two historical Node adapters; the raw failures remain in `syntax-initial-dispatch.json`, and shebang-corrected results are in `syntax.json`. No source was changed to hide those diagnostics.
- `git diff --check`: exit 0.
- Standard-library content assertions: **51/51 immutable source hashes**, all nine ordered steps, AA/grayscale/desktop/paid rules, **16/16 skills**, active caller names/Gotchas/relative links, generic memory save 3 and retained selected-adapter key/90-day/exposure rule PASS. Original source and Grok-review diff is empty.
- Starting-code probes accept unitless dimension, bogus type and cross-type reference; corrected tests reject them. Two new Python regressions deliberately fail against starting launcher/parser bytes and pass against current bytes. An initial before-fix parser probe reached an old host-check loop; its real error is retained separately, then the probe was correctly bounded to parsing only.
- Read-only native code review found ambiguous dot-path collisions and inherited allowlist names during validation, plus wrapper/pseudo focus coverage. They were corrected and regression-tested; narrow rereview found no remaining issue in those changes. This is not Amin's review or security approval.
- `python3 -B scripts/package-r3.py self-test`, `build --start <starting SHA>` and `verify --start <starting SHA>` validate release hashes, exact file sets, all seven deliverables/16 full skills, changed-file coverage and ZIP bytes/CRC. The production GNU manifest command is attempted separately on Mac and is unavailable; portable package verification is not a Linux verifier PASS.

No lint/typecheck/npm-test script, pytest configuration or further test suite is declared in the repository package manifests; the Node native and Python unittest suites above cover the supplied runnable tests. No new analyzer was installed. semgrep, shellcheck and gitleaks are absent; a redacting diff-pattern scan is a limited check, not a full secrets/security audit.

The final response is committed last. All suites are rerun after that commit with fresh logs outside the frozen repository to preserve both the last-response-commit rule and clean status; the final chat reports those results and log location. Nothing in this document anticipates a successful post-commit run.
