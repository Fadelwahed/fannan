---
name: design-prototype
description: Turn a brief-backed screen idea into a reviewed clickable design prototype within the project's current design stage.
---

Read `design-process`, the current brief step, project settings/rules, copy and UI map. Verify the pinned manifest at session start. Before each write run `"$FANNAN_RELEASE/tools/readonly-precheck.sh" "/workspace/design-output/<project>/" "<project>"`; use the reviewed safe-write path. Stop if either check fails. Work only in the project's design tool or standalone mocks under `/workspace/design-output/<project>/`; never edit code in the repo. Ask Fadel before anything paid, every time. See [security and install](../../references/security-and-install.md).

1. **Plan:** state the goal, screens, current step, evidence, checks and any cost; obtain the project's approver's yes for the plan and record the task. Under the existing authority record this role resolves to Fadel; a different or missing mapping blocks the gate.
2. **Shape:** map one click path and each section to a brief line. Use the writer's real copy before layout; show missing text as `[placeholder]` with owner.
3. **Explore:** make 3–5 named, private variants along a clear design dimension. The approver chooses one; only that variant proceeds.
4. **Implement:** use `design-canvas` and the configured tool; if it cannot prototype, produce a standalone HTML mock in the allowed output folder. Respect grayscale through Step 5, desktop first and every text length/language/direction requirement. The prototype is reference only.
5. **See:** capture rendered 1440px frames, interaction states and accessibility evidence. Do not crop longer copy. At the end of Step 4, before the existing Step 5 grayscale structure signoff, run `FANNAN_DEPS=... node "$FANNAN_RELEASE/tools/pre-handoff-check.mjs" <DESIGN.md> <page.html> <evidence-dir> <project> <handoff.json> --phase=wireframe` for the full desktop set; it informs that gate rather than creating a new one.
6. **Critic:** a separate read-only reviewer scores copy and design together using [critic rubric](../../references/critic-rubric.md) and real references. Fix and rescore at most three rounds. Stop if a round gains <1 total point. A cap or stalled score is never a soft pass; send the scores and open defects to the approver. Any P0/P1 blocks handoff.
7. **Harden:** before Step 9 run `FANNAN_DEPS=... node "$FANNAN_RELEASE/tools/pre-handoff-check.mjs" <DESIGN.md> <page.html> <evidence-dir> <project> <handoff.json> --phase=handoff`. Require PASS evidence and complete [handoff contract](../../references/handoff-contract.md). WCAG 2.2 AA is the minimum.
8. **Review/share:** collect versioned private link, screens/states, evidence, critic history and walkthrough; use `design-share`. No public sharing without Fadel's yes.

## Gotchas

- A plan approval, variant pick and final design approval are separate records. Do not infer one from another.
- Missing copy/facts, manual accessibility checks or open questions block Step 9 even if automated checks pass.
