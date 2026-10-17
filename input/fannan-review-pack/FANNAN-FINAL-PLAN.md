# Fannan: final plan (for Codex review)
Last verified: Thu Oct 15, 2026, 8:14 AM Gaza time (UTC+3), against the review pack at `/workspace/docs/fleet-audit/fannan-review-pack/`, Fannan's live skills (`/home/box/agent-data/workflows/proto-*`) and the round 1–5 panel files.
**Status: proposal only.** Nothing is installed, and Fannan and his live skills are unchanged. Round 5 verdict: **PASS WITH CONDITIONS for the design, FAIL for install** until §10 is done. **(untested)** marks anything that hasn't been run.

## 1. What Fannan is
- Fannan is Fadel's UI/UX design bot. **He designs and never builds.**
- **Generic.** Every company, country, client, partner, wording, vendor and approver fact lives in the project's files under `/workspace/docs/projects/<project>/` (`project-rules.md`, `settings.md`, the brief), never in the bot. Digital Cloud is only the example project.
- **Desktop only (1440px).** No mobile or tablet layouts until the approver approves the desktop design **and** the brief's current step allows it.
- **Output:** layouts, clickable prototypes, DESIGN.md (Google format), tokens and handoff specs. They are made in the project's design tool, or as standalone HTML mocks, in `/workspace/design-output/<project>/` only.
- **Read-only on code.** He may read the project's repo and preview site to map the real UI. He never branches, commits, pushes, opens PRs or writes inside a repo.
- **Handoff:** the project's engineer builds, QA checks, and Fadel merges.

## 2. Approved decisions (Fadel)
| When (Gaza) | Decision |
|---|---|
| Oct 14, 11:41 PM | Fannan's 9 memory saves set (desktop first, tool-agnostic, read-only code, handoff, skills gate, gates, paused routines). |
| Oct 15, 4:19 AM | The generic design process: Codex's 8 design steps. |
| Oct 15, 4:36 AM | Yes to fixing the round-1 panel findings, in the sandbox and pack only. |
| Oct 15, 4:46 AM | **J1:** ask before anything paid, every time. No spend cap. |
| Oct 15, 4:46 AM | **J2:** a read-only GitHub token for the website repo only, plus main-branch protection. Jabr sets it up. The free plan can't enforce protection, so Jabr's daily check is the backup. **Approved, not done.** |
| Oct 15, 4:46 AM | **J3:** Fadel owns the Stitch key. It's kept in the bots' secret store as `STITCH_API_KEY` and rotated every 90 days, or right away if it may have leaked. Wazir reminds Fadel. |
| Oct 15, 4:46 AM | **J4:** WCAG 2.2 AA is a minimum that no project rule can lower. |
| Oct 15, 4:46 AM | **C5:** the process is the 8 steps plus Step 9 (handoff to the engineer). Scope and authority is a rules section, not a step. |
| Oct 15, 6:59 AM | Memory saves 1, 3 and 5 rewritten as generic pointers (yes given in Fannan's chat). |
| Oct 15, 7:53 AM | Plain job names: proto-* becomes design-* (§4). |
| Oct 15 (time not recorded) | The design-tool setting lives only in the project's `settings.md`. The old vendor-settings.md was moved there (E2). |
| Standing | Skills are pinned to a commit, reviewed by Amin, and need Fadel's yes. No vendor lock-in. Bots act only on approvals Fadel gives in their own chat. 12-hour times in Fadel's time zone. Delete nothing (archive). |

**Still waiting for Fadel** (from the full plan, unchanged): A1, A2, A4, B1, B2, C1–C4, D1–D6, E1, F1, F2, G1–G12, H1, I1–I6. Each needs a yes or no; see `fannan-full-plan.md` and `fannan-complete-for-review.md` §10.

## 3. Design process (`design-process`)
**Rules (they apply to every step; this is not a step):**
- Fadel is the final design approver, and no designer or AI can declare approval.
- Each gate records the IDs, date, decision, open issues and next step.
- Feedback goes into one issue list.
- An approved gate reopens only for a documented issue.
- Which step a project is at is recorded only in its brief.

**Steps:**
1. Reconcile the brief and define design success.
2. Visitor needs, content and evidence.
3. Information architecture.
4. Grayscale desktop wireframes.
5. Test and approve the desktop wireframes.
6. Desktop visual design.
7. Mobile and tablet (only after desktop is approved, per the brief).
8. Validate, document, and final design approval.
9. **Handoff to the engineer.**

**Step 9 needs all of these, or there is no handoff:**
- the private design link and frame names;
- DESIGN.md (lint 0 errors) and settings.md;
- tokens (DTCG JSON plus CSS variables);
- the component inventory with every state, language and direction;
- motion notes (reduced motion means no movement; nothing hidden with JS off);
- assets within the size budget;
- final copy from the writer;
- the evidence bundle (PASS);
- the recorded approval.

If anything is missing: list it with its owner, set the Bot Tasks row to Stuck or On hold, and tell Fadel.

**Loop inside a step that produces screens (`design-prototype`, untested):**
precheck → plan (Fadel's yes) → Shape → Explore (3–5 private variants; Fadel picks one) → Implement → See → separate read-only Critic (0–4 rubric, at most 3 rounds, stop if a round gains less than 1 point, then send Fadel a summary; any open P0 or P1 blocks) → Harden (`pre-handoff-check.mjs`) → Review → design-share.

## 4. Skills (final names)
**Fannan's workflow skills** (proposed in `skills-proposed/`; the live ones keep their proto-* names until install):

| New name | Live name | What it does |
|---|---|---|
| design-process | (new) | The 8+1 step process, gates, handoff inputs. |
| design-setup | proto-setup | First run: asks the project, precheck and install check, reads settings, brief and rules, connects the one design tool, records the spend rule, runs design-ui-map. |
| design-prototype | proto-build | Turns an idea into a clickable desktop prototype through the loop in §3. Named "prototype" because Fannan never builds code. |
| design-canvas | proto-figma | Draws or reviews screens in **whatever tool** `design-tool:` names (Figma, Stitch or others). The name is vendor-neutral and avoids clashing with the setting key. |
| design-ui-map | proto-codebase | Reads the repo and app (read-only) into ui-map.md. |
| design-connect | proto-connect | Connects or repairs the design tool and other tool connections. |
| design-media | proto-media | Images, edits and short video. Prices first; asks before anything paid. |
| design-research | proto-research | Read-only craft research into a playbook file. |
| design-share | proto-share | Finishes a job: packet, handoffs, and a share draft that waits for a yes. |

**Vendor skills** (pinned; Amin PASS at rounds 1–3):

| Skill | Pin |
|---|---|
| frontend-design | dbd4588f |
| impeccable | e9be87dd + engine v0.1.14 (sha256 3d31ec1a…68efb6); detect only, through the launcher |
| stitch-design-md, generate-design, manage-design-system | 0337446d (used only when the design tool is Stitch) |
| a11y-wcag-audit | afa8da94 |
| Google DESIGN.md + `@google/design.md` | 0.4.0 |
| awesome-design-md | 3b605329 (reference only) |
| shadcn | 4233ed1c (guidance only, Read tool, no CLI) |
| Style Dictionary | 5.6.1 |
| axe-core | 4.14.0 |

The Figma guide is on hold until the Figma purchase.

## 5. Tools and settings (vendor-swappable)
- **Settings:**
  - `design-tool:` in the project's `settings.md` is the only switch. A vendor is swapped by changing that line and its vendor skill; no bot text names a vendor.
  - Keys are referenced by secret variable name only.
- **Tools** in `fannan-tools/`:
  - `readonly-precheck.sh <path> <project>`
  - `safe-write.sh <project> <path>` (advisory)
  - `pre-handoff-check.mjs <DESIGN.md> <page> <evidence-dir> <project>`, with `FANNAN_DEPS` set
  - `verify-manifest.sh`
  - the converter `designmd-to-sd.mjs`
  - the impeccable launcher, which allows `--version` and `detect` only and runs a copy of the pinned binary after checking its hash
- **npm dependencies** install outside the checked tree: `npm ci --prefix /home/box/agent-data/fannan-deps`.
- **Runtime:** Node **22.12+** is required. The box has Node 20.19.2 (open, N6).
- **Trust manifest:** `/home/box/agent-data/fannan-trust/MANIFEST.sha256`, read-only, outside the tree it checks, with its own sha256 pinned. The pack build is `91b8b8a8fa2820e9c3812fbca2c5b728ab604811998ac169e2b28814a57f6584` (94 entries); it changes at install.
- **Precedence:** project rules > accessibility (the AA minimum can't be lowered) > DESIGN.md > impeccable > frontend-design > tool defaults.

## 6. Security and approvals
- Fadel's written yes in Fannan's own chat is needed before buying, sending, sharing, publishing, deleting or changing the system. Approvals relayed by other bots don't count.
- An unanswered approval stays On hold, with reminders after 4 hours (normal), 24 hours (low) or 1 hour (emergency), and a Bot Tasks row.
- Ask before anything paid, every time. **This is enforced by instruction only (A4, open).**
- Fannan writes only to `/workspace/design-output/<project>/`, never into a git tree, a bare repo or a hard-linked file. The precheck runs first in every workflow and before every write.
- He never branches, commits, pushes, opens PRs or merges.
- **Install gate:** no skill is installed or updated without Amin's review and Fadel's yes, pinned. The manifest is checked at session start; if it fails, he stops and tells Fadel.
- Secrets are referenced by variable name only. GitHub is never used for logs or storage. Archive instead of deleting (Hafiz's retention rule).
- Research goes to Sanad. Wazir owns follow-through. Mi'mar (formerly dr eggbot) runs the weekly fleet health check.

## 7. Fixes applied, rounds 1–5
| Round | Fixed (in the pack and sandbox only) | Record |
|---|---|---|
| 1 (4:37–4:42 AM) | P0s: the launcher refuses live mode; pin checked at run time with no download fallback; shadcn no longer auto-runs npx. Stitch key kept off the command line; uploader disabled; desktop-only override in all skills; AA floor; critic end state; converter bugs; npm audit 0 (shadcn CLI removed); precedence in every skill. | `fannan-fixes-round1.md` |
| 2 (4:45–4:48 AM) | Launcher changed to an allowlist (32 refusals tested); copy-hash-run; external read-only manifest with a pinned sha; precheck made mandatory; desktop override keeps approval; gate false-PASSes fixed; converter units and hex; shadcn npx lines tagged; J1–J4 and C5 written in. | `fannan-fixes-round2.md` |
| 3 (7:21 AM) | Live skill snapshot refreshed; 6 stale Digital Cloud or Website Ops quotes removed; example project files refreshed. | `fannan-fixes-round3.md` |
| 4 (7:55 AM) | Rename proposed and used throughout the pack; rounds 3 and 4 added. Docs only. | `RENAME-proto-to-design.md` |
| 5 (this file) | See the table below. | — |

**Round-5 fixes and how each was checked:**

| ID | Fix | Test |
|---|---|---|
| N1 | design-setup asks for the project first, then runs the precheck on `/workspace/design-output/$PROJECT/` with `$PROJECT`. | Tested: precheck on `…/r5test/` with `r5test` gives rc 0; the root gives rc 2. Not tested as a running skill. |
| N2 | npm dependencies moved outside the checked tree (`FANNAN_DEPS`). The gate reads design.md, axe and playwright from there and refuses to run if `FANNAN_DEPS` is unset. | Tested on a simulated root: deps outside gives MANIFEST OK. **Untested:** a real `npm ci --prefix`, and the gate end to end (needs Node 22 and Chromium). |
| N5 | The gate passes `IMPECCABLE_BIN` (default `latest/impeccable/bin/impeccable-linux-x64`), and the spec paths now match. | Tested: launcher rc 3 when unset and rc 5 when set (the hash check is reached). Real binary untested. |
| R3-5 a | The precheck requires `<path> <project>` and refuses a project named with `/`, `.` or `..`. | Tested: rc 2 with no or empty project; rc 11 for `..`, `a/b` and another project; rc 10 outside the root; rc 0 for a valid path. |
| R3-5 b, c | The gate passes the project; design-setup, design-prototype and design-canvas call the tools with full paths and the project. | `node --check` OK; usage refusal rc 2. |
| R3-5 d | New `tools/safe-write.sh`: precheck, no symlink, no overwrite, and a re-check of the real path after writing. **Advisory: it narrows the race but doesn't close it.** | Tested: write OK; overwrite refused; a symlink to outside refused (the outside file was unchanged). |
| G2, G3, G4 | The precheck denies hard-linked files and bare repos, and both scripts set a fixed `PATH`. | Tested: hard link rc 13; bare repo rc 12; a fake `realpath` on PATH is ignored (rc 10). |
| R3-13 / G1 | verify-manifest resolves absolute paths, uses `cd -P`, and checks for a symlink before resolving. | Tested: a relative path works; a manifest planted inside the root is refused; a symlinked manifest is refused. |
| R3-3 + D6 | No "spend cap" wording anywhere in the proposed skills. New `design-media` asks before anything paid, every time. Proposed save 8: "Ask before anything paid, every time (no spend cap)." | Grep: 0 hits apart from "no spend cap". The memory change is not applied (it needs Fadel's yes in Fannan's chat). |
| A1/N3 | generate-design's 4 lines (and the same 4 in `latest-local-patches.diff`) now say design-prototype. Trust manifest re-hashed; spec pin updated. | Grep: 0 `proto-build` left in either file. |
| N4 | The RENAME doc says design-process is new (there's no live proto-process). Spec §4.3 shows live files under their live names, and the D-table line numbers refer to `live-skills-snapshot/proto-*`. | Read back. |
| S1 | One-step install rule written (RENAME doc and §11). All 9 design-* skills are in `skills-proposed/`. | Read back. |
| A3 (text) | Spec now says the manifest covers `latest/` and `fannan-tools/` only, **not** Fannan's design-* skills. | — |
| N8, N10 | design-setup "Never" rules split into separate bullets; tools called by full path. | Read back. |
| R3-1 | **Rejected** in round 5: line 83 already goes through the launcher (the hashes match). Dropped. | — |

## 8. Still open, in Asad's fix order
1. **Code still open:**
   - N6: Node 22 isn't on the box (installing it needs Fadel's yes).
   - N7: no Style Dictionary build script for the Step 9 CSS.
   - A3: Fannan's design-* skills need adding to the manifest's `# covers:`.
   - N5 note: extra files under `bin/` aren't detected.
   - A4: paid calls aren't gated in code.
   - P2s: R3-8 (2.5.7, 3.3.8, RTL), R3-9 (no RTL or `lang` pass), R3-10 (unitless fontSize).
   - P3s: R3-14/A5 (launcher accepts any path, counts flags as paths), R3-15, R3-18/N9/R4-2 (converter references and units), R4-3 (root skips the read-only check), N11 (unquoted dirs), R3-20 (focus heuristic).

   Full list: `fannan-panel-round5.md`.
2. **Text:** R3-6/O3 (save 6 names Jabr, the QA bot and "en and ar/RTL"), R3-7/O2 ("Fadel" or "the project's approver"), O4 (resolved by the proposal: `/workspace/design-output/<project>/` replaces `/workspace/proto-bot/builds/`; confirm at install), R3-16/R3-17 (stale text, Gaza in save 8).
3. **Amin re-checks** the round 3–5 code (launcher, 4 tools, converter, design-* skills, the patch) and records PASS or FAIL per file in spec §10 item 1 (R3-2).
4. **R3-4:** create the fine-grained read-only token (Contents: read, one repo; only its name goes in settings.md), and record Jabr's daily main-branch check as a Bot Task.
5. **Fadel's yes in Fannan's chat**, then install as one step (§11), including memory saves 7 and 8.

## 9. Review seats per round
| Round | Seats |
|---|---|
| 1 (about 4:30 AM) | 9: Amin, Asad (+ Grok CLI second opinion), Bayan, Jabr, QA bot, Sanad, Wazir, Website Ops, Writing Bot. |
| 2 (about 4:50 AM) | The same 9 bots; Grok CLI failed (not signed in). |
| 3 (7:30–7:45 AM) | Asad only; Grok timed out with no findings. |
| 4 (7:45–8:00 AM) | Asad only, in 4 topic seats; Grok returned no findings. |
| 5 (7:56–8:15 AM) | Amin (security, gitleaks 0), Jabr (engineering), Grok CLI (2 of 4 chunks returned findings), Asad (tie-breaks). |

**Caveat:** rounds 3 and 4 were one agent (Asad), so they weren't independent. Round 5 is the first independent round since round 2. **No one has reviewed the round-5 fixes in this file yet.**

## 10. Before install (blocking)
Asad's §8 items 3–5: Amin's recorded PASS, the read-only token and Jabr's check, and Fadel's yes. Plus Node 22 (N6) and a real end-to-end gate run.

## 11. Install: one atomic step (after §10)
Do all of this in one session. If any check fails, stop, restore the backup and tell Fadel.
1. Back up the live `proto-*` folders, `fannan-tools/`, the trust manifest and Fannan's memory to Drive, and confirm the checksums.
2. Install the vendor skills from the sandbox into `workflows/latest/`. Run `npm ci --prefix /home/box/agent-data/fannan-deps`. Install the tools into `workflows/fannan-tools/`.
3. Install all 9 `skills-proposed/design-*` folders **and** retire the 8 live `proto-*` folders together (archive, don't delete). Never one without the other (S1).
4. Update memory saves 7 and 8 (and 2 and 6 if O2/O3 are decided), with Fadel's yes in Fannan's chat.
5. Regenerate the trust manifest at its install paths (adding the design-* skills under A3 if decided), make it read-only (0444), and pin its sha256 as `FANNAN_MANIFEST_SHA256`.
6. Run verify-manifest, the precheck tests, the gate on an example page, and the 13 proto.py tests. Read every file back twice.
7. Tell Fadel the results in Fannan's chat.
