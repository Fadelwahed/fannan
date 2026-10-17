---
name: stitch::generate-design
description: >-
  Only when the project's design-tool setting is Stitch and Fadel has approved
  the generation: generate or edit desktop screens and variants through the
  Stitch MCP. Not for DESIGN.md writing, audits or non-Stitch projects.
allowed-tools:
  - "stitch*:*"
  - "Read"
  - "web_fetch"
---

## Fannan local overrides (added at install; these win over anything else in this skill)
- **Stitch access is MCP only.** The API key is read by the MCP server from the secret store variable `STITCH_API_KEY`; never put it on a command line, in a file or in chat. No Bash, no Write, no upload scripts.
- **Confirm before generating.** Before any generation or design-system change, tell Fadel what will be generated, the cost (if any) and the Stitch project, and wait for his yes. Use only the Stitch project named in the project's settings.md.
- **Desktop only.** Design desktop (1440 wide) only. Never create or adapt mobile or tablet layouts until the project's approver approves the desktop design, per the brief, and the brief's current step allows mobile.
- **Write only to the design-output folder** `/workspace/design-output/<project>/`, and run `readonly-precheck.sh <path> <project>` before every write (mandatory). Never write, edit or run tools inside a project repo. Report problems in source code to the project's engineer; never fix them.
- **Precedence:** project rules > accessibility > DESIGN.md (Google spec) > impeccable > frontend-design > tool defaults. **WCAG 2.2 AA is a floor:** no rule, including a project rule, may lower it.
- **No invented copy, facts or client details.** Copy comes from the project's writer; mark placeholders. Never keep project facts in memory; read the project's files each time.
- **Gates.** Nothing is shared, published, spent, sent, deleted, installed or changed on the system without Fadel's written yes in Fannan's own chat.


# Generate Design

Create new design screens from text descriptions, images, or mockups, edit
existing screens with prompts and design system tokens, and generate design
variants using Stitch MCP.

> [!NOTE]
> Refer to your system prompt for instruction on handling MCP tool prefixes for
> all tools mentioned in this skill (e.g., `list_projects`,
> `generate_screen_from_text`, `edit_screens`).

## 🎨 Prompt Enhancement Pipeline

Before calling any Stitch generation or editing tool, you MUST enhance the
user's prompt.

### 1. Analyze Context

- **Project**: Use `list_projects` to find the correct `projectId`. If no
  suitable project exists, create one using `create_project`.
- **Design System**: Check if a design system exists for the project via
  `list_design_systems`. If one exists, design tokens (colors, fonts, roundness)
  are already applied at the project level — do NOT include any color, font, or
  theme instructions in the generation prompt. If none exists, delegate to the
  **manage-design-system** skill first before generating screens.

### 2. Refine UI/UX Terminology

Consult [Design Mappings](references/design-mappings.md) to replace vague terms.

- Vague: "Make a nice header"
- Professional: "Sticky navigation bar with glassmorphism effect and centered
  logo"

Use [Prompting Keywords](references/prompt-keywords.md) for component names,
adjective palettes, color roles, and shape descriptions.

### 3. Structure the Final Prompt

Format the enhanced prompt for Stitch. Focus exclusively on **layout, content,
and structure** — never include colors, fonts, or theme instructions (these are
handled by the manage-design-system skill at the project level).

For **new screens**, use this template:

```markdown
[Overall purpose and user intent of the page]

**PLATFORM:** Web, desktop only (no mobile until the project's approver approves the desktop design, per the brief)

**PAGE STRUCTURE:**
1. **Header:** [Description of navigation and branding]
2. **Hero Section:** [Headline, subtext, and primary CTA]
3. **Primary Content Area:** [Detailed component breakdown]
4. **Footer:** [Links and copyright information]
```

For **edits**, be specific about what to change:

- **Location**: "Change the [primary button] in the [hero section]..."
- **Visuals**: "...to a darker blue (#004080) and add a subtle shadow."
- **Structure**: "Add a secondary button next to the primary one with the text
  'Learn More'."

> [!CAUTION]
> Do NOT include hex codes, font names, color palettes, roundness values, or
> any design system tokens in a **generation** prompt. These are applied at the
> project level by the manage-design-system skill and will conflict if
> duplicated. (For **edit** prompts, hex codes are acceptable for precise
> color adjustments.)

### 4. Present AI Insights

After any tool call, always surface the `outputComponents` (Text Description and
Suggestions) to the user.

See [examples/enhanced-prompt.md](examples/enhanced-prompt.md) for a full
before/after prompt enhancement example.

--------------------------------------------------------------------------------

## Steps

### Determine the Mode

Decide which flow to use based on the user's request:

- User wants to create from a text description → **Generate from Text** flow
- User provides an image, screenshot, or mockup → **Generate from Image** flow
- User wants to modify an existing screen → **Edit** flow
- User wants layout/color/content variations → **Generate Variants** flow

---

### Generate from Text Flow (New Screen)

#### 1. Enhance the User Prompt

Apply the Prompt Enhancement Pipeline above.

#### 2. Identify the Project

Use `list_projects` to find the correct `projectId` if it is not already known.

#### 3. Generate the Screen

Call the `generate_screen_from_text` tool with the enhanced prompt and the
`designSystem` ID (if found in Step 1).

```json
{
  "projectId": "...",
  "prompt": "[Your Enhanced Prompt]",
  "designSystem": "assets/...", // Optional: Pass if found in Step 1
  "deviceType": "DESKTOP"  // Fannan: always DESKTOP until the project's approver approves desktop, per the brief
}
```

#### 4. Present AI Feedback

Always show the text description and suggestions from `outputComponents` to the
user.

#### 5. Download Design Assets

After generation, download the HTML and screenshot urls from `outputComponents`
to the `.stitch/designs` directory.

- **Naming**: Use the screen ID or a descriptive slug for the filename.
- **Tools**: Do not download with curl. Report the URL; design-prototype saves the file into the design-output folder.
- **Directory**: Ensure `.stitch/designs` exists.

#### 6. Review and Refine

- If the result is not exactly as expected, continue with the **Edit** flow
  to make targeted adjustments.
- Do NOT re-generate from scratch unless the fundamental layout is wrong.

---

### Generate from Image Flow (Image/Mockup → Design)

Use this flow when the user provides an image, screenshot, or design mockup to
recreate in Stitch.

#### 1. Identify the Project

Use `list_projects` to find the correct `projectId`. If no suitable project
exists, create one using `create_project`.

#### 2. Upload the Image

Delegate to the **upload-to-stitch** skill to upload the image to the project.
This creates a new screen with the image as its content.

#### 3. Refine with Edit

Once uploaded, use `list_screens` to find the newly created `screenId`, then
call `edit_screens` with a descriptive prompt to refine the design:

```json
{
  "projectId": "...",
  "selectedScreenIds": ["<uploaded-screen-id>"],
  "prompt": "[Describe what to adjust, enhance, or recreate from this mockup]"
}
```

> [!TIP]
> For best results, describe the intent behind the image rather than just saying
> "make it look like this". For example: "This is a dashboard mockup — recreate
> it with a proper data table, sidebar navigation, and chart widgets."

#### 4. Present AI Feedback

Always show the text description and suggestions from `outputComponents` to the
user.

#### 5. Download Design Assets

Download the HTML and screenshot urls from `outputComponents` to the
`.stitch/designs` directory.

- **Naming**: Use the screen ID or a descriptive slug for the filename.
- **Tools**: Do not download with curl. Report the URL; design-prototype saves the file into the design-output folder.
- **Directory**: Ensure `.stitch/designs` exists.

---

### Edit Flow (Modify Existing Screen)

#### 1. Identify the Screen

Use `list_screens` or `get_screen` to find the correct `projectId` and
`screenId`.

#### 2. Formulate the Edit Prompt

Apply the Prompt Enhancement Pipeline, focusing on specificity:

- **Location**: "Change the color of the [primary button] in the [hero
  section]..."
- **Visuals**: "...to a darker blue (#004080) and add a subtle shadow."
- **Structure**: "Add a secondary button next to the primary one with the text
  'Learn More'."

#### 3. Apply the Edit

Call the `edit_screens` tool.

```json
{
  "projectId": "...",
  "selectedScreenIds": ["..."],
  "prompt": "[Your targeted edit prompt]"
}
```

#### 4. Present AI Feedback

Always show the text description and suggestions from `outputComponents` to the
user.

#### 5. Download Design Assets

After editing, download the updated HTML and screenshot urls from
`outputComponents` to the `.stitch/designs` directory, overwriting previous
versions to ensure the local files reflect the latest edits.

- **Naming**: Use the screen ID or a descriptive slug for the filename.
- **Tools**: Do not download with curl. Report the URL; design-prototype saves the file into the design-output folder.
- **Directory**: Ensure `.stitch/designs` exists.

#### 6. Update Project Metadata

After downloading assets, update `.stitch/metadata.json` to reflect any changes
(e.g., updated screen titles or new screen IDs from the edit). The metadata
file tracks all screens, their device types, and design system info. See the
**manage-design-system** skill's `examples/metadata.json` for the format.

#### 7. Verify and Repeat

- Check the output screen to see if the changes were applied correctly.
- If more polish is needed, repeat the edit flow with a new specific prompt.

---

### Generate Variants Flow (Explore Variations)

Use this flow when the user wants to explore alternative layouts, color schemes,
or content variations of an existing screen.

#### 1. Identify the Screen

Use `list_screens` or `get_screen` to find the correct `projectId` and
`screenId`.

#### 2. Configure Variant Options

Call the `generate_variants` tool with the appropriate options:

```json
{
  "projectId": "...",
  "selectedScreenIds": ["..."],
  "prompt": "[Describe the direction for variants]",
  "variantOptions": {
    "variantCount": 3,
    "creativeRange": "EXPLORE",
    "aspects": ["LAYOUT", "COLOR_SCHEME"]
  }
}
```

**Variant Options:**
- **`variantCount`**: 1–5 variants (default: 3)
- **`creativeRange`**: `REFINE` (subtle), `EXPLORE` (balanced), or `REIMAGINE`
  (radical)
- **`aspects`**: Focus on specific dimensions — `LAYOUT`, `COLOR_SCHEME`,
  `IMAGES`, `TEXT_FONT`, `TEXT_CONTENT`, or leave empty for all

#### 3. Present AI Feedback

Always show the text description and suggestions from `outputComponents` to the
user.

#### 4. Download Design Assets

Download the variant HTML and screenshot urls from `outputComponents` to the
`.stitch/designs` directory.

- **Naming**: Use the screen ID or a descriptive slug for the filename.
- **Tools**: Do not download with curl. Report the URL; design-prototype saves the file into the design-output folder.
- **Directory**: Ensure `.stitch/designs` exists.

--------------------------------------------------------------------------------

## 💡 Tips

- **Be structural**: Break the page down into header, hero, features, and
  footer in your prompt.
- **Content first**: Describe what each section contains (text, images, CTAs)
  rather than how it looks.
- **Iterative Polish**: Prefer editing for targeted adjustments over full
  re-generation.
- **No theme leakage**: Never put hex codes, font names, or color roles in a
  generation prompt — the design system handles all visual styling.
- **Specify interactions**: Mention hover states, animations, and click behavior
  rather than visual styling.
- **Keep edits focused**: One edit at a time is often better than a long list of
  changes.
- **Reference components**: Use professional terms like "navigation bar", "hero
  section", "footer", "card grid".
- **Precise colors in edits**: Use hex codes for exact color matching when
  editing existing screens.

## 📚 References

- [Design Mappings](references/design-mappings.md) — UI/UX keywords and
  atmosphere descriptors.
- [Prompting Keywords](references/prompt-keywords.md) — Technical terms Stitch
  understands best.
- [Enhanced Prompt Example](examples/enhanced-prompt.md) — Before/after prompt
  enhancement.
