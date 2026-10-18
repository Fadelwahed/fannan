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
