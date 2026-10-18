# Mi'mar R16 changes: panel round 16 (GPT plus Mi'mar cross-check; 4 P2)

Branch `mimar-r4-fixes`, from 5fe9101 (draft PR #1). Last code/package commit: 5980d2e. Written Oct 18 2026, about 7:59 AM Gaza (UTC+3). This is the latest round record: the only file besides the registry that may stay unhashed. The R15 record (`reviews/MIMAR-R15-changes-2ab5663.md`) is now hashed in the registry.

Inputs: `reviews/panel-r16/MERGED.md` and `r1-gpt.md`. GPT labelled its rows R14-GPT-01..04 because the prompt template had a stale ID line; MERGED renames them R16-GPT-01..04. Opus (403) and Grok (402) had no balance and gave no review.
- `panel-r16/out` was copied after a secret scan: pattern grep plus the package's `secret_content()`/`junk_or_secret()`, no hits.
  - `.runner` and `.time` files are stored as `.txt`.
  - Raw `.log` files are in `test-results/r16/panel-r16-raw/`.
  - The repro scripts are in `reviews/panel-r16/repro/`.
- The twelve repro screenshots (`/workspace/panel-r16/repro/*.png`) stay on the box only, because `.png` is not an allowed suffix in the packaged or hashed paths.

**Stale prompt line:** the template line `ID (R14-GPT-NN)` is not in the repository. It lives in `/workspace/panel-r16/r1-prompt-gpt.md` (line 23); the panel runner is outside the repo. The same text appears in the frozen raw logs `test-results/r14/panel-r14-raw/r1-gpt.log` and `test-results/r15/panel-r15-raw/r1-gpt.log`, which are evidence and were left unchanged. Nothing was edited in `/workspace/panel-r16`.

Registry: `trust/R3-CHANGES.sha256` sha256 `ce873da06bdf6cd9353c9af7ed47a51bb5c636d21e5ad2c30274f61b41e849b1`. The threat model and convergence rule in `release/FANNAN-PLAN.md` are unchanged. Fadel's floors are unchanged: desktop first at 1440, WCAG 2.2 AA, no glass (the glass/backdrop-filter hard fail is untouched), spacing units, 320 px reflow plus `desktopWidths` with 1440. Starting state at 7:32 AM: the box checkout was at 5fe9101, equal to `origin/mimar-r4-fixes`, with a clean tree.

## Part A (gate), P2

| Item | Result |
|---|---|
| R16-GPT-01 | FIXED (`integrity.mjs`). `contrastProbe` reads the whole composed ancestor chain, including above an opaque background. `filter: opacity()` is composited like opacity, and identity filters are ignored. Any other filter (blur, brightness, contrast, drop-shadow, `url()`…), a blend mode, a backdrop filter or a mask makes that text unknown and counts it in a new vector field, `contrastEffects`. `compareIntegrity` makes the cross-check INCOMPLETE whenever either rendering has `contrastEffects > 0`, so it is never a silent pass. **Chrome:** a filter-opacity reveal is an `integrity mismatch`. Blur, an ancestor brightness filter, screen-blend above an opaque child, a backdrop filter and a mask are all INCOMPLETE. Identity filters pass. **Full pre-handoff run (fixture):** a blur-in reveal makes the page and its declared state INCOMPLETE. |
| R16-GPT-02 | FIXED (`integrity.mjs`). These are now contrast-checked: input and textarea values, placeholders (in the `::placeholder` colour), button-type input labels and a select's chosen option. `contentProbe` adds `controls`: every shown control, link, image or element with a role or ARIA label, with its accessible name (aria-labelledby, aria-label, `<label>`, value, alt, own text, title, placeholder) and its displayed value. **Chrome:** a submit input faded to .05 and restored by script is a JavaScript-off `contrastFailures` mismatch, and a light placeholder fails. A button value, `<label>`, `aria-label` or `aria-labelledby` text that only script supplies gives a JavaScript-off content mismatch, and pass is false. **Full run:** the faded submit is an `integrity mismatch`; the scripted label is a content mismatch. Under the existing R13 N14 rule the overall status for content differences stays INCOMPLETE, never PASS. |

## Part B (designer quality), P2

| Item | Result |
|---|---|
| R16-GPT-03 | FIXED. Contract, wireframe phase: every screen's `page` must exist, each screen needs an applicable default rendering with an existing page for every declared language, and manual records are required per screen and per declared language (not only `languages[0]`). The checker in the wireframe phase renders every declared screen/language with phase-appropriate checks; a missing rendering or page fails instead of being skipped. The exact GPT text is in Step 5 of the plan and in `handoff-contract.md`. **Full wireframe run (fixture), with a second screen and Arabic:** home/en passes, the second screen's two-H1 page fails, the missing Arabic renderings are reported, and the contract names the Arabic manual gaps. |
| R16-GPT-04 | FIXED. Added a shared component inventory, `components`: one definition per component (`id`, `variants`, `states` including default, `tokens` (empty allowed in wireframes, never at handoff), `behaviour`; optional `anatomy`/`sizes`/`usage`/`content`). Every `screens[].components[]` entry must reference it by id, may only pick declared variants and states, and any specification field it repeats must equal the shared definition. Added the manual ID `component-consistency`, PASS in both phases. The critic's final round needs `componentComparison: {screens, decision: PASS, evidence}` covering every screen. The GPT text is in Step 6 (after the opening paragraph) and mirrored in the contract guide, plus a "Cross-screen component comparison" section in the critic rubric and the design-prototype critic step. **Tests:** the same component specified differently on two screens fails (tokens, behaviour), as do an undeclared variant, an unknown component, a comparison missing a screen, a missing inventory and a missing `component-consistency` record. Equal specifications (key order ignored) pass. |

## Tests and evidence

- **Before/after logs:** `test-results/r16/R16-*-{before,after}.log`. "Before" means the R16 tests against the 5fe9101 sources, with documents and runtime JSON restored.
  - Every before run failed at an assertion: `AssertionError`, or the fixture's collected R16 expectations (`{"filterReveal":false,"fadedSubmit":false,"scriptedLabel":false,"wireframe":false}`).
  - I grepped them for load and export errors: none.
  - After: all pass.
- **Full suites** (`test-results/r16/`):
  - node 112/112
  - without deps 72 + 40 SKIPPED
  - Python guard 10
  - r2 4 + 4
  - package 38 (git) / 33 + 5 SKIPPED
  - self-test PASS
  - syntax mjs=40, 0 failures
  - offline lint 0 errors
  - fixture exit 0: the expected stop on the absent pinned Impeccable binary
  - Node 20: 106 PASS, 6 FAIL. These are the same six Style Dictionary tests as R11-R15 (they need Node 22).
- Headless Chrome 155.0.8059.84 only. Browsers were closed by the tests, and no other processes were stopped; no `pkill`.

## Untested

- R16-GPT-01: pseudo-element or SVG text, SVG `url()` filters that are in fact identities (counted unknown), canvas text. By design, text that keeps such an effect cannot pass the integrity cross-check.
- R16-GPT-02: the accessible name is an approximation, not the full algorithm. Not covered: file-selector buttons, date pickers, autofill colours, open option lists, CSS generated names.
- R16-GPT-03: links between screens inside the pages are not followed. The wireframe renderings use the default state per language only.
- R16-GPT-04: whether instances that do not repeat a specification field look consistent is reviewer judgment (`component-consistency`).
- Only GPT reviewed this round (Opus and Grok had no balance). These fixes had no second-model review.
