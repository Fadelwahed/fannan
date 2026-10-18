A
FINAL POSITION: Keep the fail-closed check at handoff and record-only during the wireframe phase. Also check that the declared accent is actually used, so a page can't pass just by declaring a token.
VOTE ON MAJORITY DRAFT (rules):
- A null, invalid or missing accent fails the handoff page and every state check. The fail message names the offending variable(s). In the wireframe phase the result is recorded as "deferred", never as PASS.
- The accent must match the approved palette token (bound to the token source, as Codex proposed). It must also be painted on at least one interactive element (CTA, link, or focus ring) as background, text or border colour.
- Today usage is measured on backgroundColor only (`design-probe.mjs:23`). Record it as a proxy and extend it to color and border colours.
CHANGED FROM ROUND 1: yes, a small change. I adopt Codex's palette binding. It handles the rarely-used-colour gap better than my saturation heuristic, so I drop that heuristic.
DISSENT: none.

B
FINAL POSITION: Exempt only content that really needs 2D layout, and only the smallest region that needs it. A tag, role or data-fannan-2d makes something a candidate and records it for human review. Nothing is auto-exempt, and prose always fails.
VOTE ON MAJORITY DRAFT (rules):
- Candidates are table, real code in pre/code, maps/diagrams/canvas, role=grid/table with real tabular structure, and data-fannan-2d. Every exemption is recorded with element and reason. Prose-dominant candidates fail. Captions, headings and controls around a candidate must still reflow.
- The scroller itself must fit inside 320 px and be keyboard-reachable (focusable scrollable region). Ordinary text overflowing any auto/scroll container fails, including overflow to the right. Today the exemption only guards the left-edge check (`width-screen.mjs:12,28`, verified).
- Media that can scale down must not be exempt. Unbreakable strings outside a candidate fail unless they wrap.
CHANGED FROM ROUND 1: yes. Codex is right that markup can't prove necessity. I moved from automatic category exemptions to candidates plus recorded review, and I took the media-must-scale point.
DISSENT: a mild one with Codex. An attribute alone shouldn't block acceptance whenever its justification is unresolved. It should pass with a recorded flag for the reviewer. The owner doesn't want to be asked about every table, so only prose-dominant or overflowing candidates should block.

C
FINAL POSITION: The authoritative probes and axe run in an isolated world, with references they keep to themselves. A JS-off pass runs as a diagnostic cross-check. Contradictions on safety metrics fail closed.
VOTE ON MAJORITY DRAFT (rules):
- All probes and axe run in a Playwright utility/isolated world, or a CDP Page.createIsolatedWorld (UNVERIFIED which one Playwright exposes cleanly). Capturing natives with addInitScript alone isn't enough unless every probe uses the captured references.
- The JS-off pass covers static content only. A JS-off failure on glass, 320 px overflow or contrast for equivalent content fails the handoff with the reason "integrity mismatch". Expected hydration and interactive-state differences are recorded, not failed.
- Neither pass silently overrides the other. JS-on (isolated) decides interactive states.
CHANGED FROM ROUND 1: no on substance. I now agree that capture-only is insufficient on its own.
DISSENT: none.

D
FINAL POSITION: Close all the listed gaps now.
VOTE ON MAJORITY DRAFT (rules):
- Add wcag21a, so the tag set is every A and AA tag for 2.0/2.1/2.2 that the pinned axe supports (wcag21a is missing at `pre-handoff-check.mjs:110,157`, verified).
- The glass check covers html, body, ::before/::after, shadow roots and frames, and checks -webkit-backdrop-filter too. Today it scans only visible `body *` elements and no pseudo-elements (`design-probe.mjs:10,28`, verified). Add regression fixtures for each case.
- Packaging uses an explicit allowlist and denies .env*, keys/credentials, .DS_Store, editor and VCS files (current list UNVERIFIED). Replace "Digital Cloud" at FANNAN-PLAN.md:129 with a generic reference to the example fixture. The spacing scale governs resolved left/right/logical margins (auto, 0 and documented exceptions allowed; UNVERIFIED in code). A missing desktopWidths, or one without 1440, fails.
CHANGED FROM ROUND 1: yes, I adopted Codex's allowlist and the shadow/frame scope.
DISSENT: none.

CONFIDENCE: A=high B=high C=med D=high