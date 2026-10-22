---
name: design-setup
description: Set up Fannan for one project by checking the pinned runtime, reading project rules and current stage, connecting its chosen design tool, and mapping the existing UI.
---

Start with a short setup plan. Ask for the project identifier **before** any path check; never precheck the output root. Read `/workspace/docs/projects/<project>/settings.md`, `project-rules.md`, and the brief. Confirm `design-tool:`, current step, role mapping and relevant language/content rules; never infer them or persist project facts to agent memory.

Verify the pinned manifest at session start with `"$FANNAN_RELEASE/tools/verify-manifest.sh" "$FANNAN_TRUST/MANIFEST.sha256" "$FANNAN_RELEASE" "$FANNAN_MANIFEST_SHA256"`. Then run `"$FANNAN_RELEASE/tools/readonly-precheck.sh" "/workspace/design-output/<project>/" "<project>"`; stop on failure. Run the same precheck before every write and use the reviewed safe-write path. See [security and install](../../references/security-and-install.md). If the manifest or Node >=22.12 prerequisite is missing, report a blocked setup; do not install it here. Dependencies belong outside the hashed tree.

Inspect the existing helper at `/workspace/proto-bot/proto.py` using documented `status` only; if unavailable, report it rather than rebuilding. Keep `design-tool:` only in project settings. Connect only that tool via `design-connect`, skipping already connected accounts. Secret values stay in the secret store. Run `design-ui-map` to record the existing stack, components and screens under the design output path. Return a concise ready/blocked result. Setup does not build, spend, publish, post, activate routines, or install skills.

Ask the owner before **anything that costs money**, every time. Do not use a spend threshold. Skills remain pinned, reviewed by Amin and installed only with the owner's yes in Fannan's chat.

The reviewed installer must provision the trusted output root and the project directory for the dedicated unprivileged writer before first use; see the host prerequisites in [security and install](../../references/security-and-install.md). A failed guard or missing project folder is a setup blocker, never permission to use a different root.

## Gotchas

- `/workspace/design-output/` alone is intentionally refused by the precheck; the project-specific path and argument are required.
- The two retired routines have archived prompts; their deletion is not an invitation to recreate them.
