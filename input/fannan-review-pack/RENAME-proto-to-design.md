# Proposed rename: proto-* to design-* (Fadel, Oct 15, 7:53 AM)
Last verified: Thu Oct 15, 2026, 8:14 AM Gaza time (UTC+3).
Status: **proposal, pack and plan only.** Nothing in Fannan or the live skills has changed.

| Live (old) | Proposed | Why |
|---|---|---|
| (none) | design-process | **New skill; no live proto-process exists.** |
| proto-build | **design-prototype** | Changed from design-build. Fannan never builds; Jabr does. "build" would blur that line, and the skill makes clickable prototypes. |
| proto-setup | design-setup | Direct map. |
| proto-figma | **design-canvas** | Neither design-figma nor design-tool-figma. The skill already works in whatever tool `design-tool:` names (Figma, Stitch, others), so a vendor name breaks swappability. "design-tool" was avoided because it clashes with the `design-tool:` setting key. |
| proto-codebase | **design-ui-map** | Changed from design-codebase. It reads the repo only to write ui-map.md. The name says what it produces and that it doesn't touch the code. |
| proto-connect | design-connect | Direct map. |
| proto-media | design-media | Direct map. |
| proto-research | design-research | Direct map. |
| proto-share | design-share | Direct map. |

**Not renamed:** `proto.py` and `/workspace/proto-bot/`. These are the helper script and its data folder, not skills. Renaming them is a separate change that touches live data.

**In this pack:** `proto-skills-proposed/` is now `skills-proposed/<new name>/`, with the frontmatter `name:` updated. `proto-skills/` is now `live-skills-snapshot/` and keeps the live names and text exactly. Spec quotes of live text now use the new names; the exact live wording is in `live-skills-snapshot/`. `D1-D5.diff` and the round 1–4 reviews are historical, so they still use the old names.

## Migration note
**One step only (S1):** install all 9 `skills-proposed/design-*` folders and remove or retire the 8 live `proto-*` folders in the same step, then re-hash the trust manifest. Never install the proposed skills alone, and never rename the live ones alone: the proposed skills call `design-share`, `design-ui-map`, `design-canvas` and `design-media`, which don't exist until the rename.

The live `/home/box/agent-data/workflows/proto-*` folders stay as they are until Amin reviews this change and Fadel says yes in Fannan's chat. When that happens, the rename must update every caller below in the same step:
- **Live skill cross-references:**
  - proto-build l.14 → proto-share
  - proto-setup l.40 → proto-codebase
  - proto-setup l.43 → proto-build, proto-figma, proto-media
  - each skill's own `name:` line
- **Vendor skill caller:** `skills/generate-design/SKILL.md` lines 152, 207, 253 and 315 (and the same lines in `latest-local-patches.diff`) said "proto-build saves the file"; changed to design-prototype in the pack at round 5 and re-hashed in `trust/MANIFEST.sha256`.
- **Fannan's memory save 7:** "Load proto-* skills only when a task needs them" needs the same yes.
- **No other bot's skill** in /home/box/agent-data/workflows references the proto- names. That was an rg check; the other skills there are getting-started-assistant, getting-started-swe, skill-security-review and writing-revision.
- **Docs that use the old names** (records only; update optional):
  - docs/bot-enhancement/: analysis.md, wazir-input.md, bot-enhancement-plan.html
  - docs/routines-review/: proto-bot.md, all-routines.md, _all-routines.html
  - docs/fleet-audit/: fleet-panel-2026-10-15.md, design-skills-compat-test.md, skills-latest-and-generic.md, design-bot-skills-research.md, merge-plan-engineering-pm.md, fannan-setup.md, fannan-retired-routines.md, fannan-fixes-round1/2/3.md, fannan-panel-review*.md, fannan-panel-round3/4.md, fannan-panel/*.md, fannan-panel/round2/*.md
- **Not searched:** the bots' transcripts and memory stores, apart from Fannan's memory record. Two attachments in Mi'mar's agent-data folder also mention proto-.
