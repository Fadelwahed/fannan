# Panel discussion D1: Fannan judgment calls

Repo (read-only, fresh GitHub clone): /workspace/panel-discussion/fannan, branch mimar-r4-fixes, head 607b2e4 (draft PR #1, Fadelwahed/fannan).
Context files you may read (READ-ONLY, never edit/create/delete anything, no commits, pushes, installs or network):
- reviews/MIMAR-R10-changes-dacc74a.md (latest change record, decisions recorded)
- /workspace/scratch/fannan-review/COMPARISON.md (Asad's multi-tool review: Codex + Claude Code, 8 issues still open at 607b2e4)
- release/tools/design-probe.mjs, release/tools/width-screen.mjs, release/tools/pre-handoff-check.mjs, release/FANNAN-PLAN.md, release/OPEN-QUESTIONS.md, release/references/design-quality.md

Background: Fannan is a design bot whose pre-handoff gate (pre-handoff-check.mjs) runs browser probes (Playwright, Chrome) on a designed page before handoff. Owner rules: WCAG 2.2 AA is the minimum; glass (backdrop-filter) is a hard fail; 320 px reflow is a hard fail; every handoff declares settings.desktopWidths including 1440; instructions stay generic; the owner (Fadel) does NOT want to be asked design/engineering judgment calls: this panel decides them.

## Questions

(a) ACCENT FAIL-CLOSED. Current code (084d870): the accent is the first valid of --accent, --colors-accent, --colors-primary. If any declared candidate is not a valid colour, or none is declared, accentRatio/accentViewportRatio are null and null FAILS the final handoff page check and every state check. In the wireframe phase (grayscale by plan) it is only recorded (accentInvalid), not failed. Keep this? (Note from Claude Code's review: the accent is still whatever the page itself declares, so a page could declare a rarely-used colour as its accent.)

(b) 320 px REFLOW EXEMPTION SCOPE. Today width-screen.mjs exempts anything inside any overflow-x:auto/scroll ancestor (inHorizontalScroller), so ordinary text that needs sideways scrolling at 320 px passes (Codex's open finding). Proposal: the exemption covers only 2D content (table, pre/code, media (img/video/canvas/svg), maps, role=grid/table) plus an explicit data-fannan-2d attribute that is recorded in the evidence for human review; everything else inside a scroller fails. Is this the right scope under WCAG 2.2 SC 1.4.10 Reflow (and its "except for parts of the content which require two-dimensional layout for usage or meaning" exception)? Anything to add or remove?

(c) PROBE INTEGRITY AGAINST PAGE JS. Probes run with page.evaluate in the page's main world after page scripts, so page JS could monkeypatch getComputedStyle, getBoundingClientRect, querySelectorAll, canvas fillStyle, axe, etc. (partly confirmed, not exploited). Options: capture pristine natives before any page script (Playwright addInitScript / isolated world), a JS-off pass (javaScriptEnabled:false), or both. Which, and how should a mismatch between passes be treated?

(d) OTHER JUDGMENT CALLS. Name any other open judgment call you see in the plan or open findings (e.g. the axe tag set missing wcag21a; glass on html/body/::before/::after; package excludes for .env/.DS_Store; the "Digital Cloud" named example in FANNAN-PLAN.md:129 vs the generic-instructions rule; spacing-scale left/right margins) and give your position. Keep it to decisions, not a full code review.

## Reply format (exactly)
For each of A, B, C, D:
POSITION: <one line>
REASONS: <2-5 short bullets>
Then a final line: CONFIDENCE: A=<low|med|high> B=<..> C=<..> D=<..>
Keep the whole reply under 700 words. Label anything you did not verify in the code as UNVERIFIED.
