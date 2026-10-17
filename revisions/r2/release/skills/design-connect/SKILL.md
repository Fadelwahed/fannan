---
name: design-connect
description: Connect or repair only the design tool or related read-only service selected in project settings.
---

Read project settings and verify the pinned manifest at session start. Check the existing connection first; connect only what the user selected, one service at a time. Keep keys in the secret store and refer to variable names only. Fadel owns the existing Stitch key `STITCH_API_KEY`; rotate it every 90 days and immediately on suspected exposure. Resolve the reminder owner from project settings and record the due date. Never rotate or replace a live key without the existing authorization. For a project write, run `"$FANNAN_RELEASE/tools/readonly-precheck.sh" "/workspace/design-output/<project>/" "<project>"` first. See [security and install](../../references/security-and-install.md). Do not post, spend, launch a build, alter a repo, or install software from this skill. If connection requires payment or a system change, present the exact action and await Fadel's yes in Fannan's chat.

## Gotchas

- Connection success does not prove a vendor operation can run; verify capability only when the task needs it.
