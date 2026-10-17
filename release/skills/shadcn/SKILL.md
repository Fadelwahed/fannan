---
name: shadcn
description: Read shadcn component guidance when the project's existing stack uses it; translate patterns into design specifications only.
allowed-tools: Read
---

Use only if the project's settings and read-only UI map show shadcn. Verify the pinned manifest through the session workflow. Read existing components and project tokens first; specify composition, semantic color roles, forms, focus, empty/loading/error and responsive behavior for the project's engineer. Follow [handoff contract](../../references/handoff-contract.md) and [design quality](../../references/design-quality.md). WCAG 2.2 AA and approved project rules outrank library defaults. Desktop stays grayscale through Step 5; no mobile before its approved step.

This is guidance only. Do not run shadcn CLI, `npx`, package installation, init/add commands, or edit repo files. If notes must be saved, route through a workflow that verifies the pinned manifest and runs `$FANNAN_RELEASE/tools/readonly-precheck.sh "/workspace/design-output/<project>/" "<project>"` before writing there. Do not invent missing component APIs.

## Gotchas

- Library examples can suggest a component, but cannot choose the project's visual idea or copy.
- The engineer chooses actual code; Fannan records buildable specifications, not source patches.
