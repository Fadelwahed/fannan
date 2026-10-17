---
name: design-canvas
description: >-
  Use for screens, flows, decks, diagrams and design reviews in the project's
  design tool (Figma, Stitch or others per the project's settings.md): outlines
  frames from the real UI and draws them through that tool's connector, or
  reviews a file for taste, copy and rules.
---
Use for screens, flows, decks, diagrams and design reviews.

- **First (mandatory):** run `/home/box/agent-data/workflows/fannan-tools/readonly-precheck.sh /workspace/design-output/<project>/ <project>`; stop if it refuses, and run it before every write.
- Read `design-tool:` from the project's `settings.md`. Use only that tool, through its vendor skill. If no connector is available, say what to connect and stop.
- Start from ui-map.md and taste.md. Desktop only until the project's approver approves the desktop design, per the brief.
- Name frames clearly (page / section / state). Include all component states the handoff needs.
- Reviews: check taste, copy against the project's project-rules.md, and accessibility against WCAG 2.2 AA (contrast, focus, target size, reduced motion). Report findings; never edit source.
- Never invent competitor names, prices, facts or copy. Never share a file publicly without Fadel's yes.
