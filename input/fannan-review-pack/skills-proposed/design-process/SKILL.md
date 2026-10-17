---
name: design-process
description: >-
  Fannan's generic design process, from brief to approved design. Use to decide
  what the current task may produce. Which step a project is at lives only in
  that project's brief.
---
Generic design process (approved by Fadel, Oct 15, 2026, 4:19 AM; Step 9 and the rules-section layout approved 4:46 AM). It is design-only; implementation is the project engineer's work. Read the project's brief to find the **current step**; never assume it. Do only what that step allows.

**Rules: scope and authority (apply to every step; this is a rules section, not a step).** Fadel is the final design approver. The designer prepares options and recommendations; content owners verify facts; user evidence informs but doesn't approve; an accessibility reviewer checks the spec. A designer or AI tool can never declare owner approval. Each gate records version or screen IDs, date, decision, open issues and next step. Feedback goes into one issue list. An approved gate reopens only for a documented issue.

1. **Reconcile the brief and define design success.** Output: a one-page brief, decision map (approved / open / evidence pending), page inventory, roles and gates, visitor tasks and measurable acceptance criteria. Exit: no conflicting instructions; scope explicit; missing sources have owners.
2. **Visitor needs, content and evidence.** Output: audience and task briefs, content inventory, claim-to-source ledger, image briefs, evidence and consent backlog. Exit: each claim has a source or a visible placeholder; no invented proof.
3. **Information architecture and section briefs.** Output: sitemap, task flows, section blueprints, content outline and CTA destinations, a focused reference board. Exit: all pages accounted for and the project's structure rules met (read them in project-rules.md).
4. **Grayscale desktop wireframes.** Output: options for genuinely open sections (2 by default here; the 3–5 variant loop is for visual exploration and the project's brief may set the number), a recommended page, 1440 master with width checks, annotations, numbered states, a comparison scorecard. Exit: no brand styling, colour, font choice or mobile screens; every visual states its job.
5. **Test and approve the desktop wireframe set.** Output: test plan and notes, issue list with severity, revised wireframes, accessibility checklist, explicit sign-off per page or template. Exit: no unresolved critical task failure; a home-only approval doesn't approve other templates.
6. **Desktop visual design.** Output: hi-fi desktop screens, components and states, brand applications, assets, motion spec with static alternatives. Exit: explicitly approved; no invented claims; critical accessibility issues fixed; no new brand tokens without approval.
7. **Mobile and tablet.** Only after the project's approver approves the desktop design, per the brief, and only when the brief's current step says so. Output: smaller-screen layouts, navigation changes, reflow rules, touch, keyboard and focus states. Exit: key journeys usable; nothing depends on hover.
8. **Validate, document and final approval.** Output: versioned design package, inventory, copy and asset manifest, specs, motion and state storyboards, accessibility notes, issue log, signed approval record. Exit: every scoped page approved, or marked conditional if legal, consent or assets are pending.
9. **Handoff to the engineer for the build.** Input: the approved Step 8 package. Output: the handoff package (see "Handoff inputs" below) sent to the project's engineer, a Bot Tasks row, and the evidence bundle for QA. Exit: the engineer confirms the package is complete and buildable, or lists what's missing; Fannan fixes the gaps. The build, QA and merge then follow the project's merge rule (build passes → engineer approves → QA passes the preview → the approver merges; main protected). Fannan never builds or merges.

**Handoff inputs (required before Step 9 can start):**
- the approved design link (design tool, private) and frame names;
- the project's DESIGN.md (Google spec, `design.md lint` 0 errors) and settings.md;
- tokens (DTCG JSON from designmd-to-sd.mjs, plus the Style Dictionary CSS variables);
- the component inventory, with a spec for every component and state, and the languages and directions the project requires;
- motion notes per the project's rules (reduced-motion and no-JS states, inline fallback timing, clean-up);
- assets (SVG/WebP within the size budget) and final copy from the project's writer;
- the pre-handoff evidence bundle (evidence.json PASS, screenshots, critic summary);
- the approver's recorded approval (date, version or screen IDs).

**If any input is missing:** don't send a partial handoff. List what's missing, who owns each item and the next step; set the Bot Tasks row to "Stuck" or "On hold" and tell Fadel. A missing design link, DESIGN.md or approval record always blocks.

**Archive and retention:** follow Hafiz's archive retention rule (it belongs to Hafiz; Fannan doesn't define it). Never delete; archive instead.

Inside any step that produces screens, use the design-prototype loop: Precheck → Shape → Explore (the approver picks) → Implement → See → Critic (max 3 rounds, then escalate) → Harden → Review.
