// Isolated browser fixture: copied tools get a TEST root shim because production write guards target /workspace on Linux.
// This proves Node/Chrome/Style Dictionary execution, never production guard or a real project PASS.
import { cpSync, mkdirSync, writeFileSync, readFileSync, existsSync, mkdtempSync, chmodSync, realpathSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { manualIds, states } from '../tools/handoff-contract.mjs';
import { tmpdir } from 'node:os';
import { fixturePage } from './fixture-page.mjs';

const task = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const deps = join(task, 'runtime-deps');
if (!['yaml/dist/index.js', 'style-dictionary/lib/StyleDictionary.js', 'playwright-core/index.mjs', 'axe-core/axe.min.js', '@google/design.md/dist/index.js'].every(name => existsSync(join(deps, 'node_modules', name)))) {
  console.error('LOCAL FIXTURE BLOCKED: existing pinned runtime dependencies absent; no network install attempted'); process.exit(2);
}
const chrome = process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome';
if (!existsSync(chrome)) { console.error('LOCAL FIXTURE BLOCKED: local test browser absent'); process.exit(2); }
const fixture = mkdtempSync(join(tmpdir(), 'fannan-browser-fixture-'));
console.log('TEST-ONLY fixture evidence: ' + fixture);
const tools = join(fixture, 'tools');
const output = join(fixture, 'design-output/test');
mkdirSync(output, { recursive: true });
cpSync(join(task, 'release/tools'), tools, { recursive: true, force: true });
cpSync(join(task, 'release/runtime/sd.config.mjs'), join(fixture, 'runtime/sd.config.mjs'), { recursive: true, force: true });
cpSync(join(task, 'release/runtime/package-lock.json'), join(fixture, 'runtime/package-lock.json'), { recursive: true, force: true });
cpSync(join(task, 'release/runtime/quality-checks.json'), join(fixture, 'runtime/quality-checks.json'), { recursive: true, force: true });
cpSync(join(task, 'release/runtime/dependency-trust.json'), join(fixture, 'runtime/dependency-trust.json'), { recursive: true, force: true });
const root = join(fixture, 'design-output');
// CODEX-R3-03: every relocation must apply, or the fixture stops (no silent no-op replacement).
const patch = (file, from, to) => { const text = readFileSync(file, 'utf8'); if (!text.includes(from)) throw Error(`fixture patch target absent in ${file}`); writeFileSync(file, text.replace(from, to)); };
const checker = join(tools, 'pre-handoff-check.mjs');
patch(checker, "const OUTPUT_BASE = '/workspace/design-output';", `const OUTPUT_BASE = ${JSON.stringify(root)};`);
// CODEX-R3-03: the temporary launcher copy gets the same test root, so detect reaches the pinned-binary check.
// The production launcher in release/tools keeps its /workspace/design-output boundary (checked below).
const launcherBoundary = '"/workspace/design-output/$FANNAN_PROJECT"/*)';
if (!readFileSync(join(task, 'release/tools/launcher-impeccable.sh.internal'), 'utf8').includes(launcherBoundary)) throw Error('production launcher boundary changed');
patch(join(tools, 'launcher-impeccable.sh.internal'), launcherBoundary, `${JSON.stringify(realpathSync(root) + '/')}"$FANNAN_PROJECT"/*)`);
const missingBinary = 'impeccable (Fannan launcher): pinned binary missing; no download fallback';
const runChecker = (evidenceDir, quiet = false, extra = []) => {
  const r = spawnSync(process.execPath, [join(tools, 'pre-handoff-check.mjs'), design, html, evidenceDir, 'test', handoff, ...extra], { env, encoding: 'utf8' });
  if (!quiet) { process.stdout.write(r.stdout); process.stderr.write(r.stderr); }
  const result = JSON.parse(readFileSync(join(evidenceDir, 'evidence.json'), 'utf8'));
  // CODEX-R3-03: the full gate must stop at the missing pinned binary (launcher exit 3), not at any other detector error.
  if (result.checks.impeccable?.exit !== 3 || result.checks.impeccable.ran !== false || !r.stderr.split('\n').includes(missingBinary)) throw Error(`expected launcher exit 3 "${missingBinary}"; got exit ${result.checks.impeccable?.exit}: ${r.stderr.trim().split('\n').filter(l => l.includes('impeccable')).join(' | ')}`);
  return { status: r.status, result };
};
const guard = `#!${process.execPath}\nconst fs=require('fs'),path=require('path');const root=${JSON.stringify(root)};const [a,b]=process.argv.slice(2);const write=process.argv[1].endsWith('safe-write.sh');const project=write?a:b,target=path.resolve(write?b:a);if(project!=='test'||!target.startsWith(path.join(root,project)+path.sep)){console.error('TEST GUARD DENY');process.exit(10)}if(write){fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,fs.readFileSync(0),{flag:'wx'});}else console.log('TEST GUARD ALLOW');\n`;
writeFileSync(join(tools, 'readonly-precheck.sh'), guard, { mode: 0o755 });
writeFileSync(join(tools, 'safe-write.sh'), guard, { mode: 0o755 });
chmodSync(join(tools, 'readonly-precheck.sh'), 0o755);
chmodSync(join(tools, 'safe-write.sh'), 0o755);
// R6: the test shim carries the local Chrome's own version, so the R4-4 runtime-version check can pass in this fixture.
const chromeVersion = /(\d+\.\d+\.\d+\.\d+)/.exec(execFileSync(realpathSync(chrome), ['--version'], { encoding: 'utf8' }))?.[1];
if (!chromeVersion) throw Error('local Chrome version unreadable');
// These adapters exist only in the temporary copied tools; they cannot approve production storage.
const verifier = join(tools, 'verify-deps.mjs');
writeFileSync(verifier, readFileSync(verifier, 'utf8').replace('return verifyDeps(prefix, pin, releaseRoot);', 'return verifyDependencyTree(prefix, pin, releaseRoot);'));
writeFileSync(join(tools, 'executable-trust.mjs'), readFileSync(join(tools, 'executable-trust.mjs'), 'utf8').replace('export function verifiedBrowser() {', 'function productionBrowser() {') + `\nexport function verifiedBrowser() { return { ...verifyExecutable(${JSON.stringify({path:realpathSync(chrome),sha256:createHash('sha256').update(readFileSync(chrome)).digest('hex')})}), version: ${JSON.stringify(chromeVersion)} }; }\n`);
const env = { ...process.env, FANNAN_DEPS: deps };
delete env.CHROME_PATH; delete env.PUPPETEER_EXECUTABLE_PATH;
const sourceDesign = readFileSync(resolve(task, 'input/fannan-review-pack/example-DESIGN.md'), 'utf8');
const design = join(output, 'fixture-DESIGN.md');
writeFileSync(design, sourceDesign.replace('---\n\n## Overview', 'breakpoints:\n  desktop: 1440px\n---\n\n## Overview'));
const json = join(output, 'tokens.json'), css = join(output, 'variables.css');
execFileSync(process.execPath, [join(tools, 'designmd-to-sd.mjs'), design, json, 'test'], { env, stdio: 'inherit' });
execFileSync(process.execPath, [join(tools, 'sd-build.mjs'), json, css, 'test'], { env, stdio: 'inherit' });
if (!readFileSync(css, 'utf8').includes('--colors-primary') || !readFileSync(css, 'utf8').includes('--breakpoints-desktop')) throw Error('CSS token or breakpoint absent');
const html = join(output, 'home.html');
writeFileSync(html, fixturePage('variables.css')); // OPUS-R2-10 follow-up: built spacing scale, no browser defaults
const handoff = join(output, 'handoff.json');
writeFileSync(handoff, '{}'); // Deliberately fails contract: this fixture only tests browser execution.
const evidence = join(output, 'evidence');
let { status, result } = runChecker(evidence);
if (status !== 1 || result.pass || !result.checks.axe || !result.checks.design || !result.checks.impeccable) throw Error('expected browser execution and fail-closed output');
const shot = join(evidence, 'page-1440.png');
const hash = createHash('sha256').update(readFileSync(shot)).digest('hex');
const brief = join(output, 'brief.md'), rules = join(output, 'rules.md'), settings = join(output, 'settings.md'), approved = join(output, 'approval.md');
writeFileSync(brief, 'Residents need a clear service.\nSpecific service\nA service for residents.\nStart\n');
writeFileSync(rules, 'Use verified copy.');
writeFileSync(settings, 'repo-fixture stack-fixture engineer-fixture qa-fixture writer-fixture approver-fixture');
const frameId = `home/en/default/v1/${hash}`;
writeFileSync(approved, `2026-10-16 approver-fixture ${frameId}`);
const na = state => ({ state, lang: 'en', dir: 'ltr', applicable: false, reason: 'fixture static state', reviewer: 'fixture-reviewer', evidence: shot });
const authored = {
  version: 1, phase: 'handoff', brief: { path: brief }, rules: { path: rules },
  designLink: { url: 'https://example.invalid/private', private: true, evidence: brief }, tokens: { ...Object.fromEntries(['json', 'css', 'buildScript', 'config', 'lock'].map(k => { const path = { json, css, buildScript: join(tools, 'sd-build.mjs'), config: join(fixture, 'runtime/sd.config.mjs'), lock: join(fixture, 'runtime/package-lock.json') }[k]; return [k, { path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') }]; })), buildEvidence: { path: css + '.build.json' } }, toolEvidence: [{ tool: 'fixture', version: '1', artifact: shot }],
  settings: { desktopWidths: [1440], path: settings, repository: 'repo-fixture', stack: 'stack-fixture', roles: { engineer: 'engineer-fixture', qaGate: 'qa-fixture', writer: 'writer-fixture', approver: 'approver-fixture' } },
  pointOfView: { idea: 'Clear service for residents', briefRefs: ['brief.md:1'] },
  screens: [{ id: 'home', page: html, headingOutline: [{ level: 1, text: 'Specific service' }], seoIntent: 'service', schemaIntent: 'none', images: [], actions: [{ id: 'start', label: 'Start' }], states: [{ state: 'default', lang: 'en', dir: 'ltr', page: html, frame: { path: shot, width: 1440, version: 'v1', sha256: hash } }, ...states.slice(1).map(na)], components: [{ id: 'start-button', states: [{ state: 'default', lang: 'en', dir: 'ltr', applicable: true, evidence: shot }, ...states.slice(1).map(na)] }], acceptance: [{ id: 'visible', severity: 'BLOCK', decision: 'PASS', check: 'service visible', evidence: shot }], wcag: { standard: '2.2 AA', contrastEvidence: shot, focusOrderEvidence: shot, targetSizeEvidence: shot } }],
  copySlots: [
    { id: 'headline', screen: 'home', kind: 'interface', purpose: 'name service', text: 'Specific service', minChars: 5, maxChars: 32, tone: 'direct', placementScreenshot: shot, placements: [{ lang: 'en', state: 'default', screenshot: shot }], source: { kind: 'brief', path: brief, ref: 'brief.md:2' }, lang: 'en', dir: 'ltr', variants: [{ lang: 'en', dir: 'ltr', text: 'Specific service', source: { path: brief, ref: 'brief.md:2' } }] },
    { id: 'description', screen: 'home', kind: 'interface', purpose: 'explain service', text: 'A service for residents.', minChars: 5, maxChars: 40, tone: 'direct', placementScreenshot: shot, placements: [{ lang: 'en', state: 'default', screenshot: shot }], source: { kind: 'brief', path: brief, ref: 'brief.md:3' }, lang: 'en', dir: 'ltr', variants: [{ lang: 'en', dir: 'ltr', text: 'A service for residents.', source: { path: brief, ref: 'brief.md:3' } }] },
    { id: 'button', screen: 'home', kind: 'interface', purpose: 'start flow', text: 'Start', minChars: 1, maxChars: 20, tone: 'direct', placementScreenshot: shot, placements: [{ lang: 'en', state: 'default', screenshot: shot }], source: { kind: 'brief', path: brief, ref: 'brief.md:4' }, lang: 'en', dir: 'ltr', variants: [{ lang: 'en', dir: 'ltr', text: 'Start', source: { path: brief, ref: 'brief.md:4' } }] }
  ],
  facts: [], placeholders: [], openQuestions: [], languages: [{ lang: 'en', dir: 'ltr' }], assets: [], motion: [],
  manualChecks: manualIds.map(id => ({ id, screen: 'home', lang: 'en', state: 'default', decision: 'PASS', reviewer: 'fixture-reviewer', artifact: shot, note: 'test fixture only', briefRefs: ['brief.md:1'] })),
  critic: { referenceWork: shot, rounds: [{ decision: 'PASS', reviewer: 'fixture-critic', evidence: shot, copyChecks: [{ decision: 'PASS', evidence: shot }], designChecks: [{ decision: 'PASS', evidence: shot }] }] },
  approval: { decision: 'approved', approver: 'approver-fixture', record: approved, frameIds: [frameId] }
};
writeFileSync(handoff, JSON.stringify(authored));
const evidence2 = join(output, 'evidence-valid');
const { status: status2, result: second } = runChecker(evidence2);
status = status2;
if (status !== 1 || !second.checks.contract.pass || second.checks.states.length !== 1 || !second.checks.states[0].pass || second.checks.impeccable.pass) throw Error('expected valid contract and all applicable state browser checks, with pinned binary blocking');
if (!second.checks.widths?.pass || second.checks.states[0].widths?.results.map(r => r.width).join() !== '1440,320' || !second.checks.states[0].widths.pass) throw Error('R8: declared desktop width 1440 and 320 px reflow must be screened on the page and the state');
// R12 M18: the claims VERIFICATION.md makes about this run are asserted here, not inferred.
const claims = { integrity: second.checks.integrity?.status, stateIntegrity: second.checks.states[0].integrity?.status, glassSource: second.checks.glassSource?.pass, accent: second.checks.accent?.status, stateAccent: second.checks.states[0].accent?.status, frames: second.checks.frames?.status, spacingExceptions: second.checks.spacingExceptions?.status, reflowCandidates: second.checks.reflowCandidates?.status, stylesheets: second.checks.stylesheets?.pass, stateStylesheets: second.checks.states[0].stylesheets?.pass, reducedMotion: second.checks.reducedMotion?.pass, stateReducedMotion: second.checks.states[0].reducedMotion?.pass, stateRafCounted: Number.isFinite(second.checks.states[0].reducedMotion?.rafCallsOver700ms) };
console.log('R12/R13 fixture claims: ' + JSON.stringify(claims));
if (!second.checks.integrity?.pass || !second.checks.states[0].integrity?.pass || second.checks.glassSource?.pass !== true || !second.checks.accent?.pass || second.checks.accent.status !== 'PASS' || !second.checks.states[0].accent?.pass || second.checks.states[0].accent.status !== 'PASS' || !second.checks.frames?.pass || !second.checks.spacingExceptions?.pass || !claims.stylesheets || !claims.stateStylesheets || !claims.reducedMotion || !claims.stateReducedMotion || !claims.stateRafCounted) throw Error('R12 M18, R13 N07/N18: integrity (page and state), glassSource, accent (page and state), frames and spacingExceptions must PASS on the valid fixture: ' + JSON.stringify(claims));
if (process.env.FANNAN_FIXTURE_EVIDENCE_COPY) cpSync(join(evidence2, 'evidence.json'), process.env.FANNAN_FIXTURE_EVIDENCE_COPY);
// R13 N05/N06: executed negative runs of the frames, spacing-exception and per-state integrity gates (not source regexes).
const original = readFileSync(html, 'utf8');
const negative = {};
writeFileSync(html, original.replace('</main>', '<iframe title="embedded note" srcdoc="<p>note</p>"></iframe></main>'));
const { result: framed } = runChecker(join(output, 'evidence-frame'), true);
const { result: framedWire } = runChecker(join(output, 'evidence-frame-wireframe'), true, ['--phase=wireframe']);
negative.frames = { handoff: framed.checks.frames?.status, statePass: framed.checks.states[0]?.frames?.pass, wireframe: framedWire.checks.frames?.status };
if (framed.checks.frames?.status !== 'FAIL' || framed.checks.frames.pass !== false || framed.pass || framed.checks.states[0]?.frames?.pass !== false || framedWire.checks.frames?.status !== 'DEFERRED') throw Error('R13 N05: a same-origin srcdoc frame must FAIL the handoff (page and state) and be DEFERRED in a wireframe: ' + JSON.stringify(negative.frames));
writeFileSync(html, original.replace('<h1 data-copy-slot="headline">', '<h1 id="title" data-copy-slot="headline" data-fannan-spacing-exception="optical alignment of the title" style="margin-left:3px">'));
const { result: excused } = runChecker(join(output, 'evidence-spacing-unapproved'), true);
writeFileSync(handoff, JSON.stringify({ ...authored, spacingExceptions: [{ screen: 'home', state: 'default', lang: 'en', id: 'title', reason: 'optical alignment of the title', reviewer: 'approver-fixture' }] }));
const { result: approvedExc } = runChecker(join(output, 'evidence-spacing-approved'), true);
negative.spacingExceptions = { withoutEntry: excused.checks.spacingExceptions?.status, unresolved: excused.checks.spacingExceptions?.unresolved?.length, withEntry: approvedExc.checks.spacingExceptions?.status, contractWithEntry: approvedExc.checks.contract?.pass };
if (excused.checks.spacingExceptions?.status !== 'FAIL' || excused.pass || approvedExc.checks.spacingExceptions?.status !== 'PASS' || !approvedExc.checks.contract?.pass) throw Error('R13 N05: a spacing exception without an approver entry must FAIL, and PASS with a matching entry: ' + JSON.stringify(negative.spacingExceptions));
writeFileSync(html, original);
const statePage = join(output, 'loading.html');
writeFileSync(statePage, original.replace('</main>', '<div id="wide" style="width:2000px;height:1px"></div></main><script>document.getElementById("wide").remove();</script>'));
const twoStates = JSON.parse(JSON.stringify(authored));
twoStates.screens[0].states[states.indexOf('loading')] = { state: 'loading', lang: 'en', dir: 'ltr', page: statePage, frame: { path: shot, width: 1440, version: 'v1', sha256: hash } };
writeFileSync(handoff, JSON.stringify(twoStates));
const { result: stateOnly } = runChecker(join(output, 'evidence-state-integrity'), true);
const loadingState = stateOnly.checks.states.find(x => x.state === 'loading'), defaultState = stateOnly.checks.states.find(x => x.state === 'default');
negative.stateIntegrity = { positional: stateOnly.checks.integrity?.status, defaultState: defaultState?.integrity?.status, loadingState: loadingState?.integrity?.status, loadingMismatch: loadingState?.integrity?.mismatches?.map(m => m.check), loadingPass: loadingState?.pass };
if (stateOnly.checks.integrity?.status !== 'PASS' || defaultState?.integrity?.status !== 'PASS' || loadingState?.integrity?.status !== 'integrity mismatch' || loadingState.pass !== false || stateOnly.pass) throw Error('R13 N06: an integrity mismatch on a non-positional state must fail that state while the positional page passes: ' + JSON.stringify(negative.stateIntegrity));
console.log('R13 fixture negative runs: ' + JSON.stringify(negative));
writeFileSync(handoff, JSON.stringify(authored));
writeFileSync(html, readFileSync(html, 'utf8').replace('A service for residents.', 'Invented service copy.'));
const evidence3 = join(output, 'evidence-mutated');
const { result: mutated } = runChecker(evidence3, true);
if (mutated.checks.states[0].copy.pass || mutated.checks.states[0].renderedSha256 === hash) throw Error('changed HTML must fail deck and approved-frame hash');
const foreign = join(fixture, 'foreign.html');
writeFileSync(foreign, '<p>outside project</p>');
writeFileSync(html, readFileSync(html, 'utf8').replace('</main>', `<iframe src="${pathToFileURL(foreign).href}"></iframe><img src="https://example.invalid/x.png"></main>`));
const evidence4 = join(output, 'evidence-foreign');
const { result: foreignResult } = runChecker(evidence4, true);
if (!foreignResult.externalRequestsBlocked?.some(v => v.url?.includes('foreign.html')) || !foreignResult.externalRequestsBlocked?.some(v => v.url?.includes('example.invalid')) || foreignResult.checks.resourceBoundary.pass) throw Error('foreign file and network loads must be blocked by browser route');
console.log(`LOCAL FIXTURE: browser, contract and applicable state checks passed; full gate correctly blocked by absent pinned Impeccable binary (launcher exit 3: ${missingBinary})`);
