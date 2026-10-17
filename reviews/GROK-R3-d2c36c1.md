# Grok independent review — Fannan R3 at d2c36c1

**This review is provisional.** R3 is unfinished, and nothing here is an approval, Amin's sign-off or permission to install.

## Header

| Item | Value |
|---|---|
| Reviewed commit | `d2c36c1f86e8ec3797ce71a84ba7004ccadd6bd0`. This is `origin/main` after `git fetch` on 17 Oct 2026 at 05:20 Gaza time (UTC+3). No newer commit existed. |
| Release-manifest SHA | **No valid R3 manifest exists.** `trust/MANIFEST.sha256` (sha256 `204f79e4…2b06`) is byte-identical to `revisions/r2/trust/MANIFEST.sha256`. It verifies `revisions/r2/release` (57 files OK). Against `release/` it **fails**: 7 changed files, and 3 new files are not covered (`tools/token-references.mjs`, `tests/host-trust.test.mjs`, `tests/token-validation.test.mjs`). |
| Transfer sums | `sha256sum -c TRANSFER-SHA256SUMS.txt` passes for 232 entries on a `git archive HEAD` copy. |
| Runtime/platform | Mi'mar's box: Linux 6.12.94+ x86_64, Debian glibc 2.41, Python 3.13.5. Default Node is v20.19.2; Node v22.23.3 is at `/home/box/.local/node-v22.23.3/bin/node`. Google Chrome 154.0.8037.97 is at `/usr/bin/google-chrome` (a symlink to `/etc/alternatives` → `/opt/google/chrome`). All agents run as uid 1000 `box`. **This box is not necessarily the original Linux bot host.** |
| Scratch | `/workspace/scratch-fannan-r3` (a `git archive` of HEAD). The repo clone was not modified. One stray `__pycache__` from `py_compile` was removed. |
| Dependencies used for tests | I copied the existing tree from `/workspace/fannan-asad/r3/cv` into the scratch copy as test evidence only, not as an install. Its lock sha256 is `55a645b1…8710` (it matches the pin). Its `inventoryDigest(node_modules)` is `0f7891dbbd5883f8123781844c41a1eae7aea70750a13d87cf56693d7124a031`, which matches `runtime/dependency-trust.json`. No `npm ci` and no network install. |

**Files inspected (in GROK-HANDOFF order):**
- AGENTS.md, ORIGINAL-ASSIGNMENT.md, CLOUD-HANDOFF.md, CHECKPOINT.md, GROK-HANDOFF.md
- release/FANNAN-PLAN.md (gates and steps), release/REVIEW-RESPONSE.md, release/INSTALL-ACCEPTANCE.md, release/UNTESTED.md, release/OPEN-QUESTIONS.md
- release/references/security-and-install.md, critic-rubric.md (cap), design-quality.md (reflow)
- release/memory/FANNAN-MEMORY-PROPOSED.md
- skills: design-connect, design-process, design-prototype, design-canvas, a11y-wcag-audit (grep level)
- FANNAN-OPEN-ITEMS.md (third-party evidence)
- All 10 R3-changed tools and tests, diffed against revisions/r2/release
- tools/verify-deps.mjs, safe-write.py, safe-write.sh, pre-handoff-check.mjs (lines 1–60, 117–232) and handoff-contract.mjs (keys)
- runtime/*.json
- input/fannan-panel-round3/4/5.md and FANNAN-FINAL-PLAN.md (R3-7/8/12/16/20 definitions)

**Not read in full:** `Grok bot REVIEW.md` and the r7 files in `/workspace/docs/fleet-audit/fannan-codex-r7/`. I treated them as third-party evidence through FANNAN-OPEN-ITEMS.md.

**Commands actually run, all in scratch unless noted:**
1. `git fetch && git log -1` in the clone.
2. `diff -u` of every changed file against R2.
3. `node --test tests/<each>.test.mjs` with Node 22.23.3, then again with Node 20.19.2.
4. `python3 -m unittest -v tests/test_guard_tools.py`.
5. `node --check` on every .mjs, `sh -n` on every .sh/.internal, `py_compile` on the Python files.
6. `verify-manifest.sh`:
   - top-level trust against `release` (FAIL, as expected);
   - R2 trust against `revisions/r2/release` (OK, 57 files);
   - R2 with one injected extra file (rejected).
7. Direct launcher invocations (below).
8. `require_host(Path('/workspace/design-output'))` (read-only).
9. Converter and sd-build probes through a test-only `safe-write.sh` stub in `harness/` (the same stub technique `token-validation.test.mjs` uses). The stub is never production.
10. A Playwright/Chrome probe of the checker's focus expression.
11. `sha256sum` of `/tmp/node-v22.23.3-linux-x64.tar.xz`.
12. `stat` and `ls` of the host paths.

**Not run:**
- the real Impeccable detector (absent);
- a full `pre-handoff-check.mjs` fixture run (`tests/local-fixture.mjs` is Mac-specific; not adapted);
- fresh `npm ci`;
- Node GPG verification;
- semgrep, shellcheck, gitleaks (not installed);
- the same-uid race reproduction;
- any live token, branch or host-lifecycle check.

## Setup observations reproduced at d2c36c1

| Observation | Result |
|---|---|
| `executable-trust.mjs` missing | **Reproduced.** `tests/host-trust.test.mjs` fails with `ERR_MODULE_NOT_FOUND` on Node 22 and Node 20. |
| Launcher `shift 2` drops the first caller argument | **Reproduced.** Running `env -i PATH=/usr/bin:/bin ./launcher-impeccable.sh --version` gives rc 4, `allowed: --version \| detect <project paths>`, so `--version` was dropped. `… DUMMY --version` gets past argument parsing. `test_launcher_denies_override_outside_and_missing_project` fails with `'--json' is not allowed` because `detect` was dropped. |

**Test totals on Node 22.23.3:**
- Node: 5 files PASS, 1 FAIL (host-trust).
- Python: 6 PASS, 1 FAIL (launcher), 0 skipped. The Linux openat2 writer test and the manifest mode test ran and passed.

**On Node 20.19.2:** token-validation also fails (sd-build exits 2), and pre-handoff-check refuses Node 20 by design. Node 22 is a hard prerequisite.

**Syntax:** all JS, shell and Python syntax checks pass.

## Findings

Statuses:
- **CONFIRMED** means I reproduced it at d2c36c1.
- **FIXED-VERIFIED** means the R3 change works as I tested it.
- **REPORTED-ONLY** means third-party evidence I could not check.
- **UNTESTED** means inspected but not exercised.

| ID | Sev | Status | file:line | Reproduction / evidence | Smallest safe fix | Owner |
|---|---|---|---|---|---|---|
| G-1 | P1 | CONFIRMED | release/tools/launcher-impeccable.sh:8 | `sh -c '…' sh "$0" "$@"` makes `$1` the launcher, so `shift 2` also removes the caller's first argument. Repro and the failing Python test are above. Every real call (`--version`, `detect …`) is broken. | Change to `shift` (one). Add a test that `--version` reaches the internal helper with argv unchanged (e.g. a test-only `.internal` that prints `"$@"`). | Codex |
| G-2 | P1 | CONFIRMED | release/tests/host-trust.test.mjs:7; release/tools/pre-handoff-check.mjs:6,54 | `tools/executable-trust.mjs` does not exist. The checker still uses `process.env.CHROME_PATH \|\| '/usr/bin/google-chrome'` and launches with no identity check before execution. P2-A is still open. | Write `executable-trust.mjs` to the test's contract: refuse the `CHROME_PATH` override; require an absolute non-symlink path in protected root-owned storage; check the reviewed identity **before** `chromium.launch`; record version and hash in evidence. Without a reviewed target-host browser digest, stay BLOCKED and invent no digest. Note that `/usr/bin/google-chrome` is a 2-level symlink on this box, so the pin has to name the real file. | Codex, then Amin |
| G-3 | P1 | CONFIRMED | release/tools/pre-handoff-check.mjs:215 vs launcher-impeccable.sh.internal:8 | The checker passes `IMPECCABLE_BIN=process.env.IMPECCABLE_BIN \|\| <release>/../latest/impeccable/bin/impeccable-linux-x64`. The R3 launcher rejects any value except `PINNED_BIN`. Repro: `IMPECCABLE_BIN=…/latest/… ./launcher-impeccable.sh detect --json …` gives rc 3, `must be the pinned production path`. Even after G-1 is fixed and the binary is staged, the detector check is always `ran:false` unless the caller happens to set the exact pinned path. | Stop passing `IMPECCABLE_BIN` from the checker, so the launcher uses its own constant. Update the fixture adapters. | Codex |
| G-4 | P1 | CONFIRMED (Mi'mar's box) | launcher-impeccable.sh.internal:6,37-42; pre-handoff-check.mjs:23; references/security-and-install.md:30; design-quality.md:71 | `PINNED_BIN=/home/box/agent-data/fannan-bin/…`. On Mi'mar's box, `/home/box/agent-data` is a symlink (→ `/home/box/sand-data`, created Oct 15). The new ancestor loop therefore always fails: `pinned binary path contains a symlink` (rc 3, reproduced). The prefix is also owned by the shared uid 1000, so it is not protected storage. The same prefix is proposed for the deps tree. | Do **not** relax the symlink check. Pick one protected, root-owned prefix with no symlinked ancestors (for example `/opt/fannan/{bin,deps}`, root:root, directories 0755, files 0444/0555). It needs Fadel's yes and the system owner to provision it. Use that constant in the launcher, the checker, verify-deps and the docs, and add ancestor owner/mode checks (see G-15). | Codex (code); system owner and Fadel (host) |
| G-5 | P2 | CONFIRMED | release/tools/sd-build.mjs:21 | sd-build checks only references, not types. `{"a":{"$value":16,"$type":"dimension"},"b":{"$value":"x","$type":"bogus"}}` builds with rc 0 and emits `--a: 16rem; --b: x;`. The R3-10 unitless→rem defect survives at the sd-build boundary (and for hand-edited token JSON). | Move the type validation into `token-references.mjs` (or a sibling) and call it from both tools: allowlisted `$type`, value shape per type, and no number for `dimension`. | Codex |
| G-6 | P2 | CONFIRMED | release/tools/token-references.mjs:1-19 | References are checked for existence and cycles but not type compatibility. `spacing.sm: "{colors.primary}"` converts (rc 0) and builds `--spacing-sm: #123456`. | Resolve each reference chain to its terminal token and require a compatible `$type` for the referencing group or key. | Codex |
| G-7 | P3 | CONFIRMED | release/tools/designmd-to-sd.mjs:47 | YAML `.Inf` is typed `number`. JSON then writes `$value: null`, and the CSS gets `--spacing-sm: null`. | Require `Number.isFinite(v)` for number and dimension values. | Codex |
| G-8 | P3 | CONFIRMED | release/tools/designmd-to-sd.mjs:43 | `fontWeight: "heavy-ish"` is accepted as type `fontWeight`. | Accept 1–1000 or the DTCG weight keyword allowlist only. | Codex |
| G-9 | P3 | CONFIRMED (behaviour change) | release/tools/designmd-to-sd.mjs:43 | `fontFamily: ["Inter","sans-serif"]` was accepted in R2 ("arrays stay arrays") and now fails as `unknown token type`. `lineHeight: "150%"` also fails. The example and fixture DESIGN.md files still convert (rc 0). | Decide whether DESIGN.md allows family arrays. If yes, accept non-empty string arrays. Either way, add the case to the caller-compatibility test. | Codex |
| G-10 | P2 | CONFIRMED (Chrome probe) | release/tools/pre-handoff-check.mjs:126,166 | This is R3-20, still open. In real Chrome, using the checker's exact expression: a button with `outline:none` and a static decorative `box-shadow` is reported focus-visible (**false pass**). A button whose focus indicator is a background change is reported not visible (**false fail**). | Compare computed outline, box-shadow, border, background-color, color and text-decoration (or a screenshot diff) focused vs unfocused, and treat no change as a failure. Keep manual focus evidence mandatory (WCAG 2.4.7/2.4.13 are not proven by this). | Codex |
| G-11 | P2 | CONFIRMED (Mi'mar's box) | release/tools/safe-write.py:44-52 (require_host) | This is B1. Running `require_host(Path('/workspace/design-output'))` gives `DENY: /workspace must be root-owned without group/other write`. `/workspace` is box:box 0755. The behaviour is correct per the preserved rule. | Do not weaken it (this review rejects r7 "Option A" as a closure). The host needs root-owned `/workspace` and `/workspace/design-output`, plus a dedicated non-root writer uid or an equivalent reviewed isolation boundary (bubblewrap is at `/usr/bin/bwrap`, untested). That needs Fadel's decision and the system owner. No chown of shared directories without that decision. | Fadel / system owner; Amin re-review |
| G-12 | P2 | CONFIRMED | release/REVIEW-RESPONSE.md:1; release/UNTESTED.md; release/VERIFICATION.md; trust/MANIFEST.sha256 | R3 packaging is incomplete. REVIEW-RESPONSE still says "revision 2". There is no corrected B1–D8 ledger. UNTESTED, VERIFICATION and CHANGELOG are byte-identical to R2. The trust manifest is the R2 one (it fails on R3). FANNAN-REWRITE.md describes R2. | This is Codex's R3 packaging plan from CLOUD-HANDOFF.md: ledger, regenerated docs, fresh manifest and pin, ZIP. | Codex |
| G-13 | P2 | CONFIRMED | release/memory/FANNAN-MEMORY-PROPOSED.md:7 | This is P3-E. Save 3 still names Stitch and `STITCH_API_KEY`. The vendor rule, including 90 days and immediate rotation on exposure, is already in `skills/design-connect/SKILL.md:6` and `references/security-and-install.md:15`. | Replace the vendor sentence with a generic one: "follow the selected adapter's key-ownership and rotation rule". Keep the 90-day and exposure text in the adapter. | Codex |
| G-14 | P3 | UNTESTED (code reading) | launcher-impeccable.sh.internal:27-34 | Detect paths are canonicalised for the check, but the original `$a` is passed to the binary. A same-uid writer could swap a symlink between check and exec. The detector is read-only, so the impact is low. | Rebuild argv from the canonical paths. | Codex |
| G-15 | P3 | CONFIRMED (code) | launcher-impeccable.sh.internal:37-42 | The ancestor loop checks symlinks only, not owner or mode. Integrity holds anyway, because the private-tmp copy is hashed and that same copy is run (internal:43-56, verified by reading). | Add root-owner and no-group/other-write checks per ancestor, together with G-4. | Codex |
| G-16 | P2 | CONFIRMED (code) | release/tools/verify-deps.mjs:26-33 | P3-A and P2-C are still open. Any prefix is accepted. There is no owner or mode check on the prefix or its ancestors. Hashing happens before the later import, so a same-uid writer can swap files in between. `chmod -R a-w` under the same owner does not fix this. | Fixed protected root-owned prefix (G-4), with a realpath equality check and an ancestor owner/mode walk. A dedicated runtime identity stays a prerequisite. | Codex; system owner |
| G-17 | P3 | FIXED-VERIFIED | release/tools/verify-manifest.sh:12-13 | P3-D. The root bypass is gone and write bits are checked. The new test passes (0644 refused, 0444 OK). The R2 manifest also verifies and rejects an injected extra file. | None. | — |
| G-18 | P3 | FIXED-VERIFIED | designmd-to-sd.mjs:33-55,81; token-references.mjs | P2-G, P3-H and R3-10 in the converter. Unknown types fail. Unitless fontSize, letterSpacing and breakpoints fail with "units required". Missing, self, 2-cycle and 3-cycle references fail before writing. A group reference (`{colors}`) fails. `token-validation.test.mjs` passes on Node 22. Residual gaps are G-5 to G-9. | None beyond G-5 to G-9. | — |
| G-19 | P3 | FIXED-VERIFIED | launcher-impeccable.sh:3-10; .internal:8 | Environment sanitisation (test passes: TEST_SECRET, NODE_OPTIONS and an untrusted PATH are removed). Symlink invocation is refused with rc 3, and the adjacent untrusted helper is not run (test passes, and I reproduced it). Arbitrary `IMPECCABLE_BIN` is refused (rc 3). The precheck usage line names an absolute path (P3-G). | None (but see G-1, G-3 and G-4). | — |

## Reconciliation of r7 items, decisions and older findings

| Item | Disposition at d2c36c1 |
|---|---|
| B1 writer vs host | **Open blocker, CONFIRMED** (G-11). r7 "Option A, accept euid" is not a valid closure, because shared uid 1000 is not separation from other agents. |
| B2 detector | **Open blocker.** The binary is absent (`/home/box/agent-data/fannan-bin` does not exist). The pin is engine-v0.1.14 `impeccable-linux-x64` `3d31ec1a664ac35c815ea1d7c10abad1155ce364d0f461157eb837a34368efb6` (from CLOUD-HANDOFF; I did not re-fetch the release metadata). The r7 curl example uses an ellipsis checksum and is unusable. G-1, G-3 and G-4 also block it in code. |
| B3 token / branch (R3-4) | **Open, NOT RUN.** I had no access and requested none. Correction: a zero-SHA ref-create 403 and a 422 are not authoritative permission proof. The evidence has to be the token's scope and repository-selection record plus a safe read. A branch-endpoint 403 alone does not prove a plan limitation. Also needed: a daily-check record with owner, task ID, schedule, time zone, last run, result and escalation. No mutation probes. |
| B4 Node 22 | **Done on Mi'mar's box; record reconciled.** `/home/box/.local/node-v22.23.3/bin/node` reports v22.23.3 x64 linux, glibc 2.41. `/tmp/node-v22.23.3-linux-x64.tar.xz` sha256 = `df450af8…02de` (matches the pin). The tarball mtime is 2026-10-16 08:00:34 Gaza time. Install was reported as done with Fadel's yes in Mi'mar's chat. GPG was **not** verified by Mi'mar; Amin's GPG check is REPORTED-ONLY. The r7 B4/D2 rows (absent, `/home/box/agent-data/` prefix) are stale. Do not reinstall. `runtime/node-runtime.json` flags should stay false for the package claim. If wanted, add a separate "reported host installs" record. It is not target-host proof if the bot host is a different machine. |
| B5 deps | **Pin reproducible, install not done.** An existing tree from a byte-identical lock reproduces `0f7891db…a031` on this box. A fresh `npm ci --ignore-scripts` into a protected prefix is NOT RUN, and the prefix choice is blocked by G-4/G-16. |
| B6 activation / rollback | **Open, UNTESTED.** There is no host hold/swap/rollback mechanism or evidence. |
| B7 Fadel's yes | **Open.** It must be on the final R3 digest, after Amin's review of that digest, and given **in Fannan's own chat**, per the preserved rules. The r7 "Mi'mar's chat" wording is wrong. |
| P2-A browser | **Open, CONFIRMED** (G-2). |
| P2-B binary path | Override **FIXED-VERIFIED** (G-19). New breakages: G-3 and G-4. |
| P2-C dep race | **Open** (G-16). `chmod a-w` is insufficient. |
| P2-D paid gate | **Open, REPORTED-ONLY / UNTESTED.** Text-only; disclosed at security-and-install.md:7. |
| P2-E missing records | **Open, NOT RUN.** I did not search for the archive, helper tests or register. |
| P2-F widths | **Open (P3).** The checker is 1440-only (pre-handoff-check.mjs:55,171,193). Correction: cover the *declared* project desktop widths plus the 320 CSS px / 400% reflow evidence, without a mobile phase. 1280/1920 are not universally required. |
| P2-G token types | **FIXED-VERIFIED in the converter** (G-18). Residual: G-5 to G-9. |
| P2-H real-project proof | **UNTESTED.** Pilot required. |
| P3-A deps prefix | **Open** (G-16). |
| P3-B project directory creation | **Decided, not a defect.** Pre-provisioned project directories are intentional (CLOUD-HANDOFF). |
| P3-C node-runtime flags | **Keep false.** Amin's GPG check is REPORTED-ONLY; see B4. |
| P3-D manifest root | **FIXED-VERIFIED** (G-17). |
| P3-E vendor memory | **Open, CONFIRMED** (G-13). |
| P3-F launcher location | Symlink refusal **FIXED-VERIFIED**, but every invocation is broken by G-1. |
| P3-G precheck usage | **FIXED-VERIFIED.** |
| P3-H converter references | **FIXED-VERIFIED** (missing, self and cycle). Type compatibility is open (G-6). |
| P3-I older findings | See the R3 rows below. |
| D1 final install yes | **Pending.** It is not askable until the blockers close and Amin reviews the R3 digest. |
| D2 Node 22 | **Done** (see B4). Do not ask again. |
| D3 writer identity | **Pending Fadel.** Correction: Option A is not acceptable as closure. A dedicated identity or reviewed isolation is required, not optional hardening. |
| D4 network fetches at install | **Pending** (binary download and `npm ci`). |
| D5 Stitch rule in memory | **Already decided** by CLOUD-HANDOFF: move it out. This is now a Codex task (G-13), not an open decision. |
| D6 proceed without missing records | **Pending** (after the P2-E search). |
| D7 messages to Codex/Jabr | **Pending.** This review sent no messages. |
| D8 engine-v0.1.15 | **Settled.** Stay on the v0.1.14 pin; no substitution. |
| R3-7 approver wording | **FIXED-VERIFIED (text).** FANNAN-PLAN.md:11 requires the approver role to resolve to Fadel and blocks on a mismatch. |
| R3-8 (2.5.7, 3.3.8, RTL) | **FIXED-VERIFIED (text only).** a11y-wcag-audit/SKILL.md:8 and design-quality.md add manual dragging, authentication and RTL checks. These are not automated, which is acceptable as long as manual evidence is mandatory. |
| R3-12 manifest/runtime coverage | `runtime/node-runtime.json` is in the manifest (line 18). The R3 manifest itself is missing and stale, so this is **open** until G-12 is done. |
| R3-16 stale text | **FIXED-VERIFIED.** No "not yet in this pack" or "not signed in" in release/. The accepted `/workspace/proto-bot/proto.py` helper path remains (P3-6, accepted). |
| R3-20 focus heuristic | **Open, CONFIRMED** (G-10). |

**Priority 4 (process and design gates).** FANNAN-PLAN.md, the references, the skills and handoff-contract.mjs are byte-identical to R2, so R3 introduced no regression there. I checked the following:
- the nine steps (FANNAN-PLAN.md:27-101);
- desktop-only plus grayscale through the Step 5 approval (:17, :51-61, design-canvas:8);
- the critic's 3-round cap with no soft pass (:107, critic-rubric.md:34, design-prototype:13);
- placeholders failing Step 9 (:39) and the canonical handoff.json (:93-101);
- the handoff contract enforcing seven states per language and direction with source proof (handoff-contract.mjs:73-95). `handoff-contract.test.mjs` passes.

Automated heuristics (accent proxy, copy signals, focus, axe) do not prove design quality or WCAG conformance. G-10 shows the focus screen is unreliable in both directions.

## Remaining deployment blockers

| # | Blocker | Closure evidence required |
|---|---|---|
| 1 | G-1, G-2, G-3 code defects | A new commit. All Node and Python tests pass on Linux, including host-trust and an argv-preservation test. The launcher reaches the binary on a `--version` call. |
| 2 | Protected storage and identity (G-4, G-11, G-16, B1) | Fadel's decision and system-owner provisioning: root-owned `/workspace` and output root, a dedicated writer identity or reviewed isolation, and a protected bin/deps prefix with no symlinked ancestors. `stat` output for every ancestor, and `require_host` returning OK on the actual host. |
| 3 | Detector staged (B2) | The binary at the protected path. `sha256sum` = `3d31ec1a664ac35c815ea1d7c10abad1155ce364d0f461157eb837a34368efb6`, mode 0555, root-owned. `launcher --version` rc 0. Support assets verified. A real detect run. |
| 4 | Deps installed (B5) | `npm ci --ignore-scripts` with Node 22's npm into the protected prefix. Inventory = `0f7891db…a031`. On a mismatch, stop and re-review; never re-pin. |
| 5 | Browser identity (P2-A) | A reviewed real-file Chrome path and identity on the target host, checked before launch and recorded in evidence. |
| 6 | Full gate | `pre-handoff-check.mjs` PASS on the target host with the real dependencies, detector and browser, on a valid fixture, with no stubs. |
| 7 | R3 package (G-12) | Corrected ledger, regenerated docs, FANNAN-REWRITE.md, a fresh MANIFEST and PINNED, and a ZIP, with verified inventory and CRC. |
| 8 | Amin review (R3-2) | Amin's per-file PASS/FAIL against the **final R3 digest**. The R2 PASS on `204f79e4…` does not transfer. |
| 9 | Token and branch (R3-4) | Authoritative scope and repository-selection record, a safe read, current branch settings, and the daily-check task record. Secret names only. |
| 10 | Activation and rollback (B6) | A host hold/stage/swap/readback/rollback record, with failure-injection results restoring skills and memory byte-for-byte. |
| 11 | Fadel's yes (B7/D1) | Written yes in **Fannan's own chat** referencing the final digest, runtime and memory changes. |

## Verdicts

**Local package readiness: NOT READY.** R3 at d2c36c1 is an unfinished working tree:
- one Node test file fails (missing `executable-trust.mjs`);
- the launcher drops the first argument (G-1) and is incompatible with its caller (G-3);
- the browser identity check is unimplemented;
- the docs, ledger and manifest are still R2, and there is no valid R3 manifest or ZIP.

The converter's type and reference fixes, the manifest mode check and the launcher's environment and symlink hardening are real improvements and verified.

**Live installation readiness: BLOCKED.** None of blockers 2–11 has closure evidence. On Mi'mar's box specifically:
- the writer refuses the host (B1);
- the pinned binary path cannot pass, because of the `agent-data` symlink (G-4);
- the detector and the protected deps are absent.

Node 22 is present, which is the only host prerequisite that is met.
