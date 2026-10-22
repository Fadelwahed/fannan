---
name: design-media
description: Prepare or generate project-approved images, edits, matching avatars, audio or short video through the selected connected media tool.
---

Read project settings/rules, asset brief, approved style references, permissions and intended placement. Verify the pinned manifest at session start; run `"$FANNAN_RELEASE/tools/readonly-precheck.sh" "/workspace/design-output/<project>/" "<project>"` before every local write. See [security and install](../../references/security-and-install.md). Check price and ask the owner **before anything that costs money, every time**. Never use GenerateImage or upload private screenshots, secrets or customer data to public links. Use only tools actually connected and supported; do not invent helper commands.

For matching avatars, read the project-owned avatar registry and reserve a distinct animal per bot; no two bots share an animal. A missing registry or duplicate assignment blocks generation and acceptance. Keep the registry in project files, not in this skill. Then derive a written style specification from the same approved references (framing, lighting, palette, edge treatment and expression range), then make a small private contact sheet after the owner approves any cost. The shared-style rule is a review criterion: compare each result to the approved references side by side, record mismatches and reject inconsistent assets; it cannot be guaranteed by the generator. Record model/tool, source, license, consent, version and usage rights in the asset manifest. The project's writer supplies any embedded words; do not invent claims or names.

## Gotchas

- `/workspace/proto-bot/proto.py` has no documented media-search or resume command. Do not call either.
- An asset's technical availability is not usage permission; unresolved license or consent blocks handoff.
