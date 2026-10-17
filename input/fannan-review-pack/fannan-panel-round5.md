# Fannan plan: round-5 panel review (final round before the final)
Thu Oct 15, 2026, 7:56 to about 8:15 AM Gaza. This review was read-only. Fannan, the pack and the live files were not changed. Tests ran only on copies in `r5/t/`.
- **Pack:** `/workspace/docs/fleet-audit/fannan-review-pack.zip`, rebuilt at 7:55:38 AM, sha256 `dbaf01c02e4b21e0323bf159f99ec3b678413c13516fa8fc0e40c2398e0707b1`. This matches the value Mi'mar gave.
- **File count:** there are **44 files: 43 listed in `PACK-MANIFEST.sha256` plus the manifest itself**. `sha256sum -c` passes 43 of 43, and no files are unlisted. Amin's "43" and Mi'mar's "44" are both correct.
- **Full plan:** `fannan-full-plan.md` (7:55:38 AM) sits outside the pack, at `/workspace/docs/fleet-audit/`. I read it.

## Seats
| Seat | Who | Counted? |
|---|---|---|
| Security | **Amin** (`seat-amin.md`, 7:57 AM). Ran gitleaks (0 leaks) and tests. | **Yes**, real findings |
| Engineering | **Jabr** (`seat-jabr.md`, 7:56–8:15 AM). Tests run. | **Yes**, real findings |
| Grok CLI | 4 single-file chunks with tools disabled and a 15-minute timeout (`seat-grok.md`) | **Yes, partly**: 2 of 4 chunks returned findings (precheck, verify-manifest). The other 2 had no output by 8:08 AM |
| Asad | me: tie-break tests, rename grep, write-up | Yes |
This round is independent: two seats came from other bots. It is the first round where Grok returned findings.

## Verdict: **PASS WITH CONDITIONS for the design. FAIL for install** (stricter than round 4)
Jabr found two bugs that stop Fannan from working at all: setup always stops, and the install check and the gate can't both pass. A third bug makes the gate always fail. All three are confirmed by my own reruns.
**Open counts: P0 0 · P1 7 · P2 14 · P3 17 (38 open).** Of the 23 round-4 findings: 19 confirmed, 1 rejected (R3-1, replaced by N5), 1 resolved (R3-19), and 2 folded into others (R4-1 into R3-5; R3-20 kept but not re-tested).

## Disagreements settled by test (Asad)
- **R3-1 vs N5. Jabr is right.** `sha256(skills/impeccable/launcher-impeccable.sh)` = `46004533…0d41`, which is the entry in `trust/MANIFEST.sha256` for `latest/impeccable/scripts/impeccable`. So `pre-handoff-check.mjs:83` *does* go through the launcher, and **R3-1 is rejected**. But `env -u IMPECCABLE_BIN launcher detect --json x` gives **rc 3**, and nothing in the pack sets `IMPECCABLE_BIN` for the gate (I grepped for it). The gate therefore always FAILs. That is fail-closed, so it isn't a security hole, but every handoff is blocked. **N5 is rated P1** (Jabr said P2). Amin's fix (pass `IMPECCABLE_BIN` explicitly) and Jabr's fix are the same fix.
- **N1 confirmed:** `readonly-precheck.sh /workspace/design-output/` gives rc 10, and without the slash also rc 10. `…/a/ a` gives rc 0.
- **N2 confirmed** on a simulated root:
  - clean: `MANIFEST OK`, rc 0
  - add a `node_modules/.bin/design.md` symlink: "symlinks are not allowed", rc 1
  - add `node_modules/axe-core/axe.min.js`: "unexpected files", rc 1
  - The gate needs both of these (`pre-handoff-check.mjs:23,28`).

## Round-4 findings: status
| ID | R4 | R5 | Evidence |
|---|---|---|---|
| R3-1 | P1 | **Rejected** (now N5) | Launcher hash equals the trust entry (above) |
| R3-2 | P1 | Confirmed P1 | Spec l.8. Amin's seat is a review, but nothing is recorded in §10 item 1 yet |
| R3-3 | P1 | Confirmed P1 | `live-skills-snapshot/proto-build:15`, `proto-media:7`, `proto-setup:36` ($2/$10 widget), `fannan-memory-live.md:10`. There is no D6 hunk |
| R3-4 | P1 | Confirmed P1 | Spec l.572 and l.586, full-plan l.144: "approved, not done" |
| R3-5 | P1 | Confirmed P1 | Rerun: `…/a/x` with no project gives 0, and an empty `''` project gives 0. Callers pass no project |
| R3-6 to R3-10 | P2 | Confirmed | Both seats re-ran or cited the lines |
| R3-11 | P2 | Confirmed (spec text only) | Unverified |
| R3-12 | P2 | Confirmed | O5 is open |
| R3-13 | P3 | **Upgraded to P2** (Grok G1) | Test: a relative manifest path plus a planted `$root/m` passes a **tampered** file (`MANIFEST OK`, rc 0). The live caller (`design-setup:17`) uses an absolute path, so this is latent. Fix: `m=$(realpath -- "$m"); root=$(realpath -- "$root")` before l.13, and `cd -P` |
| R3-14, 15, 16, 17, 18 | P3 | Confirmed | R3-14 rerun (rc 5). R3-16 is wider (spec l.578). R3-18 is wider (self-reference) |
| R3-19 | rejected | **Resolved** | `CODEX-START-HERE.md:10` |
| R3-20 | P3 | Kept, not re-tested | |
| R4-1 | P2 | Folded into R3-5 | |
| R4-2, R4-3 | P3 | Confirmed | Jabr reran R4-2 |

## New findings (round 5)
| ID | P | Seat | File:line | Problem | Fix |
|---|---|---|---|---|---|
| N1 | **P1** | Jabr | `skills-proposed/design-setup/SKILL.md:16` | The first precheck targets the design-output root itself, which always gives rc 10, so setup always stops | `$T/readonly-precheck.sh "/workspace/design-output/$PROJECT/" "$PROJECT"`. Ask for the project before §1 |
| N2 | **P1** | Jabr | `trust/MANIFEST.sha256:2` vs `pre-handoff-check.mjs:23,28` | The npm deps under `fannan-tools/node_modules` break verify-manifest (symlinks and extra files) | Install the deps outside the covered tree (`npm ci --prefix /home/box/agent-data/fannan-deps`). In l.23, call `node $FANNAN_DEPS/node_modules/@google/design.md/<bin js>`. In l.28, read axe from `$FANNAN_DEPS` and fail if it's unset |
| N5 | **P1** | Jabr (rated P1 by Asad) | `tools/pre-handoff-check.mjs:83` | `IMPECCABLE_BIN` is never set, so the launcher gives rc 3 and the gate always FAILs. The spec l.96 and l.497 path differs from the manifest's `latest/…` path | Add `env:{...process.env, IMPECCABLE_BIN: process.env.IMPECCABLE_BIN \|\| join(here,'../latest/impeccable/bin/impeccable-linux-x64')}` to the execFileSync options. Then align spec l.96 and l.497 with the `latest/` path, and note that `bin/impeccable-linux-x64` is hash-checked but `bin/` is not in `# covers:`, so extra files there go undetected |
| A1/N3 | P2 | Amin + Jabr | `skills/generate-design/SKILL.md:152,207,253,315`, plus `latest-local-patches.diff:1012,1021,1030,1039` | **Stale rename caller:** "proto-build saves the file". RENAME l.22-29 doesn't list it | Change it to `design-prototype` in all 8 places, add the file to the RENAME caller list, and re-hash `trust/MANIFEST.sha256` (`latest/generate-design/SKILL.md`) and the pinned manifest sha |
| A3 | P2 | Amin | `trust/MANIFEST.sha256:2` vs spec l.499 | Fannan's own workflow skills aren't covered, but the spec says "all skills" | Add the `design-*` folders to `# covers:` with their hashes, or correct l.499 |
| A4 | P2 | Amin | spec l.311, `design-setup:39` | The spend rule is text only. Nothing in code blocks a paid call | Spec §10: "enforced by instruction only". Gate paid generators with per-call approval in `allowed-tools`, and test `spend_cap 0` |
| N4 | P2 | Jabr, confirmed by Asad | `RENAME-proto-to-design.md:7`; spec l.4, l.328, l.377; full-plan l.155 | The live state is misquoted: no live `proto-process` exists, and the BEFORE (live) blocks and the "live design-setup / live design-prototype" text use the new names. Full-plan l.65-68 (D1–D4) give line numbers against new names, so it's ambiguous which file they mean | RENAME l.7: "(new) design-process, no live skill". Spec l.4 and full-plan l.155: "live proto-setup / proto-build". Spec l.328 and l.377: use the live names. D1–D4: name the `live-skills-snapshot/proto-*` file the lines refer to |
| N6 | P2 | Jabr | `package.json` engines `>=22.12.0` | The box has Node v20.19.2 | Install Node 22 (needs Fadel's yes), or add a version check at `pre-handoff-check.mjs:13` |
| N7 | P2 | Jabr | `skills-proposed/design-process/SKILL.md:25` | Step 9 needs Style Dictionary CSS, but the pack has no build script for it | Add `tools/sd-build.mjs` and pin it, or make the JSON the only required token output |
| A5 | P3 | Amin | `launcher-impeccable.sh:25` | `detect` accepts any existing path (`/etc/passwd`) | Use `realpath -e`, and allow only paths under `/workspace/design-output/` |
| N8 | P3 | Jabr | `design-setup:50` | The "Never" line is ambiguous | Write each rule as its own bullet: "Never write outside …" |
| N9 | P3 | Jabr | `designmd-to-sd.mjs:26` | Self-references and cyclic references are accepted | Resolve every reference, and error on a missing or cyclic one |
| N10 | P3 | Jabr | `design-canvas:11`, `design-prototype:11,15,18` | The tools are called by bare name, without `$T` or `node` | Use full paths and `node …/pre-handoff-check.mjs` |
| N11 | P3 | Jabr | `verify-manifest.sh:16,22,24` | `$dirs` is unquoted. It fails closed on a space | Document "no spaces", or read the list with `while read` |
| S1 | P3 | Asad | `skills-proposed/design-prototype:19`, `design-setup:43,46`, `design-process:36` | The proposed skills call `design-share`, `design-ui-map`, `design-canvas` and `design-media`, which don't exist live until the rename. Installing D1–D5 before the rename breaks those callers | RENAME migration note: "install skills-proposed and rename all 9 folders in one step. Never install the proposed skills alone" |
| G2 | P3 | Grok | `readonly-precheck.sh:7-16` | A hard link inside a project to an outside file passes, and the check-then-write race is open (same as R3-5d) | Deny when `stat -c %h` > 1. Use the safe-write wrapper from R3-5d |
| G3 | P3 | Grok | `readonly-precheck.sh:14` | A bare git repo (HEAD + objects/, no `.git`) isn't detected | Also deny when `[ -f "$d/HEAD" ] && [ -d "$d/objects" ]` |
| G4 | P3 | Grok | both scripts, top | `PATH` is inherited, so a fake `realpath` could allow everything | Add `PATH=/usr/bin:/bin; export PATH` after `set -eu` |
| A2 | info | Amin | `fannan-memory-live.md:9` | Save 7 ("Load proto-* skills") is already listed in RENAME l.28 | Change it at the rename, with Fadel's yes |

**Grok claims rejected by test:**
- "Glob in the project name widens the match": `'*'` and `'app*'` give rc 11. Quoted patterns are literal in dash.
- "P0 relative manifest": confirmed only as latent, so it's P2 (above).
- verify-manifest `pipefail` and `cd -L` claims: not reproduced. A missing covered folder gives rc 1. Left unverified.

**Rename grep (Asad):** the other `proto-` hits are historical (rounds 1–4, `D1-D5.diff`), the live snapshot, `proto.py` and `/workspace/proto-bot/` (kept by design), or npm package names (`dunder-proto`, `get-proto`). None of these are findings. Every `name:` line in `skills-proposed/` matches the map (design-process, -prototype, -setup, -canvas). No `design-build`, `design-figma` or `design-codebase` leftovers remain.

## Fix order before install
1. Code: N1, N2, N5, then R3-5 (a–d from round 4)
2. Text: R3-3 (+ D6), A1/N3
3. Amin re-checks, and Amin's review is recorded in §10 (R3-2)
4. R3-4: token and branch check
5. Fadel's yes in Fannan's chat. Then the rename and the D1–D5 install happen as one step (S1)

## Unverified
- Grok's chunks for pre-handoff-check.mjs and the launcher (no output by 8:08 AM)
- The real impeccable binary
- The gate run end to end in Chromium
- Node 22
- Host enforcement of `allowed-tools` and the write limits
- proto.py spend enforcement (proto.py isn't in the pack)
- Whether verify-manifest runs before every launcher call
- R3-11 and R3-20
- The 12 `proto-` mentions in other bots' attachments (not opened)
