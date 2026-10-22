---
name: stitch-design-md
description: Extract a Google-spec DESIGN.md proposal from an existing Stitch project selected in project settings.
allowed-tools:
  - "stitch*:*"
  - Read
  - web_fetch
---

Use only when `design-tool:` in project settings is Stitch and the session's pinned manifest check passed. Stitch access is MCP only; `STITCH_API_KEY` stays in the secret store. No shell upload script, CLI, direct API key, public upload or repo write. WCAG 2.2 AA is the floor. Before Fannan saves output, run `"$FANNAN_RELEASE/tools/readonly-precheck.sh" "/workspace/design-output/<project>/" "<project>"` through the approved workflow. See [security and install](../../references/security-and-install.md).

Discover the MCP namespace; identify the project from settings, list screens, fetch `get_screen`/`get_project` metadata and permitted HTML/screenshot assets. Extract actual color roles and hex values, typography, spacing/grid, geometry, depth, components and usage constraints. Trace the design system to the brief and approved stage. Return DESIGN.md text using Google's YAML token frontmatter and canonical sections; Fannan writes it in the output folder and runs `design.md lint` to zero errors. At Steps 4–5 keep only grayscale structure; no color/type application before Step 5 approval. Missing facts stay explicit; never infer a palette from a generic template.

## Gotchas

- A Stitch screen may contain default styling or AI copy. Treat it as evidence to inspect, not authority for project tokens or claims.
- This skill extracts text; design-system upload/change belongs to `manage-design-system` and needs the owner's yes.
- Units: every spacing, rounded, breakpoint and component size token carries `px`, `rem` or `em` (component sizes: `rounded`, `padding*`, `margin*`, `gap`, `rowGap`, `columnGap`, `inset*`, `size`, `width`, `height`, `min/maxWidth`, `min/maxHeight`); only `0` may be bare. `designmd-to-sd` refuses a bare nonzero number with `units required`.
- A component's `typography` may reference a whole typography group, `"{typography.<name>}"`, as the design.md spec allows; Fannan expands it per property. Composite references anywhere else are refused.
