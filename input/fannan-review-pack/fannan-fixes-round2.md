# Fannan package: fixes round 2 and self re-review

Thu Oct 15, 2026, about 4:45 to 4:48 AM (Gaza time), by an executor working for dr eggbot.
**Scope:** the sandbox, `fannan-review-pack/` and the docs only. Nothing was installed, the live skills are untouched, and no bot was messaged.
**Archive:** round 1 versions are in `sandbox/fannan-skills/archive-round1/` (launcher, round 1 manifest, round 1 spec) and `work/*.round1.*.bak`. **Amin hasn't reviewed round 1 or round 2.**
**Fadel's 4:46 AM decisions are folded in and closed:** J1 (no cap), J2 (approved, not done), J3, J4 and C5.

## Fixes and test evidence
| # | Finding | Status | Evidence |
|---|---|---|---|
| N1 (P0) | Launcher denylist bypass | **Fixed** | An allowlist: `--version`, or `detect` on existing local paths with 6 read-only flags plus `--scope`. **32 refused cases tested, all exit 4:** live, live-inject, live-wrap, live-server, live-generate, live-anything, generate, skills install, update, link, check and help, ignores, ignores add, hooks, doctor, pin, install, update, link, check, document, context, help, --help, a URL, --viewport, --live, a missing path, a bare detect, `--version x`, and an empty command. Allowed: `--version` gives 4.0.0; `detect` and `detect --json --no-advisory` give 1 finding. |
| N15 (P3) | Hash-then-exec race | **Fixed** | The binary is copied to `mktemp -d` (umask 077); that copy is hashed, then run, then removed. A symlinked IMPECCABLE_BIN is refused (exit 3). Tampered → 5, unset → 3. 0 temp folders left. |
| N2 (P1) | Manifest self-attesting, symlink-blind, skills only | **Fixed** | It's external at `/workspace/sandbox/fannan-trust/MANIFEST.sha256` (install: `/home/box/agent-data/fannan-trust/`), mode 0444, 93 files (skills, scripts, launcher, converter, tools, package.json, lockfile). Its own sha256, `cc9d3518…0733a93`, is pinned in spec §6. Tested OK; a wrong pin, a tamper, a symlink, an extra file, a manifest inside the root and a writable manifest all exit 1. The Node runtime isn't covered (open, P3). |
| N3 (P1) | Precheck advisory | **Partly fixed** | Mandatory in every skill override, as step 1 of proto-setup, proto-build and proto-figma, and inside pre-handoff (an evidence folder in a repo → exit 2, tested). Still a convention plus a race; the GitHub token is the backstop (J2, not done). |
| N4 (P1) | Desktop override drops approval | **Fixed** | All 7 skills say "until the project's approver approves the desktop design, per the brief" (grep: 7 overrides plus 1 inline in generate-design). The proto files match. |
| N5 (P1) | pre-handoff false PASSes | **Fixed** | The Tab walk uses element identity (two "Read more" links → 3 stops, a 10px button is caught). Reduced motion now catches JS: the rAF page FAILs (42 calls, 1 element moved). impeccable not run → FAIL ("did not run"). The good mock passes; the bad page fails. |
| N6 (P1) | Amin review of round 1 | **Open** | Amin needs to review rounds 1 and 2 before install (rule 5). |
| N7 (P2) | Converter units, unquoted hex, regex | **Fixed** | Unitless 8 stays a number, and SD prints `8`. Unquoted hex → exit 3. Empty group → exit 3. Non-colour → exit 3. The regex is fixed. |
| N18 (P3) | Converter BOM, no trailing newline | **Fixed** | Tested OK. |
| N8 (P2) | Live DC project-rules draft not updated | **Open** | It's outside my scope (the docs/projects file wasn't in the allowed list). Only the pack copy is updated. |
| N9 (P2) | shadcn imperative npx lines | **Fixed** | 18 lines tagged "reference only: Fannan never runs this", and the search principle replaced. allowed-tools: Read. |
| N10 (P2) | Who writes DESIGN.md | **Fixed** | Stitch skills return text. Fannan writes `design-output/<project>/DESIGN.md` after the precheck, converts and lints. Spec §5. |
| N11 (P2) | proto-share, media and codebase not in the pack | **Open (marked)** | The references now say "live skill, not yet in this pack". They need review. |
| N12 (P2) | Stale live text, unordered tie-breaks, 2 options vs 3–5 | **Fixed** | Live text removed from §3, X9 and the impeccable description. One ordered precedence list in §5. Step 4 = 2 options by default, and the variant loop is separate. |
| N13 (P2) | On hold not tied to Bot Tasks | **Fixed** (text) | §2 Tracking and §7: On-hold approvals get a Bot Tasks row with a due date. Reminders aren't automated. |
| N14 (P3) | Chrome hard-coded, --no-sandbox, WS and SW, inline links | **Fixed** | `CHROME_PATH`; `--no-sandbox` only with `CHROME_NO_SANDBOX=1`; service workers and WebSockets blocked; inline text links exempt from 2.5.8. |
| N16 (P3) | impeccable +3, playwright 1.64.1 | **Open** | Noted in §7; waits for Amin. |
| N17 (P3) | generate-design trigger broad | **Fixed** | Only when the design tool is Stitch and Fadel approved. |
| Wazir P1-A | QA proof rules | **Fixed** (text) | §8: a chat message or a green PR is not a pass; a missing screenshot is a FAIL; the preview SHA must match the scanned build. |
| Jabr P1-1 | Handoff not build-ready | **Partly fixed** | The required inputs and the missing-input rule are defined (proto-process Step 9, §4.1). There's still no real design link or example DESIGN.md or settings.md, and no handoff has been run. |
| Step 9 | Handoff step | **Fixed** | proto-process: scope and authority is a rules section; Steps 1–8, then Step 9 handoff (C5, Fadel 4:46 AM). |
| QA N1 | Archive retention rule | **Noted, not added** | The rule belongs to Hafiz; Fannan follows it. QA's chat-sourced details aren't verified in any file. |
| J1–J4, C5 | Decisions | **Closed** | Spec §7 and §10; plan addendum. J2 is approved but not done. |
| Still open from before | 2.5.7, 3.3.8, RTL, keyboard-trap checks; Stitch untested; critic never run; binary from main; host `allowed-tools`; server-side bot text | **Open** | |

## Test commands (all offline, sandbox)
- **Launcher:** `IMPECCABLE_BIN=bin/impeccable-linux-x64 unshare -rn latest/impeccable/scripts/impeccable <verb>`, for each case above.
- **Converter:** 8 cases in `/tmp/cvt`, plus `work/dry/DESIGN.md` → 22 variables.
- **pre-handoff:** good, bad, duplicate-link, rAF, no-impeccable and repo-folder cases. Evidence is in `/workspace/design-output/_test/` (scratch test output).
- **Manifest:** 7 cases.
- **Secret scan (4:48 AM):** gitleaks found no leaks in the review pack, the sandbox skills or fannan-tools. A regex scan for common key formats found nothing.
