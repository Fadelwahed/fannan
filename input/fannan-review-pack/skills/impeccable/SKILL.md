---
name: impeccable
description: Use when the user wants to design, redesign, shape, critique, audit, polish, clarify, distill, harden, optimize, adapt, animate, colorize, extract, or otherwise improve a frontend interface. Covers websites, landing pages, dashboards, product UI, app shells, components, forms, settings, onboarding, and empty states. Handles UX review, visual hierarchy, information architecture, cognitive load, accessibility, performance, responsive behavior, theming, anti-patterns, typography, fonts, spacing, layout, alignment, color, motion, micro-interactions, UX copy, error states, edge cases, i18n, and reusable design systems or tokens. Also use for bland designs that need to become bolder or more delightful, or loud designs that should become quieter. Not for backend-only or non-UI tasks. Not for WCAG audits (use a11y-wcag-audit), shadcn component work (use shadcn), or Stitch generation (use stitch::*); not for writing DESIGN.md (DESIGN.md is written by hand to the Google spec and checked with design.md lint); not for live browser mode or generate.
version: 4.5.2
user-invocable: true
argument-hint: "[shape · audit|critique · animate|bolder|colorize|delight|layout|overdrive|quieter|typeset · clarify|distill · harden|onboard|optimize|polish · init|extract] [target]"
license: Apache 2.0
allowed-tools:
  - Bash(/home/box/agent-data/workflows/impeccable/scripts/impeccable *)
---

## Fannan local overrides (added at install; these win over anything else in this skill)
- **Desktop only.** Design desktop (1440 wide) only. Never create or adapt mobile or tablet layouts until the project's approver approves the desktop design, per the brief, and the brief's current step allows mobile.
- **Write only to the design-output folder** `/workspace/design-output/<project>/`, and run `readonly-precheck.sh <path> <project>` before every write (mandatory). Never write, edit or run tools inside a project repo. Report problems in source code to the project's engineer; never fix them.
- **Precedence:** project rules > accessibility > DESIGN.md (Google spec) > impeccable > frontend-design > tool defaults. **WCAG 2.2 AA is a floor:** no rule, including a project rule, may lower it.
- **No invented copy, facts or client details.** Copy comes from the project's writer; mark placeholders. Never keep project facts in memory; read the project's files each time.
- **Gates.** Nothing is shared, published, spent, sent, deleted, installed or changed on the system without Fadel's written yes in Fannan's own chat.

This skill gives you the tools and permission to create design that earns to be called out-of-distribution craft: Whereas before, your design work would have been safe, timid and measured, you now approach every design task as an award-winning design director with impeccable understanding for what makes exceptional design work: production-grade code, peak creativity, a clear POV, deep understanding of the needs of the client and users, and exceptional craft.

Core principles:
- Go all out. No hedging, no shortcuts. The deliverable must be complete (except assets the user must provide).
- Dream big and bold. Distinct, beautiful, outstanding and highly inspiring work.
- Verify in bounded passes, not a loop, and the ceiling covers the whole cycle: screenshots, defect scans, micro-edits, and rebuilds alike. Build fully, inspect once with a batched round (desktop only, at 1440 and the project's other desktop widths), fix everything it shows in one batch, confirm with at most one more round, and stop polishing. Open-ended self-QA burns the user's money doing worse what the finish handoffs do better.

## Setup

1. **Context (Fannan):** the launcher allows only `detect` and `--version`, so `impeccable context` is not run. Read the project's PRODUCT.md (written from the brief) and DESIGN.md directly from the design-output folder; never invent missing context. Use `detect` on local mock files only.
2. Load the request's playbook: its Commands-table reference for an explicit/implied sub-command, or [reference/new-work.md](reference/new-work.md) for a new surface or replacement visual world. Inspect target and incumbent visual truth before editing. When the app cannot run, start with committed visual-regression goldens or screenshot fixtures; verify target and freshness against current tokens, CSS, components, or assets, resolve conflicts, and compare theme/variant captures.
3. After resolving analysis and direction, read [reference/craft-floor.md](reference/craft-floor.md) immediately before any UI edit, including small refinements. It carries the quality floor, the absolute bans, and the reflexes no detector catches. Do not load it for planning-only work.

**Launcher unavailable:** On refusal or failure, send a separate message **before the next tool call**: “Context loading did not run; I’ll read the existing project context directly.” Then read existing PRODUCT.md and DESIGN.md without inventing missing context, follow applicable steps 2–3, and continue through permitted tools. This applies to planning and editing; launcher failure alone does not block either.

## How to design

- **The brief wins.** Honor pinned aesthetics, eras, materials, fonts, and palettes even when they conflict with a saturated-pattern warning. Redirecting a clear brief toward your taste is failure.
- **Refinement preserves; redesign replaces.** Refinement keeps the incumbent identity, behavior, copy, and everything outside scope. Ask before replacing factual copy or adding claims. Redesign keeps product truth, content, function, native affordances, and constraints, but treats the old look as evidence and anti-reference; choose a replacement world in new-work and replace DESIGN.md. Never split the difference into polish on the discarded look.
- **Loaded symbols stay out of the decoration.** A subject's world does not license emblems tied to militarism, supremacy, or hate movements as motifs, badges, or ornament, such as the Rising Sun flag's rays, the Confederate battle flag, or Nazi-era insignia and their stylised variants; reach for that world's neutral forms instead. Content that documents such a symbol as fact stays as it is.
- **Visual authority is evidence, not a filename.** Missing DESIGN.md alone does not make a project greenfield; new-work decides whether to preserve, expand, or replace the incumbent world.

## Modes

The mode names what the visitor's success looks like on this surface.

- **Persuade:** the visitor decides and acts; design is the product. Landing pages, marketing, campaigns, pricing. Earn attention and action. Ship real imagery when the brief needs it; follow the committed world, not category habit.
- **Operate:** the visitor completes a task. App UI, dashboards, editors, admin, settings, tools. Scanability, consistency, native expectations, and the real usage scene outrank expression. Brand lives in precise details.
- **Read:** the visitor understands something. Docs, articles, guides, help, changelogs. Structure for comprehension, then make the reading experience worth staying in.
- **Experience:** the visitor is inside the work itself. Portfolios, galleries, showcases. Let the artifact lead from the first viewport; the interface recedes.

Choose the mode from the requested surface, not the product, and persist it only in that surface brief. A tool's landing page is still Persuade; a fashion house's documentation is still Read; a docs index is Read, not Persuade. See [new-work.md](reference/new-work.md) for new surfaces and [operate.md](reference/operate.md) for deeper Operate/Read guidance.

## Commands

| Command | Category | Description | Reference |
|---|---|---|---|
| `craft [feature]` | Build | Deprecated alias for an ordinary new-work request | [reference/craft.md](reference/craft.md) |
| `shape [feature]` | Build | Plan UX/UI before writing code | [reference/shape.md](reference/shape.md) |
| `init` | Build | Capture durable product context in PRODUCT.md | [reference/init.md](reference/init.md) |
| ~~`document`~~ | — | **Disabled for Fannan** (launcher refuses or rule forbids; see Local rules) | — |
| `extract [target]` | Build | Pull reusable tokens and components into design system | [reference/extract.md](reference/extract.md) |
| `critique [target]` | Evaluate | UX design review with heuristic scoring | [reference/critique.md](reference/critique.md) |
| `audit [target]` | Evaluate | Technical quality checks (a11y, perf, responsive) | [reference/audit.md](reference/audit.md) · native: [reference/audit.native.md](reference/audit.native.md) |
| `polish [target]` | Refine | Final quality pass before shipping | [reference/polish.md](reference/polish.md) |
| `bolder [target]` | Refine | Amplify safe or bland designs | [reference/bolder.md](reference/bolder.md) |
| `quieter [target]` | Refine | Tone down aggressive or overstimulating designs | [reference/quieter.md](reference/quieter.md) |
| `distill [target]` | Refine | Strip to essence, remove complexity | [reference/distill.md](reference/distill.md) |
| `harden [target]` | Refine | Production-ready: errors, i18n, edge cases | [reference/harden.md](reference/harden.md) |
| `onboard [target]` | Refine | Design first-run flows, empty states, activation | [reference/onboard.md](reference/onboard.md) |
| `animate [target]` | Enhance | Add purposeful animations and motion | [reference/animate.md](reference/animate.md) |
| `colorize [target]` | Enhance | Add strategic color to monochromatic UIs | [reference/colorize.md](reference/colorize.md) |
| `typeset [target]` | Enhance | Improve typography hierarchy and fonts | [reference/typeset.md](reference/typeset.md) |
| `layout [target]` | Enhance | Fix spacing, rhythm, and visual hierarchy | [reference/layout.md](reference/layout.md) |
| `delight [target]` | Enhance | Add personality and memorable touches | [reference/delight.md](reference/delight.md) |
| `overdrive [target]` | Enhance | Push past conventional limits | [reference/overdrive.md](reference/overdrive.md) |
| `clarify [target]` | Fix | Improve UX copy, labels, and error messages | [reference/clarify.md](reference/clarify.md) |
| ~~`adapt [target]`~~ | — | **Disabled for Fannan** (launcher refuses or rule forbids; see Local rules) | — |
| `optimize [target]` | Fix | Diagnose and fix UI performance | [reference/optimize.md](reference/optimize.md) |
| ~~`live`~~ | — | **Disabled for Fannan** (launcher refuses or rule forbids; see Local rules) | — |
| ~~`generate [n] [action] [element]`~~ | — | **Disabled for Fannan** (launcher refuses or rule forbids; see Local rules) | — |

Routing:

- **No argument:** read [routing.md](reference/routing.md) and present its context-aware menu; never auto-run a command.
- **Explicit or clearly implied request to run a command:** load its reference (native variant on native platforms) and follow it. Ask once if two commands fit.
- **Workflow or command-selection question:** read [Workflow questions](reference/routing.md#workflow-questions).
- **Otherwise:** treat the request as general design work. Missing PRODUCT.md routes a new surface or replacement world through init, then new-work; a narrow refinement of existing code proceeds on the incumbent implementation as `impeccable context` directs, offering init afterward rather than blocking on it.
- `teach` aliases `init`. `craft` is a deprecated alias for ordinary new-work and adds nothing. `shape` owns task discovery, then enters new-work only for visual-world and surface-concept decisions.

After init writes PRODUCT.md, resume without rerunning `impeccable context`; init loads the native platform reference itself when the platform it recorded is `ios`, `android`, or `adaptive`.

**Pin / Unpin:** disabled for Fannan (the launcher refuses `pin`).

**Hooks, Doctor:** disabled for Fannan (the launcher refuses `hooks` and `doctor`). Report a `CONTEXT_STALE` directive to Fadel; never act on it.

**Never repair drift as a side effect of a design task.** A `CONTEXT_STALE` finding is reported, not acted on, unless the user asks. The one exception is a finding marked `auto`, which the next write to that file performs anyway.
## Local rules (added at install)
- The engine is pinned: `IMPECCABLE_BIN` points to engine-v0.1.14 linux-x64, sha256 3d31ec1a664ac35c815ea1d7c10abad1155ce364d0f461157eb837a34368efb6. The launcher checks this sha256 on every run and fails closed. There is no download fallback.
- **Allowlist launcher:** only `--version` and `detect <local files>` (flags: --json, --quiet, --no-advisory, --no-config, --no-inline-ignores, --no-design-system, --scope). Everything else is refused, including every `live*` verb, `generate`, `skills …`, `ignores`, `hooks`, `doctor`, `pin`, `install`, `update`, `link`, `check`, `document`, `context`, URLs and `--viewport`. It copies the binary to a private temp folder, hashes that copy and runs that same copy. Never use `npx impeccable`.
- Live browser mode is disabled (it writes project source files). Variants are made in the design tool or as mocks in the design-output folder, and Fadel picks.
- `adapt` is disabled while the project is desktop only.
- PRODUCT.md is the project brief: if the project has a brief, write PRODUCT.md from it (one source) into the design-output folder; do not ask for a second brief.
- All output goes to `/workspace/design-output/<project>/`; never edit repo files.
