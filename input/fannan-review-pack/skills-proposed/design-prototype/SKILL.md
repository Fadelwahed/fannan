---
name: design-prototype
description: >-
  Use for any idea, feature request, thread, or mock that should become a
  clickable desktop prototype: shapes it, explores variants, builds it in the
  project's design tool (or a standalone mock), checks it, and collects the link,
  screenshots, evidence and a short walkthrough.
---
Use for any idea or request that should become a clickable prototype. Follow design-process for which design step the project is at; do only what that step allows.

0. **Read-only precheck (mandatory, step 1 of this workflow):** run `/home/box/agent-data/workflows/fannan-tools/readonly-precheck.sh /workspace/design-output/<project>/ <project>`; if it refuses, stop. Run it again before every write.
1. Plan first: share a short plan (goal, screens, step, checks, cost) and wait for Fadel's yes. Add or update the task's row on the Bot Tasks board.
2. **Shape:** one-line goal, the screens, the click path. Desktop only until the project's approver approves the desktop design, per the brief.
3. **Explore:** 3–5 named variants on one dimension (layout, density, mood or motion), kept private in `/workspace/design-output/<project>/variants/`. **Fadel picks one.** Only the winner moves on.
4. **Implement:** read `design-tool:` from the project's `settings.md` and build there through that vendor skill. If the tool can't prototype, make a standalone HTML mock under `/workspace/design-output/<project>/builds/<slug>/`, using only the project's token variables. Write through `/home/box/agent-data/workflows/fannan-tools/safe-write.sh <project> <path>` (it runs the precheck). Ground it in ui-map.md, taste.md and the project's brief and project-rules.md. Copy comes from the project's writer; mark placeholders.
5. **See:** render, accessibility snapshot and screenshots at 1440 (then the project's other desktop widths).
6. **Critic:** a separate read-only reviewer (Read only, no edits) scores the design on a fixed rubric (hierarchy, spacing rhythm, type, colour roles, states, cliché list), each 0–4, and lists defects as P0–P3. The designer fixes; the critic re-scores. **Maximum 3 rounds.** Stop early if the total score rises by less than 1 point between rounds. **At the cap:** stop, do not keep polishing, and send Fadel a summary (scores per round, fixed defects, open defects with severity). Any open P0 or P1 blocks handoff until Fadel decides.
7. **Harden:** run `FANNAN_DEPS=/home/box/agent-data/fannan-deps node /home/box/agent-data/workflows/fannan-tools/pre-handoff-check.mjs <DESIGN.md> <page> <evidence-dir> <project>`: design.md lint 0 errors; axe-core with WCAG 2.2 AA tags and target-size on, 0 violations; custom WCAG 2.2 checks (focus not obscured, 24×24 targets, focus visible, reduced motion = no movement); impeccable detect (must run; findings advisory); the precheck on the evidence folder. WCAG 2.2 AA is a minimum no project rule can lower. Save the evidence bundle.
8. **Review:** collect the private share link, desktop screenshots of each step, the evidence bundle, the critic summary and a short walkthrough. Then follow design-share.
9. Ask Fadel before anything paid, every time (no spend cap; Fadel, Oct 15, 4:46 AM).

Never: open PRs, push, commit, or write inside any repo; publish or share publicly; launch coding agents; run impeccable live or generate.
Handoff is design-process Step 9: only with every required input present; if any is missing, list it, set the Bot Tasks row to Stuck or On hold and tell Fadel. Retention of variants and critic rounds follows Hafiz's archive rule.
