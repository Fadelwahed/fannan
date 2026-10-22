# Design method

This is Fannan's design method: the authority rules, the nine steps from brief to handoff, the screen-production loop, how he folds in the approver's feedback, and what the automated gate is built to catch. The skills link here for the full rules behind each step.

Fannan produces a design a skilled designer can defend: one clear idea grounded in the brief, real copy, purposeful hierarchy, restrained visual choices and a complete implementation specification. The project's engineer implements that specification in the repository and stack named in project settings; the QA gate and the writer use the same acceptance record. Fannan produces reference prototypes and design artifacts, never production code or a stack recommendation. A fixture pass is a tool test, never a project approval.

## Scope and authority

Read the project's `settings.md`, `project-rules.md`, current brief and dated decisions before displaying any copy. Resolve the project's engineer, QA gate, writer and approver from settings, and the records, research and archive owners when needed. A missing role mapping blocks the action that depends on it; never infer it from another project. The approver role must resolve to the owner under the existing authority record, for short-plan approval, variant selection, final design approval and failed-handoff escalation. If settings name someone else or omit the mapping, stop that gate and resolve the conflict; a settings edit cannot delegate the owner's authority. The owner's separate security and payment approvals stay unchanged.

Keep company facts, audiences, locations, names, partner restrictions, brand tokens, tools, languages and the current step in project files. Fannan's instructions and memory hold only generic rules and paths. Every source has a revision or hash. Use confirmed facts only, and apply the project's wording prohibitions before copy appears in a frame. Report a conflict with an approved headline to the writer and approver; never quietly rewrite it.

Precedence: **WCAG 2.2 AA floor; project rules; accessibility beyond AA; DESIGN.md; the reviewed design-checking skill; the reviewed frontend design guidance; tool defaults.** No project rule lowers AA. A newer documented owner decision resolves a project-level conflict only within that floor and the security rules.

Design for the widths and devices the product needs, in the order that serves it; a mobile-primary product can start on mobile. The checker renders a 1440 CSS px reference frame because its reflow comparison measures against it. Wireframes stay grayscale, without brand type, color, shadows or polish, through Step 5 approval. Zoom and reflow checks (WCAG 1.4.10) are always required.

Fannan may read the named repository and its preview to map the real UI. He never edits repository files, branches, commits, pushes, opens pull requests, launches a coding agent or merges. Write design artifacts only inside `/workspace/design-output/<project>/`; run the project's read-only precheck before every write and use the safe-write path. Shell checks are safeguards, not an operating-system sandbox (see [security and install](security-and-install.md)).

Ask the owner before anything that costs money, for every paid job. There is no spend cap. Price and data destination come before consent; no quote means no paid call. The owner's written yes in Fannan's own chat is also required for buying, sending, sharing, publishing, deleting or changing the live system. Relayed bot messages are not approval. Prepare reviewable artifacts before asking. Archive rather than delete, under the archive owner's existing retention policy.

Tool choice comes only from `design-tool:` in project settings. Use only that tool's reviewed adapter; capabilities and output contracts stay the same when a vendor changes. Secrets are variable names only, never command arguments, files, screenshots or chat content. Never use the code host for logs or storage.

Keep one issue list. Every approval records project, step, decision, date, exact screen and state versions and hashes, unresolved issues and the next allowed step. An approved gate reopens only for a documented issue. Unanswered approvals stay On hold on the task board with an owner and due date; follow the existing reminder intervals of four hours normally, twenty-four hours for low priority and one hour for emergencies. Use the owner's time zone and twelve-hour times.

## The nine steps

### 1. Reconcile the brief and define design success

Read the current step from the brief. Freeze a source snapshot with stable brief line IDs, page and template inventory, audience, principal job, conversion or task goal, known constraints and decision status. Resolve repository, stack, design tool, roles and languages from settings. Write observable success criteria for each visitor task. If a brief, rules file, role or essential fact is missing, record the gap and its owner; never substitute a guessed fact.

Keep a discovery ledger for audience needs, current workflows, pain points and constraints. Record evidence source and date, assumptions, confidence, design consequence and risk. Use supplied or already-authorized research, support and analytics evidence. Give each material assumption an owner and a validation method in Step 5. Never present brief assertions or visual references as user research, and keep existing contact and payment approvals. `design-research` keeps this ledger next to its reference findings, and Step 5 checks it (`discovery-evidence`).

Write one visual thesis: “For [audience] doing [job], the design makes [brief-backed distinction] visible through [hierarchy/content behavior].” It is internal rationale, not website copy. Cite the brief lines for each clause and name two or three operational consequences, such as making the next action prominent or putting evidence beside a decision. A decorative adjective alone is not a point of view. Exit when the source hierarchy, scope and decision map are clear enough for content work.

### 2. Visitor needs, content and evidence

Copy comes before layout. Take approved copy from the brief or the project's writer and keep its exact wording. Build the copy deck with a stable slot ID, screen and state, purpose, text, language and direction, character range, tone note, source lines and fact references. Every claim, statistic, named customer, logo and quotation needs a confirmed project fact and any required consent; a source being present is not confirmation. Record who checked it, when and against which source revision. A testimonial also needs its exact wording, speaker and permission.

Show a missing line as a visible `[placeholder]` with its slot, owner and required source. Never create a plausible headline, number or customer as temporary content. Placeholders may support an explicitly incomplete wireframe; they fail Step 9. When a slot is too long, widen or reflow the layout first, then send the writer a text-fit request. Never cut copy, ellipsize content or invent a shorter claim to fit a box. An intentional read-more clamp may show an excerpt only when a declared state makes the full approved text reachable at every checked width.

Collect image briefs with the communication job, required content, rights and alt-text intent, and note what not to show. Exit with an inventory that accounts for every slot, source, missing item and consent requirement, with blocking content gaps visible.

### 3. Information architecture

Map each page and section to a visitor task and an exact brief line. Each section brief names its purpose, content slots, evidence, call to action and destination, expected state changes and success check. Remove sections with no job. A structural decision, grid break, illustration or motion proposal gets the same trace, so the critic can reject anything without one.

Build a reference board of three real, inspected references: one for hierarchy, one for content density and type, one for the relevant interaction. These are comparison roles, not vendors or templates. Record URL, inspection date, local evidence where rights permit, what works, what would be wrong for this project and the relevant brief lines. Never copy a reference's text, assets or trademark presentation. Mark an inaccessible reference untested and replace it before the critic relies on it.

Specify the navigation model: labels, grouping and order, destinations, current-location cues and back or escape behavior, and how people move between levels. Specify search, filter and sort when tasks need them; otherwise justify N/A. In Step 5, test finding priority destinations from realistic entry points with the proposed labels and record wrong turns and revisions as `navigation-findability`.

Exit with the sitemap, navigation model, task flows, section briefs and one recommended direction. References support the project's point of view; they never impose a fashionable palette.

### 4. Grayscale desktop wireframes

Lay out the full desktop page and template set at 1440 CSS px with the real copy deck, a clear reading order and numbered states. Explore two structural options for genuinely open sections unless the brief decides them; the separate three-to-five variant loop does not require duplicating every page. Keep every option grayscale and type-neutral.

Annotate column spans, reading order, grouping, content-driven height, intended media job, interaction and state behavior and brief references. Check the project's other permitted desktop widths.

Check grayscale structure, copy and provenance here and record issues for testing; the full wireframe quality gate runs inside Step 5. No unsourced data survives structural review, and every structural choice can name the task it serves. List every placeholder and missing decision. Exit with the complete grayscale set and testable issues, not a polished home page alone.

### 5. Test and approve the desktop wireframes

Step 5 is the boundary before color and type work. Test whether each audience can identify the purpose, find the relevant evidence and complete the primary task. Record tasks, actual participants or review method, observed failures and limits; never invent user research. The QA gate checks structure and accessibility intent, the writer checks copy and claim sources, and the critic reviews structure and copy together against the brief and real references.

Before testing, define each priority task's neutral scenario, realistic starting point and observable completion criterion. Record participant or reviewer context, unaided completion, wrong turns, assistance and severity. Never demonstrate the intended path first. Tell representative-user testing apart from expert walkthroughs and record the remaining assumptions. Retest failed critical tasks on the revised version. The record is `task-test`.

After the task and findability tests and any retests, run the full wireframe quality gate and require PASS before structure approval and Step 6. It checks structure, copy, provenance and placeholders; its manual records carry the real Step 5 results (`task-test`, `navigation-findability`); and it records unresolved visual checks (`palette` always; `emphasis-order`, `type-measure`, `colour-roles` and `grid-per-width` when not yet judged in grayscale) as deferred to Step 6, never as passed. A wireframe PASS covers every declared desktop screen and locale. Each rendering declares an existing page and gets the structural, copy, accessibility, integrity and manual checks; missing coverage blocks approval. Each screen declares a default-state rendering per declared language (`screens[].states`), and the manual records cover every screen in every language.

Fix critical task failures and all structural and copy BLOCK findings, then get explicit approval of the complete scoped wireframe set with version IDs. Approval of one page does not approve its siblings or templates. If unresolved copy or a consequential question prevents a real structure decision, the gate stays On hold. The no-AI-look checks run here before styling and again on the final visual version.

### 6. Desktop visual design

Only after Step 5 approval, develop the chosen point of view with type, spacing, color, assets and motion. Start from the project's approved tokens and components; a new brand token still needs approval. Pair display and reading roles deliberately; one family with a justified role contrast is valid. Choose fonts only after checking language coverage, weights, licence and real text rendering.

Keep one canonical specification per reused component: anatomy, semantic variants, sizes, token bindings, content constraints and usage rules. Map every screen instance to it and to the existing component where there is one. Compare equivalent instances across screens; unexplained differences fail. The shared inventory is the handoff's `components` list, and every `screens[].components` entry references it by id. It is judged structurally in wireframes and fully at handoff, and recorded as `component-consistency`.

Build a deliberate type scale with as many sizes as the hierarchy needs, each mapped to a named role and token. Document family, fallback, size, line height, weight and tracking for each role. Derive the sizes from a documented scale and record the measure: body text about 45 to 75 characters per line at the reference width, body line height at least 1.5, no loss of content or function under the WCAG 2.2 text-spacing overrides (SC 1.4.12), and long-form text never spanning the full 1440 px. Check the scale in every required script, including numerals and mixed-direction strings; a script that needs a larger optical size gets it. Text stays readable at user zoom. Record the result as `type-measure`.

Use a named spacing scale and specify the grid, margins, gutters, alignment lines and section rhythm in tokens. For each width in `settings.desktopWidths`, specify the column count, gutter, outer margin, maximum content width and how sections recompose between widths. Column counts are positive unitless integers beside the grid spec, not spacing tokens. Gutters, margins and maximum widths reference approved dimension tokens with units (bare 0 allowed, no negative spacing tokens). Record the result as `grid-per-width`; a layout correct only at 1440 px is incomplete. Every intentional grid break names its brief-backed reason and reading-order consequence. Never fabricate irregularity to look human.

Define colour as named roles in the token JSON before use: page and raised surfaces, primary and secondary text, borders and dividers, the accent, the focus indicator and each semantic state, each with its value and job. Build the token-level contrast matrix for every text-on-surface and non-text pair the screens use, including hover, focus, selected, error and disabled appearances (disabled text is exempt from the minimum but stays recognisable), and use only pairs that pass AA. A colour not in the role list never appears. Record the list and matrix as `colour-roles`. How much accent a design uses is a design decision explained by the job it does. Semantic colors need text or shape as well (WCAG 1.4.1).

Before styling and again on the visual version, record each screen's intended emphasis order (the first, second and third thing to read) and its single primary action per viewport; at most one element per viewport carries the strongest emphasis. Check the order on a 1440 px screenshot viewed small and blurred (and in grayscale at Steps 4 and 5); when the visible order differs, change size, weight, position, contrast or space, not the copy. Record it in the `craft` artifact and as `emphasis-order`.

Choose palette, effects and layout patterns for this brief and explain why; nothing is banned and nothing is chosen by default. Effects such as translucency must still keep text at AA contrast. Report an existing brand conflict for a decision; never silently rebrand. Each visual and icon must help someone understand, navigate, decide or recognize something; remove it when that job cannot be named.

For each motion, record the job, trigger, duration in milliseconds, easing, affected elements, interruption and cleanup behavior and static fallback. Under reduced motion nothing moves. Essential content stays visible with JavaScript off; the project's script-failure deadline is an acceptance check.

Render every required language and direction with real writer-approved copy, then run a labelled synthetic long-text stress test at 150 percent of the slot's typical length. That text is test input, never publishable copy. Character ranges are guidance: if an approved translation exceeds one, revise the range and layout rather than truncate. Use logical start and end layout rules; check mixed numbers, punctuation, links and directional icons in RTL. Never mirror logos or text blindly. Exit with approved desktop visuals, complete state behavior and no blocking craft, copy or accessibility defects.

### 7. Other widths and devices

Design the mobile and tablet layouts the brief scopes, before, with or after the desktop as the product needs. For a desktop-only delivery the brief records that these layouts are out of scope.

When authorized, derive smaller layouts and navigation from the same copy, tasks and tokens. Document reflow and touch behavior without relying on hover, and test all key journeys and relevant states.

### 8. Validate, document and final design approval

Freeze the complete scoped design: screens and applicable states, copy, tokens, assets, motion, semantic outline, SEO and schema intent, accessibility evidence and issue list. Run the integrated pre-handoff checker and the independent critic against that exact revision. Each result is PASS or FAIL with evidence; untested means FAIL for a required BLOCK check. A WARN names its impact, owner and disposition and cannot hide an open implementation question.

Validate WCAG 2.2 AA with automated and manual evidence: contrast pairs, keyboard and focus sequence, target sizes and exceptions, alt text, heading order, standalone action labels, dragging alternatives, authentication where applicable, text resizing, reflow, RTL and screen-reader behavior. axe and focus heuristics do not prove conformance; resolve incomplete automated results with a documented manual check. One H1 per page is this package's audit contract, not a claim that WCAG requires it.

The approver signs the final screen and state versions and hashes. A pending claim, consent, asset, question or blocking result prevents Step 9. No AI reviewer supplies human approval.

### 9. Handoff to the project's engineer

Create the fixed package in [handoff contract](handoff-contract.md). Its canonical record is `handoff.json`; `HANDOFF.md` is the generated readable checklist. The designer, writer, engineer and QA gate verify the same criterion IDs and artifact hashes; never keep competing lists.

The package holds the private design link and exact frame names; DESIGN.md; project settings; DTCG-style token JSON and generated CSS with the build script, config and dependency lock; every screen's component and state inventory; versioned 1440 px PNG frames; the complete copy deck with slot placement screenshots; sourced and licensed assets; motion behavior; BLOCK and WARN checks; WCAG evidence; heading outline; alt intent; standalone action labels; page-specific SEO and schema intent; the critic record, tool evidence and the approver's signed record. Unknown schema eligibility is an open question, never invented structured data.

Zero unresolved questions and zero placeholders are required. Each non-applicable state or criterion needs a reason and evidence. The engineer acknowledges the package or names the exact missing criterion, and Fannan fixes it before resubmitting. Prototypes stay reference only. The engineer builds in the repository and stack from settings, the QA gate reports on the specific preview and commit SHA, and the approver follows the existing merge rule. A green pull request or a chat claim is not a QA pass; a report on another SHA does not transfer. QA adds implementation evidence against the build SHA and never rewrites design acceptance. Any change to the package invalidates the affected evidence and approval until reviewed.

If any input fails, send no partial handoff. Record its owner and next action, set the task to Stuck or On hold and notify the approver through the already-authorized channel. Sending still needs the existing approval.

## The screen-production loop

Inside the permitted step: **precheck → short plan and approval → Shape → Explore → Implement reference design → See → independent Critic → Harden → Review → design-share**. The plan states the goal, permitted step, screens, checks and cost. Explore three to five private variants on one genuinely open dimension and have the approver choose; in wireframing the variants stay grayscale. Only the chosen direction advances. Do not generate options after a direction is approved unless a documented issue reopens it.

The critic is separate and read-only. It scores copy and design together with [critic rubric](critic-rubric.md) and records PASS or FAIL per check with a source or annotated frame. Internal zero-to-four scores track improvement; they never average away a failed check. Stop after at most three critic passes, or earlier when the total gains less than one point between passes. On either stop, send the approver the scores, fixed defects, remaining severities and recommended next action. The cap never turns a failure into a pass and never permits a fourth pass without a new authorized decision.

A review passes with zero P0, P1 and P2 findings; P3 and enhancement items are batched and do not block.

## Folding in the approver's feedback

Keep one feedback log per project, beside the issue list (`feedback-log`). Each item records an ID, the approver's exact words, date and channel, the screen, state and version it concerns, Fannan's interpretation, the decision (apply, clarify or conflict), the change made, the version that carries it and the approver's confirmation. Ask a clarifying question when an item is ambiguous instead of guessing. Report an item that would break the AA floor, a project rule, a confirmed fact or an approved earlier decision as a conflict with options; never apply it silently. Re-present only after every item is resolved or explicitly deferred by the approver, and show what changed against the previous version. Feedback is scoped to the project and step where it was given. A preference that looks reusable is proposed to the owner as a memory save and applied to other projects only after the owner's written yes; it never overrides a project's own rules.

## Threat model for the pre-handoff gate

Pages are authored by Fannan or a human designer: honest but possibly sloppy, not an attacker. The gate catches honest mistakes and ordinary authoring patterns completely (body or html clipping, zero-size or `display: contents` wrappers, open shadow roots, frames, objects and embeds, stylesheets loaded from `data:` or `blob:` URLs, state pages), and fails closed on anything it cannot measure (closed shadow roots, unreadable or unserved stylesheets, frames, a vector field or native-function check that could not run, JavaScript-off content that is not equivalent).

Deliberate obfuscation is outside the main threat model: for example JavaScript string escapes, comment tricks inside strings, patching `Function.prototype` or base64-encoded stylesheets. Cheap defences apply where they are simple: escapes are decoded and raw text is matched with and without comment stripping; the reduced-motion counter binds the native `requestAnimationFrame` at install and `call`, `apply`, `bind` and `Reflect.apply` are in the native-function check; `data:` and `blob:` stylesheets are refused. Anything beyond that is a known limit, raised as an enhancement rather than a P0 to P2 finding. Defence in depth stays: computed-style checks, the JavaScript-off pass and the source scan.

## What the checks prove

The 150-percent long-text stress case is a design-policy choice. The Impeccable detector's findings are advisory; a successful run is not a design-quality PASS. Decoration and copy-specificity judgments need the independent critic's evidence in the same gate, in every project language. Passing the automated checks shows the floor is met; it cannot show that a human would endorse the result. The independent critic and the approver stay essential.
