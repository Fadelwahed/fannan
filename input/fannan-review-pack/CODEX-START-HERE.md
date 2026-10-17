# Codex: start here
Last verified: Thu Oct 15, 2026, 8:14 AM Gaza time (UTC+3).

Skill names: this pack uses the proposed design-* names; see `RENAME-proto-to-design.md`. Live skills are still named proto-*.

**What Fannan is.** Fannan is Fadel's UI/UX design bot. It designs and never builds. It is generic: project facts (brand, claims, design tool, approver, engineer) live only in each project's `project-rules.md` and `settings.md`. Digital Cloud is the example project. Fannan follows an 8-step design process plus Step 9 (handoff to the engineer, Jabr). It has read-only repo access, and it asks before anything paid, with no spend cap. WCAG 2.2 AA is the minimum. Skills are pinned, reviewed by Amin, and need Fadel's yes. **Everything here is a proposal. The proposed skills are not live yet.**

## Reading order
0. **`FANNAN-FINAL-PLAN.md`: the final plan. Start here; it stands alone.** Round 5 (`fannan-panel-round5.md`) supersedes the open-findings list below, and its fixes are in §7 of the final plan.
1. `fannan-complete-for-review.md`: the full spec. §0 has the reviewer questions; §10 has known gaps.
2. `fannan-fixes-round1.md`, `fannan-fixes-round2.md`, `fannan-fixes-round3.md`: what changed, and the open items O1–O5. Then `fannan-panel-round3.md` and `fannan-panel-round4.md` (the latest review). `../fannan-full-plan.md` is outside the pack.
3. `live-skills-snapshot/`: the live skills today. `skills-proposed/` and `D1-D5.diff`: the proposed replacements.
4. `fannan-memory-live.md`: the bot's saved instructions.
5. `skills/`, `latest-local-patches.diff`, `PINNED.sha256`: the vendor skills and pins.
6. `tools/`, `designmd-to-sd.mjs`, `package.json`: the scripts and converter.
7. `example-DESIGN.md`, `example-project-digital-cloud-*.md`: the example project.

## Feedback wanted
- Any P0–P3 issues, each with file, section and quote: conflicts, gaps, fail-open paths in `tools/`, supply-chain risk, converter bugs, and project facts leaking into the generic bot.
- Does the 8+1-step process work as written? Is the critic loop (3 rounds maximum) sound?
- Your view on open items O1–O4.
- Untested so far: Stitch (no key yet), shadcn, the a11y audit run as an agent, and the Asad round-3 review (not run).

## Open findings as of round 4 (historical; see FANNAN-FINAL-PLAN.md §8 for the current list) (round 4: PASS WITH CONDITIONS; not ready to install; P0 0 · P1 5 · P2 8 · P3 9)
**Caveat: every reviewer seat in rounds 3 and 4 was Asad (one agent), so this is not an independent panel. The grok CLI second opinion returned no findings in either round.** None of these fixes has been applied.

The P1s and their proposed fixes:
- **R3-1.** `tools/pre-handoff-check.mjs:83` calls the impeccable binary directly, skipping the launcher's allowlist and sha check. Fix: call the launcher (`FANNAN_IMPECCABLE_LAUNCHER`) with a pinned `IMPECCABLE_BIN`, and FAIL the gate if the launcher is missing or exits 5.
- **R3-2.** Amin hasn't signed off on rounds 1 and 2. Fix: send Amin the pack and record his PASS or FAIL for each file in spec §10 item 1.
- **R3-3.** The spend cap is still live in 4 places: design-prototype step 5, design-media, memory save 8, and the spec quote. Fix: change each to "ask Fadel before anything paid, every time", plus a new D6 hunk for design-media. This needs Amin's review and Fadel's yes.
- **R3-4.** The GitHub read-only token and main protection are "approved, not done". Fix: a fine-grained read-only token (Contents: read, one repo, with only its name in settings.md), and Jabr's daily check recorded as a Bot Task.
- **R3-5.** `readonly-precheck.sh` doesn't require a project, and its callers leave it out (this also covers R4-1). Fix:
  - require exactly 2 arguments and refuse a project name containing `/`, `.` or `..`;
  - make `pre-handoff-check.mjs` pass the project;
  - make design-setup call the precheck with `<project>`;
  - add a `safe-write.sh` wrapper with O_NOFOLLOW/O_EXCL (advisory until tested).

The full list, with P2/P3 items and tests, is in `fannan-panel-round4.md`.
