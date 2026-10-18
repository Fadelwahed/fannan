A
POSITION: Keep fail-closed, and add a usage check: the declared accent must actually be painted on meaningful UI (a CTA, link or focus ring), not just be declared.
REASONS:
- If the accent is missing or invalid and that counts as a pass, the contrast gate can be skipped silently. The owner's rules make a failed handoff cheaper than a false pass. In code: `design-probe.mjs:19-22` sets accentComputed to null whenever any declared candidate is invalid.
- Recording only (no fail) in the wireframe phase is correct, since that phase is grayscale by plan.
- Claude Code's gap is real: a page can declare a rarely used colour. Fix it with a usage floor, e.g. the accent colour appears on at least one interactive element. Also cross-check the most saturated colour that is actually rendered on interactive elements against the declared accent, and record any mismatch.
- The fail message should name which variable was invalid or missing, so a fix takes one step.

B
POSITION: Accept the proposed 2D-only scope, with three changes:
- Count role=grid/table only when the element really has tabular structure.
- Fail any data-fannan-2d element whose content is mostly prose, and cap how many the page can mark.
- Also require that the scroller itself fits inside 320 px and can be reached by keyboard.
REASONS:
- In SC 1.4.10 the exception is for content that needs 2D layout to be used or understood. Tables, code, maps, media and data grids fit that. Prose, nav, cards and forms do not, whatever their container is. The current blanket check in `width-screen.mjs:12` (inHorizontalScroller) is too broad. Codex's finding stands.
- pre/code fits the exception only when it is genuine code. Count pre/code only in that case and fail styled prose inside a pre.
- Long unbreakable strings (URLs, emails) outside 2D content should fail, or have to wrap via overflow-wrap.
- The scroller container must not overflow the viewport itself. A scrollable region also needs tabindex/focusability, because axe flags scrollable regions that keyboard users can't reach. This keeps "scrollable" from turning into a new way to hide content from keyboard users.
- The escape hatch stays visible to reviewers because data-fannan-2d is recorded in the evidence.

C
POSITION: Do both. Capture pristine natives with addInitScript in an isolated world, and run a JS-off pass. Any metric that differs in a way that matters for safety fails closed as "integrity mismatch". Differences that are only cosmetic are recorded.
REASONS:
- If probes run through an isolated world (via CDP), page scripts can't patch the probes' globals. That also covers axe, loaded in that world (UNVERIFIED whether Playwright's evaluate on a utility world is exposed cleanly; the CDP Page.createIsolatedWorld fallback works).
- The JS-off pass has two jobs. It catches pages that look fine only after JS runs, and it gives a baseline for progressive enhancement.
- A JS-off result isn't valid for interactive states. So treat JS-on (with natives isolated) as the authoritative verdict, and use JS-off as a cross-check.
- Mismatch rule: fail the handoff if JS-off shows glass, 320 px overflow, or worse contrast, or if the JS-on result looks better than physically possible (e.g. no overflow while the scrollWidth comparison shows overflow).
- This isn't adversarial hardening against the designer. It stops a buggy or third-party script from faking a pass.

D
POSITION: Decisions on the other open items:
- Add wcag21a to the axe tags.
- Extend the glass check to html, body and ::before/::after, and treat -webkit-backdrop-filter the same way.
- Exclude .env*, .DS_Store, keys and VCS dirs from the package (deny by default).
- Replace the "Digital Cloud" example in FANNAN-PLAN.md:129 with a neutral placeholder.
- Let the spacing scale govern left/right page margins too.
REASONS:
- In code: axe runs with `['wcag2a','wcag2aa','wcag21aa','wcag22aa']` (`pre-handoff-check.mjs:110,157`). wcag21a is missing, so new 2.1 Level A rules (e.g. character key shortcuts, orientation-related ones) are skipped. AA as a minimum includes A.
- In code: the glass check (`design-probe.mjs:28`) reads computed backdropFilter on elements. Pseudo-elements are UNVERIFIED and probably missed. Glass on a ::before overlay is a common pattern and would slip through. Check getComputedStyle(el, '::before'/'::after') as well.
- Package excludes: a design bot shouldn't ship secrets or OS litter. A deny list is cheap. UNVERIFIED what the current exclude list holds.
- A named brand in the instructions breaks the generic-instructions rule and pulls outputs toward that brand. Use something like "<ClientName>".
- Margins taken from the spacing scale at each declared width (including 1440) keep layouts consistent. Arbitrary gutters are where off-scale values usually show up. One more check: every desktopWidths declaration must include 1440, and an omitted declaration fails rather than defaulting.

CONFIDENCE: A=high B=high C=med D=med