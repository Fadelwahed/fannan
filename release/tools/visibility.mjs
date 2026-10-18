// R17 (panel round 17: R17-MIMAR-01, R17-GPT-02, R17-MIMAR-02): the rendered-visibility backstop of the integrity
// cross-check. Rounds 15-17 each found one more CSS way to hide text (opacity, filter, placeholder opacity, clip-path,
// transform, an overlaying preloader, text-fill colour, a gradient overlay). The CSS computation in contrastProbe stays
// the first pass; this backstop does not enumerate properties. It looks at what the browser painted, in each rendering
// (JavaScript on and off):
//  - targets: every element with its own rendered text, every native control showing text (its value, placeholder or
//    selected option, measured in its content box) and every named element without painted text of its own (an
//    accessible name only, such as an icon button: hit test only, it has no text pixels).
//  - viewport bands: the page is scrolled in steps of half the viewport height; after each scroll the finite running
//    animations are allowed to finish (up to VISIBILITY.animationWaitMs; infinite ones are ignored), so a normal
//    entrance or scroll reveal is measured at rest. Each target is measured in the band where it sits most centrally
//    and wholly inside the viewport (a target taller than half the viewport where most of it is visible).
//  - (a) hit test: at up to three points across each text line (elementsFromPoint in the document and in every shadow
//    root on the way), the first element in the stack must be the target, its own subtree or its ancestor line.
//    A different element that paints at that point (a background colour or image, a replaced element, a backdrop
//    filter or its own text) covers it; transparent wrappers are skipped. Covered at more than half of the points
//    counts as obscured.
//  - (b) pixels: a viewport screenshot is taken in the same band. Over the target's visible text boxes the background
//    is the modal colour (5 bits per channel); ink pixels differ from it by more than VISIBILITY.inkDelta in a channel.
//    Fewer than VISIBILITY.minInk ink pixels means no text was painted (ratio 1). Otherwise the WCAG contrast ratio of
//    each ink pixel against the background is taken and the 90th percentile is the measured ratio (antialiased edges
//    and single noisy pixels do not decide it). Below VISIBILITY.floor (3:1) the text is unreadable. This is a
//    readability floor for the backstop; AA (4.5:1, 3:1 for large text) stays with the CSS pass, axe and the manual
//    WCAG review. Rendered text whose boxes are under VISIBILITY.minTextHeight px high is unreadable too.
//  - unmeasured (INCOMPLETE, never PASS): a control with no box, text clipped to nothing by a clipping ancestor, text
//    outside the document (off-screen), boxes with too few pixels, or a target never wholly inside one viewport.
//  - assistive-only text (inside a clipping box of at most 1 x 1 px, the visually-hidden pattern) is counted, not graded;
//    a collapsed clipping box (height or width 0, larger in the other) clips its text to nothing (unmeasured).
// compareIntegrity fails text obscured or unreadable in the scripted page and treats JavaScript-off text that is
// worse (obscured, unreadable or unmeasured where the scripted page painted it) as an integrity mismatch.
import { inflateSync } from 'node:zlib';

export const VISIBILITY = { floor: 3, inkDelta: 24, minInk: 3, inkPercentile: 0.9, minTextHeight: 4, animationWaitMs: 2000, maxItems: 40 };

// Browser side (probe world): one viewport band at scroll position y.
export async function visibilityBand({ y, waitMs, minTextHeight }) {
  scrollTo(0, y);
  const frame = () => new Promise(r => requestAnimationFrame(() => r()));
  await frame(); await frame();
  const finite = () => document.getAnimations().filter(a => a.playState === 'running' && Number.isFinite(a.effect?.getComputedTiming?.().endTime));
  const started = performance.now();
  while (finite().length && performance.now() - started < waitMs) await frame(); // rAF: timers do not run with page scripts off
  await frame(); await frame();
  const vw = innerWidth, vh = innerHeight, sy = scrollY, docH = document.documentElement.scrollHeight;
  const up = a => a.assignedSlot ?? a.parentElement ?? (a.getRootNode() instanceof ShadowRoot ? a.getRootNode().host : null);
  const inside = (outer, e) => { for (let x = e; x; x = up(x)) if (x === outer) return true; return false; };
  const parse = v => { const m = /^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/.exec(v || ''); return m ? [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])] : null; };
  const cut = (r, c) => { const left = Math.max(r.left, c.left), top = Math.max(r.top, c.top), right = Math.min(r.right, c.right), bottom = Math.min(r.bottom, c.bottom); return right > left && bottom > top ? { left, top, right, bottom } : null; };
  const area = rs => rs.reduce((s, r) => s + (r.right - r.left) * (r.bottom - r.top), 0);
  const ownRects = el => [...el.childNodes].filter(n => n.nodeType === 3 && n.nodeValue.trim()).flatMap(n => { const range = document.createRange(); range.selectNodeContents(n); return [...range.getClientRects()].filter(b => b.width > 0 && b.height > 0); });
  const NO_TEXT = ['hidden', 'checkbox', 'radio', 'range', 'color', 'file', 'image'], BUTTONISH = ['submit', 'reset', 'button'];
  const controlShows = el => {
    if (el.tagName === 'SELECT') return !!el.selectedOptions?.[0]?.text.trim();
    const t = (el.type || 'text').toLowerCase();
    if (el.tagName === 'INPUT' && NO_TEXT.includes(t)) return false;
    if (el.tagName === 'INPUT' && BUTTONISH.includes(t)) return el.hasAttribute('value') ? !!el.value.trim() : t !== 'button';
    return !!(el.value.trim() || el.placeholder?.trim());
  };
  const named = el => (el.hasAttribute('aria-label') && el.getAttribute('aria-label').trim()) || el.hasAttribute('aria-labelledby');
  // clipping ancestors (overflow other than visible; html and body propagate to the viewport and are excluded)
  const clipOf = el => { let box = { left: -Infinity, top: -Infinity, right: Infinity, bottom: Infinity }, assistive = false; for (let a = el; a && a !== document.body && a !== document.documentElement; a = up(a)) { const s = getComputedStyle(a); if (s.overflowX === 'visible' && s.overflowY === 'visible' && s.overflow !== 'clip') continue; const r = a.getBoundingClientRect(); if (r.width <= 1 && r.height <= 1) assistive = true; box = cut(box, r) || { left: 0, top: 0, right: 0, bottom: 0 }; } return { box, assistive }; };
  const opacityOf = e => { let op = 1; for (let a = e; a; a = up(a)) op *= Number(getComputedStyle(a).opacity); return op; };
  const paintsAt = (e, x, yy) => {
    const s = getComputedStyle(e);
    if (s.visibility !== 'visible' || opacityOf(e) < 0.02) return false;
    if (e instanceof SVGElement || /^(IMG|VIDEO|CANVAS|IFRAME|OBJECT|EMBED|INPUT|TEXTAREA|SELECT|PICTURE)$/.test(e.tagName)) return true;
    const bg = parse(s.backgroundColor);
    if ((bg && bg[3] > 0.02) || s.backgroundImage !== 'none' || (s.backdropFilter && s.backdropFilter !== 'none')) return true;
    return ownRects(e).some(b => x >= b.left && x <= b.right && yy >= b.top && yy <= b.bottom);
  };
  const coveredAt = (target, x, yy) => {
    const roots = [document]; for (let r = target.getRootNode(); r instanceof ShadowRoot; r = r.host.getRootNode()) roots.splice(1, 0, r);
    return roots.some(root => { for (const e of root.elementsFromPoint(x, yy)) { if (e === target || inside(target, e) || inside(e, target)) return false; if (paintsAt(e, x, yy)) return true; } return false; });
  };
  const ids = [], targets = [];
  const visit = (root, path) => [...root.children].forEach((el, i) => {
    const id = `${path}/${el.tagName}:${i}`;
    if (!/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|OPTION|OPTGROUP|HEAD|TITLE)$/.test(el.tagName)) {
      const s = getComputedStyle(el);
      let kind = null, rects = [];
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) { if (controlShows(el) && s.visibility === 'visible' && s.display !== 'none') kind = 'control'; }
      else if (s.visibility === 'visible' && (rects = ownRects(el)).length) kind = 'text';
      else if (named(el) && s.visibility === 'visible' && s.display !== 'none' && !el.closest?.('[hidden]')) kind = 'name';
      if (kind) {
        ids.push(id);
        const r = el.getBoundingClientRect();
        if (kind !== 'text') {
          if (kind === 'control') { const bl = parseFloat(s.borderLeftWidth) + parseFloat(s.paddingLeft), br = parseFloat(s.borderRightWidth) + parseFloat(s.paddingRight), bt = parseFloat(s.borderTopWidth) + parseFloat(s.paddingTop), bb = parseFloat(s.borderBottomWidth) + parseFloat(s.paddingBottom); rects = r.width - bl - br > 0 && r.height - bt - bb > 0 ? [{ left: r.left + bl, top: r.top + bt, right: r.right - br, bottom: r.bottom - bb }] : []; }
          else rects = r.width > 0 && r.height > 0 ? [r] : [];
        }
        const rec = { id, kind, tag: el.tagName.toLowerCase(), text: (kind === 'control' ? (el.value || el.placeholder || el.selectedOptions?.[0]?.text || '') : kind === 'name' ? el.getAttribute('aria-label') || '' : el.textContent).replace(/\s+/g, ' ').trim().slice(0, 60) };
        const { box, assistive } = clipOf(kind === 'text' ? el : up(el) || el);
        const shown = rects.map(b => cut(b, box)).filter(Boolean);
        if (!rects.length) targets.push({ ...rec, status: 'unmeasured', reason: 'no box' });
        else if (assistive) targets.push({ ...rec, status: 'assistive' });
        else if (!shown.length) targets.push({ ...rec, status: 'unmeasured', reason: 'clipped to nothing' });
        else if (shown.every(b => b.right <= 0 || b.left >= vw || b.bottom + sy <= 0 || b.top + sy >= docH)) targets.push({ ...rec, status: 'unmeasured', reason: 'off-screen' });
        else if (kind !== 'name' && Math.max(...shown.map(b => b.bottom - b.top)) < minTextHeight) targets.push({ ...rec, status: 'unreadable', reason: `rendered text under ${minTextHeight} px high` });
        else {
          const view = { left: 0, top: 0, right: vw, bottom: vh }, seen = shown.map(b => cut(b, view)).filter(Boolean), fraction = area(seen) / area(shown), top = Math.min(...shown.map(b => b.top)), bottom = Math.max(...shown.map(b => b.bottom));
          if (seen.length && (fraction >= 0.999 || (bottom - top > vh / 2 && fraction >= 0.5))) {
            const lines = seen.length <= 6 ? seen : [0, 1, 2, 3, 4, 5].map(k => seen[Math.round(k * (seen.length - 1) / 5)]);
            const points = lines.flatMap(b => [0.2, 0.5, 0.8].map(f => [b.left + (b.right - b.left) * f, (b.top + b.bottom) / 2])).filter(([x, yy]) => x >= 0 && x < vw && yy >= 0 && yy < vh);
            const covered = points.filter(([x, yy]) => coveredAt(el, x, yy)).length;
            targets.push({ ...rec, status: 'measured', points: points.length, covered, obscured: points.length > 0 && covered * 2 > points.length, rects: kind === 'name' ? [] : seen.map(b => [b.left, b.top, b.right, b.bottom]), score: fraction * 10 + 1 - Math.abs((top + bottom) / 2 - vh / 2) / vh });
          }
        }
      }
    }
    if (el.shadowRoot) visit(el.shadowRoot, id + '#shadow');
    visit(el, id);
  });
  if (document.body) visit(document.body, 'body');
  return { vw, vh, y: sy, docH, ids, targets };
}

// Node side: decode an 8-bit, non-interlaced PNG (greyscale, RGB, grey+alpha or RGBA) as Chrome screenshots are.
export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw Error('not a PNG');
  let off = 8, width = 0, height = 0, type = 0, depth = 0, interlace = 0; const idat = [];
  while (off < buf.length) { const len = buf.readUInt32BE(off), kind = buf.toString('latin1', off + 4, off + 8), data = buf.subarray(off + 8, off + 8 + len); if (kind === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); depth = data[8]; type = data[9]; interlace = data[12]; } else if (kind === 'IDAT') idat.push(data); else if (kind === 'IEND') break; off += 12 + len; }
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[type];
  if (depth !== 8 || !channels || interlace) throw Error(`unsupported PNG (depth ${depth}, type ${type}, interlace ${interlace})`);
  const raw = inflateSync(Buffer.concat(idat)), stride = width * channels, out = Buffer.alloc(width * height * 3);
  let prev = Buffer.alloc(stride), cur = Buffer.alloc(stride);
  for (let row = 0; row < height; row++) {
    const f = raw[row * (stride + 1)], line = raw.subarray(row * (stride + 1) + 1, (row + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? cur[i - channels] : 0, b = prev[i], c = i >= channels ? prev[i - channels] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      cur[i] = (line[i] + (f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
    }
    for (let x = 0; x < width; x++) { const s = x * channels, d = (row * width + x) * 3; if (channels >= 3) { out[d] = cur[s]; out[d + 1] = cur[s + 1]; out[d + 2] = cur[s + 2]; } else out[d] = out[d + 1] = out[d + 2] = cur[s]; }
    [prev, cur] = [cur, prev];
  }
  return { width, height, rgb: out };
}

const channel = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (r, g, b) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
// Node side: the measured contrast of the pixels inside rects ([left, top, right, bottom] in CSS px; scale = device
// pixels per CSS px). Returns { ratio, ink, pixels } or { ratio: null, reason } when there are too few pixels.
export function pixelContrast(img, rects, scale = 1, opts = VISIBILITY) {
  const seen = new Set(), px = [];
  for (const [l, t, r, b] of rects) for (let yy = Math.max(0, Math.floor(t * scale)); yy < Math.min(img.height, Math.ceil(b * scale)); yy++) for (let x = Math.max(0, Math.floor(l * scale)); x < Math.min(img.width, Math.ceil(r * scale)); x++) { const k = yy * img.width + x; if (!seen.has(k)) { seen.add(k); px.push(k * 3); } }
  if (px.length < 4) return { ratio: null, reason: 'fewer than 4 pixels', pixels: px.length };
  const buckets = new Map(); let mode = null;
  for (const i of px) { const key = (img.rgb[i] >> 3) << 10 | (img.rgb[i + 1] >> 3) << 5 | img.rgb[i + 2] >> 3; const v = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 }; v.n++; v.r += img.rgb[i]; v.g += img.rgb[i + 1]; v.b += img.rgb[i + 2]; buckets.set(key, v); if (!mode || v.n > mode.n) mode = v; }
  const bg = [mode.r / mode.n, mode.g / mode.n, mode.b / mode.n], lbg = lum(...bg);
  const ink = px.filter(i => Math.max(Math.abs(img.rgb[i] - bg[0]), Math.abs(img.rgb[i + 1] - bg[1]), Math.abs(img.rgb[i + 2] - bg[2])) > opts.inkDelta);
  if (ink.length < opts.minInk) return { ratio: 1, ink: ink.length, pixels: px.length, background: bg.map(Math.round) };
  const ratios = ink.map(i => contrast(lum(img.rgb[i], img.rgb[i + 1], img.rgb[i + 2]), lbg)).sort((a, b) => a - b);
  return { ratio: Math.round(ratios[Math.floor((ratios.length - 1) * opts.inkPercentile)] * 100) / 100, ink: ink.length, pixels: px.length, background: bg.map(Math.round) };
}

// Node side: the backstop for one rendering (a Playwright page, normally the probe-world proxy). Returns the counts
// that enter the integrity vector and the problem items as evidence.
export async function visibilityScan(pg, opts = VISIBILITY) {
  const started = Date.now();
  const { vh, docH } = await pg.evaluate(() => ({ vh: innerHeight, docH: document.documentElement.scrollHeight }));
  const max = Math.max(0, docH - vh), ys = [];
  for (let y = 0; y < max; y += Math.max(1, Math.floor(vh / 2))) ys.push(y);
  ys.push(max);
  const best = new Map(), fixed = new Map(), all = new Set();
  for (const y of [...new Set(ys)]) {
    const band = await pg.evaluate(visibilityBand, { y, waitMs: opts.animationWaitMs, minTextHeight: opts.minTextHeight });
    const img = decodePng(await pg.screenshot({ type: 'png' })), scale = img.width / band.vw;
    for (const id of band.ids) all.add(id);
    for (const t of band.targets) {
      if (t.status !== 'measured') { if (!fixed.has(t.id)) fixed.set(t.id, t); continue; }
      if (best.has(t.id) && best.get(t.id).score >= t.score) continue;
      if (t.kind !== 'name') t.pixel = pixelContrast(img, t.rects, scale, opts);
      t.band = band.y; delete t.rects; best.set(t.id, t);
    }
  }
  await pg.evaluate(() => scrollTo(0, 0));
  const items = [];
  let measured = 0, obscured = 0, unreadable = 0, unmeasured = 0, assistive = 0;
  for (const id of all) {
    const m = best.get(id), f = fixed.get(id);
    if (m) {
      if (m.obscured) { obscured++; items.push({ id, kind: m.kind, text: m.text, problem: 'obscured', covered: `${m.covered}/${m.points}`, band: m.band }); }
      else if (m.pixel && m.pixel.ratio === null) { unmeasured++; items.push({ id, kind: m.kind, text: m.text, problem: 'unmeasured', reason: m.pixel.reason }); }
      else if (m.pixel && m.pixel.ratio < opts.floor) { unreadable++; items.push({ id, kind: m.kind, text: m.text, problem: 'unreadable', ratio: m.pixel.ratio, ink: m.pixel.ink, background: m.pixel.background, band: m.band }); }
      else measured++;
    } else if (f?.status === 'unreadable') { unreadable++; items.push({ id, kind: f.kind, text: f.text, problem: 'unreadable', reason: f.reason }); }
    else if (f?.status === 'assistive') assistive++;
    else { unmeasured++; items.push({ id, kind: f?.kind, text: f?.text, problem: 'unmeasured', reason: f?.reason || 'never wholly inside one viewport' }); }
  }
  return { textMeasured: measured, textObscured: obscured, textUnreadable: unreadable, textUnmeasured: unmeasured, textAssistive: assistive, bands: new Set(ys).size, ms: Date.now() - started, items: items.slice(0, opts.maxItems), itemsTotal: items.length, method: 'hit test at up to 3 points per text line; 90th-percentile ink-pixel contrast against the modal background colour; floor ' + opts.floor + ':1' };
}
