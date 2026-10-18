// R17 (panel round 17: R17-MIMAR-01, R17-GPT-02, R17-MIMAR-02), revised in R18 (panel round 18: R18-GPT-03 to 07,
// R18-MIMAR-01/02): the rendered-visibility backstop of the integrity cross-check. Rounds 15-17 each found one more
// CSS way to hide text (opacity, filter, placeholder opacity, clip-path, transform, an overlaying preloader, text-fill
// colour, a gradient overlay). The CSS computation in contrastProbe stays the first pass and keeps AA; this backstop
// decides VISIBILITY (is the text actually painted, uncovered and readable at all) from what the browser painted, in
// each rendering (JavaScript on and off):
//  - targets: every rendered text node (display:contents wrappers included), every native control showing text (its
//    value, placeholder or selected option, measured in its content box) and every named element without painted
//    text of its own (an accessible name only, such as an icon button: hit test only, it has no text pixels).
//  - lines: a text node is measured line by line. Its words' text ranges are grouped into line boxes, so a line hidden
//    while another line of the same element is visible is caught (R18-GPT-07).
//  - clipping: a line clipped to nothing by a clipping ancestor (overflow other than visible) that cannot be scrolled
//    (an inactive carousel slide, an accordion collapsed with max-height:0) is not displayed: counted in textHidden,
//    like display:none, and graded through the declared states. More hidden text with JavaScript off than on is a
//    js-off mismatch. A line outside the scrollport of a scrollable ancestor (an app shell's main, a tab strip) is
//    reached by scrolling that ancestor (R18-GPT-05, R18-MIMAR-01). Absolute and fixed descendants escape the
//    clippers they escape in CSS.
//  - coverage: the scan visits targets, not bands. After a first look at the top of the page every line that is not yet
//    measured is scrolled into view (its scrollable ancestors first, then the document, the line at a quarter of the
//    viewport) and measured once the page has settled; a line that measured covered or unpainted gets one retry
//    centred. The page bottom is then collected again, so content added while scrolling is found; this repeats for at
//    most VISIBILITY.maxPasses passes. A line still unmeasured at VISIBILITY.maxSteps, or content still added after the
//    last pass, is INCOMPLETE (R18-GPT-06); there is no band cap.
//  - settle: after each scroll the finite running animations are allowed to finish and then the painted state of
//    every element (opacity, transform, filter, clip-path, colours, position) must be unchanged about 100 ms apart, so
//    a normal CSS or script-driven entrance or scroll reveal is measured at rest (bounded by
//    VISIBILITY.animationWaitMs; elements under infinite animations are left out; other continuous motion ends the
//    wait at the bound and is counted in unsettledSteps).
//  - (a) hit test: at three points across each line (elementsFromPoint in the document and in every shadow root on the
//    way), the first element in the stack must be the target, its own subtree or an ancestor. An OPAQUE cover (a
//    replaced element, or a background colour whose alpha times the opacity is at least VISIBILITY.opaqueCover) at
//    more than half the points obscures the line. A translucent cover (a lighter background colour, a background
//    image or gradient, a backdrop filter or other text) is compositing the CSS pass cannot see: that line is graded
//    by its pixels (R18-GPT-04).
//  - (b) pixels: a viewport screenshot is taken after the page settles. Over the middle 60% of the line box (so the
//    descenders of a neighbouring line do not count) the background is the modal colour (5 bits per channel); ink
//    pixels differ from it by more than VISIBILITY.inkDelta in a channel. ratio = the 90th percentile of the ink
//    pixels' WCAG contrast against the background; peak = the strongest ink pixel (a not-painted line has no ink at all; a hairline weight keeps a few full-strength pixels).
//  - grading (R18-MIMAR-02): where the CSS pass resolved the colours (contrastProbe known) and no translucent layer
//    covers the line, pixels fail it only when it is effectively not painted: fewer than VISIBILITY.minInk ink pixels or
//    peak under VISIBILITY.paintFloor (1.5:1). Light and thin weights that pass AA by colour are therefore left to the
//    CSS pass. Where the CSS pass could not resolve the colours (a background image, a filter or blend, a translucent
//    cover), the pixels grade readability: ratio under VISIBILITY.floor (3:1), or VISIBILITY.smallFloor (1.5:1) for
//    a line with fewer than VISIBILITY.smallInk ink pixels (a single thin glyph). AA (4.5:1, 3:1 for large text) stays
//    with the CSS pass, axe and the manual WCAG review. A line box under VISIBILITY.minTextHeight px high is unreadable.
//  - a target is obscured or unreadable when any of its lines is; it is unmeasured (INCOMPLETE, never PASS) when a
//    line is outside the document, has too few pixels, is not reachable by scrolling or was not measured before the
//    bound.
//  - text of a disabled control (`:disabled`, or inside aria-disabled="true") has no contrast requirement (WCAG 1.4.3)
//    and assistive-only text (a clipping box of at most 1 x 1 px, the sr-only rules and the off-screen focusable skip
//    link of width-screen.mjs) are counted, not graded.
// compareIntegrity fails text obscured or unreadable in the scripted page and treats JavaScript-off text that is
// worse (obscured, unreadable, unmeasured or hidden where the scripted page painted it) as an integrity mismatch.
import { inflateSync } from 'node:zlib';
import { contrastProbe } from './integrity.mjs'; // the CSS verdict per element (a module cycle; used only at run time)

export const VISIBILITY = { floor: 3, smallFloor: 1.5, smallInk: 30, paintFloor: 1.5, opaqueCover: 0.9, inkDelta: 24, minInk: 3, inkPercentile: 0.9, peakPercentile: 1, minTextHeight: 4, animationWaitMs: 2000, maxSteps: 300, maxPasses: 4, maxItems: 40 };

// Browser side (probe world): scroll to y and let finite CSS and Web Animations finish (up to waitMs).
export async function visibilitySettle({ y = null, waitMs }) {
  if (y !== null) scrollTo(0, y);
  const frame = () => new Promise(r => requestAnimationFrame(() => r()));
  await frame(); await frame();
  const finite = () => document.getAnimations().filter(a => a.playState === 'running' && Number.isFinite(a.effect?.getComputedTiming?.().endTime));
  const started = performance.now();
  while (finite().length && performance.now() - started < waitMs) await frame(); // rAF: timers do not run with page scripts off
  // script-driven tweens are not in getAnimations(): wait (within the same bound) until the painted state of every
  // element (opacity, transform, filter, clip-path, colours, visibility and position) is the same about 100 ms apart.
  // Elements under an infinite animation (a spinner) are left out; other continuous motion ends the wait at the bound.
  const up = a => a.assignedSlot ?? a.parentElement ?? (a.getRootNode() instanceof ShadowRoot ? a.getRootNode().host : null);
  const endless = new Set(document.getAnimations().filter(a => !Number.isFinite(a.effect?.getComputedTiming?.().endTime)).map(a => a.effect?.target).filter(Boolean));
  const all = []; const walk = root => { for (const el of root.querySelectorAll('*')) { all.push(el); if (el.shadowRoot) walk(el.shadowRoot); } }; if (document.body) walk(document.body);
  const moving = all.filter(e => { for (let a = e; a; a = up(a)) if (endless.has(a)) return true; return false; }), still = all.filter(e => !moving.includes(e));
  const snap = () => still.map(e => { const c = getComputedStyle(e), r = e.getBoundingClientRect(); return [c.opacity, c.transform, c.filter, c.clipPath, c.color, c.webkitTextFillColor, c.backgroundColor, c.visibility, Math.round(r.x), Math.round(r.y)].join(','); }).join('|');
  let settled = false;
  for (let before = snap(); ;) { for (let i = 0; i < 6; i++) await frame(); const now = snap(); if (now === before) { settled = true; break; } before = now; if (performance.now() - started > waitMs) break; }
  return { y: scrollY, vh: innerHeight, docH: document.documentElement.scrollHeight, settled };
}

// Browser side (probe world). Mode 'reset' clears the target registry; mode 'focus' scrolls one line of a target into
// view (scrollable ancestors, then the document); mode 'restore' puts every scrolled ancestor back and scrolls to the
// top; otherwise (measure) it returns every target of the document with its lines and their state in this viewport.
export function visibilityBand({ mode = 'measure', minTextHeight = 4, opaqueCover = 0.9, focus = null } = {}) {
  const R = mode === 'reset' || !globalThis.__fannanVisibility ? (globalThis.__fannanVisibility = { ids: new WeakMap(), byId: new Map(), next: 0, scrolled: new Map() }) : globalThis.__fannanVisibility;
  if (mode === 'reset') return { ok: true };
  const vw = innerWidth, vh = innerHeight;
  const up = a => a.assignedSlot ?? a.parentElement ?? (a.getRootNode() instanceof ShadowRoot ? a.getRootNode().host : null);
  const inside = (outer, e) => { for (let x = e; x; x = up(x)) if (x === outer) return true; return false; };
  const parse = v => { const m = /^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/.exec(v || ''); return m ? [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])] : null; };
  const cut = (r, c) => { const left = Math.max(r.left, c.left), top = Math.max(r.top, c.top), right = Math.min(r.right, c.right), bottom = Math.min(r.bottom, c.bottom); return right > left && bottom > top ? { left, top, right, bottom } : null; };
  const area = r => r ? (r.right - r.left) * (r.bottom - r.top) : 0;
  const box = r => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
  // the line boxes of a text node: its words' ranges grouped by vertical overlap, in reading order
  const textLines = n => {
    const out = [], range = document.createRange(), re = /\S+/g; let m, words = 0;
    while ((m = re.exec(n.nodeValue)) && words++ < 4000) {
      range.setStart(n, m.index); range.setEnd(n, m.index + m[0].length);
      for (const b of range.getClientRects()) {
        if (!(b.width > 0 && b.height > 0)) continue;
        const mid = (b.top + b.bottom) / 2, l = out.find(x => mid > x.top && mid < x.bottom);
        if (l) { l.left = Math.min(l.left, b.left); l.right = Math.max(l.right, b.right); l.top = Math.min(l.top, b.top); l.bottom = Math.max(l.bottom, b.bottom); } else out.push(box(b));
      }
    }
    return out.sort((a, b) => a.top - b.top || a.left - b.left);
  };
  const contentBox = (el, s) => { const r = el.getBoundingClientRect(), bl = parseFloat(s.borderLeftWidth) + parseFloat(s.paddingLeft), br = parseFloat(s.borderRightWidth) + parseFloat(s.paddingRight), bt = parseFloat(s.borderTopWidth) + parseFloat(s.paddingTop), bb = parseFloat(s.borderBottomWidth) + parseFloat(s.paddingBottom); return r.width - bl - br > 0 && r.height - bt - bb > 0 ? [{ left: r.left + bl, top: r.top + bt, right: r.right - br, bottom: r.bottom - bb }] : []; };
  const linesOf = t => t.kind === 'text' ? textLines(t.node) : t.kind === 'control' ? contentBox(t.el, getComputedStyle(t.el)) : (r => r.width > 0 && r.height > 0 ? [box(r)] : [])(t.el.getBoundingClientRect());
  const scrollerOf = (a, s) => (['auto', 'scroll'].includes(s.overflowY) && a.scrollHeight > a.clientHeight + 1) || (['auto', 'scroll'].includes(s.overflowX) && a.scrollWidth > a.clientWidth + 1);
  // clipping ancestors of el (html and body propagate to the viewport and are excluded), with the CSS escapes of
  // absolutely positioned (to the nearest positioned ancestor) and fixed (to a transformed ancestor) descendants
  const clippers = start => {
    const out = []; let escape = null, tiny = false;
    for (let a = start; a && a !== document.body && a !== document.documentElement; a = up(a)) {
      const s = getComputedStyle(a), positioned = s.position !== 'static', containing = s.transform !== 'none' || s.filter !== 'none' || /paint|layout|strict|content/.test(s.contain);
      const clips = !(s.overflowX === 'visible' && s.overflowY === 'visible' && s.overflow !== 'clip');
      const skip = (escape === 'fixed' && !containing) || (escape === 'absolute' && !positioned && !containing);
      if (clips && !skip) { const r = a.getBoundingClientRect(); if (r.width <= 1 && r.height <= 1) tiny = true; out.push({ r: box(r), scroller: scrollerOf(a, s), el: a }); }
      if (escape === 'fixed' && containing) escape = null; else if (escape === 'absolute' && (positioned || containing)) escape = null;
      if (s.position === 'fixed') escape = 'fixed'; else if (s.position === 'absolute' && escape !== 'fixed') escape = 'absolute';
    }
    return { out, tiny };
  };
  const srOnly = (r, c) => (r.width <= 1 && r.height <= 1 && (['hidden', 'clip'].includes(c.overflowX) || ['hidden', 'clip'].includes(c.overflowY))) || /^rect\(0(px)?,? 0(px)?,? 0(px)?,? 0(px)?\)$/.test(c.clip) || c.clipPath === 'inset(50%)';
  const focusable = e => e.matches?.('a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])');
  const assistiveOf = el => { for (let a = el; a && a !== document.documentElement; a = up(a)) { if (a.nodeType !== 1) continue; const r = a.getBoundingClientRect(), c = getComputedStyle(a); if (srOnly(r, c)) return true; if (focusable(a) && ['absolute', 'fixed'].includes(c.position) && (r.right <= 0 || r.bottom + scrollY <= 0 || r.left >= document.documentElement.scrollWidth)) return true; } return false; };
  const inactive = el => { for (let a = el; a && a !== document.documentElement; a = up(a)) if (a.matches?.(':disabled') || a.getAttribute?.('aria-disabled') === 'true') return true; return false; };
  const NO_TEXT = ['hidden', 'checkbox', 'radio', 'range', 'color', 'file', 'image'], BUTTONISH = ['submit', 'reset', 'button'];
  const controlShows = el => {
    if (el.tagName === 'SELECT') return !!el.selectedOptions?.[0]?.text.trim();
    const t = (el.type || 'text').toLowerCase();
    if (el.tagName === 'INPUT' && NO_TEXT.includes(t)) return false;
    if (el.tagName === 'INPUT' && BUTTONISH.includes(t)) return el.hasAttribute('value') ? !!el.value.trim() : t !== 'button';
    return !!(el.value.trim() || el.placeholder?.trim());
  };
  const named = el => (el.hasAttribute('aria-label') && el.getAttribute('aria-label').trim()) || el.hasAttribute('aria-labelledby');
  const idOf = (key, t) => { let id = R.ids.get(key); if (!id) { id = 't' + R.next++; R.ids.set(key, id); } R.byId.set(id, t); return id; };
  // every target of the document (composed tree), in document order
  const collect = () => {
    const out = [];
    const visit = root => { for (const el of root.children) {
      if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|OPTION|OPTGROUP|HEAD|TITLE|DATALIST)$/.test(el.tagName)) continue;
      const s = getComputedStyle(el);
      // not rendered (display:none, a closed details or another content-visibility:hidden subtree): not a target; a
      // display:contents wrapper has no box of its own and is judged by its nearest ancestor with one (R18-GPT-03)
      let boxed = el; while (boxed && getComputedStyle(boxed).display === 'contents') boxed = up(boxed);
      if (s.display !== 'none' && (!boxed || boxed.checkVisibility())) {
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) { if (controlShows(el) && s.visibility === 'visible' && el.getClientRects().length) out.push({ kind: 'control', el, id: idOf(el, { kind: 'control', el }) }); }
        else {
          let own = false;
          if (s.visibility === 'visible') for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) { own = true; out.push({ kind: 'text', node: n, el, id: idOf(n, { kind: 'text', node: n, el }) }); }
          if (!own && named(el) && s.visibility === 'visible' && el.getClientRects().length && !el.closest?.('[hidden]')) out.push({ kind: 'name', el, id: idOf(el, { kind: 'name', el }) });
        }
        if (el.shadowRoot) visit(el.shadowRoot);
        visit(el);
      }
    } };
    if (document.body) visit(document.body);
    return out;
  };
  if (mode === 'restore') { for (const [el, [l, t]] of R.scrolled) { el.scrollLeft = l; el.scrollTop = t; } R.scrolled.clear(); R.byId.clear(); scrollTo(0, 0); return { ok: true }; }
  if (mode === 'focus') {
    const t = R.byId.get(focus.id); if (!t || !(t.node || t.el).isConnected) return { ok: false };
    const line = () => linesOf(t)[focus.line];
    if (!line()) return { ok: false };
    for (const c of clippers(t.kind === 'text' ? t.el : up(t.el) || t.el).out) {
      if (!c.scroller) continue;
      const a = c.el, r = a.getBoundingClientRect(), l = line(); if (!R.scrolled.has(a)) R.scrolled.set(a, [a.scrollLeft, a.scrollTop]);
      const innerTop = r.top + a.clientTop, innerLeft = r.left + a.clientLeft;
      if (l.top < innerTop || l.bottom > innerTop + a.clientHeight) a.scrollTop += (l.top + l.bottom) / 2 - (innerTop + a.clientHeight / 2);
      const l2 = line(); if (l2.left < innerLeft || l2.right > innerLeft + a.clientWidth) a.scrollLeft += (l2.left + l2.right) / 2 - (innerLeft + a.clientWidth / 2);
    }
    const l = line(), dx = l.left < 0 || l.right > vw ? l.left - Math.max(0, (vw - (l.right - l.left)) / 2) : 0;
    scrollBy(dx, l.top - vh * (focus.at ?? 0.25));
    return { ok: true };
  }
  // measure
  const contrast = globalThis.__fannanContrast;
  const opacityOf = e => { let op = 1; for (let a = e; a; a = up(a)) op *= Number(getComputedStyle(a).opacity); return op; };
  const ownTextAt = (e, x, yy) => [...e.childNodes].some(n => { if (n.nodeType !== 3 || !n.nodeValue.trim()) return false; const range = document.createRange(); range.selectNodeContents(n); return [...range.getClientRects()].some(b => x >= b.left && x <= b.right && yy >= b.top && yy <= b.bottom); });
  // what a covering element paints at a point: 'opaque', 'translucent' or null
  const paintsAt = (e, x, yy) => {
    const s = getComputedStyle(e), op = opacityOf(e);
    if (s.visibility !== 'visible' || op < 0.02) return null;
    if (e instanceof SVGElement || /^(IMG|VIDEO|CANVAS|IFRAME|OBJECT|EMBED|INPUT|TEXTAREA|SELECT|PICTURE)$/.test(e.tagName)) return op >= opaqueCover ? 'opaque' : 'translucent';
    const bg = parse(s.backgroundColor);
    if (bg && bg[3] * op >= opaqueCover && s.backgroundImage === 'none') return 'opaque';
    if ((bg && bg[3] * op > 0.02) || s.backgroundImage !== 'none' || (s.backdropFilter && s.backdropFilter !== 'none')) return 'translucent';
    return ownTextAt(e, x, yy) ? 'translucent' : null;
  };
  const coverAt = (target, x, yy) => {
    const roots = [document]; for (let r = target.getRootNode(); r instanceof ShadowRoot; r = r.host.getRootNode()) roots.splice(1, 0, r);
    let found = null;
    for (const root of roots) for (const e of root.elementsFromPoint(x, yy)) { if (e === target || inside(target, e) || inside(e, target)) break; const p = paintsAt(e, x, yy); if (p === 'opaque') return 'opaque'; if (p) found = 'translucent'; }
    return found;
  };
  const sw = document.documentElement.scrollWidth, docH = document.documentElement.scrollHeight;
  const view = { left: 0, top: 0, right: vw, bottom: vh };
  const targets = [];
  for (const t of collect()) {
    const el = t.el, rec = { id: t.id, kind: t.kind, text: (t.kind === 'control' ? (el.value || el.placeholder || el.selectedOptions?.[0]?.text || '') : t.kind === 'name' ? el.getAttribute('aria-label') || '' : t.node.nodeValue).replace(/\s+/g, ' ').trim().slice(0, 60) };
    const cl = clippers(t.kind === 'text' ? el : up(el) || el);
    if (inactive(el)) { targets.push({ ...rec, status: 'inactive', lines: [] }); continue; }
    if (cl.tiny || assistiveOf(el)) { targets.push({ ...rec, status: 'assistive', lines: [] }); continue; }
    const v = contrast?.get(el); rec.known = t.kind !== 'name' && !!v?.known; if (v?.known) rec.predicted = v.ratio;
    const lines = linesOf(t).map(b => {
      const all = cl.out.reduce((acc, c) => acc && cut(acc, c.r), b), fixed = cl.out.filter(c => !c.scroller).reduce((acc, c) => acc && cut(acc, c.r), b);
      if (!fixed) return { status: 'hidden' };
      if (!all) return { status: 'scroll' };
      if (all.right + scrollX <= 0 || all.bottom + scrollY <= 0 || all.left + scrollX >= sw || all.top + scrollY >= docH) return { status: 'offscreen' };
      if (t.kind !== 'name' && b.bottom - b.top < minTextHeight) return { status: 'tiny' };
      const seen = cut(all, view), fraction = area(seen) / area(all);
      if (!seen || !(fraction >= 0.999 || ((all.bottom - all.top > vh / 2 || all.right - all.left > vw * 0.9) && fraction >= 0.5))) return { status: 'pending' };
      const my = (seen.top + seen.bottom) / 2, pts = [0.2, 0.5, 0.8].map(f => [seen.left + (seen.right - seen.left) * f, my]).filter(([x, yy]) => x >= 0 && x < vw && yy >= 0 && yy < vh);
      const covers = pts.map(([x, yy]) => coverAt(el, x, yy)), opaque = covers.filter(c => c === 'opaque').length, any = covers.filter(Boolean).length;
      const h = seen.bottom - seen.top;
      return { status: 'measured', points: pts.length, opaque, obscured: pts.length > 0 && opaque * 2 > pts.length, composited: pts.length > 0 && any * 2 > pts.length, rect: [seen.left, seen.top + h * 0.2, seen.right, seen.bottom - h * 0.2], score: 1 - Math.abs(my - vh / 2) / vh };
    });
    targets.push({ ...rec, status: 'shown', lines });
  }
  return { vw, vh, y: scrollY, docH, targets };
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
  if (ink.length < opts.minInk) return { ratio: 1, peak: 1, ink: ink.length, pixels: px.length, background: bg.map(Math.round) };
  const ratios = ink.map(i => contrast(lum(img.rgb[i], img.rgb[i + 1], img.rgb[i + 2]), lbg)).sort((a, b) => a - b);
  const at = q => Math.round(ratios[Math.floor((ratios.length - 1) * q)] * 100) / 100;
  return { ratio: at(opts.inkPercentile), peak: at(opts.peakPercentile ?? 1), ink: ink.length, pixels: px.length, background: bg.map(Math.round) };
}

// Node side: the backstop for one rendering (a Playwright page, normally the probe-world proxy). Returns the counts
// that enter the integrity vector and the problem items as evidence.
export async function visibilityScan(pg, opts = VISIBILITY) {
  const o = { ...VISIBILITY, ...opts }, started = Date.now();
  const T = new Map(); // id -> { kind, text, status, known, predicted, lines: [{ status, best, tries }], present }
  let steps = 0, unsettled = 0, seenAt = 0;
  const band = { minTextHeight: o.minTextHeight, opaqueCover: o.opaqueCover };
  const look = async y => {
    const at = await pg.evaluate(visibilitySettle, { y, waitMs: o.animationWaitMs });
    if (!at.settled) unsettled++;
    await pg.evaluate(contrastProbe, { record: true }); // the CSS verdict per element, as it is now
    const b = await pg.evaluate(visibilityBand, band); // read-only: paints nothing
    const img = decodePng(await pg.screenshot({ type: 'png' })), scale = img.width / b.vw;
    steps++; seenAt++;
    for (const t of b.targets) {
      const r = T.get(t.id) || { lines: [] }; T.set(t.id, r);
      Object.assign(r, { kind: t.kind, text: t.text, status: t.status, known: t.known, predicted: t.predicted, present: seenAt });
      r.lines.length = t.lines.length;
      t.lines.forEach((l, i) => {
        const cur = r.lines[i] || (r.lines[i] = { tries: 0 });
        if (l.status !== 'measured') { if (!cur.best) cur.status = l.status; return; }
        if (t.kind !== 'name') l.pixel = pixelContrast(img, [l.rect], scale, o);
        l.known = t.known && !l.composited; delete l.rect;
        l.bad = l.obscured || (l.pixel && (l.pixel.ratio === null || (l.known ? l.pixel.peak < o.paintFloor : l.pixel.ratio < (l.pixel.ink < o.smallInk ? o.smallFloor : o.floor))));
        if (!cur.best || (cur.best.bad && !l.bad) || (!!cur.best.bad === !!l.bad && l.score > cur.best.score)) cur.best = l;
        cur.status = 'measured';
      });
    }
    return b;
  };
  const next = () => { // the first line still to measure: not yet seen in full, or measured bad once (one centred retry)
    for (const [id, r] of T) if (r.present === seenAt && r.status === 'shown') for (let i = 0; i < r.lines.length; i++) { const l = r.lines[i]; if (!l) continue;
      if (['pending', 'scroll'].includes(l.status) && l.tries < 2) return { id, line: i, at: l.tries ? 0.5 : 0.25, l };
      if (l.status === 'measured' && l.best.bad && l.tries < 1) return { id, line: i, at: 0.5, l }; }
    return null;
  };
  await pg.evaluate(visibilityBand, { mode: 'reset' });
  let passes = 0, growing = false, stopped = false, last = await look(null);
  try {
    for (; passes < o.maxPasses; passes++) {
      for (let f; (f = next());) {
        if (steps >= o.maxSteps) { stopped = true; break; }
        f.l.tries++;
        const moved = await pg.evaluate(visibilityBand, { mode: 'focus', focus: { id: f.id, line: f.line, at: f.at } });
        if (!moved.ok) { f.l.tries = 9; continue; }
        last = await look(null);
      }
      if (stopped) break;
      // the page bottom, collected again: content added on scroll (lazy sections, infinite lists) is found here
      const known = new Set(T.keys()), height = last.docH;
      last = await look(Math.max(0, last.docH - last.vh));
      growing = last.targets.some(t => !known.has(t.id)) || last.docH > height || !!next();
      if (!growing) break;
    }
  } finally { await pg.evaluate(visibilityBand, { mode: 'restore' }); }
  const items = [];
  let measured = 0, obscured = 0, unreadable = 0, unmeasured = 0, assistive = 0, hidden = 0;
  for (const [id, r] of T) {
    if (r.present !== seenAt) continue; // no longer in the document (a removed preloader)
    const base = { id, kind: r.kind, text: r.text };
    if (r.status === 'inactive' || r.status === 'assistive') { assistive++; continue; }
    const ls = r.lines.filter(Boolean), m = ls.filter(l => l.best).map(l => l.best);
    const ob = m.find(l => l.obscured), un = m.find(l => !l.obscured && l.bad && l.pixel?.ratio !== null), tiny = ls.some(l => !l.best && l.status === 'tiny');
    const open = ls.filter(l => !l.best && !['hidden', 'tiny'].includes(l.status)), nopx = m.find(l => l.pixel && l.pixel.ratio === null);
    if (ob) { obscured++; items.push({ ...base, problem: 'obscured', line: ls.indexOf(ls.find(l => l.best === ob)), covered: `${ob.opaque}/${ob.points}` }); }
    else if (un || tiny) { unreadable++; items.push(un ? { ...base, problem: 'unreadable', line: ls.indexOf(ls.find(l => l.best === un)), graded: un.known ? 'not painted (CSS colours known)' : 'pixel readability (CSS colours unknown)', ratio: un.pixel.ratio, peak: un.pixel.peak, predicted: un.known ? r.predicted : null, ink: un.pixel.ink, background: un.pixel.background } : { ...base, problem: 'unreadable', reason: `rendered text under ${o.minTextHeight} px high` }); }
    else if (open.length || nopx) { unmeasured++; const s = open[0]?.status; items.push({ ...base, problem: 'unmeasured', reason: nopx ? nopx.pixel.reason : s === 'offscreen' ? 'outside the document' : s === 'scroll' ? 'not reachable by scrolling its scroll container' : stopped ? `scan stopped at ${o.maxSteps} steps` : 'never wholly inside one viewport' }); }
    else if (!m.length && ls.length && ls.every(l => l.status === 'hidden')) hidden++;
    else if (!ls.length) { unmeasured++; items.push({ ...base, problem: 'unmeasured', reason: 'no box' }); }
    else measured++;
  }
  if (growing) { unmeasured++; items.push({ problem: 'unmeasured', reason: `content still added after ${o.maxPasses} passes over the page` }); }
  return { textMeasured: measured, textObscured: obscured, textUnreadable: unreadable, textUnmeasured: unmeasured, textHidden: hidden, textAssistive: assistive, steps, passes: passes + 1, unsettledSteps: unsettled, ms: Date.now() - started, items: items.slice(0, o.maxItems), itemsTotal: items.length, method: `target-directed scan, line by line: hit test at 3 points per line (opaque covers obscure); pixels decide visibility: not painted (strongest ink pixel under ${o.paintFloor}:1) where the CSS pass resolved the colours, readability (90th-percentile ink under ${o.floor}:1) where it could not` };
}
