# Integrated design and copy acceptance

Load at section planning, the Step 4/5 grayscale review and the Step 8 pre-handoff check. This is the rulebook for `tools/pre-handoff-check.mjs`, not an optional separate review. The machine thresholds are in `runtime/quality-checks.json`; semantic verdicts and evidence live in the same `handoff.json` used by the checker. A missing required manual check fails acceptance. Automated detectors identify measurable patterns; a human/independent critic checks meaning and visual exceptions. Neither is an authorship detector. Impeccable findings are advisory: its `pass` means the pinned detector ran and produced parseable output, not that it found no design problems. The gate separately requires the scoped critic/manual PASS records for generic heroes, rounded-card grids, dashboard tropes, decoration and other semantic criteria; absent or failed records block handoff.

## Measurement contract

The reference viewport is 1440 × 900 CSS pixels at device scale one, with a full-page screenshot as well. Visit every declared screen and applicable state. Wait for local fonts and assets; log failed or blocked loads. Keep external requests, service workers and WebSockets blocked during the local check. Capture file hashes and the version under test. A reference PNG is 1440 pixels wide and named `screen--state--locale--vNN.png`; its hash identifies the version. A screenshot from another revision cannot support a PASS.

Mark visible text wrappers with `data-copy-slot="ID"` and match every displayed string to the approved locale variant in the copy deck, including interface and error labels. Unlisted or mismatched text blocks final handoff. Declare semantic section, component, copy-slot and media IDs in the reference DOM and match them to the handoff inventory. The critic inspects the full screenshot and semantic outline so unmarked containers cannot evade a count. CSS/computed-style counts are recorded as measurements. Layout intent, claims, tasteful restraint and the purpose of an image remain reviewed judgments with an artifact, reviewer, explanation and brief line references. A guessed PASS flag is not evidence.

Where the browser test uses a proxy, label it as a proxy in `evidence.json`. In particular, DOM element rectangles do not measure the actual colored pixels of text, images, gradients or overlapping regions. For accent coverage, the documented acceptance measure is visible accent area divided by total rendered area, separately for the full page and each reviewed viewport. The reviewer supplies an annotated color mask or measured screenshot regions for image/canvas/SVG content and any disputed DOM estimate. Use union area, not summed overlapping boxes. Borderline or unmeasurable coverage remains FAIL pending evidence; do not round 10.1% down to 10%.

## Pass/fail checklist

Every row is BLOCK unless explicitly marked WARN. `wireframe` evaluates the structure/copy column; visual-only criteria are recorded as deferred, never called PASS. `handoff` requires both columns and all fourteen manual IDs listed below.

| Rule | Pass mark | Evidence and detector | Phase |
|---|---|---|---|
| Point of view | One coherent idea tied to an audience, job and goal; all three cited | `point-of-view`: brief lines, rationale and annotated recommended direction | Both |
| Section and decision trace | 100% of sections, layout breaks, token choices and expressive media name the brief line and visitor job served | `brief-trace`: section/decision ledger matched to DOM IDs and screenshot | Both; token trace after styling |
| Centering | At most one centered principal section per page | DOM computed text alignment plus composition screenshot; reviewer catches nested/unmarked groups | Both |
| Accent area | At most 10% full-page and at most 10% reviewed viewport | Declared accent token(s), computed-style proxy, screenshot measurement including accent inside media/effects | Visual |
| Type sizes | At most six distinct rendered sizes per page/locale, all mapped to named type tokens | Token list and DOM computed `font-size`; inspect pseudo-elements/SVG/canvas text manually | Visual; structural hierarchy in grayscale |
| Centered icon trio | Zero rows of three centered icon-first feature blocks | DOM grouping and screenshot; changing tags or using SVG does not exempt it | Both |
| Generic hero | Zero vague transferable headlines, including a vague headline above three icon cards | `generic-hero`: writer/critic swap test and actual hero screenshot; a headline still valid for unrelated firms fails | Both |
| Default effects | Zero generic gradient heroes and zero stock glassmorphism | Background-image/backdrop-filter detector plus screenshot; decorative effects cannot be relabelled data visuals | Both in grayscale; visual final |
| Rounded-card grid | Zero repeated default rounded-card grids | `card-grid`: actual grouped content, borders/radii and screenshot; use the content's appropriate structure | Both |
| Purple-blue default | Zero default purple-blue decorative pairing | Color-role inventory and screenshot; semantic status color is reviewed for its job, never used as a second decorative accent | Visual |
| Decoration | Every non-content mark has a named comprehension, navigation, hierarchy or identity job | `decoration-job`: asset/element ID → brief line → purpose; unsupported marks are removed | Both |
| Dashboard tropes | Zero undifferentiated KPI-card rows, icon soup, color-only status, fake live tickers | `dashboard-tropes`: task-flow review, screenshots, data/source/timestamp labels and state checks | Both |
| Copy provenance | Every slot's displayed text appears in the brief or writer's deck; every claim maps to a checked, confirmed fact | Slot source lines + source revision/hash; writer checks names/location/partners against project rules | Both |
| Copy filler | Zero occurrences of `unlock`, `seamless`, `empower`, `cutting-edge` and their listed variants in visible copy | English word-boundary and normalized Arabic cliché scan; critic read-through in every required language | Both |
| Rule-of-three tagline | Zero empty three-part slogans | Headline-only automated punctuation/conjunction screening plus mandatory `rule-of-three` semantic review; useful three-item task/data lists are not slogans | Both |
| Stats/quotes/logos | Zero unconfirmed or unlicensed proof claims | Fact ledger, exact quotation/source, permission and asset manifest; numeric regex is only a warning detector for this broader review | Both |
| Placeholders | All visible as `[placeholder]` with IDs during draft; zero at final handoff | Copy deck + rendered DOM + placeholder inventory; scan lorem ipsum, TBD and hidden substitutes | Draft recorded; final BLOCK |
| Craft | Consistent named type/spacing/grid/color roles and purposeful hierarchy | `craft`: token sheet, alignment overlay, actual content and comparative reference critique | Structural before style; complete at handoff |
| Real reference comparison | Three inspected references with dated notes and project-specific lessons | `reference-work`: source URLs, captures/notes, what to adopt and reject, brief trace | Both |
| Complete accessibility evidence | No failed applicable WCAG 2.2 A/AA criterion or unresolved automated incomplete result | `wcag-review`: axe + keyboard/screen-reader/manual checklist + reference-state captures | Both at design level; full proof at handoff |
| All states/locales and copy fit | Every requested variant accounted for; no clipping, truncation or meaningless N/A | Component matrix, real translations, 150% synthetic stress evidence, LTR/RTL review | Both at current fidelity |
| Observational improvement | Optional non-blocking preference with owner and disposition | WARN only when no contract, accessibility, truth, approval or implementation question is affected | Both |

Six sizes serve six semantic tiers without making every label another style. Ten percent makes “about ten percent” a reproducible upper bound. The rules are intentionally strict constraints requested for this bot; they do not establish universal rules of good design.

## Manual evidence that the checker requires

`manualChecks` includes `point-of-view`, `brief-trace`, `generic-hero`, `decoration-job`, `card-grid`, `dashboard-tropes`, `rule-of-three`, `reference-work`, `craft`, `wcag-review`, `accent-area`, `palette`, `rules-copy` and `language-overflow`. Every record identifies its screen, language and state, PASS/FAIL, reviewer, artifact path, brief line references and a concrete note. An artifact may cover several states, but each record identifies the part supporting its exact scope. The artifact contains the actual rubric/check result, screenshot references and measured values where relevant. Missing coverage for a screen is a failure even if another screen passed. A grayscale artifact records visual tests as deferred while judging structural craft; it does not sign off final color or typography.

The critic asks: with the company name masked, does the headline still express a precise offering, audience task or independently sourced distinction from this brief? Record the compared alternative categories and the reason. If it could be pasted unchanged onto arbitrary company sites, fail and return the slot to the writer. Do not replace an approved headline without the existing approval process.

For functional dashboards, derive content from the user's decisions and workflows. Use a ranked queue, trend or table when that is what the task requires; do not add a summary-card row merely because dashboards often have one. Every number requires a real source, scope and update meaning. Static sample data must be explicitly labelled as a fixture and cannot enter a real handoff as production data. “Live” requires a real documented data path; animation is not evidence.

## Accessibility evidence, accurately scoped

Record each text foreground/background pair and state. Normal text needs 4.5:1 contrast; large text needs 3:1 using WCAG's definition of large text. Contrast uses specified/computed colors, not antialiased screenshot edges. Do not round a failing ratio upward. [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

Applicable control boundaries, meaningful icons and graphical objects need 3:1 against adjacent colors. Record their actual role and applicable exceptions rather than claiming every decorative border must pass. Status also has a readable label or shape. [W3C non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

Record sequential keyboard focus, visible focus before/after, modal entry/escape/return, traps and sticky overlays. AA focus-not-obscured requires that the focused control is not entirely hidden by author content; prefer full visibility as this project's stricter usability target. Focus Appearance 2.4.13 is AAA, so do not mislabel it as the AA criterion. [W3C focus-not-obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum).

Measure actual pointer targets. A 24 × 24 CSS-pixel target is the baseline; any smaller target needs a documented qualifying spacing, equivalent-control, inline, user-agent or essential exception. Bounding boxes and an “inline” tag are only screening heuristics. [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum).

Test non-dragging alternatives for dragging operations, and accessible authentication without an unsupported cognitive test where authentication exists. If absent, record N/A with the screen inventory that proves absence. [W3C WCAG 2.2 additions](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/).

Check 200% text resizing and 400% desktop zoom/reflow (equivalent 320 CSS-pixel width), including applicable two-dimensional content exceptions. This is accessibility validation, not authorization to design phone layouts. Document browser zoom and viewport used. [W3C reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

Set the page language, mark language changes and specify base direction separately. Test real RTL content, mixed-direction identifiers, punctuation and numbers; use appropriate directional markup rather than reversing strings. [W3C internationalization guidance](https://www.w3.org/International/questions/qa-html-dir).

## Command and release decision

```sh
FANNAN_DEPS=/opt/fannan/deps \
node "$FANNAN_RELEASE/tools/pre-handoff-check.mjs" \
  /workspace/design-output/PROJECT/DESIGN.md \
  /workspace/design-output/PROJECT/reference.html \
  /workspace/design-output/PROJECT/evidence-vNN \
  PROJECT /workspace/design-output/PROJECT/handoff.json --phase=handoff
```

Use `--phase=wireframe` for the Step 4/5 structural check. Replace `PROJECT` with the validated project slug and use a fresh output directory. A nonzero result blocks. A missing protected checker binary, dependency, reference, approval or manual evidence remains a failure; never replace it with a stub in a production run. The separate test suite may stub a boundary only when its output is clearly labelled test-only and cannot masquerade as release evidence.
