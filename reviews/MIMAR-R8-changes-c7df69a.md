# Mi'mar R8 changes: port from Codex cloud (`codex/fannan-r3-review` 2733317)

Branch `mimar-r4-fixes`, from 069e2d3. Last code/package commit: c7df69a. Written Oct 18 2026, about 12:05 AM Gaza (UTC+3). This record is the latest round record: the only file besides the registry left unhashed (OPUS-R2-03 rule, `release/PACKAGING.md`). `reviews/MIMAR-R7-changes-8bd2dc6.md` is now hashed in the registry and left unchanged. No `GROK-*` or `CODEX-*` file was added or changed.

## Authority

- Fadel approved merging the useful Codex cloud work into Mi'mar's fixes on Oct 17 2026, 11:45 PM Gaza, in Mi'mar's chat. The work was ported by hand (no `git merge`, no cherry-pick); every port commit says `ported from codex/fannan-r3-review 2733317`.
- The cloud branch's own "authorization" and "publication" commits (3a55ce1, 1a88fe1) record Fadel's approval, given in Codex's chat, to **publish that private review branch**. His screenshot shared at 11:50 PM Gaza confirms it. It approved publication of a review branch only. It is **not** an install approval, not Amin's review and not Fadel's final-digest yes; installation stays BLOCKED.
- `main`, `grok-review`, `codex-r3-fixes` and `codex/fannan-r3-review` were not touched (read back after push). No force push.

## Ported (each test fails before and passes after)

| Port | Commit | Change | Evidence in `test-results/r8/` |
|---|---|---|---|
| PORT-01 desktop widths in the handoff (cloud `handoff-contract.mjs:54`) | 61e6e69 | `settings.desktopWidths` must be unique positive integer CSS widths that include 1440. The contract test fixture, the local fixture and `references/handoff-contract.md` are updated. | PORT-01-before (fail: `desktopWidths undefined must fail`) / after (pass); nine bad lists refused, `[1440]` and `[1440, 1280]` pass |
| PORT-02 width screen (cloud `browser-probes.mjs` `screenWidths`/`inspectLayout`) | 7eb98df | New `tools/width-screen.mjs`. `pre-handoff-check.mjs` calls it with `handoff.settings.desktopWidths` right after our focus probe, both on the positional page (after the 1440 frame, so the reference screenshot is unchanged) and on every declared state, where it is part of the state's pass. It renders each declared width plus 320 CSS px and fails horizontal overflow, clipped or ellipsised text, and a lang/dir mismatch. An invalid list fails closed (no silent 1440 fallback). Our focus, spacing and design probes are kept unchanged; the cloud `screenFocus` was not taken. Docs: `design-quality.md`, `REVIEW-RESPONSE.md` P2-F. | PORT-02-before (0/3, module absent) / after (3/3); real Chrome 155 (test-only): a fluid page passes 1440/1280/320, a 1400px layout fails 1280 and 320, ellipsised text fails, Arabic RTL fails an `en/ltr` state, viewport is restored to 1440. The local fixture now asserts `1440,320` on the page and the state (exit 0) |
| PORT-03 stricter install wording (cloud `security-and-install.md`) | 33454d8 | 403/422 is not proof of read-only, 200/404 is not proof of scope, no push, ref-create, zero-SHA or other mutation probe, and no verification step or test may write to the repository. A branch 403 does not prove a plan limit. The daily check needs a last-run timestamp with time zone and must have run within its interval, or it escalates to the engineer owner and approver. A dedicated runtime identity is mandatory, and shared uid 1000 ownership of `/workspace` or `/workspace/design-output` fails; do not chown shared paths. Detector: our fixed `/opt/fannan/bin/impeccable-linux-x64` path (the cloud's `/home/box/agent-data/fannan-bin` path conflicts with our pin and was not taken), refuses other `IMPECCABLE_BIN` values and symlinked components, pinned source `engine-v0.1.14` asset `impeccable-linux-x64`, consistent with `launcher-impeccable.sh.internal`, PROVENANCE and the 3d31ec1a… digest. | PORT-03-before (1/5) / after (5/5). Test 5 is a guard that already passed before: no `REPORTED COMPLETE`/`REPORTED_INSTALLED` text, `node-runtime.json` stays `PROPOSED_REQUIRES_REVIEW_AND_APPROVAL` |
| PORT-04 package input (cloud `scripts/build-package.py` `files_under`) | d667c07 | `package-r3.py files()` refuses `__pycache__`, `*.pyc`, `node_modules` and `.git` entries in any packaged tree instead of hashing them into the manifest and ZIP. `PACKAGING.md` updated. The same commit makes the ZIP carry `test-results/r8`, like R4-R7. | PORT-04-before (2 fail: input rule, R8 ZIP evidence) / after (13/13) |

## Checked and not ported

- **ZIP CRC/inventory (`build-package.py`, `verify-static.mjs`):** `package-r3.py verify` already runs `testzip()` (CRC), checks exact names, duplicate names and member bytes, the release manifest, the 16 skills and the combined document. The cloud's direct manifest-digest check of ZIP release members is transitively the same (ZIP bytes = disk bytes = manifest). Only the input rule above was a real addition.
- **`verify-static.mjs`** was run once, ad hoc, against this tree: PASS (16 skills, frontmatter, links, no obsolete callers, nine plan steps, nine memory saves, unchanged deps, ledger coverage, 51 source hashes). It was not shipped: nothing failed before, so no fail-before test is possible. Two local adjustments are recorded in the log: the deps-prefix check was skipped, and `bash -n` was used for the `.internal` launcher, because `/bin/sh -n` fails on its arrays (a bug in the cloud script).

## Dropped, and why

- **Cloud artifacts and journal** (`artifacts/r3/*`, its `FANNAN-REWRITE.md`, `CHECKPOINT.md`, `test-results/r3/*`, `.gitignore /work/`): built from d2c36c1, about 50 commits behind; our `package-r3.py` builds the current artifacts.
- **Release docs** (CHANGELOG, FANNAN-PLAN, INSTALL-ACCEPTANCE, OPEN-QUESTIONS, PROVENANCE, REVIEW-RESPONSE, UNTESTED, VERIFICATION, memory, skills): written against the old base and conflicting with our R4-R7 fixes. Specifically **not taken**: the "REPORTED COMPLETE / no fresh approval" runtime text and `node-runtime.json` `REPORTED_INSTALLED`.
- **`browser-probes.mjs` `screenFocus`/`inspectFocus`**: our `focus-screen.mjs` is stronger (one unfocused baseline, `:focus-within` and pseudo-element indicators, 3:1 contrast against the backdrop, settled transitions).
- **`executable-trust.mjs`, `verify-deps.mjs`, `browser-trust.json`, `dependency-trust.json`, launcher edits**: we already have the verified browser pin, protected storage at `/opt/fannan/*` and the Argon R2 fixes; the cloud's versions use the `agent-data` prefix.
- **`token-references.mjs` / `designmd-to-sd.mjs`**: ours carries the R7 negative and component-typography rules.
- **Rest of the `pre-handoff-check.mjs` diff** (try/finally around the browser): our checker already fails closed (an error exits non-zero with no evidence and no handoff). Possible later improvement, not needed for correctness.
- **Cloud tests and fixtures** (`detector-fixture.mjs`, `browser-probes-fixture.mjs`, edits to host/dependency/token/guard tests): they target the cloud code above.

## Results (Node v22.23.3, Python 3.13.5, Chrome 155.0.8059.84 test-only)

| Suite | Result |
|---|---|
| Node, pinned test-only deps | 50/50 pass (`node.log`) |
| Node, no deps | 40 pass, 10 skipped (need deps or Chrome), 0 fail |
| Node v20.19.2 | 44 pass, 6 fail: all the intended `Node 22.12+ required` refusal (same six as R7) |
| Python guard tools | 10/10 |
| R2 Node / R2 Python | 4/4, 4/4 |
| Package tests | 13/13 in the git checkout; 10 pass, 3 skipped in a no-git copy |
| Package self-test | PASS |
| Local fixture end to end | exit 0; widths 1440 + 320 asserted; launcher exit 3, missing binary (asserted) |
| Syntax | mjs=27 sh=4 py=4 plus the launcher `.internal`, 0 failures |
| design.md lint 0.4.0 offline (`unshare -rn`) | example 0 errors/1 warning; fixture 0/2; OPUS-04 sample 0/0 (lint only; convert + build run inside the local fixture) |
| Whitespace, `git diff --check eb2d540..HEAD -- . ':(exclude)test-results/**/*.log'` | exit 0 |

## Package

- `build --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3`: release manifest `d9421c7abbd20745ba48370faf898a309f373497da913aedd3d9be11102824ae` (74 files), archive `65caca319acd5fde5fa6a0851936b216721c92c1f2f031cecd7a84862b623365` (314 entries, including `test-results/r8`, `tools/width-screen.mjs`, both package scripts, and no Mi'mar or CODEX records).
- `--registry-sha256 6cc42599cc8df51cde3b08573f2579b6b501f060e2e764fb68e91c507e23b230`. 237 changed, 236 hashed, 0 uncovered; at build only the registry is excluded. The R7 record is now hashed.
- Anchored verify in an isolated clone at c7df69a, trust files at 0444: PASS, `registryPin: external`. Wrong pin: exit 1 (`registry pin mismatch`). No pin: exit 1 (`unanchored registry`). GNU `verify-manifest.sh`: `MANIFEST OK (74 files)`.
- Secret pattern grep over `git diff 069e2d3..HEAD` and the extracted ZIP: 0 hits.

## Effects to know

- Every handoff JSON now needs `settings.desktopWidths` (at least `[1440]`); old handoffs fail the contract until it is added.
- Any page that overflows or clips text at a declared width or at 320 CSS px now fails the gate (page and state). Pages with fixed desktop-width layouts will fail the 320 reflow screen. That is intended (WCAG 1.4.10 at 400%), but it is new.
- A Python cache left in `release/` now stops the build rather than being hashed.

## Untested

- Width screen: real zoom, WCAG text spacing, reflow exceptions and the production browser pin. 320 px is not mobile approval.
- The install wording is documentation only; nothing was provisioned or probed on a host.
- The real Impeccable binary, a full gate PASS, a provisioned root-owned `/opt/fannan/bin` browser and the target host.
- Installation stays BLOCKED pending Amin's review and Fadel's yes in Fannan's chat.
