# Fannan

Fannan is a UI/UX design bot. It holds two roles at once: **Lead of UI/UX** and **UI/UX employee**. As the employee, Fannan makes every design himself, from research to the engineering handoff. As the lead, he also takes in and ranks design requests, critiques other people's design work, runs the design system and the accessibility program, and checks built previews with the QA bot.

This repository holds the files that install and run Fannan. Install only after the [install prerequisites](#install-prerequisites) are met, Amin (the security reviewer) has reviewed the exact manifest digest, and the owner says yes in Fannan's own chat.

## Contents

- [The two roles](#the-two-roles)
- [Standing rules](#standing-rules)
- [Skills](#skills)
- [Tools and connectors](#tools-and-connectors)
- [Workflow](#workflow)
- [The 320px reflow checker](#the-320px-reflow-checker)
- [Repository layout](#repository-layout)
- [Install](#install)
- [Configure a project](#configure-a-project)
- [Verify the release](#verify-the-release)
- [Update and pinning policy](#update-and-pinning-policy)
- [Working with other bots](#working-with-other-bots)
- [Approvals](#approvals)
- [Install prerequisites](#install-prerequisites)
- [License](#license)

## The two roles

Fannan does the design work first and leads on top of it. Leading never replaces doing.

| Role | What Fannan does |
|---|---|
| UI/UX employee | Research, user flows and information architecture, 1440px grayscale wireframes, visual and UI design, clickable reference prototypes, design tokens, and the handoff package for the engineer. He takes briefs, gives estimates and status, owns his deadlines, presents designs with the reason for each choice, revises after feedback, and keeps a decision log. |
| Lead of UI/UX | Takes in and ranks design requests, critiques other people's design work with the same rubric he uses on his own, owns the design system, runs the accessibility program, checks built previews with the QA bot, and reports to the owner. |

Fannan never passes a gate on his own review. Every gate needs his critique checklist plus an independent check from a separate critic, the QA bot or the owner.

The skills in this release cover the employee role (steps 1 to 9). The lead duties have no skills yet.

## Standing rules

There are no style bans. Type scale, colour and accent use, centring, layout patterns, effects such as glass, and word choice are design decisions Fannan makes and explains, and the critic and the owner judge them. What stays fixed is the floor and how he works:

1. WCAG 2.2 AA is the minimum. This includes reflow at 320 CSS pixels (WCAG 1.4.10).
2. Facts and claims are confirmed; nothing is invented.
3. Every spacing token has a unit, for example `16px` or `1rem`, and tokens are valid.
4. Fannan is read-only on code. He never branches, commits, pushes or opens pull requests. The engineer bot (Jabr) ships code. Prototypes are reference only.
5. Fannan asks the owner before anything that costs money, every time. There is no spend cap.
6. Fix the root cause, never the symptom.
7. Never guess. Label anything not checked as UNTESTED.
8. Instructions stay generic. Country, company, client and partner facts live only in each project's brief and settings.

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

`release/references/` holds the shared rules the skills link to: `design-method.md` (the authority rules, the nine steps, the screen loop and feedback handling), `critic-rubric.md`, `design-quality.md`, `handoff-contract.md` and `security-and-install.md`.

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
| `copy-deck.mjs` | Copy against the writer's copy deck |
| `design-probe.mjs`, `probe-world.mjs`, `local-file-boundary.mjs` | The isolated browser probe and the project-only file boundary |
| `integrity.mjs`, `exceptions.mjs`, `executable-trust.mjs`, `verify-deps.mjs`, `verify-manifest.sh` | Release integrity, recorded exceptions, binary and dependency trust, and the manifest check |
| `safe-write.py`, `safe-write.sh`, `readonly-precheck.sh` | The guarded writer and the check that runs before every write |
| `launcher-impeccable.sh` | Starts the pinned Impeccable binary with a clean environment |

## Workflow

The skills run nine steps (1 to 9). The full rules for each step are in `release/references/design-method.md`.

| Step | Output | Gate | Independent check |
|---|---|---|---|
| 1 Brief and success | Success criteria, page inventory | Conflicts in the brief are resolved | Owner confirms |
| 2 Content and evidence | Content inventory; missing text shown as `[placeholder]` with an owner | No invented facts | Critique checklist |
| 3 Information architecture and flows | Sitemap, task flows, one brief line per section | Every section names the brief line it serves | Independent critic, on request |
| 4 Wireframes | Grayscale 1440px wireframes, at least two structures compared | Structure compared against alternatives | Critique checklist |
| 5 Test and approve | Task-test findings and revisions | Owner approves the structure of each page | Owner |
| 6 Visual design | Visual design, tokens, all states, motion notes | Valid tokens; contrast at AA | Automated checks |
| 7 Other widths and devices | Mobile, tablet and reflow specs, in the order the product needs | 320px reflow gate passes | Reflow gate |
| 8 Validate | Critique, accessibility and copy reports | 0 P0 and P1; every P2 fixed at the root or accepted by the owner | Independent critic and owner |
| 9 Handoff to the engineer | Handoff package and one acceptance checklist | `pre-handoff-check.mjs` passes; an open question, placeholder or missing approval blocks sending | Automated gate, then owner |

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
trust/
  MANIFEST.sha256   SHA-256 of every file in release/
  PINNED.sha256     SHA-256 of MANIFEST.sha256
```

## Install

Follow `release/references/security-and-install.md`. In short:

1. Confirm Amin's review of the exact manifest digest and the owner's yes in Fannan's chat.
2. Stage the full release inactive, with dependencies in `/opt/fannan/deps` outside the hashed tree and the pinned Impeccable binary in `/opt/fannan/bin/`.
3. Run the manifest check, the project prechecks, the token build and a full checker run on the target host.
4. Activate the whole skill tree in one step, retire the eight `proto-*` skills (the rename table is in `security-and-install.md`), update every caller, and apply only the memory saves the owner approved.
5. Read back names, memory, hashes and paths. If anything fails, restore the full snapshot.

The acceptance checklist in `security-and-install.md` lists the evidence each step needs.

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
desktopWidths: [1440, 1280]    # 1440 is the checker's reference rendering
mobileWidths: [320, 390]
```

A missing role blocks the step that needs it. The approver role always resolves to the owner.

## Verify the release

Fannan runs this check at every session start (`design-setup`). Run it the same way on a fresh clone of `main`:

```bash
git clone https://github.com/the ownerwahed/fannan fannan && cd fannan
chmod 0444 trust/MANIFEST.sha256
release/tools/verify-manifest.sh "$PWD/trust/MANIFEST.sha256" "$PWD/release" "$(cut -d' ' -f1 trust/PINNED.sha256)"
```

Expected output: `MANIFEST OK (<n> files)`. The script fails on a changed, missing or extra file, a symlink, a writable manifest or a pin mismatch. A clone does not keep the 0444 mode, so set it first; this does not change any bytes. In production the pin comes from Amin's review record, not from `PINNED.sha256`. The script needs GNU `realpath`, `stat` and `sha256sum`.

## Update and pinning policy

- Every skill and tool is pinned to a commit or a SHA-256.
- Amin reviews every new or changed skill, tool and pin before it is installed.
- Nothing is installed or updated without the owner's yes in Fannan's own chat.
- Any change to `release/` changes the manifest pin, so it needs a new review.
- Changes reach `main` through one focused pull request each. Only the owner merges.

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
| Code changes | The engineer builds, QA passes, the owner merges |

Fannan acts only on approvals the owner gives in Fannan's own chat.

## Install prerequisites

These must be in place on the target host before activation. The full list, with owners and evidence, is the acceptance checklist in `release/references/security-and-install.md`.

- **Writer host.** `release/tools/safe-write.py` needs Linux x86_64 or aarch64 with `openat2`, and `/workspace` and `/workspace/design-output` owned by root without group or other write. It refuses to write anywhere else.
- **Impeccable binary.** Stage the binary with SHA-256 `3d31ec1a664ac35c815ea1d7c10abad1155ce364d0f461157eb837a34368efb6` (engine v0.1.14) at `/opt/fannan/bin/impeccable-linux-x64`. Without it the full pre-handoff gate stops by design.
- **Browser pin.** `release/runtime/browser-trust.json` stays `blocked` until Amin reviews the real browser path, version and SHA-256.
- **Read-only code token.** The engineer proves the code-read token is limited to Contents: read on the one project repository.
- **Branch protection.** The only-the-owner-merges rule must be enforced on `main` or covered by the daily engineer check.
- **Carousel markup.** Check the declared-carousel contract against the carousel library a project actually uses before relying on it.

## License

This repository has no license file. No license is granted.
