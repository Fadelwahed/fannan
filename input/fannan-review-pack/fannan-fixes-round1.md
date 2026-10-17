# Fannan package: fixes round 1 and self re-review

Thu Oct 15, 2026, about 4:37 to 4:42 AM (Gaza time), by an executor working for dr eggbot. Fadel approved fixing the panel's findings at 4:36 AM.
**Scope:** only the sandbox (`/workspace/sandbox/fannan-skills/`), `fannan-review-pack/` and 2 docs (`fannan-complete-for-review.md`, `fannan-full-plan.md`).
- Nothing was installed for Fannan.
- `/home/box/agent-data/workflows` wasn't touched.
- No bot was messaged.
- Backups (archive, no deletes): `sandbox/fannan-skills/latest.bak-pre-round1-20261015/`, `archive-round1/` (the upstream impeccable launcher, live-browser JS, `.cmd`, the round 0 diff and both round 0 docs), plus `work/*.bak-pre-round1`.
- **Amin has not reviewed these changes.** The self re-review below isn't a substitute for his review.

## Changes, in the panel's fix-list order
1. **impeccable locked down:**
   - A new fail-closed launcher (`latest/impeccable/scripts/impeccable`). It requires IMPECCABLE_BIN and checks sha256 3d31ec1a…68efb6 on every run. There's no download, cache or PATH fallback.
   - It refuses live, generate, hooks, doctor, pin, install, update, link, check and document.
   - Live JS, modern-screenshot and `.cmd` were archived.
   - SKILL edits: the "downloaded once" text is gone; "Not for writing DESIGN.md / live / generate"; commands table rows disabled; desktop-only inspection; cwd set to design-output.
2. **shadcn made guidance only:**
   - Removed the load-time `!npx shadcn@4.21.5 info --json`, the "IMPORTANT: run all CLI commands" line, "always run npx docs", "always edit this file" and "fix all issues".
   - Removed `shadcn` from package.json, so npm audit went from 7 high to 0.
3. **D1–D5:** new proto-setup, proto-build and proto-figma files plus a new `proto-process` skill are in `fannan-review-pack/proto-skills-proposed/`, with `D1-D5.diff`. A grep found no bot or project names.
4. **Read-only:**
   - Tool limits: Stitch has no Bash or Write, shadcn has Read only, and the impeccable verbs are refused.
   - New `tools/readonly-precheck.sh`.
   - "Fix the source" changed to "report" in a11y and shadcn.
   - §7 and §8: the merge chain, main protected, and a read-only token (**token and protection are not set up; needs Fadel and Jabr**).
5. **Stitch key:**
   - MCP only, key from the secret-store variable `STITCH_API_KEY`.
   - The uploader script and `--api-key` are disabled in SKILL and tool-schema. `curl -o` is removed.
   - Fadel confirms (with cost and project) before every generation.
6. **Desktop only:**
   - Removed "unless the project's rules say otherwise".
   - Added the override "desktop only unless the project's current step allows mobile" to all 7 skills.
   - generate-design PLATFORM and deviceType set to desktop. a11y uses desktop navigation. impeccable `adapt` is disabled.
7. **Fadel's rule set, in §2 and §7:**
   - the gate covers buy, send, share, publish, delete and system changes;
   - On hold, with reminders at 4 h, 24 h and 1 h;
   - archive, never delete;
   - plan first, one question at a time;
   - no GitHub for logs or storage;
   - encrypted Drive backups, plus **the 2 Hafiz archive rules** (unencrypted Drive copies allowed; password held only by Fadel);
   - house rules;
   - spend default "every paid job".
8. **Design loop:**
   - The critic is read-only, with a 6-item 0–4 rubric. It stops if the total rises by less than 1 point. At the 3-round cap it **stops and escalates to Fadel with a findings summary**, and open P0/P1 defects block.
   - WCAG 2.2 AA is an explicit floor.
   - New `tools/pre-handoff-check.mjs` and an evidence bundle.
   - Variants are private and Fadel picks.
   - **The generic process (Step 0 plus Steps 1–8) from Codex pack Rev 7 §15 was added as `proto-process`.**
9. **Skill text conflicts:**
   - frontend-design: no memory use, no invented copy, desktop only, critic split out.
   - impeccable: not for DESIGN.md.
   - The precedence line is now in **all 7 skills**.
   - `npx lighthouse` and `npm -g` were replaced. Reduced motion is now `none` (was 0.01ms).
10. **Example project:** the review-pack copy of the rules gains no home FAQ, the current step (wireframe, Step 4), and the 3-way UNDP conflict with the stricter gate until F2. The docs draft in `docs/projects/` wasn't edited (out of scope). settings.md, AGENTS.md, DESIGN.md and the inventory weren't created (they need E2 and Fadel).
11. **Converter and supply chain:**
    - The converter was rewritten: arrays, null, numbers, $type, input checks; 5 cases tested.
    - `yaml` 2.9.1 is a direct, exact dependency. The new lockfile sha256 is 55a645b1…7928710.
    - `MANIFEST.sha256` covers 87 files, and `verify-manifest.sh` was tested against a tamper.
    - Full SHAs are in §3.
    - The playwright 1.64.1 bump is **not done** (waiting on Amin).

## Self re-review against every finding
| # | Finding | Status | Evidence |
|---|---|---|---|
| P0-1 | impeccable live mode writes the repo | **Fixed** (in package) | The launcher refuses `live` (exit 4, tested). Live JS archived. The SKILL disables live and generate. All writes go only to design-output. |
| P0-2 | Pin not checked at run time; download fallback | **Fixed** (in package) | Tested offline: unset → 3, tampered → 5, good → runs. No fallback code. "Downloaded once" removed. The IMPECCABLE_BIN path is created only at install. |
| P0-3 | shadcn auto-runs npx at load | **Fixed** | `grep '!\`npx'` finds nothing in shadcn/SKILL.md. allowed-tools is Read. |
| P0 (Fadel 4) | Critic cap has no end state | **Fixed** | proto-build step 5 and §4.2: stop, then a summary to Fadel; open P0/P1 block. |
| P1-1 | Read-only is prompt-only | **Partly fixed** | Tool limits plus precheck script (tested). GitHub read-only token and main protection still open (J2). Host enforcement of allowed-tools is unverified. |
| P1-2 | Stitch key in argv; uploader unreviewed | **Fixed** | The uploader is disabled in SKILL and tool-schema. `grep -- '--api-key'` only hits the "disabled" notes. MCP plus env var. |
| P1-3 | Key scope, rotation and owner | **Open** | Needs Fadel or Amin (J3). |
| P1-4 | Only 1 artifact hashed; binary source | **Partly fixed** | Manifest of 87 files with a session-start check. The binary is still a release asset, not built from the pin (risk noted). |
| P1-5 | D1–D5 not applied; DC rules and bot names in proto | **Partly fixed** | Proposed files written and grep-clean. Live skills unchanged by instruction; applying them needs Fadel's yes. |
| P1-6 | Desktop only broken | **Fixed** (in package) | Escape clause removed in §2. Override in all 7 skills. generate-design, a11y and impeccable edits. |
| P1-7 | Merge chain; main protection | **Partly fixed** | Written in §7 and §8. Protection isn't configured (J2). |
| P1-8 | Gate partial; On hold, reminders, archive; impeccable hooks | **Fixed** (text) | §2 Gates and §7. Launcher refuses hooks, doctor and pin. Reminders are text only (no automation). |
| P1-9 | $2 spend cap vs the rule | **Partly fixed** | Default is now "every paid job"; Stitch needs confirmation. Whether any cap is allowed → Fadel (J1). |
| P1-10 | Critic metric, end state, WCAG level, evidence | **Fixed** (spec) / untested | Rubric 0–4, stop if under 1 point, AA floor, pre-handoff-check plus evidence.json (tested on mocks). The critic subagent has never run. |
| P1-11 | `generate` vs Fadel's pick; variants not private | **Fixed** | generate disabled. Variants stay in private design-output/variants. Fadel picks. |
| P1-12 | Project rules override accessibility | **Fixed, needs confirmation** | AA floor in §2, §5 and every skill. Fadel's stated order is kept otherwise (J4). |
| P1-13 | frontend-design invents copy and uses memory; impeccable writes DESIGN.md | **Fixed** | frontend-design edits; impeccable `document` refused by the launcher and the SKILL. |
| P1-14 | Lookup order stops every task; settings name | **Fixed** | Optional files are noted as gaps and the task continues. One name: settings.md. |
| P1-15 | Example rules: FAQ, UNDP, grayscale phase | **Partly fixed** | Pack copy updated; docs draft unedited. F2 still open. |
| P1-16 | Bot Tasks rule; RTL, keyboard and focus checks | **Partly fixed** | Bot Tasks in §2 and proto-build. Focus visible and obscured checks are automated. RTL, keyboard trap, 2.5.7 and 3.3.8 are still open. |
| P2 | Converter bugs | **Fixed** | 5 cases (array, null, number, $type, bad input) plus a real build of 22 variables. |
| P2 | yaml transitive | **Fixed** | `npm ls`: yaml@2.9.1 direct. |
| P2 | shadcn 7 audit highs | **Fixed** | `npm audit`: 0. |
| P2 | Live server token and origins | **Fixed by removal** | Live mode disabled and its JS archived. |
| P2 | a11y unpinned npx and -g; 0.01ms | **Fixed** | Replaced. |
| P2 | Precedence missing in a11y and Stitch | **Fixed** | Present in all 7. |
| P2 | generate-design has no hunk | **Fixed** | New hunk in the diff. |
| P2 | Rule 11 (GitHub logs, encryption) | **Fixed** (text) | §2 and §7, plus the Hafiz archive exceptions. |
| P2 | Rule 12 plan first | **Fixed** (text) | §2, proto-setup and proto-build step 0. |
| P2 | Rule 16 house rules | **Fixed** (text) | §2 and §7. |
| P2 | Rule 6 low stars | **Open** | Fadel's A4. |
| P2 | playwright 1.64.1 | **Open** | Needs Amin. |
| P2 | design-tool stored twice; time-zone question | **Fixed** (proposed) | proto-setup: settings.md only; time zone from user settings. |
| P2 | Workflows and design-skills copies unreviewed | **Open** | proto-share, proto-codebase and proto-media aren't in the pack. |
| P2 | Motion handoff engineering lines | **Fixed** (text) | §8 motion notes. |
| P3 | Short or truncated pins | **Fixed** | Full SHAs in §3. |
| P3 | Header time | **Fixed** | The header gives round 0 at about 4:03 AM and round 1 at 4:37–4:42 AM. |
| P3 | Example DESIGN.md missing from pack | **Fixed** | `example-DESIGN.md`. |
| P3 | Spend widget value 0 undefined | **Fixed** | 0 = "ask for every paid job". |
| P3 | Star drift, HEAD moved, rename shown as delete plus add, asset budget | **Partly fixed** | Asset size budget mentioned in §8. The rest is accepted or noted. |
| — | "24 CSS variables" claim | **Corrected** | Both the old and new converters give 22. |

**Rules checklist after round 1** (my assessment; Amin and the panel should re-check):
- **Generic bot (rule 1):** Followed in the package; the live proto skills still need D1–D5.
- **Desktop only (rule 3):** Followed in the package.
- **Pinned, Amin reviews (rule 5):** Partly followed; Amin's review of round 1 and the binary source are still pending.
- **High-star only (rule 6):** Pending (A4).
- **Read-only and merge chain (rule 7):** Partly followed; the GitHub side isn't set up.
- **Written yes, On hold, reminders (rule 8):** Followed in text; reminders aren't automated.
- **Archive, never delete (rule 9):** Followed.
- **Secrets, GitHub logs, encrypted backups (rule 11):** Followed in text.
- **Plan first (rule 12):** Followed.
- **DC example rules (rule 15):** Partly followed (pack copy only).
- **House rules (rule 16):** Followed.
- **Rules 2, 4, 10, 13 and 14:** Unchanged; already Followed.

## Notes and gaps
- The source process in Codex pack Rev 7 §15 has **Steps 1–8 plus a "Scope and authority" section**, not 9 numbered steps. I numbered that section Step 0. Fadel should confirm (C5).
- The DC-specific step text (six owner corrections, Aidlane, eight-section home and so on) was kept out of `proto-process`. The current step (Step 4, wireframe) is recorded only in the example project's rules copy.
- Secret scan: gitleaks on the review pack (about 996 KB) and on the sandbox skills found no leaks (4:40 AM). A regex scan for common key formats also found nothing.
