// R14 Part B (R14-GPT-07 to 11, R14-MIMAR-01 to 05): the designer process and contract text must exist where the plan,
// skills and references say, stay generic and tool-agnostic, and keep the existing floors (desktop first, 1440,
// WCAG 2.2 AA, no glass, spacing scale, 320 px reflow plus desktopWidths).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const release = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(release, f), 'utf8');
const flat = t => t.replace(/\s+/g, ' ');
const REQUIRED = {
  'R14-GPT-07': [['FANNAN-PLAN.md', 'skills/design-research/SKILL.md'], 'Maintain a discovery ledger for audience needs, current workflows, pain points and constraints. Record evidence source/date, assumptions, confidence, design consequence and risk. Use supplied or already-authorized research, support and analytics evidence. Assign material assumptions an owner and validation method in Step 5. Never present brief assertions or visual references as user research; preserve existing contact and payment approvals.'],
  'R14-GPT-08': [['FANNAN-PLAN.md'], 'Specify navigation labels, grouping/order, destinations, current-location cues and back/escape behavior. Document discovery and movement between navigation levels. Specify search, filter and sort behavior when tasks require them; otherwise justify N/A. In Step 5, test finding priority destinations from realistic entry points using the proposed labels; record wrong turns and revisions.'],
  'R14-GPT-09': [['references/handoff-contract.md', 'skills/design-canvas/SKILL.md'], 'The seven baseline states are a minimum. Derive additional reachable states from actual interactions, including success/completion, selected/checked, expanded/collapsed, validation and read-only where applicable. Specify triggers, appearance, approved copy, semantics, announcements, keyboard/focus behavior and reference evidence. Success communicates the confirmed outcome and next action. The interaction critique fails when a reachable state or transition is unspecified.'],
  'R14-GPT-10': [['references/handoff-contract.md', 'skills/design-canvas/SKILL.md'], 'For every form, specify labels, required/optional indicators, accepted formats, help, validation timing, inline/summary errors, failure focus, input preservation and correction steps. Define submitting, success, failure, retry and duplicate-submission behavior. For consequential actions, specify cancellation, confirmation or undo as appropriate, plus unsaved-change behavior. Each applicable behavior requires approved interface copy and a task-level acceptance check; justify N/A.'],
  'R14-GPT-11': [['FANNAN-PLAN.md'], "Before testing, define each priority task's neutral scenario, realistic starting point and observable completion criterion. Record participant/reviewer context, unaided completion, wrong turns, assistance and severity. Do not demonstrate the intended path first. Distinguish representative-user testing from expert walkthroughs and record remaining assumptions. Retest failed critical tasks after revisions against the new version. Resolve material uncertainty within the existing Step 5 approval gate."],
};
const section = (text, heading) => { const at = text.indexOf(heading); assert.ok(at >= 0, heading); const next = text.indexOf('\n### ', at + heading.length); return text.slice(at, next < 0 ? undefined : next); };

test('R14-GPT-07 to 11: the exact process and contract text is in the plan, skills and references', () => {
  for (const [id, [files, text]] of Object.entries(REQUIRED)) for (const f of files) assert.ok(flat(read(f)).includes(text), `${id} in ${f}`);
  const plan = read('FANNAN-PLAN.md');
  assert.ok(section(plan, '### 1. Reconcile').includes(REQUIRED['R14-GPT-07'][1]), '07 sits in Step 1');
  const step3 = section(plan, '### 3. Information architecture');
  assert.ok(step3.indexOf(REQUIRED['R14-GPT-08'][1]) >= 0 && step3.indexOf(REQUIRED['R14-GPT-08'][1]) < step3.indexOf('Exit with the complete sitemap'), '08 sits before the Step 3 exit');
  assert.ok(section(plan, '### 5. Test and approve').includes(REQUIRED['R14-GPT-11'][1]), '11 sits in Step 5');
  const contract = read('references/handoff-contract.md');
  assert.ok(contract.indexOf(REQUIRED['R14-GPT-09'][1]) > contract.indexOf('`screens[].components[].states`'), '09/10 follow the component-state guide');
  assert.match(read('skills/design-research/SKILL.md'), /\]\(\.\.\/\.\.\/FANNAN-PLAN\.md\)/, 'design-research links the plan');
});

test('R14-GPT-07 to 11: each new step is a required manual check, documented in design-quality.md', async () => {
  const { manualIds } = await import('../tools/handoff-contract.mjs');
  const quality = read('references/design-quality.md');
  for (const id of ['discovery-evidence', 'navigation-findability', 'interaction-states', 'form-behavior', 'task-test']) assert.ok(manualIds.includes(id), id);
  for (const id of manualIds) assert.ok(quality.includes('`' + id + '`'), `design-quality.md documents ${id}`);
  const plan = read('FANNAN-PLAN.md');
  for (const id of ['discovery-evidence', 'navigation-findability', 'task-test']) assert.ok(plan.includes('`' + id + '`'), `the plan names ${id}`);
});

test('R14-MIMAR-01 to 05: feedback loop, emphasis order, type measure, colour roles and per-width grid are required', () => {
  const plan = read('FANNAN-PLAN.md'), step6 = section(plan, '### 6. Desktop visual design');
  assert.match(plan, /\n## Folding in the approver's feedback\n/);
  for (const t of ["the approver's exact words", 'conflict with the options, never applied silently', 'only after his written yes']) assert.ok(flat(plan).includes(t), t);
  assert.match(step6, /intended emphasis order/); assert.match(step6, /blurred/);
  assert.match(step6, /45 to 75 characters per line/); assert.match(step6, /SC 1\.4\.12/);
  assert.match(step6, /named roles in the token JSON/); assert.match(step6, /contrast matrix at token level/);
  assert.match(step6, /For each width in `settings\.desktopWidths`, specify the column count, gutter, outer margin, maximum content width/);
  assert.match(read('references/handoff-contract.md'), /feedback log with every item resolved or explicitly deferred/);
  assert.match(read('skills/design-share/SKILL.md'), /feedback log/);
  assert.match(read('memory/FANNAN-MEMORY-PROPOSED.md'), /feedback log/);
  const rubric = read('references/critic-rubric.md');
  for (const t of ['reachable states beyond the seven', 'documented scale', 'every declared desktop width', 'token-level contrast matrix', 'emphasis order']) assert.ok(rubric.includes(t), t);
});

test('R14 Part B keeps the floors: desktop first at 1440, WCAG 2.2 AA, zero glass, spacing scale, 320 px reflow plus desktopWidths with 1440', async () => {
  const plan = flat(read('FANNAN-PLAN.md')), quality = flat(read('references/design-quality.md')), contract = flat(read('references/handoff-contract.md'));
  assert.ok(plan.includes('Work on desktop only, with 1440 CSS px reference exports'));
  assert.ok(plan.includes('**WCAG 2.2 AA floor;'));
  assert.ok(plan.includes('stock glass effects'));
  assert.ok(plan.includes('Use a named spacing scale'));
  assert.ok(quality.includes('320 CSS px (the 400% reflow equivalent of a 1280 px desktop)'));
  assert.ok(contract.includes('`settings.desktopWidths` lists the project\'s declared desktop CSS widths: unique positive integers that always include the canonical 1440'));
  const q = JSON.parse(read('runtime/quality-checks.json'));
  assert.deepEqual([q.thresholds.stockGlass, q.thresholds.spacingOffScale, q.thresholds.typeSizes], [0, 0, 6]);
});

test('R14 Part B text is generic and tool-agnostic: no client, country or design-tool vendor names in the new text', () => {
  const vendors = /\b(figma|sketch|framer|webflow|canva|penpot|adobe|stitch|miro|hotjar|google analytics)\b/i;
  const added = [...Object.values(REQUIRED).map(([, t]) => t), section(read('FANNAN-PLAN.md'), "## Folding in the approver's feedback"), section(read('FANNAN-PLAN.md'), '### 6. Desktop visual design').split('For the existing')[0]];
  for (const t of added) assert.doesNotMatch(t, vendors);
  for (const t of added) assert.doesNotMatch(t, /digital[\s_-]*cloud|\bgaza\b|palestin/i);
});

// R15 B1-B4 (panel round 15): exact wording from the merged review.
const R15 = {
  gate: 'Within the existing Step 5 gate, after the task and navigation-findability tests and necessary retests, run the complete wireframe quality gate; require PASS before structure approval and Step 6.',
  step4: 'At Step 4, check grayscale structure, copy and provenance and record issues for testing.',
  grid: 'Column counts are positive unitless integers recorded beside the grid spec, not spacing tokens. Gutters, outer margins and maximum content widths reference approved dimension tokens with units (bare 0 allowed, no negative spacing tokens). Document recomposition between widths as behaviour.',
  feedback: "The feedback-log artifact records each item's exact words, scope, version, interpretation, decision, resulting change and confirmation. A deferral needs the approver's recorded disposition. Missing or unresolved items fail. If no feedback was received, record that explicitly with reviewer and scope.",
};

test('R15-B1: the complete wireframe gate runs inside Step 5 after the task and findability tests; nine steps unchanged', () => {
  const plan = read('FANNAN-PLAN.md'), step4 = flat(section(plan, '### 4. Grayscale desktop wireframes')), step5 = flat(section(plan, '### 5. Test and approve'));
  assert.ok(step4.includes(R15.step4), 'Step 4 checks and records issues for testing');
  assert.ok(!/Run the wireframe phase of the quality gate before Step 5/.test(flat(plan)), 'the old Step 4 timing is gone');
  assert.ok(step5.includes(R15.gate), 'the gate sentence sits in Step 5');
  assert.ok(step5.indexOf(R15.gate) > step5.indexOf('The record is `task-test`.'), 'after the task-test paragraph');
  assert.deepEqual([...plan.matchAll(/^### (\d+)\. /gm)].map(m => Number(m[1])), [1, 2, 3, 4, 5, 6, 7, 8, 9], 'nine steps unchanged');
  const skill = flat(read('skills/design-prototype/SKILL.md'));
  assert.ok(skill.includes('Within the existing Step 5 gate, after the task and navigation-findability tests and necessary retests, run `FANNAN_DEPS=... node "$FANNAN_RELEASE/tools/pre-handoff-check.mjs"'), 'design-prototype runs it inside Step 5');
  assert.ok(skill.includes('--phase=wireframe` for the full desktop set; require PASS before structure approval and Step 6.'));
  assert.ok(!skill.includes('At the end of Step 4'), 'design-prototype no longer runs it at the end of Step 4');
  assert.ok(flat(read('references/design-quality.md')).includes('run within the existing Step 5 gate after the task and navigation-findability tests and necessary retests'));
});

test('R15-B2: column counts are unitless integers; gutters, margins and maximum widths are dimension tokens', () => {
  const step6 = flat(section(read('FANNAN-PLAN.md'), '### 6. Desktop visual design'));
  assert.ok(step6.includes(R15.grid), 'exact grid wording');
  assert.ok(!step6.includes('each value is a spacing-scale token'), 'the unit-breaking clause is gone');
});

test('R15-B3/B4: feedback-log and the four craft checks are manual IDs; critic checks are keyed to the eight rubric rows', async () => {
  const contract = await import('../tools/handoff-contract.mjs');
  for (const id of ['feedback-log', 'emphasis-order', 'type-measure', 'colour-roles', 'grid-per-width']) assert.ok(contract.manualIds.includes(id), id);
  assert.deepEqual(contract.wireframeDeferrable, ['emphasis-order', 'type-measure', 'colour-roles', 'grid-per-width']);
  assert.deepEqual(contract.wireframeDeferred, ['accent-area', 'palette']);
  const quality = flat(read('references/design-quality.md')), rubric = read('references/critic-rubric.md'), handoff = flat(read('references/handoff-contract.md')), plan = flat(read('FANNAN-PLAN.md'));
  assert.ok(quality.includes(R15.feedback), 'exact feedback-log wording');
  for (const id of ['emphasis-order', 'type-measure', 'colour-roles', 'grid-per-width']) assert.ok(plan.includes('`' + id + '`'), `the plan names ${id}`);
  assert.equal(contract.criticRows?.length, 8);
  for (const id of contract.criticRows) { assert.ok(rubric.includes('(`' + id + '`) |'), `rubric row ${id}`); assert.ok(handoff.includes('`' + id + '`'), `handoff-contract.md lists ${id}`); }
  assert.ok(handoff.includes('recorded as the `feedback-log` manual check'));
  const vendors = /\b(figma|sketch|framer|webflow|canva|penpot|adobe|stitch|miro|hotjar|google analytics)\b/i;
  for (const t of Object.values(R15)) { assert.doesNotMatch(t, vendors); assert.doesNotMatch(t, /digital[\s_-]*cloud|\bgaza\b|palestin/i); }
});

// R16-GPT-03/04 (panel round 16): exact wording from the merged review.
const R16 = {
  wireframe: 'A wireframe PASS covers every declared desktop screen and locale. Each rendering must declare an existing page and receive the applicable structural/copy, accessibility, integrity and manual checks; missing coverage blocks structure approval.',
  components: 'Maintain one canonical specification for each reused component: anatomy, semantic variants, sizes, token bindings, content constraints and composition/usage rules. Map every screen instance to that specification and the existing component where available. Compare equivalent instances across screens; unexplained differences fail.',
};

test('R16-GPT-03/04: wireframe coverage of every screen and locale; one shared component specification compared across screens', async () => {
  const plan = read('FANNAN-PLAN.md');
  assert.ok(flat(section(plan, '### 5. Test and approve')).includes(R16.wireframe), 'wireframe coverage sits in Step 5');
  const step6 = flat(section(plan, '### 6. Desktop visual design'));
  assert.ok(step6.includes(R16.components), 'component rule sits in Step 6');
  assert.ok(step6.indexOf(R16.components) < step6.indexOf('Use at most **six distinct rendered type sizes per page**'), 'after the opening paragraph');
  const contract = flat(read('references/handoff-contract.md'));
  for (const t of Object.values(R16)) assert.ok(contract.includes(t), `handoff-contract.md mirrors: ${t.slice(0, 40)}`);
  assert.ok(contract.includes('`componentComparison: {screens, decision, evidence}`'));
  assert.match(read('references/critic-rubric.md'), /\n## Cross-screen component comparison\n/);
  assert.ok(flat(read('references/design-quality.md')).includes('`component-consistency`'));
  assert.ok(flat(read('skills/design-prototype/SKILL.md')).includes('compares each reused component across all screens'));
  const { manualIds } = await import('../tools/handoff-contract.mjs');
  assert.ok(manualIds.includes('component-consistency'));
  assert.deepEqual([...plan.matchAll(/^### (\d+)\. /gm)].map(m => Number(m[1])), [1, 2, 3, 4, 5, 6, 7, 8, 9], 'nine steps unchanged');
  const vendors = /\b(figma|sketch|framer|webflow|canva|penpot|adobe|stitch|miro|hotjar|google analytics)\b/i;
  for (const t of Object.values(R16)) { assert.doesNotMatch(t, vendors); assert.doesNotMatch(t, /digital[\s_-]*cloud|\bgaza\b|palestin/i); }
});

// R17 (panel round 17): the filter decision (fail-closed, GPT's sentence verbatim), the pixel-measured exception as
// ENH backlog, and the rendered-visibility backstop documented with its method.
const R17 = {
  filter: 'Unresolved compositing on displayed text in either rendering blocks handoff as INCOMPLETE. Token contrast proofs and `jsOffDifferences` cannot waive it. Retaining the effect requires a reviewed measurement implementation that resolves its actual composition for every applicable rendering. Backdrop-filter remains a hard FAIL.',
  backlog: 'ENH backlog: a future exception for an unresolved compositing effect is acceptable only with a pixel-measured proof per rendering',
  backstop: 'Rendered-visibility backstop: the CSS contrast computation is the first pass; what the browser actually painted is the backstop, in both renderings (JavaScript on and off).',
};

test('R17: fail-closed compositing sentence, ENH backlog and the rendered-visibility backstop method are documented', () => {
  const quality = flat(read('references/design-quality.md')), contract = flat(read('references/handoff-contract.md'));
  for (const t of Object.values(R17)) assert.ok(quality.includes(t), `design-quality.md: ${t.slice(0, 40)}`);
  assert.ok(contract.includes(R17.filter), 'handoff-contract.md mirrors the compositing sentence');
  for (const k of ['textMeasured', 'textObscured', 'textUnreadable', 'textUnmeasured']) assert.ok(contract.includes('`' + k + '`'), `jsOffDifferences lists ${k}`);
  for (const m of ['hit test', '90th percentile', 'modal colour', '3:1', 'INCOMPLETE, never PASS', 'accessible names']) assert.ok(quality.includes(m), `method: ${m}`);
  const vendors = /\b(figma|sketch|framer|webflow|canva|penpot|adobe|stitch|miro|hotjar|google analytics)\b/i;
  for (const t of Object.values(R17)) { assert.doesNotMatch(t, vendors); assert.doesNotMatch(t, /digital[\s_-]*cloud|\bgaza\b|palestin/i); }
});

// R18 (panel round 18): the backstop's role (Fadel's tiebreak: pixels decide visibility, AA stays with the CSS pass),
// line-by-line and target-directed coverage, hidden text, and the copy deck's separate accessible name.
test('R18: the backstop role, its coverage, text that is not displayed and the approved accessible name are documented', () => {
  const quality = flat(read('references/design-quality.md')), contract = flat(read('references/handoff-contract.md'));
  for (const m of ['Pixels decide visibility, not AA:', 'line by line', 'directed at targets', 'scrolled into view', 'four passes', 'is INCOMPLETE', 'opaque cover', 'peak under 1.5:1', 'could not resolve the colours', 'is not displayed: it is counted (`textHidden`)', '`ariaLabel`']) assert.ok(quality.includes(m), `design-quality.md: ${m}`);
  for (const m of ['`textHidden`', 'optional `ariaLabel`', 'Pixels decide visibility; AA stays with the CSS pass']) assert.ok(contract.includes(m), `handoff-contract.md: ${m}`);
  const vendors = /\b(figma|sketch|framer|webflow|canva|penpot|adobe|stitch|miro|hotjar|google analytics)\b/i;
  const para = quality.slice(quality.indexOf('Rendered-visibility backstop:'));
  assert.doesNotMatch(para.slice(0, 6000), vendors); assert.doesNotMatch(para.slice(0, 6000), /digital[\s_-]*cloud|\bgaza\b|palestin/i);
});

// R19 (panel round 19): covers the hit test cannot see, the top layer on declared states, inner scrollports, the width
// screen's hidden content, the colour-contrast incomplete resolver (Fadel's tiebreak) and the cited accessible name.
test('R19: hidden layers, the top layer, inner scrollports, hidden content in the width screen and the contrast incomplete resolver are documented', () => {
  const quality = flat(read('references/design-quality.md')), contract = flat(read('references/handoff-contract.md'));
  for (const m of ['Layers a hit test cannot see are possible covers too', '`pointer-events:none` layer', 'the fade of a truncated block', 'the top layer is respected', 'a non-modal open dialog is not inert', 'the end of every inner scrollport', 'The width screen uses the same rule', 'Automated contrast incomplete results:', 'in BOTH renderings', 'cites the screenshot', 'must appear in its cited source', 'an SVG, which is mostly transparent shapes']) assert.ok(quality.includes(m), `design-quality.md: ${m}`);
  for (const m of ['must appear in its cited source', 'resolves an automated colour-contrast incomplete result']) assert.ok(contract.includes(m), `handoff-contract.md: ${m}`);
  const vendors = /\b(figma|sketch|framer|webflow|canva|penpot|adobe|stitch|miro|hotjar|google analytics)\b/i;
  const para = quality.slice(quality.indexOf('Rendered-visibility backstop:'));
  assert.doesNotMatch(para.slice(0, 9000), vendors); assert.doesNotMatch(para.slice(0, 9000), /digital[\s_-]*cloud|\bgaza\b|palestin|\baxe-core\b.*\bdeque\b/i);
});

// R19b (Mi'mar's tiebreak): a script-only declared state may resolve a colour-contrast incomplete on its scripted rendering
test('R19b: the requiresScript state, its trigger and the false-claim mismatch are documented', () => {
  const quality = flat(read('references/design-quality.md')), contract = flat(read('references/handoff-contract.md'));
  for (const m of ['`requiresScript: true` with its trigger recorded', 'resolves on the scripted rendering alone', 'the default state always needs both renderings', 'fails as an integrity mismatch']) assert.ok(quality.includes(m), `design-quality.md: ${m}`);
  for (const m of ['`requiresScript: true` with `trigger`', 'The default state cannot declare it.']) assert.ok(contract.includes(m), `handoff-contract.md: ${m}`);
});
