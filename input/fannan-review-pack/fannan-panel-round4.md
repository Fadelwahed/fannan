# Fannan plan: round-4 panel review
Thu Oct 15, 2026, about 7:45–8:00 AM (Gaza). Read-only: Fannan, the pack and the live files were not changed. Pack sha256 is `56bdc7bd82afe924…77b0` (matches), and `PACK-MANIFEST.sha256` still verifies (`sha256sum -c` gives PACK OK). Tests ran only on copies in `r4/pack`, `r4/t` and `r4/v`.

**Seats:** fresh seats looked at four areas: the tool code (shell and JS), the rules and text, the converter, and a call-site audit. That last one is new and checks how each tool is actually called.
- **Grok CLI:** it got a smaller scope (4 tool files), but after about 5 minutes it had returned only its first line and no findings. It is not counted. See `r4/grok-out.md`.
- **Same agent:** every seat was run by the same agent, so this isn't a truly independent panel.
- **Evidence:** each status below comes from a rerun test or a grep done in this round.

## Verdict: **PASS WITH CONDITIONS** (design and tools). The bot is **NOT ready to install** (no change from round 3).
**Counts (open now): P0 0 · P1 5 · P2 8 · P3 9.** Of the 20 round-3 findings, 18 are confirmed, 1 is downgraded and 1 is rejected. There are 3 new findings.

## Round-3 findings: status
| ID | R3 P | R4 | Evidence (round 4) |
|---|---|---|---|
| R3-1 | P1 | **Confirmed P1** | `tools/pre-handoff-check.mjs:83` calls `join(here,'../latest/impeccable/scripts/impeccable')` directly, so the launcher's allowlist and sha check are skipped. |
| R3-2 | P1 | **Confirmed P1** | Spec l.8 says "Amin hasn't reviewed the round 1 or round 2 changes yet." No Amin sign-off appears anywhere in the pack. |
| R3-3 | P1 | **Confirmed P1** | The spend cap is still live in 4 places: `proto-skills/proto-build/SKILL.md:15` "get a yes before going over the spend cap", `proto-skills/proto-media/SKILL.md:7` "ask above the spend cap", `fannan-memory-live.md:10` "over the spend cap", and spec l.341 (a quote of the live copy). `D1-D5.diff` has no proto-media hunk. |
| R3-4 | P1 | **Confirmed P1** | Spec l.572 and l.586: "approved, not done". |
| R3-5 | P1 | **Confirmed P1, wider** | Tests: `precheck /workspace/design-output/a` (no project) gives 0, and the cross-project check gives 11. **New in round 4:** the callers leave out the project, so even the gate doesn't scope it. `pre-handoff-check.mjs:16` passes only the path, and `proto-skills-proposed/proto-setup/SKILL.md:16` runs `readonly-precheck.sh /workspace/design-output/` with no project. |
| R3-6 | P2 | Confirmed | `fannan-memory-live.md:8` (Jabr, QA bot, "en and ar/RTL") and `proto-skills/proto-build/SKILL.md:18` ("send Jabr"). |
| R3-7 | P2 | Confirmed | 7 of 7 vendor skills say "project's approver". This depends on O2. |
| R3-8 | P2 | Confirmed | Spec §10 item 4 has no rows for 2.5.7, 3.3.8 or RTL. |
| R3-9 | P2 | Confirmed | `pre-handoff-check.mjs:30` uses a single viewport at 1440 with no `dir` or `lang` handling. |
| R3-10 | P2 | Confirmed | Test: `fontSize: 16` gives rc 0 and `{"$value":16,"$type":"dimension"}`. |
| R3-11 | P2 | Confirmed (from the spec text) | Spec §10 item 6. I didn't rebuild the binary. |
| R3-12 | P2 | Confirmed | O5 is still open. |
| R3-13 | P3 | Confirmed | Test: a relative manifest path gives rc 2 and `sed: can't read v/m.txt`; the absolute path gives `MANIFEST OK`. |
| R3-14 | P3 | Confirmed | Tests with `IMPECCABLE_BIN=/bin/true`: `detect /etc/passwd` and `detect --scope type` (no path) both reach the sha step (rc 5) instead of a usage refusal (4). Cause: `launcher-impeccable.sh:17` counts flags as paths. |
| R3-15 | P3 | **Downgraded to P3, latent** | `launcher-impeccable.sh:34` uses `${TMPDIR:-/tmp}`. /tmp on the box is not mounted noexec (`/proc/mounts`), so this is a portability risk only. |
| R3-16 | P3 | Confirmed | Out-of-date text: spec l.315 and l.367 say "not yet in this pack", and `fannan-fixes-round3.md:6` says "not signed in". |
| R3-17 | P3 | Confirmed | `fannan-memory-live.md:10` "12-hour Gaza times". |
| R3-18 | P3 | Confirmed | Tests: `{colors.q}` gives rc 0 and `rounded: "{nope}"` gives rc 0. |
| R3-19 | P3 | **Rejected** | `CODEX-START-HERE.md:6-9`: the reading order does not name `fannan-full-plan.md`. It's mentioned only in the fixes-round1 scope line. |
| R3-20 | P3 | Confirmed | It's a heuristic, as the script's own note says. I didn't re-test a background-only focus style. |

## P1 fixes (exact)
1. **R3-1** `tools/pre-handoff-check.mjs:83`
   - **Replace:** `execFileSync(join(here,'../latest/impeccable/scripts/impeccable'), ['detect','--json',page], …)`
   - **With:** `execFileSync(process.env.FANNAN_IMPECCABLE_LAUNCHER || '/abs/install/skills/impeccable/launcher-impeccable.sh', ['detect','--json',page], { encoding:'utf8', env:{...process.env, IMPECCABLE_BIN: '/abs/pinned/impeccable'} })`
   - **Also:** before that line, add `if (!existsSync(launcher)) { ev.checks.impeccable={ran:false,pass:false}; fail=true; }`.
   - **Test:** a tampered binary gives launcher exit 5, which must make `ran:false` and the gate FAIL. The current line 86 already treats any exit other than 0 or 2 as FAIL.
2. **R3-5**
   - **(a)** `tools/readonly-precheck.sh:5`: change `[ $# -ge 1 ]` to `[ $# -eq 2 ] && [ -n "$2" ]`. Also add `case "$2" in */*|.|..) exit 11;; esac`, and drop the `if [ -n "${2:-}" ]` guard on l.12.
   - **(b)** `pre-handoff-check.mjs:13/16`: add a 4th argument `<project>` and pass it: `[resolve(outDir)+'/evidence.json', project]`.
   - **(c)** `proto-skills-proposed/proto-setup/SKILL.md:16`: change to `readonly-precheck.sh /workspace/design-output/<project>/ <project>`.
   - **(d)** For the race, write through a wrapper (`safe-write.sh <project> <path>`) that runs the precheck and then writes with `O_NOFOLLOW` or `O_EXCL`, for example `set -C` plus `realpath` re-checked after open. Until host enforcement is tested, mark it advisory.
3. **R3-3**
   - `proto-skills/proto-build/SKILL.md:15`: change to "Price any paid generation first, and ask Fadel before anything paid, every time."
   - `proto-skills/proto-media/SKILL.md:7`: change "ask above the spend cap" to "ask Fadel before anything paid, every time". This needs a new **D6** hunk.
   - `fannan-memory-live.md:10` (save 8): change to "Ask before anything paid, every time (no spend cap)."
   - Apply these only after Amin's review and Fadel's yes.
4. **R3-2** (process; no line to edit)
   - Send Amin the pack (launcher, the 3 tools, converter, proto-process, `D1-D5.diff` plus D6).
   - Record his PASS or FAIL for each file in spec §10 item 1, replacing l.8.
5. **R3-4** (process)
   - Create a fine-grained read-only token (Contents: read, one repo) or a read-only deploy key. Only its name goes in settings.md.
   - Record Jabr's daily main-branch check as a Bot Task.
   - Then update spec l.572 and l.586 to "done".

## New findings (round 4)
| ID | P | File | Problem | Evidence | Fix |
|---|---|---|---|---|---|
| R4-1 | P2 (folded into the R3-5 fix) | `pre-handoff-check.mjs:16`; `proto-skills-proposed/proto-setup/SKILL.md:16` | The callers of the precheck leave out the project, so writes are only limited to the design-output root and not to the project's folder. | grep (above) | R3-5 fixes (b) and (c). |
| R4-2 | P3 | `designmd-to-sd.mjs:29` | Strings under `spacing` or `rounded` aren't validated. `sm: banana` comes out as `$type dimension` with rc 0. | Test rc 0 | Require `/^-?\d*\.?\d+(px|rem|em)$/` or a reference; otherwise push an error. |
| R4-3 | P3 | `tools/verify-manifest.sh:10` | The read-only check is skipped when running as root (uid 0), so a writable manifest passes. The pinned hash still catches tampering, so the impact is low. | Code | Check `stat -c %a` for no write bits, whatever the uid. |

## Rules check
No change from round 3. **Broken:** 1 (R3-6, R3-17), 5 (R3-2, R3-11), 7 (R3-1, R3-4, R3-5), 8 (R3-3).

## Unverified
- Grok's second opinion. It returned no findings in round 3 or round 4.
- Host enforcement of `allowed-tools` and of write limits.
- Output from the real pinned impeccable binary (only `/bin/true` was used).
- R3-11: the binary's origin rests on the spec text only.
- R3-20: not re-tested.
- Stitch, shadcn, a11y-audit and the critic loop run end to end.
- Whether the On hold reminders and the key-rotation Bot Tasks exist.
- Round-3 items left unverified: N10, N12, N17.
- `fannan-full-plan.md` checked against the spec.
