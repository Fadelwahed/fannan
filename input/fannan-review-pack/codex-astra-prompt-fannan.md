# Codex prompt: review and rewrite Fannan's design-bot plan (GPT-6 Astra)

Prepared by Bayan for Fadel, Fri Oct 16, 2026, about 2:05 AM (Gaza time). Based on Rayyan's goal (`codex-goal-fannan.md`); every rule and requirement in it is kept.

**Recommended setting:** Codex, model GPT-6 Astra, reasoning **High**. This is a careful rewrite that needs judgment and has many cross-checks; OpenAI's GPT-6 guide puts careful review at High and says to try Extra High only if High falls short. If Astra isn't available on the plan, use GPT-6.1 Sol at High.

**How to use:** attach `fannan-review-pack-for-codex.zip`, then paste everything below the line as the first message.

**How Astra differs from the other Codex models (OpenAI, checked Oct 15, 2026):**
- It asks focused questions when an answer could change the outcome, and it tends to over-check. The prompt therefore says exactly what it may decide alone and what must come back as a question.
- If you don't answer its questions, it proceeds with sensible assumptions but waits on consequential decisions. The prompt tells it which decisions count as consequential.
- It defaults to lists and tables. The prompt asks for prose in the plan where prose reads better.
- It needs Codex CLI 0.153.0 or newer.
- OpenAI says overly specific instructions can now hurt results. The prompt gives goals and checks, not step-by-step recipes.
- Astra Ultrafast is only on Pro $500 and some Enterprise plans; normal speed is fine for this job.

---

## Your assignment

Rewrite the plan for Fannan, our UI/UX design bot, so that he produces design a skilled human designer would sign off on, which doesn't look AI-made, and which the project's engineer, QA gate and writer can act on without asking a question. Return the full plan, fixed or rewritten from scratch.

**Done means:** you return all 7 deliverables listed at the end, in that order; every rule under "Rules that must stay" is kept; all 7 round-5 P1s are closed; nothing is invented; and anything you did not run is marked untested.

## Context and inputs

The attached zip holds the review pack.
- Start with `fannan-review-pack/CODEX-START-HERE.md`, then read `FANNAN-FINAL-PLAN.md` (the plan to rewrite) and `fannan-panel-round5.md` (the open findings).
- `skills/`, `skills-proposed/`, `tools/`, `trust/`, `RENAME-proto-to-design.md` and the `MANIFEST`/`PINNED` files are the current skill set, the rename plan and the integrity files.
- `live-skills-snapshot/` is what is installed now, for reference only.
- `fannan-complete-for-review.md`, earlier panel rounds and `fannan-fixes-round*.md` are history. Use them to understand closed findings; don't reopen any of them.
- Ignore every file ending in `.bak-*`. They are superseded backups.
- `example-project-digital-cloud-*` files are one example project. Use them only to test that the plan works on a real project, and label them as an example anywhere they appear.

The plan is already safe and well governed. Keep that; raise the design quality and make every step actionable.

## What the rewritten plan must deliver

1. **A point of view traced to the brief.** Each project gets one confident visual idea drawn from its brief, its audience and its real content. Every design decision traces to a line in the brief (an audience, job or goal), and the critic rejects any section that can't name the brief line it serves.

2. **No AI look, as testable checks.** Turn the patterns below into pass/fail checks with a pass mark and evidence, computed from tokens, the DOM or screenshots wherever possible, and wire them into the pre-handoff check rather than a separate document:
   - no more than one centered section per page;
   - the accent colour covers no more than about 10% of the area;
   - no more than N type sizes (you set N and justify it);
   - no centered three-icon feature rows;
   - no generic gradient hero, stock glassmorphism or default rounded-card grid;
   - no purple-blue default palette;
   - no decoration without a job;
   - no dashboard tropes: a row of KPI cards, icon soup, status shown only by colour, or fake live tickers.

3. **No AI copy.** Copy comes before layout. Use real copy from the brief or the writer, never lorem ipsum or invented headlines. A missing line shows as a visible `[placeholder]`, and the handoff lists every placeholder. The checks fail on:
   - filler words such as "unlock", "seamless", "empower" and "cutting-edge";
   - rule-of-three taglines;
   - a vague hero line above three icon cards;
   - any stat or quote without a source.
   Every claim traces back to a checked fact. Never invent numbers, client names, logos, quotes or claims; use only facts marked confirmed in the project's files, and check the project's rules file for wording rules (names, location, partners) before showing any copy.

4. **Craft.** A real type scale and pairing, deliberate spacing and rhythm, a grid that breaks on purpose, and a restrained palette with one strong accent. Motion appears only where it explains something, and each motion spec gives duration, easing, trigger and a reduced-motion fallback. Every text slot has a character range and handles the project's languages and text directions, including longer translations and right-to-left text. The layout flexes to fit the text; copy is never cut.

5. **A tough critic.** The critic scores copy and design together against a written rubric and real reference work, and fails a page if its headline could sit on any company's site. Scores are PASS or FAIL with evidence. When the 3-round cap is reached, the critic stops and reports to the approver; the cap never becomes a soft pass.

6. **A fixed Step 9 handoff package** from which the engineer can build every screen without asking a question. Any open question blocks the handoff. The package contains:
   - design tokens (type, spacing, colours, breakpoints) as JSON, plus a working script and config that generate the CSS variables;
   - a list of components and states per screen: default, hover, focus, disabled, empty, loading and error;
   - reference frames as 1440 px desktop exports, named by screen and state, version-pinned;
   - the final copy, or the writer's copy deck, giving each slot an ID, purpose, length limit, tone note and a screenshot of where it sits;
   - assets with sources and licences;
   - per-screen acceptance criteria, each marked BLOCK or WARN with a pass/fail check;
   - WCAG 2.2 AA evidence: contrast pairs, focus order, target sizes and alt text;
   - what the audits need: a heading outline with one H1, the intent behind each image's alt text, link and button labels that make sense on their own, and the SEO and schema intent for each page.
   Prototypes are reference only. The engineer builds into the repo and stack named in the project's settings file; Fannan never names a stack.

7. **Roles, not names.** Write "the project's engineer", "QA gate", "writer" and "approver", looked up in the project's settings file. Don't name any bot.

## Rules that must stay

- WCAG 2.2 AA is the minimum; no project rule can lower it.
- Desktop only, until the approver approves the desktop version.
- Follow the 8 design steps plus the Step 9 handoff, with Scope and authority kept as a rules section. No step skips ahead to polish: wireframes stay grayscale until the approver approves the structure.
- Code access is read-only. Ask before anything paid. There is **no spend cap anywhere**: not in any skill (design-media included) and not in memory save 8.
- Bot instructions stay generic. Project facts live only in each project's files; Digital Cloud may appear only as a labelled example.
- Tools stay swappable, not locked to one vendor.
- Skills are pinned, reviewed by Amin, and installed only with Fadel's yes.

## Technical requirements

- Close all 7 round-5 P1s: N1, N2, N5, R3-2, R3-3, R3-4 and R3-5. Don't reopen any closed finding.
- The pre-handoff check must actually pass on our machine, which runs Node 20. Either target Node 20, or make installing Node 22 part of the reviewed install step. npm packages live outside the hashed folder.
- Ship the new skill set as one atomic change: the renames, every caller that uses them, `MANIFEST.sha256` and the rename map, together. No stale `proto-*` names may remain (for example `generate-design` lines 152, 207, 253 and 315). Search the whole set for leftovers before you finish.

## What you decide and what you ask

Decide on your own, without asking: wording, structure, checks, thresholds (with a stated reason), the rubric and all skill text. Where something is unclear but low-stakes, make a sensible assumption, note it, and keep going.

Don't edit these; return any proposed change as an open question instead: the 9 steps, the tools, the approval gates and the security rules. Treat these as consequential decisions.

## How to work and check

- Read the inputs before writing. Cut anything the task doesn't need, but keep the evidence it does.
- Run what you can: the pre-handoff check, the token script, and a search for stale names. Report the command and result for each. Anything you couldn't run goes on the untested list; never describe it as passing.
- Before you return, check each item of "Done means" and each rule above against your output, and fix any miss.

## What to return, in this order

1. The full rewritten plan as one Markdown document. Use prose where it reads better than lists, and keep tables for real comparisons.
2. The rewritten skill files, in full, each kept reasonably short; put details in supporting files that load only when needed.
3. The anti-AI checklist for design and copy, wired into the pre-handoff check.
4. The critic rubric, with its checks and pass marks.
5. A changelog listing each P1 and how it was closed.
6. Your open questions for us.
7. A separate list of everything you couldn't test.

End with a three-line handoff: what changed, what you checked, and what still needs our attention.

## Latest updates from Fannan (Oct 16, 2026, 2:00 AM)
**Changes since Oct 15, 8:14 AM**
- 8:38 AM: proto-build line 13 now says "Copy comes from the project's writer". Memory saves 1, 3 and 5 are generic and point to the project's settings.md and project-rules.md.
- Both template routines (Prototype rundown, Craft scan) were deleted. Their prompts are kept word for word in fannan-retired-routines.md. Title: UI/UX Designer.
- Task page spec and mockup are in projects/task-page/. Command center reviews r1 and r2 are in projects/command-center/reviews/.
- About 6:58 AM: the box restored itself onto a new disk and fannan-memory-check.md came back as an old version. The generic update section was re-added.

**Known gaps to check**
- Memory save 8 still says "Ask before any paid job over the spend cap". It must say "Ask Fadel before anything that costs money", because there is no spend cap.
- The skill renames (proto-* to design-*) and the path moves are still waiting on the final plan.
- proto.py has no "fal find" or media resume commands. Decide whether design-media drops them or proto.py adds them.

**Questions to answer**
1. Is the shared-avatar-style rule enforceable, and what is the cleanest way to generate matching avatars from the existing style references (with Fadel's yes)?
2. Does the process need an explicit gate between step 4 (gray wireframes) and color and type work, so the no-AI-look check happens before styling?
3. Should the step 9 handoff be one checklist file that both design acceptance and QA verify against?
