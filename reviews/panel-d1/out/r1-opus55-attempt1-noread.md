A
POSITION: Keep fail-closed for handoff and state checks, keep wireframe phase record-only. Add one guard: the declared accent has to actually render on the page.
REASONS:
- A null accent means contrast can't be proven. Under a WCAG 2.2 AA minimum, "unprovable" should fail, not pass.
- The wireframe exemption fits the plan, since grayscale is intended there. It should still be recorded so it's visible at handoff.
- Fix the gap Claude Code found: require the accent to cover a minimum share of the viewport (accentViewportRatio above a small floor) or appear on at least one interactive element. Otherwise a page can declare a colour it barely uses.
- The candidate order (--accent, then --colors-accent, then --colors-primary) is fine. An invalid value in any declared candidate should keep failing, because it's probably a token typo.
- UNVERIFIED: I could not read the code (read permission was denied), so all of this is based on the brief.

B
POSITION: Accept the narrowed scope (table, pre/code, img/video/canvas/svg, maps, role=grid/table, plus data-fannan-2d recorded as evidence), with three changes.
REASONS:
- SC 1.4.10 exempts content that needs 2D layout, not anything that happens to sit inside a scroller. Blanket ancestor exemption is too broad.
- Only the 2D element itself is exempt, not its scrolling ancestor. Prose that scrolls sideways next to a table still fails, and so does prose inside a table cell that overflows only because of its own length (for example long unbroken strings).
- Count data-fannan-2d uses and flag when they cover a large share of the page (say, more than 30% of text nodes). Otherwise the attribute becomes a free bypass. It also shouldn't be allowed on html/body/main.
- Add role=img with an aria-label, math elements, and code editors/terminals (role=application, used sparingly). Leave out role=table on non-tabular layout divs; the check should be semantic (the element has row/column structure), not just the role attribute.
- Even exempt content must not make the whole page scroll horizontally at 320 px. It has to scroll inside its own container.

C
POSITION: Do both. Capture pristine natives via addInitScript or an isolated world for the main pass, and add a JS-off pass for layout and colour checks. Any material mismatch fails closed, with both results in the evidence.
REASONS:
- Pristine natives stop casual monkeypatching. Isolated-world evaluation (separate globals, shared DOM) is cleaner than freezing natives in the main world. Inject axe into the isolated world too.
- The JS-off pass is independent ground truth for static CSS: glass, reflow, contrast, accent. JS-rendered pages will legitimately differ, so compare only measures present in both passes.
- Mismatch handling: if the JS-on pass is better than the JS-off pass on a hard-fail measure (glass, 320 px overflow, contrast), fail and record both. If JS-off is simply missing content, mark it "not comparable" rather than failing.
- Also detect tampering directly: check that getComputedStyle and friends are still native (Function.prototype.toString of the pristine copy), and fail if the page redefined them.
- Probes measure the design rather than fight an adversary, so this approach is proportionate and doesn't need deep sandboxing.

D
POSITION: Add the missing axe tags. Fail glass on any element including html/body and pseudo-elements. Exclude secrets and junk from packages. Replace named examples with generic ones. Treat the spacing scale as a warning for left/right margins.
REASONS:
- axe tags should be wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa. Leaving out wcag21a drops checks that fall under the AA minimum. UNVERIFIED which tags the code sets today.
- Glass: check backdrop-filter, including the -webkit-backdrop-filter prefix, on html, body, ::before and ::after as well. Pseudo-element glass is the most common way it slips through. A backdrop-filter of none is fine.
- Packages: use an allowlist (or a hard exclude) covering .env*, .DS_Store, *.pem, *.key, node_modules, .git and screenshots holding real data. The packager should fail if it finds a secret-looking file. UNVERIFIED current excludes.
- The "Digital Cloud" example at FANNAN-PLAN.md:129 breaks the generic-instructions rule and should be replaced with a placeholder like "Example Co". UNVERIFIED context.
- Spacing scale: enforce it for vertical rhythm and gaps. For left/right margins, allow auto centring and values driven by max-width or clamp(), and warn rather than fail, since containers often produce off-scale side margins legitimately.
- Settings: fail if settings.desktopWidths is missing or lacks 1440, already per the owner rule. Also treat any panel decision as a written rule in OPEN-QUESTIONS.md so it isn't asked of Fadel again.

CONFIDENCE: A=high B=med C=med D=med