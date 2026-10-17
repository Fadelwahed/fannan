// Bounded copy flags; the required human critic handles meaning in every language.
const en = /\b(unlock|seamless|empower|cutting[ -]edge|revolutionary|game[ -]changing)\b/i;
const ar = /(?:^|[^\p{L}\p{N}])(?:أطلق\s+العنان|اطلق\s+العنان|بلا\s+حدود|بسلاسة|ثوري(?:ة|ا)?)(?=$|[^\p{L}\p{N}])/u;
const clean = text => (text || '').normalize('NFKC').replace(/[\u0640\u064b-\u065f]/g, '');
export function copySignals(text, headlines = []) {
  const value = clean(text);
  const filler = en.test(value) || ar.test(value);
  const ruleOfThree = headlines.some(line => {
    const parts = clean(line).split(/\s*[.!؟،,;؛]\s*|\s+(?:and|و)\s+|\s+و(?=[\p{L}])/iu).map(x => x.trim()).filter(Boolean);
    return parts.length === 3 && parts.every(x => x.split(/\s+/).length <= 4);
  });
  return { filler, ruleOfThree };
}
