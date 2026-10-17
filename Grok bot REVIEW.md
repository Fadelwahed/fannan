# Fannan rewrite (Codex, Oct 16, 2026): read-only review

Reviewer: Mi'mar (executor), Oct 16, 2026, about 7:00 AM Gaza time. Nothing was installed, no bot was changed, and nobody was messaged.
Paths below are relative to `pkg/fannan-review-candidate/release/` unless stated. `plan.md` here is byte-identical to `FANNAN-REWRITE.md` in the zip, and the zip's `input/.../FANNAN-FINAL-PLAN.md` is identical to our `FANNAN-FINAL-PLAN.md`.

## Verdict

**Design: passes, with conditions. Install: fails (blocked).** This is the strongest version so far. It keeps every one of Fadel's rules, it is honest about what it did not test, and it wires most of the no-AI-look checks into the real pre-handoff checker. Fannan still cannot be installed, for four reasons:
1. Amin has not reviewed it (R3-2 is still open).
2. Nobody has proven the read-only token or the branch and daily check (R3-4 is still open).
3. The protected Impeccable binary is missing, so the full checker can never return PASS.
4. Our box runs Node 20.19.2. The goal said the checker must pass on our box, and it does not: the checker needs Node 22.12+, and nobody has approved or done that upgrade yet.

Codex says all four of these openly in UNTESTED.md and OPEN-QUESTIONS.md.

## Manifest check

- `trust/MANIFEST.sha256` (`# covers: .`, 45 files) checked against `release/`: **all 45 OK. No missing, changed or unlisted files.**
- `trust/PINNED.sha256` (the manifest's own hash, `0d33f9aa…b5d1`): **OK.**
- `verify-manifest.sh` run in a scratch copy: OK on the clean tree. It correctly failed (rc 1) when I added an extra file, when I changed a file, and when I gave it a wrong pin.
- The input pack's `PINNED.sha256` lists `bin/impeccable-linux-x64` as **missing**. That is the absent binary, and the package says so. The input pack's `PACK-MANIFEST.sha256` lists only the files that are present, and they all match.
- Not covered by any manifest: `test-results/`, `CHECKPOINT.md` and `FANNAN-REWRITE.md`. This is by design, because they are evidence and not part of the install.

## Tests I ran (scratch copy `/workspace/scratch-fannan-r6`, no network, no installs)

- `node --test tests/handoff-contract.test.mjs`: 1/1 passed.
- `node --check` on all 4 `.mjs` tools and `sh -n` on all 4 `.sh` tools: OK.
- `readonly-precheck.sh` behaved correctly in 7 cases:
  - it allowed a path inside the project folder;
  - it denied the wrong project, `..` traversal, the output root itself, `/etc`, a `../p` project name, and an empty project.
- `launcher-impeccable.sh`: it refused `generate` (rc 4) and refused a binary whose hash is wrong (rc 5).
- **Not run (untested):**
  - `pre-handoff-check.mjs` and `local-fixture.mjs`, because they need Node 22, the npm deps and the binary;
  - `safe-write.sh` symlink and race cases, because they would write into the real shared `/workspace/design-output`.

## P1 gaps (block install)

| # | Gap | Where |
|---|---|---|
| P1-1 | Amin's per-file PASS/FAIL review against digest `0d33f9aa…` does not exist yet (R3-2). | OPEN-QUESTIONS.md:7; INSTALL-ACCEPTANCE.md |
| P1-2 | The read-only one-repo token (Contents: read) and the main-branch protection with its daily-check task are described but not proven (R3-4). | references/security-and-install.md:11-13; UNTESTED.md:9 |
| P1-3 | The Impeccable binary (sha `3d31ec1a…efb6`) is missing, so the handoff gate fails closed every time. The goal's item "the pre-handoff check must actually pass on our box" is **not met**. | security-and-install.md:17; tools/pre-handoff-check.mjs:204 |
| P1-4 | Our box has Node v20.19.2, and the checker refuses anything below 22.12. Codex chose the "reviewed Node 22 install" route, but no exact version or checksum is pinned, and nobody has approved the upgrade. | FANNAN-PLAN.md:111; pre-handoff-check.mjs:18-19; OPEN-QUESTIONS.md:9 |
| P1-5 | There is no proven mechanism for the atomic switch and rollback, which hold Fannan, swap the skills and memory, then restore on failure. | security-and-install.md:43-50; OPEN-QUESTIONS.md:10 |

## P2 gaps

| # | Gap | Where |
|---|---|---|
| P2-1 | The Impeccable "AI-look" findings are **advisory**. The gate passes whenever the detector runs, whatever it finds. Generic hero, card grid, dashboard tropes, rule of three and decoration-without-a-job are critic-only manual checks. That is acceptable, but Fadel should know that "no AI look" is enforced partly by a person or critic rather than by the machine. | pre-handoff-check.mjs:207-208; runtime/quality-checks.json manualIds |
| P2-2 | The filler-word check is a short English-only regex (unlock, seamless, empower, cutting-edge, revolutionary, game-changing). It has no Arabic list and nothing for rule-of-three taglines, so RTL projects get no automated copy check. | pre-handoff-check.mjs:81 |
| P2-3 | The checker loads Playwright, design.md and Style Dictionary from whatever folder `FANNAN_DEPS` names, and it does not check them against the lockfile when it runs. Anyone who can change that env var or that folder can run code inside the gate. | pre-handoff-check.mjs:21-30,45; tools/sd-build.mjs:34; designmd-to-sd.mjs:10 |
| P2-4 | The detector inherits the full process environment, including any tokens or keys in it, because `{...process.env}` is passed to the launcher. It should get a minimal env. | pre-handoff-check.mjs:204 |
| P2-5 | The safe-write check-then-write race is still open. It is disclosed, and the host's write-deny enforcement is untested. | tools/safe-write.sh:4,9-13; UNTESTED.md |
| P2-6 | The Stitch key rule is complete (Fadel owns it, it lives in the secret store, it rotates every 90 days and at once on exposure), but only in security-and-install.md. The plan only says "keep the existing key ownership and rotation rules", and no skill or memory save says 90 days. A bot that reads only the plan and skills won't see the period. | FANNAN-PLAN.md:23; security-and-install.md:15 |
| P2-7 | Who gets told on a failed Step 9 differs: the plan says "notify the approver", while the design-process skill says "tell Fadel". Pick one. | FANNAN-PLAN.md:101 vs skills/design-process/SKILL.md:22 |

## P3 gaps

| # | Gap | Where |
|---|---|---|
| P3-1 | The avatar rule covers one shared style, but it does not carry "no two bots share an animal". | FANNAN-PLAN.md:119; skills/design-media/SKILL.md:8 |
| P3-2 | The daily branch check is owned by "the project's engineer" instead of Jabr. That matches the "roles, not names" rule, but someone must map engineer = Jabr in each project's settings, or the check has no owner. | security-and-install.md:13 |
| P3-3 | The launcher's `detect` accepts any existing local path, such as `/etc/hosts`. It is low risk, because only the pinned binary runs it, but it could be limited to `/workspace/design-output/<project>/`. | tools/launcher-impeccable.sh:26 |
| P3-4 | The precheck accepts odd project names such as `*` or names with spaces or a leading `-`. An allow-list (`[a-z0-9-]`) would be safer. | tools/readonly-precheck.sh:7 |
| P3-5 | The browser gate lets the page load any `file:` URL, so a page could pull local files into screenshots. External network is blocked correctly. | pre-handoff-check.mjs:57,165,188 |
| P3-6 | Two skills still contain the hard-coded helper path `/workspace/proto-bot/proto.py`. It is generic and not a project fact, and it is kept on purpose, but it is the only `proto` text outside the rename map. | skills/design-setup/SKILL.md:10; skills/design-media/SKILL.md:12 |
| P3-7 | design-prototype step 1 asks for "Fadel's yes for the plan". Elsewhere, screen decisions go to "the approver". This is minor role mixing. | skills/design-prototype/SKILL.md:8 |
| P3-8 | The `CHROME_NO_SANDBOX=1` env switch turns off Chrome's sandbox. It should be documented as allowed only in a container. | pre-handoff-check.mjs:53 |
| P3-9 | The retired-routines archive, the helper tests and the full approval register are referenced but absent, and are disclosed as such. | UNTESTED.md; OPEN-QUESTIONS.md:13 |

## Script safety summary

- **Network:** none in the shell tools. The browser blocks every non-`file:` request and WebSockets. The launcher refuses URLs and has no download fallback. The skills' `web_fetch` is limited to the Stitch vendor skills.
- **Writes:** all go through `safe-write.sh` and the precheck under `/workspace/design-output/<project>/`, and the evidence folder must be new. The only `rm` deletes the file it just wrote, when the post-check fails.
- **Secrets:** none in files. Skills refer to variable names only.
- **Shell injection:** low risk. Everything uses `execFileSync` with argument arrays, never a shell string, and shell variables are quoted. The test fixture's `local-fixture.mjs` writes stub guards into its own temp folder only.
- **Downloads:** none at runtime. `npm ci --ignore-scripts` is install-time only, into an outside prefix, and only after approval.

## What's strong

- Scope and authority is a rules section. It keeps the 9 steps unchanged, makes Step 5 the gate before styling, keeps wireframes grayscale, and keeps mobile deferred until desktop is approved.
- There is no spend cap anywhere. Save 8 carries the exact sentence "Ask Fadel before anything that costs money", and the old $2/$10 widget is gone (R3-3 closed).
- Precedence states that WCAG 2.2 AA is the floor and no project rule can lower it.
- Tools are swappable: the tool comes only from `design-tool:` in settings, through reviewed adapters.
- The rename to `design-*` is complete in the active files. The only old names left are in the migration map and the helper path.
- N1 (setup's precheck of the output root), N2 (dependencies outside the hashed tree) and N5 (`IMPECCABLE_BIN` is now set) are fixed in code.
- The precheck now requires a project argument (R3-5 code fix).
- One canonical `handoff.json` generates HANDOFF.md, and the checker compares each render against the approved frame hash.
- The critic has a concrete generic-headline test: mask the brand and compare against two unrelated businesses (critic-rubric.md:26). It has a 3-round cap, stops when a round gains less than 1 point, and the cap is never a soft pass.
- It is honest: UNTESTED.md separates "blocked" from "untested", and nothing is faked, including Amin's signature.
- Digital Cloud appears only as a labelled dry run.

## Goal coverage

| Goal item | Status | Evidence |
|---|---|---|
| 1. Point of view traced to brief lines; critic rejects untraced sections | Met | FANNAN-PLAN.md:33,45 |
| 2. No-AI-look checks wired into pre-handoff | Mostly met. Centered, accent ≤10%, ≤6 sizes, three-icon rows, gradient hero, glass and purple-blue are automated. Card grid, dashboard tropes and decoration are manual. | pre-handoff-check.mjs:65-81,105; quality-checks.json |
| 3. No AI copy, placeholders, sourced facts | Met in design; the filler check is English-only (P2-2) | FANNAN-PLAN.md:37-39; handoff-contract.mjs |
| 4. Craft: type, spacing, grid, motion spec, languages, 150% stress | Met | FANNAN-PLAN.md:67-77 |
| 5. Tough critic, PASS/FAIL, generic-headline test, cap not a soft pass | Met | critic-rubric.md; FANNAN-PLAN.md:107 |
| 6. Fixed Step 9 package (tokens + script, states, 1440 frames, copy deck, assets, BLOCK/WARN, WCAG, one H1, alt intent, labels, SEO/schema) | Met in spec and contract; never run on a real project | FANNAN-PLAN.md:97-99; handoff-contract.mjs |
| 7. Roles, not names | Met (P3-2 is a mapping note) | whole candidate |
| Rule: WCAG 2.2 AA floor | Met | FANNAN-PLAN.md:15 |
| Rule: desktop-first, grayscale until structure approval | Met | FANNAN-PLAN.md:17,81 |
| Rule: 8 steps + Step 9; Scope and authority as a rule | Met | FANNAN-PLAN.md:9,27-101 |
| Rule: read-only code; ask before paid, no cap | Met | FANNAN-PLAN.md:19,21; memory save 8 |
| Rule: generic instructions | Met | memory saves 1-9; skills |
| Rule: tools swappable | Met | FANNAN-PLAN.md:23 |
| Rule: pinned, Amin reviews, Fadel's yes | Specified; Amin's review is missing (P1-1) | security-and-install.md:9 |
| Tech: close 7 P1s | 5 closed in code but untested live (N1, N2, N5, R3-3, R3-5); 2 open (R3-2, R3-4) | CHANGELOG.md |
| Tech: checker passes on our Node 20 box | **Not met** (P1-3, P1-4) | UNTESTED.md |
| Tech: one atomic change with renames, callers, manifest and rename map | Packaged; live mechanism unproven (P1-5) | migrations/rename-map.json; trust/ |
| Deliverables 1-7 (plan, skills, checklist, rubric, changelog, questions, untested) | All present | release/ |
| Fadel rule: Stitch key owned by Fadel, secret store, 90-day rotation | Met, only in the reference file (P2-6) | security-and-install.md:15 |
| Fadel rule: one-repo read-only token + branch protection + daily check | Specified; not proven (P1-2) | security-and-install.md:11-13 |
| Fadel rule: avatars share one style | Met as an acceptance process; "no shared animal" is missing (P3-1) | FANNAN-PLAN.md:119 |

## What Amin should focus on

1. Do a per-file PASS/FAIL against manifest digest `0d33f9aa…b5d1`, especially the 4 tools in `tools/` and the 3 Stitch skills' `allowed-tools`.
2. Check whether the `FANNAN_DEPS` trust model is acceptable, and whether to add a lockfile and integrity check at runtime (P2-3).
3. Check that the detector gets a minimal environment, with no secrets passed through (P2-4).
4. Check that the safe-write race and host write-deny can be proven on the Linux host (P2-5). The guards use GNU `realpath -m` and `stat -c`, so they fail on a Mac, as Codex saw.
5. Find where the real Impeccable binary is, and confirm its sha256 `3d31ec1a…`. Do not re-pin a substitute.
6. Approve or reject the exact Node 22 distribution and checksum for the box.
7. Get the token-permission and branch-check evidence from the engineer (Jabr), plus the owner of the daily task.
