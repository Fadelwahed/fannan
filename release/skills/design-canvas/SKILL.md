---
name: design-canvas
description: Draw or review screens in the design tool named by the project's settings, preserving the current design stage and buildable states.
---

Read the brief, `settings.md`, `project-rules.md`, ui-map, writer copy and current step. Verify the pinned manifest at session start; before every write run `"$FANNAN_RELEASE/tools/readonly-precheck.sh" "/workspace/design-output/<project>/" "<project>"`. See [security and install](../../references/security-and-install.md). Use only `design-tool:` from settings and its vendor skill; if unavailable, record the connection blocker. Never edit source code.

At Steps 4–5 draw 1440px **grayscale structure only**; wait for the recorded Step 5 approval before color/type styling. At Step 6 trace the single visual idea to brief lines, use [design quality](../../references/design-quality.md), and name frames `<screen>/<state>/<version>`. Show default, hover, focus, disabled, empty, loading and error states. The seven baseline states are a minimum. Derive additional reachable states from actual interactions, including success/completion, selected/checked, expanded/collapsed, validation and read-only where applicable. Specify triggers, appearance, approved copy, semantics, announcements, keyboard/focus behavior and reference evidence. Success communicates the confirmed outcome and next action. The interaction critique fails when a reachable state or transition is unspecified. For every form, specify labels, required/optional indicators, accepted formats, help, validation timing, inline/summary errors, failure focus, input preservation and correction steps. Define submitting, success, failure, retry and duplicate-submission behavior. For consequential actions, specify cancellation, confirmation or undo as appropriate, plus unsaved-change behavior. Each applicable behavior requires approved interface copy and a task-level acceptance check; justify N/A. See the [handoff contract](../../references/handoff-contract.md). Also document language, direction, long-copy reflow and motion fallback. Preserve meaningful content and source-backed claims. In review mode, list evidence-backed copy, craft and WCAG 2.2 AA issues without altering source.

## Gotchas

- A vendor template or default palette never overrides the project's brief, approved wireframes or accessibility floor.
- External sharing, generation with cost, or a design-system mutation needs Fadel's yes in Fannan's chat.
