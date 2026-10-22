// one discipline for every reviewed exception. An item found on a page carries its
// scope (screen, state, lang). It is resolved only by a handoff entry with the same scope and element id, a non-empty
// reason and a reviewer who holds an allowed role. Identical repeats collapse; every other occurrence is kept, and an
// id that names different elements within one scope is never resolved. Unresolved items block the final handoff
// (recorded as DEFERRED in the wireframe phase). No count caps.
export const scopeOf = st => ({ screen: st?.screen ?? null, state: st?.state ?? null, lang: st?.lang ?? null });
const sameScope = (a, b) => a.screen === b.screen && a.state === b.state && a.lang === b.lang;
const nonempty = x => typeof x === 'string' && !!x.trim();

export function resolveScoped({ items, entries, roles, phase = 'handoff', what, shape = item => item.element }) {
  const allowed = roles.filter(nonempty);
  const list = Array.isArray(entries) ? entries : [];
  const seen = new Map();
  for (const item of items) { const key = JSON.stringify(item); if (!seen.has(key)) seen.set(key, item); }
  const kept = [...seen.values()];
  const recorded = kept.map(item => {
    const clash = item.id && kept.some(o => o !== item && o.id === item.id && sameScope(o, item) && shape(o) !== shape(item));
    const entry = item.id ? list.find(x => x?.id === item.id && sameScope(scopeOf(x), item)) : null;
    const why = item.screen === null ? `${what} has no declared screen/state scope` : !item.id ? `${what} has no element id to resolve` : clash ? `id ${item.id} names different elements in this scope` : !item.reason ? `${what} reason on the page is blank` : !entry ? `no ${what} entry for this id, screen, state and lang` : !nonempty(entry.reason) ? `${what} entry has no reason` : !allowed.includes(entry.reviewer) ? `${what} reviewer is not ${allowed.length ? allowed.join(' or ') : 'a declared role'}` : null;
    return { ...item, resolved: !why, decision: entry && !why ? { reason: entry.reason.trim(), reviewer: entry.reviewer } : null, unresolvedBecause: why };
  });
  const unresolved = recorded.filter(x => !x.resolved).length;
  return { items: recorded, unresolved, status: phase === 'wireframe' ? 'DEFERRED' : unresolved ? 'FAIL' : 'PASS', pass: phase === 'wireframe' || unresolved === 0 };
}
