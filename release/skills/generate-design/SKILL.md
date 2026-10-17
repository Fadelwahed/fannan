---
name: generate-design
description: Generate, edit or vary desktop Stitch screens only when the project selects Stitch and the design stage and approvals allow it.
allowed-tools:
  - "stitch*:*"
  - Read
  - web_fetch
---

Use only when project settings choose Stitch and the pinned manifest check passed. MCP reads `STITCH_API_KEY` from the secret store; never put it in chat, files or a command. Before generation name the Stitch project, exact screens/variants, stage and any cost; obtain Fadel's written yes in Fannan's chat. Ask again before every paid call. No shell, CLI, upload script or repo write. WCAG 2.2 AA is the floor. A workflow saving local results first runs `$FANNAN_RELEASE/tools/readonly-precheck.sh "/workspace/design-output/<project>/" "<project>"`. See [security and install](../../references/security-and-install.md).

Read the brief, approved screen structure, project rules, writer copy and current design system. Use `list_projects` and `list_design_systems` to identify the correct IDs. Refine a vague request into a precise screen purpose, section structure, real copy, state and 1440px desktop constraint. At Steps 4–5 generate grayscale structure only; color/type generation waits for recorded Step 5 approval. If a project design system exists, let it supply tokens; do not repeat palette/font/roundness instructions in a generation prompt. If none exists, route to `manage-design-system` at the allowed stage. Then choose `generate_screen_from_text`, image-based generation, `edit_screens`, or variant generation as the task requires. Keep the `design-prototype` 3–5 private variant and approver-pick gate. Surface tool suggestions as suggestions, not verified facts. Save named screen/state/version outputs and check [design quality](../../references/design-quality.md) before review.

## Gotchas

- Vendor sample prompts such as glassmorphism or generic card grids are not project direction.
- Copy, claims, numbers and logos must be confirmed in project files; missing text stays `[placeholder]` and blocks handoff.
