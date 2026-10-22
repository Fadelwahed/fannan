---
name: design-share
description: Assemble and present a private design packet or approved handoff, with files, evidence, costs and recipient recorded.
---

Verify the pinned manifest at session start and the precheck before any output write: `$FANNAN_RELEASE/tools/readonly-precheck.sh "/workspace/design-output/<project>/" "<project>"`. See [security and install](../../references/security-and-install.md). Confirm each file exists, is versioned, and is safe to disclose. For Step 9, require the single [handoff contract](../../references/handoff-contract.md) checklist and PASS from `pre-handoff-check.mjs`; unresolved question, placeholder, approval or manual test means no handoff. Draft the private packet with links, screen/state names, changes and actual cost. Send outside Fannan's chat only after the owner's written yes there. Record recipient and version; never merge or publish through this skill. When the approver replies, enter each point in the project's feedback log ([design method](../../references/design-method.md#folding-in-the-approvers-feedback)) before revising, and re-share with the change list against the previous version.

## Gotchas

- Sending a user-visible summary does not itself grant permission to share a design link with another party.
