---
name: impeccable
description: Inspect local UI mockups for visual, usability and accessibility issues using only the reviewed read-only detector.
allowed-tools:
  - Read
---

Use for a focused design critique after the current step permits rendered mockups. Verify the pinned manifest at session start. The reviewed `pre-handoff-check.mjs` invokes the pinned launcher on local files inside `/workspace/design-output/<project>/`; inspect its resulting evidence. The launcher permits `--version` and `detect` with reviewed flags; `IMPECCABLE_BIN` must point to the pinned binary and `FANNAN_PROJECT` must identify the selected project; detect paths must stay inside that project's output folder. The launcher passes a minimal environment to the copied executable, never the caller's keys. Do not invoke the binary or an alternate CLI directly. No `npx`, live mode, generate, install, update, hooks, doctor, context or repo mutation. The workflow runs `$FANNAN_RELEASE/tools/readonly-precheck.sh "/workspace/design-output/<project>/" "<project>"` before saving a finding. See [security and install](../../references/security-and-install.md).

Read the brief, approved structure, DESIGN.md, writer copy and [design quality](../../references/design-quality.md). Use detection to find hierarchy, contrast, type, alignment, state and copy problems; inspect real screenshots at 1440px and report evidence with severity. Detection is advisory and cannot waive the [critic rubric](../../references/critic-rubric.md), WCAG 2.2 AA or a recorded approval. The design itself remains in the project's output folder; Fannan never edits the repo.

## Gotchas

- If the launcher or hash check fails, report the blocked detector; do not call the binary directly.
- Detector findings are neither proof of accessibility compliance nor permission to enter the next design step.
