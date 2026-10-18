import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { checkHandoff, manualIds, states } from '../tools/handoff-contract.mjs';
import * as contract from '../tools/handoff-contract.mjs';

// R15 B4: the eight critic-rubric rows (references/critic-rubric.md), in table order.
const RUBRIC_ROWS = ['brief-point-of-view', 'copy-truth', 'hierarchy-task-flow', 'typography-language', 'spacing-rhythm-grid', 'colour-imagery-restraint', 'interaction-states-motion', 'accessibility-handoff'];
const R15_CRAFT = ['emphasis-order', 'type-measure', 'colour-roles', 'grid-per-width'];

test('complete handoff passes; missing provenance, state or approval fails', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fannan-contract-'));
  const write = (name, value = 'evidence') => { const path = join(dir, name); writeFileSync(path, value); return path; };
  try {
    const brief = write('brief.md', 'A service for residents.\nSpecific headline.');
    const rules = write('rules.md');
    const settings = write('settings.md', 'repo-x stack-x engineer-x qa-x writer-x approver-x');
    const chunk = (type, data) => { const len = Buffer.alloc(4), crc = Buffer.alloc(4); len.writeUInt32BE(data.length); let sum = -1; for (const byte of Buffer.concat([Buffer.from(type), data])) { sum ^= byte; for (let i=0;i<8;i++) sum = sum >>> 1 ^ (sum & 1 ? 0xedb88320 : 0); } crc.writeUInt32BE((sum ^ -1) >>> 0); return Buffer.concat([len, Buffer.from(type), data, crc]); };
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(1440,0); ihdr.writeUInt32BE(1,4); ihdr[8]=8; ihdr[9]=6;
    const png = Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'), chunk('IHDR',ihdr), chunk('IDAT',deflateSync(Buffer.alloc(1+1440*4))), chunk('IEND',Buffer.alloc(0))]);
    const frame = write('home-default.png', png);
    const hash = createHash('sha256').update(png).digest('hex');
    const frameId = `home/en/default/v1/${hash}`;
    const approved = write('approved.md', `2026-10-16 approver-x ${frameId}`);
    const token = write('tokens.json', '{"colors":{}}'), css = write('variables.css', ':root { --colors-primary: #123456; }');
    const art = path => ({ path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') });
    const tokenArtifacts = { json: art(token), css: art(css), buildScript: art(fileURLToPath(new URL('../tools/sd-build.mjs', import.meta.url))), config: art(fileURLToPath(new URL('../runtime/sd.config.mjs', import.meta.url))), lock: art(fileURLToPath(new URL('../runtime/package-lock.json', import.meta.url))) };
    const buildEvidence = write('variables.css.build.json', JSON.stringify({ styleDictionaryVersion: '5.6.1', inputSha256: tokenArtifacts.json.sha256, outputSha256: tokenArtifacts.css.sha256, scriptSha256: tokenArtifacts.buildScript.sha256, configSha256: tokenArtifacts.config.sha256, lockSha256: tokenArtifacts.lock.sha256 }));
    tokenArtifacts.buildEvidence = { path: buildEvidence };
    const na = state => ({ state, lang: 'en', dir: 'ltr', applicable: false, reason: 'static screen', reviewer: 'reviewer-x', evidence: brief });
    const h = {
      version: 1, phase: 'handoff', brief: { path: brief }, rules: { path: rules },
      designLink: { url: 'https://example.invalid/private', private: true, evidence: brief }, tokens: tokenArtifacts, toolEvidence: [{ tool: 'fixture', version: '1', artifact: brief }],
      settings: { desktopWidths: [1440, 1280], path: settings, repository: 'repo-x', stack: 'stack-x', roles: { engineer: 'engineer-x', qaGate: 'qa-x', writer: 'writer-x', approver: 'approver-x' } },
      pointOfView: { idea: 'Residents first', briefRefs: ['brief.md:1'] },
      screens: [{ id: 'home', page: frame, headingOutline: [{ level: 1, text: 'Specific headline.' }], seoIntent: 'service page', schemaIntent: 'none', images: [], actions: [], states: [{ state: 'default', lang: 'en', dir: 'ltr', page: frame, frame: { path: frame, width: 1440, version: 'v1', sha256: hash } }, ...states.slice(1).map(na)], components: [{ id: 'heading', states: [{ state: 'default', lang: 'en', dir: 'ltr', applicable: true, evidence: frame }, ...states.slice(1).map(na)] }], acceptance: [{ id: 'title', severity: 'BLOCK', decision: 'PASS', check: 'title visible', evidence: frame }], wcag: { standard: '2.2 AA', contrastEvidence: frame, focusOrderEvidence: frame, targetSizeEvidence: frame } }],
      copySlots: [{ id: 'hero', screen: 'home', kind: 'interface', purpose: 'state service', text: 'Specific headline.', minChars: 5, maxChars: 30, tone: 'direct', placementScreenshot: frame, placements: [{ lang: 'en', state: 'default', screenshot: frame }], source: { kind: 'brief', path: brief, ref: 'brief.md:2' }, lang: 'en', dir: 'ltr', variants: [{ lang: 'en', dir: 'ltr', text: 'Specific headline.', source: { path: brief, ref: 'brief.md:2' } }] }],
      facts: [], placeholders: [], openQuestions: [], languages: [{ lang: 'en', dir: 'ltr' }], assets: [], motion: [],
      components: [{ id: 'heading', variants: ['page-title'], states: ['default'], tokens: { color: 'colors.primary', size: 'typography.title' }, behaviour: 'static page heading; wraps, never truncates' }],
      manualChecks: manualIds.map(id => ({ id, screen: 'home', lang: 'en', state: 'default', decision: 'PASS', reviewer: 'reviewer-x', artifact: frame, note: 'inspected', briefRefs: ['brief.md:1'] })),
      critic: { referenceWork: frame, rounds: [{ decision: 'PASS', reviewer: 'critic-x', evidence: frame, copyChecks: [{ row: 'copy-truth', decision: 'PASS', evidence: frame }], designChecks: RUBRIC_ROWS.filter(row => row !== 'copy-truth').map(row => ({ row, decision: 'PASS', evidence: frame })), componentComparison: { screens: ['home'], decision: 'PASS', evidence: frame } }] },
      approval: { decision: 'approved', approver: 'approver-x', record: approved, frameIds: [frameId] }
    };
    assert.deepEqual(checkHandoff(h), []);
    // R8, ported from codex/fannan-r3-review 2733317: declared desktop widths are unique positive integers and include the canonical 1440.
    for (const bad of [undefined, [], [1280], [1440, 1440], [1440, 0], [1440, -1280], [1440, 1280.5], ['1440'], '1440']) {
      h.settings.desktopWidths = bad;
      assert.match(checkHandoff(h).join('\n'), /settings\.desktopWidths/, `desktopWidths ${JSON.stringify(bad)} must fail`);
    }
    h.settings.desktopWidths = [1440];
    assert.deepEqual(checkHandoff(h), [], '1440 alone is enough');
    // ARGON-R5-03 (not reproduced, pinned): the wireframe phase is a handoff too, so it must declare desktopWidths with 1440;
    // there is no wireframe early return and no default to [1440].
    const wire = JSON.parse(JSON.stringify({ ...h, phase: 'wireframe' }));
    for (const bad of [undefined, [], [1280]]) {
      wire.settings.desktopWidths = bad;
      assert.match(checkHandoff(wire, 'wireframe').join('\n'), /settings\.desktopWidths/, `wireframe desktopWidths ${JSON.stringify(bad)} must fail`);
    }
    wire.settings.desktopWidths = [1440];
    assert.doesNotMatch(checkHandoff(wire, 'wireframe').join('\n'), /settings\.desktopWidths/, 'wireframe with [1440] satisfies the width rule');
    // R11 panel D1, R12 M09/M20/M21: optional reflowExceptions / jsOffDifferences / spacingExceptions records are scoped
    // to a declared screen/state/lang and name their reviewer; a reason alone excuses nothing.
    const home = { screen: 'home', state: 'default', lang: 'en' };
    h.reflowExceptions = [{ ...home, id: 't1', reason: 'comparison table', reviewer: 'qa-x' }, { ...home, id: 't2', reason: 'route map', reviewer: 'approver-x' }];
    h.jsOffDifferences = [{ ...home, check: 'reflowFail', reason: 'menu collapses after its script loads', reviewer: 'qa-x' }, { ...home, check: 'content', reason: 'the status line is written by script', reviewer: 'approver-x' }];
    h.spacingExceptions = [{ ...home, id: 'logo', reason: 'optical alignment of the logo mark', reviewer: 'approver-x' }];
    assert.deepEqual(checkHandoff(h), [], 'valid records pass');
    for (const bad of [{}, [{ ...home, id: 't1', reason: '', reviewer: 'qa-x' }], [{ ...home, id: 't1', reason: 'r', reviewer: 'writer-x' }], [{ ...home, reason: 'r', reviewer: 'qa-x' }], [{ ...home, id: 'a', reason: 'r', reviewer: 'qa-x' }, { ...home, id: 'a', reason: 'r', reviewer: 'qa-x' }], [{ id: 't1', reason: 'r', reviewer: 'qa-x' }], [{ ...home, state: 'error', id: 't1', reason: 'r', reviewer: 'qa-x' }], [{ ...home, lang: 'ar', id: 't1', reason: 'r', reviewer: 'qa-x' }]]) {
      h.reflowExceptions = bad; assert.match(checkHandoff(h).join('\n'), /reflowExceptions/, `reflowExceptions ${JSON.stringify(bad)} must fail`);
    }
    h.reflowExceptions = [{ ...home, id: 't1', reason: 'r', reviewer: 'qa-x' }, { ...home, screen: 'about', id: 't1', reason: 'r', reviewer: 'qa-x' }];
    assert.match(checkHandoff(h).join('\n'), /reflowExceptions/, 'an undeclared screen fails');
    delete h.reflowExceptions;
    for (const bad of [{}, [{ ...home, check: 'contrast', reason: 'r', reviewer: 'qa-x' }], [{ ...home, check: 'glass', reason: ' ', reviewer: 'qa-x' }], [{ ...home, check: 'glass', reason: 'a', reviewer: 'qa-x' }, { ...home, check: 'glass', reason: 'b', reviewer: 'qa-x' }], [{ ...home, check: 'glass', reason: 'r' }], [{ ...home, check: 'glass', reason: 'r', reviewer: 'writer-x' }], [{ check: 'glass', reason: 'r', reviewer: 'qa-x' }]]) {
      h.jsOffDifferences = bad; assert.match(checkHandoff(h).join('\n'), /jsOffDifferences/, `jsOffDifferences ${JSON.stringify(bad)} must fail`);
    }
    delete h.jsOffDifferences;
    for (const bad of [{}, [{ ...home, id: 'logo', reason: 'r', reviewer: 'qa-x' }], [{ ...home, id: 'logo', reason: 'r' }], [{ ...home, reason: 'r', reviewer: 'approver-x' }], [{ ...home, id: 'logo', reason: ' ', reviewer: 'approver-x' }], [{ id: 'logo', reason: 'r', reviewer: 'approver-x' }], [{ ...home, id: 'a', reason: 'r', reviewer: 'approver-x' }, { ...home, id: 'a', reason: 'r', reviewer: 'approver-x' }]]) {
      h.spacingExceptions = bad; assert.match(checkHandoff(h).join('\n'), /spacingExceptions/, `spacingExceptions ${JSON.stringify(bad)} must fail`);
    }
    delete h.spacingExceptions;
    h.settings.desktopWidths = [1440, 1280];
    h.manualChecks.push({ ...h.manualChecks[0], decision: 'FAIL' });
    assert.match(checkHandoff(h).join('\n'), /manual check IDs must be unique|manual FAIL/);
    h.manualChecks.pop();
    h.critic.rounds[0].copyChecks[0].decision = 'FAIL';
    assert.match(checkHandoff(h).join('\n'), /all final copy\/design checks PASS/);
    h.critic.rounds[0].copyChecks[0].decision = 'PASS';
    h.screens[0].acceptance[0].decision = 'FAIL';
    assert.match(checkHandoff(h).join('\n'), /passing BLOCK items/);
    h.screens[0].acceptance[0].decision = 'PASS';
    h.tokens.css = h.tokens.json;
    assert.match(checkHandoff(h).join('\n'), /distinct JSON and CSS/);
    h.tokens.css = art(css);
    const broken = write('broken.png', Buffer.alloc(24));
    h.screens[0].states[0].frame.path = broken;
    h.screens[0].states[0].frame.sha256 = createHash('sha256').update(readFileSync(broken)).digest('hex');
    assert.match(checkHandoff(h).join('\n'), /hash-checked 1440px PNG/);
    h.screens[0].states[0].frame.path = frame; h.screens[0].states[0].frame.sha256 = hash;
    h.copySlots[0].text = 'Invented headline.';
    assert.match(checkHandoff(h).join('\n'), /absent from cited source/);
    h.copySlots[0].text = 'Specific headline.';
    h.screens[0].states[1].reviewer = '';
    assert.match(checkHandoff(h).join('\n'), /N\/A needs reason/);
    h.screens[0].states[1].reviewer = 'reviewer-x';
    h.approval.frameIds = [];
    assert.match(checkHandoff(h).join('\n'), /approval/);
    h.approval.frameIds = [frameId];
    assert.deepEqual(checkHandoff(h), [], 'restored');
    // R15 B3 (feedback-log), B3/B4 (Step 6 craft manual IDs, deferrable in the wireframe phase) and B4 (one passing
    // critic check per rubric row). Collected first so a contract without them shows every gap at once.
    const r15 = {};
    r15.manualIds = ['feedback-log', ...R15_CRAFT].filter(id => !manualIds.includes(id));
    r15.criticRows = contract.criticRows;
    const dropManual = id => { const kept = h.manualChecks; h.manualChecks = kept.filter(m => m.id !== id); const out = checkHandoff(h).join('\n'); h.manualChecks = kept; return out; };
    r15.missingFeedbackLog = /manual home\/en\/default\/feedback-log/.test(dropManual('feedback-log'));
    r15.missingCraft = R15_CRAFT.filter(id => !new RegExp(`manual home/en/default/${id}:`).test(dropManual(id)));
    const final = h.critic.rounds[0];
    const withoutRow = row => { const saved = final.designChecks; final.designChecks = saved.filter(c => c.row !== row); const out = checkHandoff(h).join('\n'); final.designChecks = saved; return out; };
    r15.missingRow = RUBRIC_ROWS.filter(row => row !== 'copy-truth' && !withoutRow(row).includes(`critic row ${row}`));
    const unkeyed = final.designChecks.map(({ row, ...c }) => c);
    const savedChecks = final.designChecks; final.designChecks = [...unkeyed]; final.copyChecks[0] = { decision: 'PASS', evidence: frame };
    r15.unkeyedFails = /critic checks must each name a rubric row/.test(checkHandoff(h).join('\n'));
    final.designChecks = savedChecks; final.copyChecks[0] = { row: 'copy-truth', decision: 'PASS', evidence: frame };
    // an earlier failing round is fine when the final round covers every row
    h.critic.rounds = [{ ...final, decision: 'FAIL', designChecks: [{ row: 'spacing-rhythm-grid', decision: 'FAIL', evidence: frame }] }, final];
    r15.earlierRoundOk = checkHandoff(h).length === 0;
    h.critic.rounds = [final];
    // wireframe phase: accent-area/palette DEFERRED, the four craft IDs PASS or DEFERRED, everything else PASS.
    const wf = JSON.parse(JSON.stringify(h)); wf.phase = 'wireframe';
    const wfChecks = deferred => manualIds.map(id => ({ id, screen: 'home', lang: 'en', state: 'wireframe', decision: ['accent-area', 'palette', ...deferred].includes(id) ? 'DEFERRED' : 'PASS', reviewer: 'reviewer-x', artifact: frame, note: 'grayscale review', briefRefs: ['brief.md:1'] }));
    const manualErrors = deferred => { wf.manualChecks = wfChecks(deferred); return checkHandoff(wf, 'wireframe').filter(e => /manual/.test(e)); };
    r15.wireframeDeferredCraft = manualErrors(R15_CRAFT);
    r15.wireframePassedCraft = manualErrors([]);
    r15.wireframeDeferredTaskTest = manualErrors(['task-test']).length > 0;
    wf.manualChecks = wfChecks([]).map(m => m.id === 'accent-area' ? { ...m, decision: 'PASS' } : m);
    r15.wireframeAccentPassFails = checkHandoff(wf, 'wireframe').some(e => /accent-area/.test(e));
    const handoffDeferred = JSON.parse(JSON.stringify(h)); handoffDeferred.manualChecks = handoffDeferred.manualChecks.map(m => m.id === 'type-measure' ? { ...m, decision: 'DEFERRED' } : m);
    r15.handoffDeferredFails = checkHandoff(handoffDeferred).some(e => /manual/.test(e));
    assert.deepEqual(r15, { manualIds: [], criticRows: RUBRIC_ROWS, missingFeedbackLog: true, missingCraft: [], missingRow: [], unkeyedFails: true, earlierRoundOk: true, wireframeDeferredCraft: [], wireframePassedCraft: [], wireframeDeferredTaskTest: true, wireframeAccentPassFails: true, handoffDeferredFails: true });
    // R16-GPT-03: the wireframe phase covers every screen and every declared language, with existing pages.
    const r16 = {};
    const wf2 = JSON.parse(JSON.stringify(h)); wf2.phase = 'wireframe';
    wf2.languages = [{ lang: 'en', dir: 'ltr' }, { lang: 'ar', dir: 'rtl' }];
    wf2.copySlots.forEach(c => c.variants.push({ lang: 'ar', dir: 'rtl', text: c.text, source: c.source }));
    wf2.screens.push({ ...JSON.parse(JSON.stringify(wf2.screens[0])), id: 'about', page: join(dir, 'missing-about.html') });
    wf2.screens[1].states = wf2.screens[1].states.map(st => ({ ...st, page: join(dir, 'missing-about.html') }));
    wf2.screens[0].states.push({ state: 'default', lang: 'ar', dir: 'rtl', page: frame });
    wf2.manualChecks = wf2.screens.flatMap(sc => manualIds.map(id => ({ id, screen: sc.id, lang: 'en', state: 'wireframe', decision: ['accent-area', 'palette'].includes(id) ? 'DEFERRED' : 'PASS', reviewer: 'reviewer-x', artifact: frame, note: 'grayscale review', briefRefs: ['brief.md:1'] })));
    const wfErrors = checkHandoff(wf2, 'wireframe').join('\n');
    r16.missingPage = /screen about: page must exist/.test(wfErrors);
    r16.secondScreenRendering = /screen about: wireframe rendering for en\/ltr/.test(wfErrors);
    r16.secondLocaleRendering = /screen about: wireframe rendering for ar\/rtl/.test(wfErrors) && !/screen home: wireframe rendering/.test(wfErrors);
    r16.secondLocaleManual = /manual home\/ar\/wireframe\/point-of-view/.test(wfErrors) && /manual about\/ar\/wireframe/.test(wfErrors) && !/manual home\/en\/wireframe/.test(wfErrors);
    // R16-GPT-04: one shared component definition, referenced by every screen; differences fail.
    r16.componentInventory = manualIds.includes('component-consistency') && checkHandoff(h).length === 0;
    const noInventory = JSON.parse(JSON.stringify(h)); delete noInventory.components;
    r16.missingInventory = /components: one shared definition/.test(checkHandoff(noInventory).join('\n'));
    const two = JSON.parse(JSON.stringify(h));
    two.screens.push({ ...JSON.parse(JSON.stringify(two.screens[0])), id: 'about' });
    two.critic.rounds[0].componentComparison.screens = ['home', 'about'];
    const twoSpec = () => checkHandoff(two).filter(e => /component heading|componentComparison/.test(e));
    two.screens[0].components[0].tokens = { color: 'colors.primary', size: 'typography.title' };
    two.screens[1].components[0].tokens = { size: 'typography.title', color: 'colors.primary' };
    r16.sameSpecOnTwoScreens = twoSpec();
    two.screens[1].components[0].tokens = { color: 'colors.accent', size: 'typography.section' };
    two.screens[1].components[0].behaviour = 'truncates after one line';
    r16.differentSpecOnTwoScreens = twoSpec();
    two.screens[1].components[0].tokens = two.screens[0].components[0].tokens; delete two.screens[1].components[0].behaviour;
    two.screens[1].components[0].variant = 'hero-title';
    r16.undeclaredVariant = twoSpec();
    delete two.screens[1].components[0].variant;
    two.screens[1].components[0].id = 'badge';
    r16.unknownComponent = checkHandoff(two).some(e => /component badge must reference the shared component inventory/.test(e));
    two.screens[1].components[0].id = 'heading';
    two.critic.rounds[0].componentComparison.screens = ['home'];
    r16.comparisonMissesScreen = twoSpec();
    r16.missingConsistencyCheck = /manual home\/en\/default\/component-consistency/.test(dropManual('component-consistency'));
    assert.deepEqual(r16, {
      missingPage: true, secondScreenRendering: true, secondLocaleRendering: true, secondLocaleManual: true,
      componentInventory: true, missingInventory: true,
      sameSpecOnTwoScreens: [],
      differentSpecOnTwoScreens: ['screen about: component heading specifies tokens differently from its shared definition', 'screen about: component heading specifies behaviour differently from its shared definition'],
      undeclaredVariant: ['screen about: component heading uses variant hero-title, not in its shared definition'],
      unknownComponent: true,
      comparisonMissesScreen: ['critic final round needs a passing, evidenced componentComparison covering every screen'],
      missingConsistencyCheck: true,
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
