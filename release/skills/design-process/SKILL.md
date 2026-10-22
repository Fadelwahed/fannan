---
name: design-process
description: Follow the project's approved design stage from brief through the engineer handoff; use for scope, gates, and stage outputs.
---

# Scope and authority

Read `/workspace/docs/projects/<project>/settings.md`, `project-rules.md`, and the brief. The brief alone records the current step. Roles (the project's engineer, QA gate, writer, approver) come from settings. The approver must map to the owner under the existing authority record; stop for an absent or conflicting mapping, never silently delegate that authority. Fannan designs; the engineer builds in the repo and stack named there. Code access is read-only. Work only in `/workspace/design-output/<project>/`. WCAG 2.2 AA is the floor. Desktop stays grayscale through Step 5; no mobile/tablet until desktop approval and Step 7 is current. No AI or designer declares approver consent. The owner's written yes in Fannan's chat is required before paid calls, sharing, publishing, installing, deleting, or changing the system. Archive instead of deleting.

At session start verify the pinned manifest; before each write run `"$FANNAN_RELEASE/tools/readonly-precheck.sh" "/workspace/design-output/<project>/" "<project>"` and use the reviewed safe-write path. Stop on refusal. Follow [security and install](../../references/security-and-install.md). An approved gate records version/screen IDs, date, decision, open issues, next step; reopen only for a documented issue. Keep one issue list. No project facts live in skills or memory.

# Nine steps

1. **Reconcile brief and success.** Map approved/open/evidence-pending decisions, page inventory, roles, gates, visitor tasks, measurable criteria. Resolve conflicts before exit.
2. **Visitor needs, content, evidence.** Inventory writer copy, facts, claims and sources, image needs, language/direction and consent. Unknown text is a visible `[placeholder]` with owner.
3. **Information architecture.** Sitemap, task flows, section briefs, CTA destinations and real reference board. Every section names the brief line it serves.
4. **Grayscale desktop wireframes.** 1440px page set, intentional grid and content fit, annotated states. Use no color/type styling; compare genuinely open structures.
5. **Test and approve desktop wireframes.** Test tasks, capture issues, revise, obtain explicit structure approval for each page/template. Do not start Step 6 without it.
6. **Desktop visual design.** Develop one brief-derived point of view with type scale/pairing, spacing rhythm and restrained palette; document tokens, states, assets and purposeful motion.
7. **Mobile and tablet.** Only after desktop approval and when the brief says Step 7; document reflow, navigation, touch, keyboard and focus behavior.
8. **Validate, document and final design approval.** Version the full scoped set; run design/copy critic and accessibility checks, resolve blockers, record each page's approval.
9. **Handoff to engineer.** Deliver the fixed package in [handoff contract](../../references/handoff-contract.md) and a single acceptance checklist for design and QA. Run the pre-handoff gate. Any missing field, open question, placeholder, untested manual criterion, or absent approval blocks sending. Set Bot Tasks Stuck/On hold with owner and next action; notify the project's approver through the already-authorized channel (the role resolves to the owner). Prototypes are reference only.

For screen-making work use `design-prototype`; its 3–5 private variants, approver pick, read-only critic, three-round cap and stop-on-<1-point-gain remain mandatory. [Design method](../../references/design-method.md) holds the full rules for each step; [design quality](../../references/design-quality.md) and [critic rubric](../../references/critic-rubric.md) govern review.

## Gotchas

- A home-page approval does not approve the other templates. Conditional or missing approval is a blocked Step 9.
- A pass mark never overrides an open P0/P1, unresolved copy fact, or a missing human approval.
