# Fannan

Fannan is a UI/UX design bot. It holds two roles at once: **Lead of UI/UX** and **UI/UX employee**. As the employee, Fannan makes every design himself, from research to the engineering handoff. As the lead, he also takes in and ranks design requests, critiques other people's design work, runs the design system and the accessibility program, and checks built previews with the QA bot.

This branch, `main`, holds only the files that install and run Fannan. Reviews, plans, tests, fixtures, evidence logs and panel round records live on the [`workbench`](https://github.com/Fadelwahed/fannan/tree/workbench) branch.

**Status: not installed.** The live bot still runs the older `proto-*` skills. Installing this release is blocked until the items in [Known limits](#known-limits-and-untested-items) are closed, Amin (the security reviewer) has reviewed the exact manifest digest, and the owner (Fadel) says yes in Fannan's own chat.

## Contents

- [The two roles](#the-two-roles)
- [Hard rules](#hard-rules)
- [Skills](#skills)
- [Tools and connectors](#tools-and-connectors)
- [Workflow](#workflow)
- [The 320px reflow checker](#the-320px-reflow-checker)
- [Repository layout](#repository-layout)
- [Install](#install)
- [Configure a project](#configure-a-project)
- [Verify the release](#verify-the-release)
- [Run the tests](#run-the-tests)
- [Sync release/ from workbench to main](#sync-release-from-workbench-to-main)
- [Update and pinning policy](#update-and-pinning-policy)
- [Working with other bots](#working-with-other-bots)
- [Approvals](#approvals)
- [Known limits and untested items](#known-limits-and-untested-items)
- [Changelog summary](#changelog-summary)
- [License](#license)

## The two roles

Fannan does the design work first and leads on top of it. Leading never replaces doing.

| Role | What Fannan does |
|---|---|
| UI/UX employee | Research, user flows and information architecture, 1440px grayscale wireframes, visual and UI design, clickable reference prototypes, design tokens, and the handoff package for the engineer. He takes briefs, gives estimates and status, owns his deadlines, presents designs with the reason for each choice, revises after feedback, and keeps a decision log. |
| Lead of UI/UX | Takes in and ranks design requests, critiques other people's design work with the same rubric he uses on his own, owns the design system, runs the accessibility program, checks built previews with the QA bot, and reports to the owner. |

Fannan never passes a gate on his own review. Every gate needs his critique checklist plus an independent check from the review panel, the QA bot or the owner.

The lead duties are a proposal. Only the employee skills exist in this release.

## Hard rules

These rules have no exceptions. A design that breaks one fails.

1. Desktop first. Design the 1440px desktop first. Mobile and tablet start only after the desktop is approved.
2. WCAG 2.2 AA is the minimum.
3. No glass effects: `backdrop-filter` is not allowed.
4. Every spacing token has a unit, for example `16px` or `1rem`.
5. `desktopWidths` must include 1440.
6. Content that does not reflow at 320 CSS pixels is a hard fail.
7. Fannan is read-only on code. He never branches, commits, pushes or opens pull requests. The engineer bot (Jabr) ships code. Prototypes are reference only.
8. Fannan asks the owner before anything that costs money, every time. There is no spend cap.
9. Fix the root cause, never the symptom.
10. Never guess. Label anything not checked as UNTESTED.
11. Instructions stay generic. Country, company, client and partner facts live only in each project's brief and settings.

## Skills

The release has 16 skills in `release/skills/`. Nine are Fannan's own workflow skills. Seven are third-party skills copied in at a pinned version.

### Workflow skills

| Skill | What it does | When Fannan uses it |
|---|---|---|
| `design-setup` | Checks the pinned manifest and runtime, reads project rules and the current stage, connects the design tool, and maps the existing UI | At the start of every project and session |
| `design-process` | Runs the design steps from brief to handoff and records each gate | Every project |
| `design-research` | Gathers read-only references and keeps a discovery ledger with sources | Steps 1 and 2, and to plan the wireframe test in step 5 |
| `design-ui-map` | Reads the repo and preview, read-only, and writes `ui-map.md` with the real components, tokens, routes and copy | At setup, and when the repo changes |
| `design-prototype` | Turns a brief-backed screen idea into a clickable reference prototype and runs the pre-handoff check | Steps 4 to 7 |
| `design-canvas` | Draws or reviews screens in the design tool the project settings name | Steps 4 to 7 |
| `design-media` | Prepares or generates approved images, avatars, audio and short video through the selected media tool | Step 6, and only with the owner's yes for any paid call |
| `design-share` | Builds a private design packet or handoff and records files, evidence, cost and recipient | Reviews and step 9 |
| `design-connect` | Connects or repairs only the design tool or read-only service named in settings | When a connection fails |

### Pinned third-party skills

| Skill | What it does | When Fannan uses it |
|---|---|---|
| `frontend-design` | Shapes one visual direction from the brief through type, layout and restraint | Step 6 |
| `impeccable` | Runs the pinned, detect-only critique binary on local mockups | Step 8, after rendered mockups exist |
| `a11y-wcag-audit` | Audits a prototype against WCAG 2.2 AA with automated and manual evidence | Steps 7 and 8 |
| `shadcn` | Reads shadcn component guidance and turns it into design specs | Only when the project's stack uses shadcn |
| `stitch-design-md` | Extracts a `DESIGN.md` proposal from a Stitch project | Only when `design-tool:` is Stitch |
| `generate-design` | Generates, edits or varies Stitch screens | Only when `design-tool:` is Stitch and the stage allows it |
| `manage-design-system` | Reads, creates or updates a Stitch design system | Only when `design-tool:` is Stitch, after step 5 approval |

`release/references/` holds the shared rules the skills link to: `critic-rubric.md`, `design-quality.md`, `handoff-contract.md`, `security-and-install.md` and `example-project-check.md`.

## Tools and connectors

Every tool is a project setting, so a project can swap it without changing a skill. The values below are examples.

| Capability | Setting | Example |
|---|---|---|
| Design canvas | `design-tool` | Stitch or Figma, over MCP |
| Read site code | `code-read` | GitHub with a read-only token |
| Render and test pages | `browser` | Headless Chromium through `playwright-core`, Node 22 |
| Accessibility engine | `a11y-engine` | axe-core |
| Token build | `token-build` | Style Dictionary |
| Docs and records | `docs-store` | Google Drive or Notion |
| Task board | `task-board` | The team's bot task board |
| Library docs lookup | `docs-lookup` | Context7 |
| Paid media generation | `media-gen` | Off by default |

The gate scripts in `release/tools/` run on Node 22 (version, URL and checksum in `release/runtime/node-runtime.json`):

| Tool | What it checks or does |
|---|---|
| `width-screen.mjs`, `visibility.mjs` | The 320px reflow gate and what is actually visible at each width |
| `pre-handoff-check.mjs`, `handoff-contract.mjs` | The full pre-handoff gate and the handoff contract fields |
| `spacing-scale.mjs`, `token-references.mjs`, `designmd-to-sd.mjs`, `sd-build.mjs` | Spacing units, token references, and the Style Dictionary build |
| `axe-tags.mjs`, `focus-screen.mjs` | axe-core rules and visible focus |
| `copy-deck.mjs`, `copy-signals.mjs` | Copy against the writer's copy deck |
| `design-probe.mjs`, `probe-world.mjs`, `local-file-boundary.mjs` | The isolated browser probe and the project-only file boundary |
| `integrity.mjs`, `exceptions.mjs`, `executable-trust.mjs`, `verify-deps.mjs`, `verify-manifest.sh` | Release integrity, recorded exceptions, binary and dependency trust, and the manifest check |
| `safe-write.py`, `safe-write.sh`, `readonly-precheck.sh` | The guarded writer and the check that runs before every write |
| `launcher-impeccable.sh` | Starts the pinned Impeccable binary with a clean environment |

## Workflow

The release skills run nine steps (1 to 9). Steps 0, 10 and 11 are proposed for the lead role and are not in the skills yet.

| Step | Output | Gate | Independent check |
|---|---|---|---|
| 0 Intake (proposed) | Classified request, estimate, priority, owner | The brief exists and the approver role resolves | Owner, on a priority conflict |
| 1 Brief and success | Success criteria, page inventory | Conflicts in the brief are resolved | Owner confirms |
| 2 Content and evidence | Content inventory; missing text shown as `[placeholder]` with an owner | No invented facts | Critique checklist |
| 3 Information architecture and flows | Sitemap, task flows, one brief line per section | Every section names the brief line it serves | Panel, on request |
| 4 Wireframes | Grayscale 1440px wireframes, at least two structures compared | Structure compared against alternatives | Critique checklist |
| 5 Test and approve | Task-test findings and revisions | Owner approves the structure of each page | Owner |
| 6 Desktop visual | Visual design, tokens, all states, motion notes | Hard rules 3 to 5; contrast at AA | Automated checks |
| 7 Mobile and tablet | Reflow and touch specs | 320px reflow gate passes | Reflow gate |
| 8 Validate | Critique, accessibility and copy reports | 0 P0 and P1; every P2 fixed at the root or accepted by the owner | Panel and owner |
| 9 Handoff to the engineer | Handoff package and one acceptance checklist | `pre-handoff-check.mjs` passes; an open question, placeholder or missing approval blocks sending | Automated gate, then owner |
| 10 Design QA (proposed) | Typed defect list from the engineer's preview | No P0 to P2 before release | QA bot |
| 11 Learn (proposed) | Root-cause fixes to the system and skills | Monthly report | Owner |

Severity: P0 is critical, P1 blocks release, P2 must be fixed, P3 is minor.

## The 320px reflow checker

`width-screen.mjs` renders each page at every declared desktop width and at 320px, with JavaScript on and off, and fails any text or control that is shown at 1440 but lost, cut or reachable only by sideways scrolling at a narrower width. Cropped media (images, video, decorative shapes) is never counted as lost content. The full rules are in `release/references/design-quality.md` and `release/references/handoff-contract.md`.

The checker does not guess which control reveals hidden content. The designer declares it. Each non-default state that shows hidden content is its own page with a declaration:

```json
{"state":"menu-open","lang":"en","dir":"ltr","page":"menu-open.html","opener":"details.mnav > summary","reveals":"details.mnav .panel"}
```

- `opener` is the control that opens the state. A disabled or inert opener fails.
- `reveals` is the region the state shows. Every `aria-controls` or `popovertarget` id must resolve and agree with `reveals` in the open rendering.
- Collapsed accordion panels, menus and the other slides of a carousel pass only when a declared state of the same screen and language shows them at 1440.

Carousels are declared, not detected. A state that shows a slide adds `carousel:{root,slides}`:

- `root` is the carousel container. `slides` lists every slide, including the first.
- The target slide must be hidden in the source capture and fully shown in the declared capture.
- Geometry, role-description words and box matching never prove that something is a carousel. An explicit `aria-expanded=false` still vetoes.
- Horizontal clipping that no declaration covers fails.
- The opener of a slide state must be a native button, `input[type=button]`, `role=button` or a slide-picker `role=tab`, and it must exist in the declared state. Links and plain elements are not carousel controls.
- Every region that `reveals` matches must sit inside a registered slide.
- The `root` may be an outer wrapper around nested clipping viewports.
- The slide inventory is checked on its own. At 1440, across every capture of that screen and language, every listed slide must resolve and show content in at least one capture, and at least two different slides must be seen. A listed slide that never appears, or a missing one, fails.

## Repository layout

```
README.md
.gitignore
release/
  skills/        16 skills, one SKILL.md each
  references/    rules the skills link to
  tools/         gate scripts and guarded helpers
  runtime/       Node runtime pin, package.json, package-lock.json, dependency and browser trust, quality checks, Style Dictionary config
  memory/        FANNAN-MEMORY-PROPOSED.md, the proposed memory saves
  migrations/    rename-map.json, the proto-* to design-* rename used at install
  FANNAN-PLAN.md          the full design plan the skills link to
  INSTALL-ACCEPTANCE.md   the install checklist; every row is OPEN
  UNTESTED.md             what each round could not establish
  OPEN-QUESTIONS.md, PROVENANCE.md, CHANGELOG.md
trust/
  MANIFEST.sha256   SHA-256 of every file in release/
  PINNED.sha256     SHA-256 of MANIFEST.sha256
```

Some release documents name test, review and evidence paths such as `release/tests/` or `test-results/`. Those paths are on `workbench`.

## Install

Installing is blocked today. When the blockers are closed, follow `release/references/security-and-install.md`. In short:

1. Confirm Amin's review of the exact manifest digest and the owner's yes in Fannan's chat.
2. Stage the full release inactive, with dependencies in `/opt/fannan/deps` outside the hashed tree and the pinned Impeccable binary in `/opt/fannan/bin/`.
3. Run the manifest check, the project prechecks, the token build and a full checker run on the target host.
4. Activate the whole skill tree in one step, retire the eight `proto-*` skills, update every caller, and apply the approved memory saves.
5. Read back names, memory, hashes and paths. If anything fails, restore the full snapshot.

`release/INSTALL-ACCEPTANCE.md` lists the evidence each step needs.

## Configure a project

Each project keeps its own `settings.md` and `project-rules.md` in the project's design-output folder. Fannan reads project facts only from these files and the brief. Example settings:

```yaml
design-tool: stitch            # or figma
code-read: github-readonly     # read-only token
browser: chrome-headless       # playwright-core, pinned
a11y-engine: axe-core
token-build: style-dictionary
docs-store: google-drive       # or notion
task-board: bot-tasks
docs-lookup: context7
media-gen: off                 # paid; ask the owner each time
roles:
  engineer: <bot>
  qa: <bot>
  writer: <bot>
  approver: owner
desktopWidths: [1440, 1280]    # must include 1440
mobileWidths: [320, 390]       # only after desktop approval
```

A missing role blocks the step that needs it. The approver role always resolves to the owner.

## Verify the release

Fannan runs this check at every session start (`design-setup`). Run it the same way on a fresh clone of `main`:

```bash
git clone https://github.com/Fadelwahed/fannan fannan && cd fannan
chmod 0444 trust/MANIFEST.sha256
release/tools/verify-manifest.sh "$PWD/trust/MANIFEST.sha256" "$PWD/release" "$(cut -d' ' -f1 trust/PINNED.sha256)"
```

Expected output: `MANIFEST OK (<n> files)`. The script fails on a changed, missing or extra file, a symlink, a writable manifest or a pin mismatch. A clone does not keep the 0444 mode, so set it first; this does not change any bytes. In production the pin comes from Amin's review record, not from `PINNED.sha256`. The script needs GNU `realpath`, `stat` and `sha256sum`.

The older anchored verify (`scripts/package-r3.py verify`) hashes review records and evidence logs, so it runs on `workbench`. See the next section.

## Run the tests

The tests and fixtures are on `workbench`. Its `release/` files other than `release/tests/` are the same bytes as on `main`, so a test run there tests the bot on `main`.

```bash
git clone -b workbench https://github.com/Fadelwahed/fannan fannan-wb && cd fannan-wb
export PATH=/path/to/node-v22/bin:$PATH
for t in release/tests/*.test.mjs; do node --test --test-concurrency=1 "$t" || echo "FAIL $t"; done
python3 -B release/tests/test_guard_tools.py
python3 -B scripts/package-r3.py verify --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3 --registry-sha256 <digest from the latest reviews/MIMAR-R*-changes-*.md>
```

Run one test file at a time. The full pre-handoff gate stops at the missing pinned Impeccable binary; that is expected until the binary is staged.

## Sync release/ from workbench to main

`release/` syncs one way, from `workbench` to `main`. Never merge either branch into the other.

`trust/MANIFEST.sha256` on `main` starts with the paths this branch covers:

```
# covers: CHANGELOG.md FANNAN-PLAN.md INSTALL-ACCEPTANCE.md OPEN-QUESTIONS.md PROVENANCE.md UNTESTED.md memory migrations references runtime skills tools
```

Those paths are `main`'s `release/`. `workbench` also has `release/tests/`, `release/VERIFICATION.md`, `release/PACKAGING.md` and `release/REVIEW-RESPONSE.md`. Leave those four on `workbench`.

After the covers line, `trust/MANIFEST.sha256` has one sorted line per file: `<sha256>  <path relative to release/>`, two spaces, the text form GNU `sha256sum` prints. `trust/PINNED.sha256` is one line: `<sha256 of MANIFEST.sha256>  MANIFEST.sha256`.

1. Land the work on `workbench` first, including round records and tests.

2. From a fresh clone, branch off `main`. Replace `<round>` with the round you are syncing.

```bash
git clone https://github.com/Fadelwahed/fannan fannan && cd fannan
git switch -c sync/<round> origin/main
```

3. Copy only the covered paths from `workbench`. Check out each covered path. Do not check out `release` as a whole.

```bash
git fetch origin workbench
git checkout origin/workbench -- \
  release/CHANGELOG.md \
  release/FANNAN-PLAN.md \
  release/INSTALL-ACCEPTANCE.md \
  release/OPEN-QUESTIONS.md \
  release/PROVENANCE.md \
  release/UNTESTED.md \
  release/memory \
  release/migrations \
  release/references \
  release/runtime \
  release/skills \
  release/tools
```

Never copy `release/tests`, `release/VERIFICATION.md`, `release/PACKAGING.md` or `release/REVIEW-RESPONSE.md`.

4. Regenerate the manifest and the pin from inside `release/`, make the manifest read-only, and run the checker. A fresh clone leaves `trust/MANIFEST.sha256` writable; `chmod` runs after the new bytes are written. The checker prints `MANIFEST OK (<n> files)` when the bytes, the covers list and the pin agree.

```bash
cd release
{
  echo '# covers: CHANGELOG.md FANNAN-PLAN.md INSTALL-ACCEPTANCE.md OPEN-QUESTIONS.md PROVENANCE.md UNTESTED.md memory migrations references runtime skills tools'
  find CHANGELOG.md FANNAN-PLAN.md INSTALL-ACCEPTANCE.md OPEN-QUESTIONS.md PROVENANCE.md UNTESTED.md memory migrations references runtime skills tools -type f | LC_ALL=C sort | xargs sha256sum
} > ../trust/MANIFEST.sha256
( cd ../trust && sha256sum MANIFEST.sha256 > PINNED.sha256 )
chmod 0444 ../trust/MANIFEST.sha256
cd ..
release/tools/verify-manifest.sh "$PWD/trust/MANIFEST.sha256" "$PWD/release" "$(cut -d' ' -f1 trust/PINNED.sha256)"
```

Checked on 22 October 2026 on a clean clone of main at 4ac681a: the snippet rewrote `trust/MANIFEST.sha256` and `trust/PINNED.sha256` byte for byte (empty `git diff -- trust/`), `verify-manifest.sh` printed MANIFEST OK (62 files), and the step 5 diff against workbench at cecf229 printed nothing. A second run in the same tree needs `chmod u+w trust/MANIFEST.sha256` before the redirect.

5. From the clone root, check `release/` against a `workbench` checkout. Exclude the four workbench-only paths. No output means the covered trees match.

```bash
git clone -b workbench https://github.com/Fadelwahed/fannan ../fannan-wb
diff -r \
  --exclude=tests \
  --exclude=VERIFICATION.md \
  --exclude=PACKAGING.md \
  --exclude=REVIEW-RESPONSE.md \
  release ../fannan-wb/release
```

6. Open one focused pull request to `main`. The new pin needs Amin's review before any install. Only Fadel merges.

7. Nothing flows from `main` to `workbench`. If a change was made on `main` by mistake, redo it on `workbench` first, then repeat this sync.

## Update and pinning policy

- Every skill and tool is pinned to a commit or a SHA-256.
- Amin reviews every new or changed skill, tool and pin before it is installed.
- Nothing is installed or updated without the owner's yes in Fannan's own chat.
- Any change to `release/` changes the manifest pin, so it needs a new review.
- Changes reach `main` through one focused pull request each. Review rounds and evidence go to `workbench`. Only the owner merges.

## Working with other bots

| Bot | Fannan gives | Fannan gets |
|---|---|---|
| Chief of staff (Wazir) | Status, estimates, blockers | Assignments, project settings, priorities |
| Engineer (Jabr) | Handoff package, QA defects | Preview builds, feasibility answers |
| QA (Najm) | The QA checklist from the handoff | Preview check results |
| Site operations (Rayyan) | Design fixes for audit findings | Site audits as inputs |
| Security (Amin) | Skill and tool install requests | Reviews and conditions |
| Writer | Copy slots and placeholders | Final copy |
| Prompt writer (Bayan) | Prompt requests | Model-specific prompts |
| Bot designer (Mi'mar) | Findings about Fannan's own skills | Skill and workflow updates |

When Fannan messages another bot, he passes every argument the messaging tool requires.

## Approvals

| Action | Who approves |
|---|---|
| Wireframe structure, final design, variant choice | Owner |
| Sharing, publishing or sending outside the team | Owner |
| Any spend, such as paid image generation | Owner, each time |
| Installing or updating a skill or tool | Amin reviews, then the owner says yes |
| Testing with real people | Owner |
| A breaking change to the design system | Owner |
| An exception to a hard rule | Not allowed |
| Code changes | The engineer builds, QA passes, the owner merges |

Fannan acts only on approvals the owner gives in Fannan's own chat.

## Known limits and untested items

- **Not installed.** Every row in `release/INSTALL-ACCEPTANCE.md` is OPEN.
- **Safe writer refuses writes on hosts where `/workspace` is not owned by root.** `release/tools/safe-write.py` requires root ownership of the output root.
- **Impeccable pin mismatch.** The launcher pins SHA-256 `3d31ec1a664ac35c815ea1d7c10abad1155ce364d0f461157eb837a34368efb6` (engine v0.1.14). No staged binary matches it, so the full gate stops there by design.
- **Engineer's read-only token not proven.** No proof that the code-read token is read-only has been recorded.
- **Carousel libraries untested.** The declared-carousel contract has not been tested against Swiper, Splide, Embla, Slick or Flickity markup.
- **No CI yet.** There is no `.github/workflows/` on this branch; every test is run by hand. CI workflows are proposed in separate pull requests.
- **No branch protection on `main`.** The only-the-owner-merges rule is a team rule, not a GitHub setting.
- **Repository visibility.** The repository is public. Earlier versions of this README called it private. The owner has not yet confirmed which is intended.
- `release/UNTESTED.md` lists every item each review round could not establish.

## Changelog summary

Rounds R18 to R35 hardened the 320px reflow checker. Full records are on `workbench` in `reviews/` and `release/CHANGELOG.md`.

| Round | Change |
|---|---|
| R18 to R28 | Visibility rules, loss accounting by DOM node, role swaps at narrow widths, and 582 real-world-style test runs whose results (223 pass) stayed the same from R28 on |
| R29 | States declare `opener` and `reveals`; the checker verifies them instead of guessing |
| R30 | 18 P2 and 1 P3 fixed: an open dialog counts as open, disabled or inert openers fail, opacity 0 counts as not visible |
| R31 | 8 P2 and 4 P3 fixed |
| R32 | 9 P2 and 2 P3 fixed, including structural-only carousel detection |
| R33 | 8 carousel fixes |
| R34 | Carousels must be declared with `carousel:{root,slides}`; the guessing code was deleted |
| R35 | Fixes for the R35 findings (8 P2, 1 P3), including inner clipping viewports, broad reveal selectors, non-button carousel controls, desktop cards that become a mobile carousel, and the anchored verify on a clean clone |

## License

This repository has no license file. No license is granted.
