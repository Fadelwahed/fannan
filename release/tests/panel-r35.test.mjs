// R35: Sol fix regressions R35-M-01..M-09 (declared-carousel follow-ups).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const release = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(release, '..');
const deps = process.env.FANNAN_DEPS || resolve(root, 'runtime-deps');
const chrome = process.env.FANNAN_TEST_CHROME || '/usr/bin/google-chrome';
const haveChrome = existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome);
const skip = !haveChrome && 'test-only deps or local Chrome absent';

const withBrowser = async fn => {
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const dir = mkdtempSync(join(tmpdir(), 'fannan-r35-'));
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  const open = async (html) => {
    const file = join(dir, `p${Math.random().toString(36).slice(2)}.html`);
    writeFileSync(file, html);
    const ctx = await browser.newContext({ javaScriptEnabled: true, viewport: { width: 1440, height: 900 } });
    const main = await ctx.newPage();
    await main.goto(pathToFileURL(file).href);
    await main.waitForLoadState('load');
    await main.waitForTimeout(100);
    return { main };
  };
  try { await fn({ open }); } finally { await browser.close(); rmSync(dir, { recursive: true, force: true }); }
};

const ws = await import('../tools/width-screen.mjs');

const M = { root: '#g', slides: ['#a', '#b'] };

const P = (body, css = '') => `<!doctype html>
<html lang="en" dir="ltr"><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{margin:16px;font:16px/24px sans-serif;color:#111;background:white}
p{margin:0}
button,a{min-width:48px;min-height:32px}
${css}
</style></head><body><h1>Gallery</h1>${body}</body></html>`;

const controls =
  '<button id="prev">Previous</button><button id="next">Next</button>';

const slides =
  '<div id="a"><p>Alpha unique copy.</p></div>' +
  '<div id="b"><p>Beta unique copy.</p></div>';

const S = (state, html, declaration = {}) => ({
  screen: 'home', state, lang: 'en', dir: 'ltr',
  page: `${state}.html`, html, ...declaration
});

const states = page => [
  S('default', page('default')),
  S('slide-a', page('slide-a'),
    { opener: '#prev', reveals: '#a', carousel: M }),
  S('slide-b', page('slide-b'),
    { opener: '#next', reveals: '#b', carousel: M })
];

const unrolledTarget = (state, control = controls, extra = '') => {
  const opened = state === 'slide-b';
  return P(`
    <div id="g"><div class="track">${slides}</div></div>
    ${extra}${control}`, `
    #g{width:240px;overflow:hidden}
    .track{display:${opened ? 'block' : 'flex'};
           width:${opened ? 240 : 480}px}
    #a,#b{width:240px;flex:0 0 240px;height:80px}
  `);
};

const G = async (list) => {
  const probes = list.filter(x => x.opener && x.reveals).map(x => ({
    state: x.state, opener: x.opener, reveals: x.reveals,
    ...(x.carousel ? { carousel: x.carousel } : {})
  }));
  const scopes = [];
  for (const x of list) {
    const page = await openPage(x.html);
    scopes.push({
      scope: { screen: x.screen || 'home', state: x.state, lang: x.lang || 'en' },
      widths: await ws.screenWidths(page.main, [1440, 1280, 320], null, 900, probes),
      declaration: x.opener && x.reveals
        ? { opener: x.opener, reveals: x.reveals, ...(x.carousel ? { carousel: x.carousel } : {}) }
        : null,
    });
  }
  const r = ws.resolveReveals(scopes);
  return { pass: r.pass && scopes.every(s => s.widths.pass), scopes, r };
};

let openPage = null;

test('R35-M-01: an outer carousel root supports an inner clipping viewport', { skip }, async () => withBrowser(async ({ open }) => {
  openPage = open;
  const page = state => P(`
  <section id="g">
    <div class="viewport"><div class="track">${slides}</div></div>
  </section>${controls}`, `
  #g{width:240px;overflow:visible}
  .viewport{width:240px;height:80px;overflow:hidden}
  .track{display:flex;width:480px;
         transform:translateX(${state === 'slide-b' ? -240 : 0}px)}
  #a,#b{flex:0 0 240px;height:80px}
`);
  assert.equal((await G(states(page))).pass, true);
}));

test('R35-M-02: scroll obligations preserve active overflow and cover inactive icon controls', { skip }, async () => withBrowser(async ({ open }) => {
  openPage = open;
  const wideText = state => {
    const opened = state === 'slide-b';
    return P(`
    <div id="g"><div class="track">
      <div id="a"><p>This paragraph requires sideways scrolling to read.</p></div>
      <div id="b"><p>Beta unique copy.</p></div>
    </div></div>${controls}`, `
    #g{width:240px;overflow-x:auto}
    .track{display:${opened ? 'block' : 'flex'};
           width:${opened ? 480 : 720}px}
    #a{width:480px;flex:0 0 480px}
    #b{width:240px;flex:0 0 240px}
    #a p{white-space:nowrap}
  `);
  };

  const bad = await G(states(wideText));
  assert.equal(bad.pass, false);
  assert.ok(bad.scopes.some(s => s.widths.results.some(r =>
    r.width === 320 && r.scrolledText.length > 0)));

  const iconSlides =
    '<div id="a"><button aria-label="Alpha action"></button></div>' +
    '<div id="b"><button aria-label="Beta action"></button></div>';

  const icons = state => P(`
  <div id="g" data-position="${state === 'slide-b' ? 240 : 0}">
    <div class="track">${iconSlides}</div>
  </div>${controls}
  <script>
    const g=document.getElementById('g');
    const apply=()=>{g.scrollLeft=Number(g.dataset.position)};
    apply();addEventListener('resize',apply);
  </script>`, `
  #g{width:240px;height:80px;overflow-x:auto;overflow-y:hidden}
  .track{display:flex;width:480px}
  #a,#b{flex:0 0 240px;height:80px}
`);

  assert.equal((await G(states(icons))).pass, true);
}));

test('R35-M-03: an always-hidden registered sibling cannot certify a single panel', { skip }, async () => withBrowser(async ({ open }) => {
  openPage = open;
  const page = state => P(`
  ${controls}
  <div id="g">
    <div id="a" hidden><p>Never observable.</p></div>
    <div id="b"><p>Real payload.</p></div>
  </div>`,
  state === 'slide-b' ? '' :
    '@media(max-width:600px){#b{display:none}}'
  );

  const result = await G(states(page));
  assert.equal(result.pass, false);
  assert.ok(result.scopes.some(s => s.widths.results.some(r =>
    r.width === 320 &&
    r.lost.some(l => l.print === 'text:Real payload.' && !l.reachableIn))));
}));

test('R35-M-04: a slide declaration cannot also certify an outside information panel', { skip }, async () => withBrowser(async ({ open }) => {
  openPage = open;
  const page = state => {
    const opened = state === 'slide-b';
    return P(`
    <div id="g"><div class="track">${slides}</div></div>
    <aside id="info"><p>Shipping information.</p></aside>
    ${controls}`, `
    #g{width:240px;overflow:hidden}
    .track{display:${opened ? 'block' : 'flex'};
           width:${opened ? 240 : 480}px}
    #a,#b{width:240px;flex:0 0 240px;height:80px}
    #info{height:${opened ? 'auto' : '0'};overflow:hidden}
  `);
  };

  const list = states(page);
  list[2].reveals = '#b,#info';
  const result = await G(list);

  assert.equal(result.pass, false);
  assert.ok(result.r.unresolved.some(u =>
    u.text.some(t => t.includes('Shipping information'))));
}));

test('R35-M-05: a verified carousel step still requires its target control', { skip }, async () => withBrowser(async ({ open }) => {
  openPage = open;
  const page = state => unrolledTarget(
    state,
    state === 'slide-b'
      ? '<button id="prev">Previous</button>'
      : controls
  );

  const result = await G(states(page));
  assert.equal(result.pass, false);
  assert.ok(result.scopes.some(s => s.widths.results.some(r =>
    r.declarations?.some(d => d.state === 'slide-b' &&
      d.why.includes('opener matches nothing in the declared state')))));
}));

test('R35-M-06: carousel alternatives reject links and plain-element controls', { skip }, async () => withBrowser(async ({ open }) => {
  openPage = open;
  for (const next of [
    '<a id="next" href="slide-b.html">Next</a>',
    '<div id="next" style="width:64px;height:32px">Next</div>'
  ]) {
    const page = state => unrolledTarget(
      state, '<button id="prev">Previous</button>' + next
    );
    const result = await G(states(page));

    assert.equal(result.pass, false);
    assert.ok(result.scopes.some(s => s.widths.results.some(r =>
      r.declarations?.some(d => d.state === 'slide-b' &&
        d.why.some(w => w.includes('eligible carousel control'))))));
  }
}));

test('R35-M-07: desktop cards receive declared mobile scroll-state cover', { skip }, async () => withBrowser(async ({ open }) => {
  openPage = open;
  const page = state => P(`
  <div id="g" data-position="${state === 'slide-b' ? 240 : 0}">
    <div class="track">${slides}</div>
  </div>${controls}
  <script>
    const g=document.getElementById('g');
    const apply=()=>{
      g.scrollLeft=innerWidth<=700 ? Number(g.dataset.position) : 0;
    };
    apply();addEventListener('resize',apply);
  </script>`, `
  #g{width:100%;overflow-x:auto}
  .track{display:flex;width:480px}
  #a,#b{flex:0 0 240px;height:80px}
  @media(max-width:700px){#g{width:240px}}
`);

  const result = await G(states(page));
  assert.equal(result.pass, true);

  const narrow = result.scopes.flatMap(s =>
    s.widths.results.filter(r => r.width === 320));
  assert.ok(narrow.every(r => r.pass));
  assert.ok(narrow.every(r => r.lost.every(l => l.reachableIn)));
  assert.ok(narrow.every(r => !r.clipped.some(c =>
    c.rule === 'shown at 1440, lost at this width')));
}));

test('R35-M-08: the finalized package passes its published anchored verification', () => {
  const records = readdirSync(join(root, 'reviews'))
    .filter(n => /^MIMAR-R\d+-changes-[0-9a-f]+\.md$/.test(n))
    .map(n => {
      const m = n.match(/^MIMAR-R(\d+)-changes-([0-9a-f]+)\.md$/);
      return { name: n, round: Number(m[1]), sha: m[2] };
    })
    .sort((a, b) => a.round - b.round || a.name.localeCompare(b.name));
  assert.ok(records.length, 'expected at least one finalized Mi\'mar record');
  const latest = records[records.length - 1];
  const body = readFileSync(join(root, 'reviews', latest.name), 'utf8');
  const dig = body.match(/registry[^`\n]*`([0-9a-f]{64})`/i) || body.match(/([0-9a-f]{64})/);
  assert.ok(dig, `registry digest missing in ${latest.name}`);
  const digest = dig[1];
  const changes = readFileSync(join(root, 'trust/R3-CHANGES.sha256'), 'utf8');
  assert.ok(!changes.includes('MIMAR-R34-changes-PENDING.md'), 'PENDING record must not remain in the registry');
  // release/PACKAGING.md: git does not preserve 0444; chmod before anchored verify
  spawnSync('chmod', ['0444', 'trust/MANIFEST.sha256', 'trust/R3-CHANGES.sha256', 'trust/PINNED.sha256'], { cwd: root });
  const run = spawnSync('python3', ['-B', 'scripts/package-r3.py', 'verify',
    '--start', '9ee1ca6aaa4a257cb84fb7381056005f48554bf3',
    '--registry-sha256', digest], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const report = JSON.parse(run.stdout.slice(run.stdout.indexOf('{')));
  assert.equal(report.registryPin, 'external');
  assert.deepEqual(report.uncoveredChangedFiles, []);
  assert.equal(report.zipCRC, 'PASS');
  assert.equal(report.exactInventoryAndBytes, 'PASS');
  assert.equal(report.sevenDeliverables, 'PASS');
});

test('R35-M-09: active carousel guidance teaches the mapped declaration contract', () => {
  const skill = readFileSync(join(release, 'skills/design-prototype/SKILL.md'), 'utf8');
  const harden = skill.split(/\n(?=\d+\. \*\*)/).find(s => s.startsWith('7. **Harden:**')) || skill;
  assert.match(harden, /"opener"/);
  assert.match(harden, /"reveals"/);
  assert.match(harden, /"carousel"/);
  assert.match(harden, /"root"/);
  assert.ok((harden.match(/#[\w-]+/g) || []).length >= 2 || harden.includes('slides'));
  assert.match(harden, /first slide|complete inventory|including the first/i);
  assert.match(harden, /no extra positive open|need no additional positive open|no additional positive open/i);
  assert.match(harden, /aria-expanded=false/);
  const ver = readFileSync(join(release, 'VERIFICATION.md'), 'utf8');
  const r31 = ver.split(/\n(?=## )/).find(s => s.startsWith('## R31')) || ver;
  assert.match(r31, /horizontal-only/);
  assert.match(r31, /SUPERSEDED by R34/i);
});
