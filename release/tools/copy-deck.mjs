// Browser side: the copy-deck check of one rendering (moved out of pre-handoff-check.mjs so it can be tested
// directly). slots = the copy slots placed in this rendering; lang and dir select each slot's variant. Every visible
// text node and every authored native string must sit in a declared slot whose approved text contains it; an
// accessible name is approved by the slot's `ariaLabel` or, when none is declared, by its displayed text.
export function copyDeckProbe({ slots, lang, dir }) {
  const norm = x => (x || '').replace(/\s+/g, ' ').trim();
  const variant = c => c.variants?.find(v => v.lang === lang && v.dir === dir);
  const wanted = new Map(slots.map(c => [c.id, norm(variant(c)?.text || c.text)]));
  // an accessible name may be approved on its own (`ariaLabel`, per variant too), apart from the displayed text
  const names = new Map(slots.map(c => [c.id, norm(variant(c)?.ariaLabel ?? c.ariaLabel)]));
  const errors = [], used = new Set();
  // the composed tree (open shadow roots included); slots are found through composed ancestors.
  const texts = [], elements = [];
  const walk = root => { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); while (w.nextNode()) { const n = w.currentNode; if (n.nodeType === 3) texts.push(n); else { elements.push(n); if (n.shadowRoot) walk(n.shadowRoot); } } };
  walk(document.body);
  const parentOf = el => el.assignedSlot ?? el.parentElement ?? (el.getRootNode() instanceof ShadowRoot ? el.getRootNode().host : null);
  const slotOf = el => { for (let a = el; a; a = parentOf(a)) if (a.hasAttribute?.('data-copy-slot')) return a; return null; };
  for (const n of texts) {
    const value = norm(n.nodeValue);
    if (!value || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(n.parentElement?.tagName)) continue;
    const style = getComputedStyle(n.parentElement), range = document.createRange(); range.selectNodeContents(n);
    if (style.display === 'none' || style.visibility === 'hidden' || range.getClientRects().length === 0) continue;
    const el = slotOf(n.parentElement), id = el?.getAttribute('data-copy-slot');
    if (!id || !wanted.has(id)) { errors.push(`unlisted visible copy: ${value.slice(0, 60)}`); continue; }
    used.add(id);
  }
  // authored native strings are displayed or announced copy as well: a button-type input's value, a
  // placeholder, every option label of a select and an aria-label. Each must sit in a copy slot whose approved text
  // contains it; typed or fixture values of text fields are user data and are not matched.
  // the displayed native strings and the accessible name are approved separately; a name identical to a
  // displayed string of the same element is one string (counted once). an option shows its label.
  const shownNative = e => [...new Set([e.tagName === 'INPUT' && ['submit', 'reset', 'button'].includes(e.type) ? e.value : '', /^(INPUT|TEXTAREA)$/.test(e.tagName) ? e.getAttribute('placeholder') : '', ...(e.tagName === 'SELECT' ? [...e.options].map(o => o.label) : [])].map(norm).filter(Boolean))];
  // a name taken by aria-labelledby from a hidden or undisplayed element is announced but never shown,
  // so it is an accessible name to approve (references to displayed text are displayed copy, checked above)
  const hiddenRefName = e => { const ids = norm(e.getAttribute('aria-labelledby')).split(' ').filter(Boolean); if (!ids.length) return ''; const root = e.getRootNode(), refs = ids.map(id => root.getElementById?.(id) ?? document.getElementById(id)).filter(Boolean); return refs.some(r => !r.checkVisibility()) ? norm(refs.map(r => r.textContent).join(' ')) : ''; };
  const nameOf = e => { const n = hiddenRefName(e) || norm(e.getAttribute('aria-label')); return n && !shownNative(e).includes(n) ? n : ''; };
  for (const e of elements) {
    const style = getComputedStyle(e), box = e.getBoundingClientRect();
    if (style.display === 'none' || style.visibility === 'hidden' || !(box.width > 0 && box.height > 0)) continue;
    const el = slotOf(e), id = el?.getAttribute('data-copy-slot');
    for (const value of shownNative(e)) {
      if (!id || !wanted.has(id)) { errors.push(`unlisted native copy: ${value.slice(0, 60)}`); continue; }
      if (!wanted.get(id).includes(value)) { errors.push(`native copy in slot ${id} differs from deck: ${value.slice(0, 60)}`); continue; }
      used.add(id);
    }
    const name = nameOf(e);
    if (!name) continue;
    if (!id || !wanted.has(id)) { errors.push(`unlisted accessible name: ${name.slice(0, 60)}`); continue; }
    // approved as the slot's ariaLabel, or (no ariaLabel declared) contained in its approved displayed text
    if (names.get(id) ? names.get(id) !== name : !wanted.get(id).includes(name)) { errors.push(`accessible name in slot ${id} differs from deck${names.get(id) ? '' : ' (no ariaLabel approved)'}: ${name.slice(0, 60)}`); continue; }
    used.add(id);
  }
  // the slot's displayed text: its text content, else its displayed native strings, else (an icon-only control) its name
  const slotText = e => norm(e.textContent) || shownNative(e).join(' ') || norm(e.getAttribute('aria-label'));
  for (const [id, text] of wanted) {
    const matches = elements.filter(e => e.getAttribute('data-copy-slot') === id);
    if (matches.length !== 1 || slotText(matches[0]) !== text) errors.push(`copy slot ${id} differs from deck`);
    if (!used.has(id)) errors.push(`copy slot ${id} not visible`);
  }
  return { errors, pass: errors.length === 0 };
}
