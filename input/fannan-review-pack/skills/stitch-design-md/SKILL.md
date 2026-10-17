---
name: stitch-design-md
description: Only for extracting a DESIGN.md from an existing Stitch project. Output must follow the Google DESIGN.md spec (YAML token frontmatter + canonical sections) and pass `design.md lint` with 0 errors.
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


# Stitch DESIGN.md Skill

You are an expert Design Systems Lead. Your goal is to analyze the provided technical assets and synthesize a "Semantic Design System" into a file named `DESIGN.md`.

## Overview

This skill helps you create `DESIGN.md` files that serve as the "source of truth" for prompting Stitch to generate new screens that align perfectly with existing design language. Stitch interprets design through "Visual Descriptions" supported by specific color values.

## Prerequisites

- Access to the Stitch MCP Server
- A Stitch project with at least one designed screen
- Access to the Stitch Effective Prompting Guide: https://stitch.withgoogle.com/docs/learn/prompting/

## The Goal

The `DESIGN.md` file will serve as the "source of truth" for prompting Stitch to generate new screens that align perfectly with the existing design language. Stitch interprets design through "Visual Descriptions" supported by specific color values.

## Retrieval and Networking

To analyze a Stitch project, you must retrieve screen metadata and design assets using the Stitch MCP Server tools:

1. **Namespace discovery**: Run `list_tools` to find the Stitch MCP prefix. Use this prefix (e.g., `mcp_stitch:`) for all subsequent calls.

2. **Project lookup** (if Project ID is not provided):
   - Call `[prefix]:list_projects` with `filter: "view=owned"` to retrieve all user projects
   - Identify the target project by title or URL pattern
   - Extract the Project ID from the `name` field (e.g., `projects/13534454087919359824`)

3. **Screen lookup** (if Screen ID is not provided):
   - Call `[prefix]:list_screens` with the `projectId` (just the numeric ID, not the full path)
   - Review screen titles to identify the target screen (e.g., "Home", "Landing Page")
   - Extract the Screen ID from the screen's `name` field

4. **Metadata fetch**: 
   - Call `[prefix]:get_screen` with both `projectId` and `screenId` (both as numeric IDs only)
   - This returns the complete screen object including:
     - `screenshot.downloadUrl` - Visual reference of the design
     - `htmlCode.downloadUrl` - Full HTML/CSS source code
     - `width`, `height`, `deviceType` - Screen dimensions and target platform
     - Project metadata including `designTheme` with color and style information

5. **Asset download**:
   - Use `web_fetch` or `read_url_content` to download the HTML code from `htmlCode.downloadUrl`
   - Optionally download the screenshot from `screenshot.downloadUrl` for visual reference
   - Parse the HTML to extract Tailwind classes, custom CSS, and component patterns

6. **Project metadata extraction**:
   - Call `[prefix]:get_project` with the project `name` (full path: `projects/{id}`) to get:
     - `designTheme` object with color mode, fonts, roundness, custom colors
     - Project-level design guidelines and descriptions
     - Device type preferences and layout principles

## Analysis & Synthesis Instructions

### 1. Extract Project Identity (JSON)
- Locate the Project Title
- Locate the specific Project ID (e.g., from the `name` field in the JSON)

### 2. Define the Atmosphere (Image/HTML)
Evaluate the screenshot and HTML structure to capture the overall "vibe." Use evocative adjectives to describe the mood (e.g., "Airy," "Dense," "Minimalist," "Utilitarian").

### 3. Map the Color Palette (Tailwind Config/JSON)
Identify the key colors in the system. For each color, provide:
- A descriptive, natural language name that conveys its character (e.g., "Deep Muted Teal-Navy")
- The specific hex code in parentheses for precision (e.g., "#294056")
- Its specific functional role (e.g., "Used for primary actions")

### 4. Translate Geometry & Shape (CSS/Tailwind)
Convert technical `border-radius` and layout values into physical descriptions:
- Describe `rounded-full` as "Pill-shaped"
- Describe `rounded-lg` as "Subtly rounded corners"
- Describe `rounded-none` as "Sharp, squared-off edges"

### 5. Describe Depth & Elevation
Explain how the UI handles layers. Describe the presence and quality of shadows (e.g., "Flat," "Whisper-soft diffused shadows," or "Heavy, high-contrast drop shadows").

## Output Guidelines

- **Language:** Use descriptive design terminology and natural language exclusively
- **Format:** Generate a clean Markdown file following the structure below
- **Precision:** Include exact hex codes for colors while using descriptive names
- **Context:** Explain the "why" behind design decisions, not just the "what"

## Output Format (DESIGN.md Structure)

Follow the Google DESIGN.md spec (google-labs-code/design.md, docs/spec.md). Tokens go in YAML frontmatter and are normative; prose explains how to apply them. Use only the canonical headings, in this order, omitting any that do not apply. Map what you extracted: Visual Theme -> Overview; Color Palette & Roles -> Colors (+ `colors` tokens); Typography Rules -> Typography (+ `typography` tokens); Component Stylings -> Components (+ `components` tokens); Layout Principles -> Layout (+ `spacing` tokens); depth/shadows -> Elevation & Depth; corner roundness -> Shapes (+ `rounded` tokens). Put the Stitch project ID in `description`, not a heading.

```markdown
---
version: alpha
name: "[Project Title]"
description: "[One line]. Source: Stitch project [Project ID]"
colors:
  primary: "#000000"
  on-primary: "#FFFFFF"
  surface: "#FFFFFF"
  on-surface: "#111111"
typography:
  headline-lg:
    fontFamily: "[Family]"
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.1
  body-md:
    fontFamily: "[Family]"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  md: 8px
spacing:
  md: 16px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: 12px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
---

## Overview
(Mood, density, aesthetic philosophy.)

## Colors
(Each color token's role, in descriptive words.)

## Typography
(Family, weight usage for headings vs body, letter-spacing character.)

## Layout
(Whitespace strategy, margins, grid alignment.)

## Elevation & Depth
(Shadow and layering approach.)

## Shapes
(Corner roundness and its meaning.)

## Components
(Buttons, cards/containers, inputs/forms.)

## Do's and Don'ts
- Do ...
- Don't ...
```

Before saving, run `design.md lint DESIGN.md`; 0 errors is required.

## Usage Example

To use this skill for the Furniture Collection project:

1. **Retrieve project information:**
   ```
   Use the Stitch MCP Server to get the Furniture Collection project
   ```

2. **Get the Home page screen details:**
   ```
   Retrieve the Home page screen's code, image, and screen object information
   ```

3. **Reference best practices:**
   ```
   Review the Stitch Effective Prompting Guide at:
   https://stitch.withgoogle.com/docs/learn/prompting/
   ```

4. **Analyze and synthesize:**
   - Extract all relevant design tokens from the screen
   - Translate technical values into descriptive language
   - Organize information according to the DESIGN.md structure

5. **Generate the file:**
   - Create `DESIGN.md` in the project directory
   - Follow the prescribed format exactly
   - Ensure all color codes are accurate
   - Use evocative, designer-friendly language

## Best Practices

- **Be Descriptive:** Avoid generic terms like "blue" or "rounded." Use "Ocean-deep Cerulean (#0077B6)" or "Gently curved edges"
- **Be Functional:** Always explain what each design element is used for
- **Be Consistent:** Use the same terminology throughout the document
- **Be Visual:** Help readers visualize the design through your descriptions
- **Be Precise:** Include exact values (hex codes, pixel values) in parentheses after natural language descriptions

## Tips for Success

1. **Start with the big picture:** Understand the overall aesthetic before diving into details
2. **Look for patterns:** Identify consistent spacing, sizing, and styling patterns
3. **Think semantically:** Name colors by their purpose, not just their appearance
4. **Consider hierarchy:** Document how visual weight and importance are communicated
5. **Reference the guide:** Use language and patterns from the Stitch Effective Prompting Guide

## Common Pitfalls to Avoid

- ❌ Using technical jargon without translation (e.g., "rounded-xl" instead of "generously rounded corners")
- ❌ Omitting color codes or using only descriptive names
- ❌ Forgetting to explain functional roles of design elements
- ❌ Being too vague in atmosphere descriptions
- ❌ Ignoring subtle design details like shadows or spacing patterns
