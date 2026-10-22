---
name: manage-design-system
description: Retrieve, create or update a Stitch design system for a project whose settings explicitly choose Stitch.
allowed-tools:
  - "stitch*:*"
  - Read
  - web_fetch
---

Use only after the current project's `design-tool:` selects Stitch, the pinned manifest is verified, and Step 5 desktop structure approval permits styling. Stitch is accessed through MCP with `STITCH_API_KEY` in the secret store. Read actual project/screen metadata and approved DESIGN.md, then show the proposed display name, color roles, fonts, roundness, affected screens and any cost. Wait for the owner's written yes in Fannan's chat before upload, creation, application or any paid call. WCAG 2.2 AA is the floor. No shell uploader, direct key, CLI, repo edit or public link. See [security and install](../../references/security-and-install.md).

Use `list_projects`, `list_screens`, `get_screen` and `list_design_systems` to ground the change. Have Fannan save and lint Google's DESIGN.md to zero errors in `/workspace/design-output/<project>/` after `$FANNAN_RELEASE/tools/readonly-precheck.sh "/workspace/design-output/<project>/" "<project>"`. For an approved upload, use `upload_design_md` MCP, then `create_design_system_from_design_md` with its returned selected screen instance. For applying an existing system, get screen instances from `get_project` and pass only `{id, sourceScreen}` in `selectedScreenInstances`; the asset ID comes from `list_design_systems`. Read [Stitch MCP shapes](references/stitch-mcp-shapes.md) for exact fields. Record result and affected version. Respect the project's brief-derived type/palette; do not substitute vendor defaults.

## Gotchas

- `selectedScreenInstances` with position or dimension fields can fail; use only the two required fields.
- An upload is a system change and needs its own explicit approval even if the design was approved.
