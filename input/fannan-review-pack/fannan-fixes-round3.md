# Fannan fixes, round 3 (Thu Oct 15, 2026, 7:21 AM Gaza time)
Last verified: 7:21 AM Gaza time.

## Asad round-3 review: NOT RUN
- Approach: same as rounds 1–2 (grok CLI 1.0.46 at /home/box/.local/bin/grok, read-only review prompt).
- Blocker: the CLI is installed but **not signed in**. Round 2 failed with the same error (r2/grok-err.txt): "Not signed in. To authenticate without a browser, run: grok login --device-code". No API key is set on the box either.
- Signing in needs Fadel (a device-code login on his account). It was not attempted. There are no round-3 findings, so no round-3 review fixes were applied.

## Refresh applied (docs only; nothing changed in Fannan himself)
1. `proto-skills/` (the "current" copies) replaced with Fannan's live skills. Live build, figma and setup had been made generic after 4:48 AM. Added the 5 live skills that were missing: codebase, connect, media, research, share. Old copies are kept as `*.bak-2026-10-15-0720` on the box and left out of the zip.
2. In `fannan-complete-for-review.md`, removed 6 stale quotes of the old live text that still had Digital Cloud or Website Ops paths and content rules. Added "Last verified" and a round-3 status note.
3. `example-project-digital-cloud-project-rules.md` refreshed from /workspace/docs/projects/digital-cloud/. Added `example-project-digital-cloud-settings.md`.
4. Added `fannan-memory-live.md`: the 9 saves, plus the 6:59 AM generic rewrites of saves 1, 3 and 5.
5. Added `CODEX-START-HERE.md` and `PACK-MANIFEST.sha256`.

## Found during the refresh (open, for Fadel: not applied)
- **O1 (P1).** The 4:46 AM decisions are not live. Live proto-setup §5 still offers "$2 (primary) / $10 / Every paid job". Live proto-build step 5 says "get a yes before going over the spend cap". Live memory save 8 says "Ask before any paid job over the spend cap". Each conflicts with J1 (no cap). Fix: apply D1–D5 and reword save 8. This needs Amin's review and Fadel's yes in Fannan's chat.
- **O2 (P2).** Live save 2 says "until Fadel approves", but the proposed skills say "the project's approver". Decide which wording is generic.
- **O3 (P2).** Live save 6 still names Jabr, the QA bot and "en and ar/RTL", which are project facts. Move them to project files?
- **O4 (P3).** Live proto-build uses /workspace/proto-bot/builds/, but proposed uses /workspace/design-output/<project>/. One path should win when D5 is applied.
- **O5.** `trust/MANIFEST.sha256` (the install manifest) was **not** regenerated. Its 87 `latest/` entries point at the vendored skill tree, which isn't in this pack. Its 6 `fannan-tools/` entries still match the pack files. Regenerating it would change the manifest sha256 pinned in the spec. Pack integrity is covered by `PACK-MANIFEST.sha256` instead.
