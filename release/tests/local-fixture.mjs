// Isolated browser fixture: copied tools get a TEST root shim because production write guards target /workspace on Linux.
// This proves Node/Chrome/Style Dictionary execution, never production guard or a real project PASS.
import { cpSync, mkdirSync, writeFileSync, readFileSync, existsSync, mkdtempSync, chmodSync, realpathSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
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
const checker = join(tools, 'pre-handoff-check.mjs');
writeFileSync(checker, readFileSync(checker, 'utf8').replace("const OUTPUT_BASE = '/workspace/design-output';", `const OUTPUT_BASE = ${JSON.stringify(root)};`));
const guard = `#!${process.execPath}\nconst fs=require('fs'),path=require('path');const root=${JSON.stringify(root)};const [a,b]=process.argv.slice(2);const write=process.argv[1].endsWith('safe-write.sh');const project=write?a:b,target=path.resolve(write?b:a);if(project!=='test'||!target.startsWith(path.join(root,project)+path.sep)){console.error('TEST GUARD DENY');process.exit(10)}if(write){fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,fs.readFileSync(0),{flag:'wx'});}else console.log('TEST GUARD ALLOW');\n`;
writeFileSync(join(tools, 'readonly-precheck.sh'), guard, { mode: 0o755 });
writeFileSync(join(tools, 'safe-write.sh'), guard, { mode: 0o755 });
chmodSync(join(tools, 'readonly-precheck.sh'), 0o755);
chmodSync(join(tools, 'safe-write.sh'), 0o755);
// These adapters exist only in the temporary copied tools; they cannot approve production storage.
const verifier = join(tools, 'verify-deps.mjs');
writeFileSync(verifier, readFileSync(verifier, 'utf8').replace('return verifyDeps(prefix, pin, releaseRoot);', 'return verifyDependencyTree(prefix, pin, releaseRoot);'));
writeFileSync(join(tools, 'executable-trust.mjs'), readFileSync(join(tools, 'executable-trust.mjs'), 'utf8').replace('export function verifiedBrowser() {', 'function productionBrowser() {') + `\nexport function verifiedBrowser() { return verifyExecutable(${JSON.stringify({path:realpathSync(chrome),sha256:createHash('sha256').update(readFileSync(chrome)).digest('hex')})}); }\n`);
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
let status = 0;
try { execFileSync(process.execPath, [join(tools, 'pre-handoff-check.mjs'), design, html, evidence, 'test', handoff], { env, stdio: 'inherit' }); }
catch (e) { status = e.status; }
const result = JSON.parse(readFileSync(join(evidence, 'evidence.json'), 'utf8'));
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
  settings: { path: settings, repository: 'repo-fixture', stack: 'stack-fixture', roles: { engineer: 'engineer-fixture', qaGate: 'qa-fixture', writer: 'writer-fixture', approver: 'approver-fixture' } },
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
try { execFileSync(process.execPath, [join(tools, 'pre-handoff-check.mjs'), design, html, evidence2, 'test', handoff], { env, stdio: 'inherit' }); }
catch (e) { status = e.status; }
const second = JSON.parse(readFileSync(join(evidence2, 'evidence.json'), 'utf8'));
if (status !== 1 || !second.checks.contract.pass || second.checks.states.length !== 1 || !second.checks.states[0].pass || second.checks.impeccable.pass) throw Error('expected valid contract and all applicable state browser checks, with pinned binary blocking');
writeFileSync(html, readFileSync(html, 'utf8').replace('A service for residents.', 'Invented service copy.'));
const evidence3 = join(output, 'evidence-mutated');
try { execFileSync(process.execPath, [join(tools, 'pre-handoff-check.mjs'), design, html, evidence3, 'test', handoff], { env, stdio: 'ignore' }); } catch {}
const mutated = JSON.parse(readFileSync(join(evidence3, 'evidence.json'), 'utf8'));
if (mutated.checks.states[0].copy.pass || mutated.checks.states[0].renderedSha256 === hash) throw Error('changed HTML must fail deck and approved-frame hash');
const foreign = join(fixture, 'foreign.html');
writeFileSync(foreign, '<p>outside project</p>');
writeFileSync(html, readFileSync(html, 'utf8').replace('</main>', `<iframe src="${pathToFileURL(foreign).href}"></iframe><img src="https://example.invalid/x.png"></main>`));
const evidence4 = join(output, 'evidence-foreign');
try { execFileSync(process.execPath, [join(tools, 'pre-handoff-check.mjs'), design, html, evidence4, 'test', handoff], { env, stdio: 'ignore' }); } catch {}
const foreignResult = JSON.parse(readFileSync(join(evidence4, 'evidence.json'), 'utf8'));
if (!foreignResult.externalRequestsBlocked?.some(v => v.url?.includes('foreign.html')) || !foreignResult.externalRequestsBlocked?.some(v => v.url?.includes('example.invalid')) || foreignResult.checks.resourceBoundary.pass) throw Error('foreign file and network loads must be blocked by browser route');
console.log('LOCAL FIXTURE: browser, contract and applicable state checks passed; full gate correctly blocked by absent pinned Impeccable binary');
