---
name: stitch::manage-design-system
description: >-
  Manage design systems in Stitch using MCP tools. Includes retrieval of assets,
  creating/updating design systems in Stitch, and applying them to screens.
allowed-tools:
  - "stitch*:*"
  - "Read"
  - "web_fetch"
---

## Fannan local overrides (added at install; these win over anything else in this skill)
- **Stitch access is MCP only.** The API key is read by the MCP server from the secret store variable `STITCH_API_KEY`; never put it on a command line, in a file or in chat. No Bash, no Write, no upload scripts.
- **Who writes DESIGN.md:** this skill returns text only. Fannan writes the file itself to `/workspace/design-output/<project>/DESIGN.md` (after `readonly-precheck.sh`), converts it to the Google spec and runs `design.md lint` (0 errors) before use.
- **Confirm before generating.** Before any generation or design-system change, tell Fadel what will be generated, the cost (if any) and the Stitch project, and wait for his yes. Use only the Stitch project named in the project's settings.md.
- **Desktop only.** Design desktop (1440 wide) only. Never create or adapt mobile or tablet layouts until the project's approver approves the desktop design, per the brief, and the brief's current step allows mobile.
- **Write only to the design-output folder** `/workspace/design-output/<project>/`, and run `readonly-precheck.sh <path> <project>` before every write (mandatory). Never write, edit or run tools inside a project repo. Report problems in source code to the project's engineer; never fix them.
- **Precedence:** project rules > accessibility > DESIGN.md (Google spec) > impeccable > frontend-design > tool defaults. **WCAG 2.2 AA is a floor:** no rule, including a project rule, may lower it.
- **No invented copy, facts or client details.** Copy comes from the project's writer; mark placeholders. Never keep project facts in memory; read the project's files each time.
- **Gates.** Nothing is shared, published, spent, sent, deleted, installed or changed on the system without Fadel's written yes in Fannan's own chat.


# Design-System

Create a "source of truth" for your project's design language to ensure
consistency across all future screens.

> [!NOTE]
> Refer to your system prompt for instruction on handling MCP tool prefixes for
> all tools mentioned in this skill (e.g., `get_screen`,
> `create_design_system_from_design_md`, `apply_design_system`).

## 📥 Retrieval

To analyze a Stitch project, you must retrieve metadata and assets using the
Stitch MCP tools:

1. **Project lookup**: Use `list_projects` to find the target `projectId`.
2. **Screen lookup**: Use `list_screens` for that `projectId` to find
   representative screens (e.g., "Home", "Main Dashboard").
3. **Metadata fetch**: Call `get_screen` for the target screen to get
   `screenshot.downloadUrl` and `htmlCode.downloadUrl`.
4. **Asset download**: Use `read_url_content` to fetch the HTML code.

## 🧠 Synthesis from Description

If you need to extract a design system from existing screens, use the `stitch-design-md` skill (Google DESIGN.md spec format).

If there are no existing screens (new project), or the user provides a direct description (e.g., "dark theme, blue and purple, rounded, Inter font"):

1. Map the user's vague terms to precise values using the design mappings (see `stitch-design-md` skill or `generate-design` skill).
2. Select concrete hex codes, font families, and roundness values.
3. Generate the `DESIGN.md` file (refer to the `stitch-design-md` skill for structure).
4. Proceed to the "Create or Update Design System in Stitch" step below.

## 📝 Output Structure

The `DESIGN.md` file should follow the structure defined in the `stitch-design-md` skill (Google DESIGN.md spec format).

## 🚀 Create or Update Design System in Stitch

After generating `.stitch/DESIGN.md`, make sure to also create or update the
design system in Stitch.

**Two-step design system creation:**

> [!WARNING]
> **Checkpoint — User Confirmation Required.**
> Before uploading, you **MUST** pause and ask the user for
> confirmation. Present a summary of the design system you are about to create
> (display name, key colors, fonts, and roundness) and wait for explicit approval
> before proceeding. Do **NOT** upload until the user confirms.

1. **Upload `DESIGN.md`**:
   - **Option A (uploader script): disabled for Fannan.** It needs Bash, puts the API key on the command line, and hasn't been reviewed by Amin.
   - **Option B (Direct MCP Tool)**: If the `DESIGN.md` is small (under ~5KB), you can call the `upload_design_md` MCP tool directly, passing the base64-encoded design markdown content as `designMdBase64`.
2. **Create Design System**: Call the `create_design_system_from_design_md` tool immediately after the upload, passing the `projectId` and the `selectedScreenInstance` (containing the `id` and `sourceScreen` returned from the upload step).

Once the `upload_design_md` MCP call and `create_design_system_from_design_md` have both completed,
Stitch holds the design tokens at the project level — you do NOT need to repeat
them in generation prompts.

## 🎨 Apply Design System to Screens

Use `apply_design_system` to apply a design system to existing screens.

> [!IMPORTANT]
> `selectedScreenInstances` must contain **only** `id` and `sourceScreen` — do
> NOT include position/dimension fields (`x`, `y`, `width`, `height`) or the
> request will fail with "invalid argument". Get the screen instance IDs from
> `get_project`.

```json
{
  "projectId": "...",
  "assetId": "...",
  "selectedScreenInstances": [
    {
      "id": "...",
      "sourceScreen": "projects/.../screens/..."
    }
  ]
}
```

**How to get the required IDs:**
1. Call `get_project` to retrieve `screenInstances` — each has an `id` and
   `sourceScreen`.
2. Call `list_design_systems` to retrieve the design system `name` (format:
   `assets/{assetId}`) — use the part after `assets/` as the `assetId`.
3. Filter out any instances with `type: "DESIGN_SYSTEM_INSTANCE"` — only pass
   real screens.

## 📋 Update Project Metadata

After writing `.stitch/DESIGN.md`, also create or update `.stitch/metadata.json`
to track the `projectId`, `title`, all known screens, and design system summary.
See [examples/metadata.json](examples/metadata.json) for the format.

## Schema Reference

See [reference/tool-schema.md](reference/tool-schema.md) for the full
`designSystem` object schema with all available options.

## 💡 Best Practices

Refer to the `stitch-design-md` skill (Google DESIGN.md spec format) for best practices on describing design elements.
