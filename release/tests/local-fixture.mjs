// Isolated browser fixture: copied tools get a TEST root shim because production write guards target /workspace on Linux.
// This proves Node/Chrome/Style Dictionary execution, never production guard or a real project PASS.
import { cpSync, mkdirSync, writeFileSync, readFileSync, existsSync, mkdtempSync, chmodSync, realpathSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { criticRows, manualIds, states } from '../tools/handoff-contract.mjs';
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
writeFileSync(brief, 'Residents need a clear service.\nSpecific service\nA service for residents.\nStart\nStart the service\n'); // R19-GPT-06: the approved accessible name of the R18 copy run is cited too
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
  screens: [{ id: 'home', type: 'marketing', page: html, headingOutline: [{ level: 1, text: 'Specific service' }], seoIntent: 'service', schemaIntent: 'none', images: [], actions: [{ id: 'start', label: 'Start' }], states: [{ state: 'default', lang: 'en', dir: 'ltr', page: html, frame: { path: shot, width: 1440, version: 'v1', sha256: hash } }, ...states.slice(1).map(na)], components: [{ id: 'start-button', states: [{ state: 'default', lang: 'en', dir: 'ltr', applicable: true, evidence: shot }, ...states.slice(1).map(na)] }], acceptance: [{ id: 'visible', severity: 'BLOCK', decision: 'PASS', check: 'service visible', evidence: shot }], wcag: { standard: '2.2 AA', contrastEvidence: shot, focusOrderEvidence: shot, targetSizeEvidence: shot } }],
  copySlots: [
    { id: 'headline', screen: 'home', kind: 'interface', purpose: 'name service', text: 'Specific service', minChars: 5, maxChars: 32, tone: 'direct', placementScreenshot: shot, placements: [{ lang: 'en', state: 'default', screenshot: shot }], source: { kind: 'brief', path: brief, ref: 'brief.md:2' }, lang: 'en', dir: 'ltr', variants: [{ lang: 'en', dir: 'ltr', text: 'Specific service', source: { path: brief, ref: 'brief.md:2' } }] },
    { id: 'description', screen: 'home', kind: 'interface', purpose: 'explain service', text: 'A service for residents.', minChars: 5, maxChars: 40, tone: 'direct', placementScreenshot: shot, placements: [{ lang: 'en', state: 'default', screenshot: shot }], source: { kind: 'brief', path: brief, ref: 'brief.md:3' }, lang: 'en', dir: 'ltr', variants: [{ lang: 'en', dir: 'ltr', text: 'A service for residents.', source: { path: brief, ref: 'brief.md:3' } }] },
    { id: 'button', screen: 'home', kind: 'interface', purpose: 'start flow', text: 'Start', minChars: 1, maxChars: 20, tone: 'direct', placementScreenshot: shot, placements: [{ lang: 'en', state: 'default', screenshot: shot }], source: { kind: 'brief', path: brief, ref: 'brief.md:4' }, lang: 'en', dir: 'ltr', variants: [{ lang: 'en', dir: 'ltr', text: 'Start', source: { path: brief, ref: 'brief.md:4' } }] }
  ],
  facts: [], placeholders: [], openQuestions: [], languages: [{ lang: 'en', dir: 'ltr' }], assets: [], motion: [],
  components: [{ id: 'start-button', variants: ['primary'], states: ['default'], tokens: { background: 'colors.primary', label: 'typography.label' }, behaviour: 'starts the service flow; one per viewport' }],
  manualChecks: manualIds.map(id => ({ id, screen: 'home', lang: 'en', state: 'default', decision: 'PASS', reviewer: 'fixture-reviewer', artifact: shot, note: 'test fixture only', briefRefs: ['brief.md:1'] })),
  critic: { referenceWork: shot, rounds: [{ decision: 'PASS', reviewer: 'fixture-critic', evidence: shot, copyChecks: [{ row: 'copy-truth', decision: 'PASS', evidence: shot }], designChecks: criticRows.filter(row => row !== 'copy-truth').map(row => ({ row, decision: 'PASS', evidence: shot })), componentComparison: { screens: ['home'], decision: 'PASS', evidence: shot } }] },
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
// R14-GPT-05: timer-driven motion inside an open shadow root fails reduced motion, on the positional page and on a
// declared state (executed checker runs; the host box does not move, there is no rAF and no Web Animation).
const shadowMotion = '<div id="motion"></div><script>const mr = document.getElementById("motion").attachShadow({ mode: "open" }); mr.innerHTML = \'<span style="display:inline-block;width:12px;height:12px;background:#000"></span>\'; let mx = 0; setInterval(() => { mx += 4; mr.firstChild.style.transform = "translateX(" + mx + "px)"; }, 50);</script>';
writeFileSync(handoff, JSON.stringify(authored));
writeFileSync(html, original.replace('</main>', shadowMotion + '</main>'));
const { result: movingPage } = runChecker(join(output, 'evidence-shadow-motion-page'), true);
writeFileSync(html, original);
writeFileSync(statePage, original.replace('</main>', shadowMotion + '</main>'));
writeFileSync(handoff, JSON.stringify(twoStates));
const { result: movingState } = runChecker(join(output, 'evidence-shadow-motion-state'), true);
const movingLoading = movingState.checks.states.find(x => x.state === 'loading'), movingDefault = movingState.checks.states.find(x => x.state === 'default');
const motionRuns = { page: { pass: movingPage.checks.reducedMotion?.pass, changed: movingPage.checks.reducedMotion?.elementsChangedOver700ms, raf: movingPage.checks.reducedMotion?.rafCallsOver700ms }, state: { positional: movingState.checks.reducedMotion?.pass, defaultState: movingDefault?.reducedMotion?.pass, loading: movingLoading?.reducedMotion?.pass, loadingChanged: movingLoading?.reducedMotion?.elementsChangedOver700ms, loadingStatePass: movingLoading?.pass } };
console.log('R14 fixture shadow-motion runs: ' + JSON.stringify(motionRuns));
if (movingPage.checks.reducedMotion?.pass !== false || !(movingPage.checks.reducedMotion.elementsChangedOver700ms > 0) || movingPage.pass || movingState.checks.reducedMotion?.pass !== true || movingDefault?.reducedMotion?.pass !== true || movingLoading?.reducedMotion?.pass !== false || movingLoading.pass !== false) throw Error('R14-GPT-05: shadow-root timer motion must fail reduced motion on the page and on the state that has it: ' + JSON.stringify(motionRuns));
// R16 (panel round 16): full pre-handoff runs for R16-GPT-01/02 (positional page and its declared state) and the
// wireframe-phase coverage of R16-GPT-03. Results are collected first so a checker without the fixes shows every gap.
writeFileSync(handoff, JSON.stringify(authored));
const r16 = {};
const r16Run = (name, extraHtml, script) => {
  writeFileSync(html, original.replace('</main>', `${extraHtml}</main><script>${script}</script>`));
  const { result } = runChecker(join(output, `evidence-r16-${name}`), true);
  const state = result.checks.states.find(x => x.state === 'default');
  return { page: result.checks.integrity?.status, state: state?.integrity?.status, checks: [...new Set([...(result.checks.integrity?.mismatches || []), ...(state?.integrity?.mismatches || [])].map(m => `${m.check}/${m.source || 'world'}`))].sort(), pass: result.pass };
};
r16.filterReveal = r16Run('filter', '<p id="r16f" style="filter:blur(8px)">Revealed later</p>', 'document.getElementById("r16f").style.filter = "none";');
r16.fadedSubmit = r16Run('submit', '<input id="r16s" type="submit" value="Start now" style="opacity:.05">', 'document.getElementById("r16s").style.opacity = "1";');
r16.scriptedLabel = r16Run('label', '<label id="r16l" for="r16e"></label><input id="r16e" type="email">', 'document.getElementById("r16l").textContent = "Email address";');
writeFileSync(html, original);
const aboutPage = join(output, 'about.html');
writeFileSync(aboutPage, original.replace('</main>', '<h1>Second top heading</h1></main>'));
const wide = JSON.parse(JSON.stringify(authored));
wide.languages = [{ lang: 'en', dir: 'ltr' }, { lang: 'ar', dir: 'rtl' }];
wide.screens.push({ ...JSON.parse(JSON.stringify(authored.screens[0])), id: 'about', page: aboutPage, states: [{ state: 'default', lang: 'en', dir: 'ltr', page: aboutPage }] });
writeFileSync(handoff, JSON.stringify(wide));
const { result: wideWire } = runChecker(join(output, 'evidence-r16-wireframe-coverage'), true, ['--phase=wireframe']);
const scopeOf16 = (screen, lang) => wideWire.checks.states.find(x => x.screen === screen && x.lang === lang);
r16.wireframe = { homeEn: scopeOf16('home', 'en')?.pass, homeAr: scopeOf16('home', 'ar')?.error, aboutEn: scopeOf16('about', 'en')?.pass, aboutAr: scopeOf16('about', 'ar')?.error, contractNamesAbout: (wideWire.checks.contract?.errors || []).some(e => /manual about\/ar\/wireframe/.test(e)), pass: wideWire.pass };
writeFileSync(handoff, JSON.stringify(authored));
console.log('R16 fixture runs: ' + JSON.stringify(r16));
const r16Want = {
  filterReveal: r16.filterReveal.page === 'INCOMPLETE' && r16.filterReveal.state === 'INCOMPLETE' && r16.filterReveal.pass === false,
  fadedSubmit: r16.fadedSubmit.page === 'integrity mismatch' && r16.fadedSubmit.checks.includes('contrastFailures/js-off') && r16.fadedSubmit.pass === false,
  scriptedLabel: r16.scriptedLabel.page !== 'PASS' && r16.scriptedLabel.checks.includes('content/js-off') && r16.scriptedLabel.pass === false,
  wireframe: r16.wireframe.homeEn !== undefined && r16.wireframe.aboutEn === false && /no rendering declared/.test(r16.wireframe.homeAr || '') && /no rendering declared/.test(r16.wireframe.aboutAr || '') && r16.wireframe.contractNamesAbout && r16.wireframe.pass === false,
};
if (Object.values(r16Want).some(v => !v)) throw Error('R16-GPT-01/02/03 full-run expectations failed: ' + JSON.stringify(r16Want));
// R17 (panel round 17): full pre-handoff runs for the rendered-visibility backstop (R17-MIMAR-01/02, R17-GPT-02), the
// control value/name split (R17-GPT-01), native copy screening (R17-GPT-03) and a healthy scroll reveal (no false
// positive). Results are collected first so a checker without the fixes shows every gap.
writeFileSync(handoff, JSON.stringify(authored));
const r17 = {};
const r17Run = (name, extraHtml, script, head = '') => {
  writeFileSync(html, original.replace('</head>', `${head}</head>`).replace('</main>', `${extraHtml}</main>${script ? `<script>${script}</script>` : ''}`));
  const started = Date.now();
  const { result } = runChecker(join(output, `evidence-r17-${name}`), true);
  const state = result.checks.states.find(x => x.state === 'default');
  const vis = [result.checks.integrity?.probeWorld?.visibility, result.checks.integrity?.jsOff?.visibility];
  return { page: result.checks.integrity?.status, state: state?.integrity?.status, checks: [...new Set([...(result.checks.integrity?.mismatches || []), ...(state?.integrity?.mismatches || [])].map(m => `${m.check}/${m.source || 'world'}`))].sort(), copy: state?.copy?.errors || [], placeholders: result.checks.design?.placeholders, filler: result.checks.design?.filler, visibilityMs: vis.map(v => v?.ms ?? null), hidden: vis.map(v => v?.textHidden ?? null), runMs: Date.now() - started, pass: result.pass };
};
r17.clipPath = r17Run('clip-path', '<p id="r17c" style="clip-path:inset(0 100% 0 0)">Revealed later</p>', 'document.getElementById("r17c").style.clipPath = "none";');
r17.scale = r17Run('scale', '<p id="r17s" style="transform:scale(.02)">Scaled in later</p>', 'document.getElementById("r17s").style.transform = "none";');
r17.preloader = r17Run('preloader', '<div id="r17p" style="position:fixed;inset:0;background:#fff"></div>', 'document.getElementById("r17p").remove();');
r17.placeholderOpacity = r17Run('placeholder', '<input id="r17i" placeholder="name@example.org">', 'document.getElementById("r17i").classList.add("ok");', '<style>#r17i::placeholder{color:#000;opacity:.05}#r17i.ok::placeholder{opacity:1}</style>');
r17.textFill = r17Run('text-fill', '<p id="r17t" style="-webkit-text-fill-color:transparent">Filled in later</p>', 'document.getElementById("r17t").style.webkitTextFillColor = "currentColor";');
r17.gradient = r17Run('gradient', '<div style="position:relative"><p>First line<br>second line<br>third line</p><div id="r17g" style="position:absolute;inset:0;background:linear-gradient(transparent,#fff 60%)"></div></div>', 'document.getElementById("r17g").remove();');
r17.ariaSubmit = r17Run('aria-submit', '<input id="r17a" type="submit" aria-label="Start now" value="">', 'document.getElementById("r17a").value = "Start now";');
r17.nativeCopy = r17Run('native-copy', '<input placeholder="[placeholder]"><input type="submit" value="Lorem ipsum">');
r17.healthyReveal = r17Run('healthy-reveal', '<p class="r17r" style="margin-top:1200px">Revealed on scroll</p>', 'const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add("in"))); document.querySelectorAll(".r17r").forEach(e => io.observe(e));', '<style>.r17r{opacity:0;transition:opacity .6s}.r17r.in{opacity:1}</style><noscript><style>.r17r{opacity:1}</style></noscript>');
writeFileSync(html, original);
writeFileSync(handoff, JSON.stringify(authored));
console.log('R17 fixture runs: ' + JSON.stringify(r17));
const lost17 = r => r.page === 'integrity mismatch' && r.state === 'integrity mismatch' && r.checks.some(c => /^text(Obscured|Unreadable)\/js-off$/.test(c)) && r.pass === false;
const r17Want = {
  clipPath: lost17(r17.clipPath), scale: lost17(r17.scale), preloader: lost17(r17.preloader), placeholderOpacity: lost17(r17.placeholderOpacity), textFill: lost17(r17.textFill), gradient: lost17(r17.gradient),
  ariaSubmit: r17.ariaSubmit.page !== 'PASS' && r17.ariaSubmit.checks.includes('content/js-off') && r17.ariaSubmit.pass === false,
  nativeCopy: r17.nativeCopy.copy.some(e => /unlisted native copy: \[placeholder\]/.test(e)) && r17.nativeCopy.copy.some(e => /unlisted native copy: Lorem ipsum/.test(e)) && r17.nativeCopy.placeholders === true && r17.nativeCopy.pass === false,
  healthyReveal: r17.healthyReveal.page === 'PASS' && r17.healthyReveal.state === 'PASS',
};
if (Object.values(r17Want).some(v => !v)) throw Error('R17 full-run expectations failed: ' + JSON.stringify(r17Want));
// R18 (panel round 18): full pre-handoff runs for the revised backstop (R18-GPT-03/04/07, R18-MIMAR-01/02) and the
// copy deck's separate accessible name (R18-GPT-01). Results are collected first so a checker without the fixes shows
// every gap.
const r18 = {};
r18.displayContents = r17Run('r18-display-contents', '<section id="r18d" style="clip-path:inset(0 100% 0 0)"><span style="display:contents">Revealed later</span></section>', 'document.getElementById("r18d").style.clipPath = "none";');
r18.partialClip = r17Run('r18-partial-clip', '<p id="r18p" style="clip-path:inset(0 0 66% 0)">First line<br>Second line<br>Third line</p>', 'document.getElementById("r18p").style.clipPath = "none";');
r18.faintLayer = r17Run('r18-faint-layer', '<div style="position:relative"><p>Under a faint layer</p><div style="position:absolute;inset:0;background:rgba(255,255,255,.03)"></div></div>');
r18.hiddenPanels = r17Run('r18-hidden-panels', '<div style="overflow:hidden;width:600px"><div style="display:flex;width:1800px"><p style="width:600px">Slide one</p><p style="width:600px">Slide two</p><p style="width:600px">Slide three</p></div></div><button aria-expanded="false">Questions</button><div style="max-height:0;overflow:hidden"><p>Collapsed answer</p></div>');
r18.scriptOpened = r17Run('r18-script-opened', '<div id="r18o" style="max-height:0;overflow:hidden"><p>Opened by script</p></div>', 'document.getElementById("r18o").style.maxHeight = "none";');
r18.thinWeights = r17Run('r18-thin-weights', '<p style="font:300 14px Lato;color:#767676">Light weight label</p><p style="font:100 12px Lato;color:#767676">Hairline caption</p><p style="font:200 16px Inter;color:#767676">Extra-light line</p>');
const r18Copy = (name, markup, slot) => {
  writeFileSync(handoff, JSON.stringify({ ...authored, copySlots: authored.copySlots.map(c => c.id === 'button' ? { ...c, ...slot } : c) }));
  writeFileSync(html, original.replace('<button data-copy-slot="button">Start</button>', markup));
  const { result } = runChecker(join(output, `evidence-r18-${name}`), true);
  return { copy: result.checks.states.find(x => x.state === 'default')?.copy?.errors || [], contract: (result.checks.contract?.errors || []).filter(e => /copy button/.test(e)) };
};
r18.copyApprovedName = r18Copy('copy-approved-name', '<button data-copy-slot="button" aria-label="Start the service">Start</button>', { ariaLabel: 'Start the service' });
r18.copySameValueName = r18Copy('copy-same-value-name', '<input type="submit" data-copy-slot="button" value="Start" aria-label="Start">', {});
r18.copyUnapprovedName = r18Copy('copy-unapproved-name', '<button data-copy-slot="button" aria-label="Start the service">Start</button>', {});
writeFileSync(html, original);
writeFileSync(handoff, JSON.stringify(authored));
console.log('R18 fixture runs: ' + JSON.stringify(r18));
const lost18 = (r, check) => r.page === 'integrity mismatch' && r.state === 'integrity mismatch' && r.checks.includes(check) && r.pass === false;
const clean18 = r => r.page === 'PASS' && r.state === 'PASS';
const r18Want = {
  displayContents: lost18(r18.displayContents, 'textUnreadable/js-off'), partialClip: lost18(r18.partialClip, 'textUnreadable/js-off'),
  faintLayer: clean18(r18.faintLayer), hiddenPanels: clean18(r18.hiddenPanels) && r18.hiddenPanels.hidden.every(n => n === 3), scriptOpened: lost18(r18.scriptOpened, 'textHidden/js-off'), thinWeights: clean18(r18.thinWeights),
  copyApprovedName: r18.copyApprovedName.copy.length === 0 && r18.copyApprovedName.contract.length === 0, copySameValueName: r18.copySameValueName.copy.length === 0,
  copyUnapprovedName: r18.copyUnapprovedName.copy.some(e => /accessible name in slot button differs from deck \(no ariaLabel approved\): Start the service/.test(e)),
};
if (Object.values(r18Want).some(v => !v)) throw Error('R18 full-run expectations failed: ' + JSON.stringify(r18Want));
// R19 (panel round 19): full pre-handoff runs for the width screen's hidden content (R19-GPT-01), covers the hit test
// cannot see (R19-GPT-02), lazy content inside an app panel (R19-GPT-04), the colour-contrast incomplete resolver
// (R19-MIMAR-01), a declared modal-dialog state (R19-MIMAR-02) and the cited accessible name (R19-GPT-06). Results are
// collected first so a checker without the fixes shows every gap.
const photoPng = () => { // a noisy photograph stand-in, 8-bit RGB
  const w = 320, h = 200, raw = Buffer.alloc((w * 3 + 1) * h); let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3, base = 90 + 80 * Math.sin(x / 23) * Math.cos(y / 17); for (let c = 0; c < 3; c++) raw[o + c] = Math.max(0, Math.min(255, base + [40, 10, -20][c] + (rnd() - 0.5) * 120)); }
  const crc = b => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; } return ~c >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};
writeFileSync(join(output, 'r19-photo.png'), photoPng());
const r19 = {};
const r19Run = (name, extraHtml, script = '', head = '', handoffJson = authored, statePageHtml = null, pageBase = original, stateExtra = {}) => {
  writeFileSync(html, pageBase.replace('</head>', `${head}</head>`).replace('</main>', `${extraHtml}</main>${script ? `<script>${script}</script>` : ''}`));
  let extraState = null;
  // R20: statePageHtml may also be a list of [state, html] pairs (reveal states: an accordion's open state, each slide)
  const extra = !statePageHtml ? [] : Array.isArray(statePageHtml) ? statePageHtml : [['dialog-open', statePageHtml]];
  if (extra.length) { const h = JSON.parse(JSON.stringify(handoffJson)); for (const [stName, stHtml] of extra) { const sp = join(output, `r19-${name}-${stName}.html`); writeFileSync(sp, stHtml); extraState = stName; h.screens[0].states.push({ state: stName, lang: 'en', dir: 'ltr', page: sp, frame: { path: shot, width: 1440, version: 'v1', sha256: hash }, ...stateExtra }); h.manualChecks = [...h.manualChecks, ...h.manualChecks.filter(m => m.state === 'default').map(m => ({ ...m, state: stName }))]; } handoffJson = h; }
  writeFileSync(handoff, JSON.stringify(handoffJson));
  const { result } = runChecker(join(output, `evidence-r19-${name}`), true);
  const st = result.checks.states.find(x => x.state === (extraState || 'default'));
  const mm = i => [...new Set((i?.mismatches || []).map(m => `${m.check}/${m.source || 'world'}`))].sort();
  return { page: result.checks.integrity?.status, state: st?.integrity?.status, pageChecks: mm(result.checks.integrity), stateChecks: mm(st?.integrity), widths: [result.checks.widths?.pass, st?.widths?.pass],
    axe: [result.checks.axe?.pass, result.checks.axe?.unresolvedIncomplete, st?.axeIncompleteUnresolved], hidden: [st?.integrity?.probeWorld?.visibility?.textHidden, st?.integrity?.jsOff?.visibility?.textHidden], requiresScript: st?.requiresScript ?? null, statePass: st?.pass ?? null, rendered: st?.renderedSha256 ?? null, stateOnly: st?.integrity?.stateOnlyContent ?? null, reveals: result.checks.reveals?.unresolved?.length ?? null, revealedBy: [...new Set([result.checks.widths, ...result.checks.states.map(x => x.widths)].flatMap(w => (w?.results || []).flatMap(r => r.clipped.flatMap(c => c.revealedBy || []))))].sort(), contract: (result.checks.contract?.errors || []).filter(e => /copy button/.test(e)) };
};
r19.hiddenWidths = r19Run('hidden-widths', '<div style="overflow:hidden;max-width:600px"><div style="display:flex;width:300%"><p style="flex:1 0 0">Slide one</p><p style="flex:1 0 0">Slide two</p><p style="flex:1 0 0">Slide three</p></div></div><button aria-expanded="false">Questions</button><div style="max-height:0;overflow:hidden"><p>Collapsed answer</p></div>');
r19.pseudoVeil = r19Run('pseudo-veil', '<div id="r19v" class="r19load"><p>Card under a loading veil</p></div>', 'document.getElementById("r19v").classList.remove("r19load");', '<style>.r19load{position:relative}.r19load::after{content:"";position:absolute;inset:0;background:rgba(255,255,255,.8)}</style>');
r19.peVeil = r19Run('pe-veil', '<div style="position:relative"><p>Under a click-through veil</p><div style="position:absolute;inset:0;background:rgba(255,255,255,.7);pointer-events:none"></div></div>');
r19.innerLazy = r19Run('inner-lazy', '<div style="height:3000px"></div><div id="r19s" style="height:1px"></div><div id="r19f"></div>', 'new IntersectionObserver(e => { if (e[0].isIntersecting) document.getElementById("r19f").innerHTML = \'<p style="color:#eee">Lazy panel text</p>\'; }, { root: document.querySelector("main") }).observe(document.getElementById("r19s"));', '<style>html,body{height:100%;overflow:hidden}main{height:100%;overflow:auto}</style>');
const hero19 = colour => '<section style="position:relative;height:360px;color:' + colour + '"><img src="r19-photo.png" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"><div style="position:absolute;inset:0;background:rgba(0,0,0,.6)"></div><div style="position:relative;padding:48px"><p style="font-size:48px;font-weight:700">Over a photo</p></div></section>';
r19.heroReviewed = r19Run('hero-reviewed', hero19('#fff'));
r19.heroDark = r19Run('hero-dark', hero19('#222'));
r19.heroUncited = r19Run('hero-uncited', hero19('#fff'), '', '', { ...authored, manualChecks: authored.manualChecks.map(m => m.id === 'wcag-review' ? { ...m, artifact: brief } : m) });
r19.dialogState = r19Run('dialog-state', '', '', '', authored, original.replace('</main>', '<dialog id="r19d"><p>Dialog text</p></dialog></main><script>document.getElementById("r19d").showModal();</script>'));
r19.nonModalState = r19Run('non-modal-state', '', '', '', authored, original.replace('</main>', '<dialog open style="position:absolute;top:0;left:0;margin:0;width:100%;height:100%;background:#fff;border:0"><p>Non-modal panel</p></dialog></main>'));
// R19b (Mi'mar's tiebreak): the scripted modal state declared requiresScript with its trigger resolves on the scripted
// rendering alone; the same claim on a state that renders with JavaScript off is an integrity mismatch
const modal19 = original.replace('</main>', '<dialog id="r19d"><p>Dialog text</p></dialog></main><script>document.getElementById("r19d").showModal();</script>');
r19.scriptedModal = r19Run('scripted-modal', '', '', '', authored, modal19, original, { requiresScript: true, trigger: 'Start opens the dialog (showModal)' });
r19.falseScriptClaim = r19Run('false-script-claim', '', '', '', authored, original, original, { requiresScript: true, trigger: 'Start opens the dialog (showModal)' });
r19.copyNameUncited = r19Run('copy-name-uncited', '', '', '', { ...authored, copySlots: authored.copySlots.map(c => c.id === 'button' ? { ...c, ariaLabel: 'Begin the journey' } : c) }, null, original.replace('<button data-copy-slot="button">Start</button>', '<button data-copy-slot="button" aria-label="Begin the journey">Start</button>'));
writeFileSync(html, original);
writeFileSync(handoff, JSON.stringify(authored));
console.log('R19 fixture runs: ' + JSON.stringify(r19));
const lost19 = (r, check) => r.page === 'integrity mismatch' && r.state === 'integrity mismatch' && r.pageChecks.includes(check) && r.stateChecks.includes(check);
const axeOpen = r => r.axe[0] === false && (r.axe[1] || []).includes('color-contrast') && (r.axe[2] || []).includes('color-contrast');
const r19Want = {
  // R20 (Mi'mar's clipping tiebreak): collapsed content without a declared reveal state now fails the width screen
  hiddenWidths: r19.hiddenWidths.page === 'PASS' && r19.hiddenWidths.state === 'PASS' && r19.hiddenWidths.widths.every(w => w === false) && r19.hiddenWidths.reveals > 0 && r19.hiddenWidths.hidden.every(n => n === 3),
  pseudoVeil: lost19(r19.pseudoVeil, 'textUnreadable/js-off'), peVeil: lost19(r19.peVeil, 'textUnreadable/rendered'), innerLazy: lost19(r19.innerLazy, 'textUnreadable/rendered'),
  heroReviewed: r19.heroReviewed.page === 'PASS' && r19.heroReviewed.axe[0] === true && Array.isArray(r19.heroReviewed.axe[1]) && r19.heroReviewed.axe[1].length === 0 && Array.isArray(r19.heroReviewed.axe[2]) && r19.heroReviewed.axe[2].length === 0,
  heroDark: axeOpen(r19.heroDark), heroUncited: axeOpen(r19.heroUncited),
  dialogState: r19.dialogState.state === 'PASS' && r19.dialogState.hidden[0] === 3 && (r19.dialogState.axe[2] || []).includes('color-contrast'),
  scriptedModal: r19.scriptedModal.state === 'PASS' && r19.scriptedModal.requiresScript?.valid === true && Array.isArray(r19.scriptedModal.axe[2]) && r19.scriptedModal.axe[2].length === 0,
  falseScriptClaim: r19.falseScriptClaim.state === 'integrity mismatch' && r19.falseScriptClaim.stateChecks.includes('requiresScript/js-off') && r19.falseScriptClaim.requiresScript?.rendersWithoutScript === true,
  nonModalState: r19.nonModalState.state === 'integrity mismatch' && r19.nonModalState.stateChecks.includes('textObscured/rendered'),
  copyNameUncited: r19.copyNameUncited.contract.includes('copy button: ariaLabel absent from cited source'),
};
if (Object.values(r19Want).some(v => !v)) throw Error('R19 full-run expectations failed: ' + JSON.stringify(r19Want));
// R20 (Mi'mar's clipping tiebreak): full gate runs. Collapsed accordion and carousel pass with declared reveal states;
// a card whose last paragraph lies below its fixed height, and a table cut at 320, fail.
const r20 = {};
const acc20 = open1 => `<button aria-expanded="${open1}">Questions</button><div style="${open1 ? '' : 'max-height:0;'}overflow:hidden">Bare collapsed answer</div>`;
const car20 = n => `<div style="overflow:hidden;max-width:600px"><div style="display:flex;width:300%;transform:translateX(-${n * 100 / 3}%)"><p style="flex:1 0 0;margin:0">Slide one</p><p style="flex:1 0 0;margin:0">Slide two</p><p style="flex:1 0 0;margin:0">Slide three</p></div></div>`;
const at20 = body => original.replace('</main>', `${body}</main>`);
r20.revealDeclared = r19Run('reveal-declared', acc20(false) + car20(1), '', '', authored, [['faq-open', at20(acc20(true) + car20(1))], ['slide-1', at20(acc20(false) + car20(0))], ['slide-3', at20(acc20(false) + car20(2))]]);
r20.revealUndeclared = r19Run('reveal-undeclared', acc20(false) + car20(1));
const card20 = '<div style="max-width:320px;height:90px;overflow:hidden;padding:8px;box-sizing:border-box"><h2 style="margin:0 0 8px;font-size:20px">Card title</h2><p style="margin:0 0 40px">Short line.</p><p style="margin:0">Last paragraph below the edge.</p></div>';
r20.cardBelow = r19Run('card-below', card20, '', '', authored, [['hover', at20(card20)]]);
r20.table320 = r19Run('table-320', '<div style="overflow:hidden;width:100%"><table style="width:900px"><tr><th>Plan</th><th>Price</th><th>Seats</th><th>Support</th><th>Storage</th></tr></table></div>');
// R20-GPT-03: pale text over a light photo with one dark band (1.35:1 where it is faintest) stays blocked through the
// full gate even though the authored wcag-review PASS cites the screenshot; the honest scrim hero (heroReviewed) resolves
writeFileSync(join(output, 'r20-band.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="200"><rect width="800" height="200" fill="#f0f0f0"/><rect x="200" width="40" height="200" fill="#111"/></svg>');
r20.photoBand = r19Run('photo-band', `<div style="position:relative;width:800px;height:200px;background:url('r20-band.svg')"><p style="position:absolute;top:80px;left:20px;margin:0;width:760px;font-size:24px;color:#d0d0d0">Pale caption over a light photo</p></div>`);
// R20-GPT-05: a slotted script-only dialog state (requiresScript, trigger recorded) is compared with the default
// state's JavaScript-off rendering; its dialog copy is an approved slot placed in that state, so the whole state PASSES
// (second run with the state's own approved frame). Without the slot placed in the state the content differs.
const slot20 = { id: 'dialog-note', screen: 'home', kind: 'interface', purpose: 'confirm start', text: 'Start the service', minChars: 5, maxChars: 40, tone: 'direct', placementScreenshot: shot, placements: [{ lang: 'en', state: 'dialog-open', screenshot: shot }], source: { kind: 'brief', path: brief, ref: 'brief.md:5' }, lang: 'en', dir: 'ltr', variants: [{ lang: 'en', dir: 'ltr', text: 'Start the service', source: { path: brief, ref: 'brief.md:5' } }] };
const slotted20 = { ...authored, copySlots: [...authored.copySlots, slot20] };
const modal20 = original.replace('</main>', '<dialog id="r20d"><p data-copy-slot="dialog-note">Start the service</p></dialog></main><script>document.getElementById("r20d").showModal();</script>');
const claim20 = { requiresScript: true, trigger: 'Start opens the dialog (showModal)' };
const first20 = r19Run('slotted-dialog', '', '', '', slotted20, modal20, original, claim20);
const frame20 = join(output, 'r20-dialog-open-1440.png');
if (existsSync(join(output, 'evidence-r19-slotted-dialog', 'home-en-dialog-open-1440.png'))) writeFileSync(frame20, readFileSync(join(output, 'evidence-r19-slotted-dialog', 'home-en-dialog-open-1440.png')));
r20.slottedDialog = r19Run('slotted-dialog-2', '', '', '', slotted20, modal20, original, { ...claim20, frame: { path: frame20, width: 1440, version: 'v1', sha256: first20.rendered } });
r20.unplacedDialog = r19Run('unplaced-dialog', '', '', '', { ...slotted20, copySlots: [...authored.copySlots, { ...slot20, placements: [{ lang: 'en', state: 'default', screenshot: shot }] }] }, modal20, original, claim20);
writeFileSync(html, original);
writeFileSync(handoff, JSON.stringify(authored));
console.log('R20 fixture runs: ' + JSON.stringify(r20));
const r20Want = {
  revealDeclared: r20.revealDeclared.widths.every(w => w === true) && r20.revealDeclared.reveals === 0 && JSON.stringify(r20.revealDeclared.revealedBy) === JSON.stringify(['default', 'faq-open', 'slide-1', 'slide-3']),
  revealUndeclared: r20.revealUndeclared.widths.every(w => w === false) && r20.revealUndeclared.reveals > 0,
  cardBelow: r20.cardBelow.widths.every(w => w === false) && r20.cardBelow.reveals > 0,
  table320: r20.table320.widths.every(w => w === false),
  photoBand: axeOpen(r20.photoBand) && r19.heroReviewed.axe[0] === true,
  slottedDialog: r20.slottedDialog.state === 'PASS' && r20.slottedDialog.statePass === true && r20.slottedDialog.requiresScript?.valid === true && JSON.stringify(r20.slottedDialog.stateOnly) === JSON.stringify([{ slot: 'dialog-note', text: 'Start the service' }]),
  unplacedDialog: r20.unplacedDialog.state !== 'PASS' && r20.unplacedDialog.stateChecks.includes('content/js-off') && r20.unplacedDialog.statePass === false,
};
if (Object.values(r20Want).some(v => !v)) throw Error('R20 full-run expectations failed: ' + JSON.stringify(r20Want));
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
