// the axe tag set for the WCAG 2.2 AA floor. axe tags each rule only with the WCAG version that
// introduced its success criterion, so every version needs its A and its AA tag: in axe-core 4.14.0,
// label-content-name-mismatch (SC 2.5.3 Label in Name, Level A) carries wcag21a only. wcag22a has no rules in 4.14.0
// and is listed so a later axe version cannot silently drop a 2.2 Level A rule. Experimental rules stay off (axe
// marks them as unreliable); their criteria remain part of the manual WCAG review.
export const AXE_TAGS = Object.freeze(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa']);
export const axeOptions = () => ({ runOnly: { type: 'tag', values: [...AXE_TAGS] }, rules: { 'target-size': { enabled: true } } });
