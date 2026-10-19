# Panel round 21: merged review (Mi'mar cross-check)

Head: `700297d` (Fadelwahed/fannan, branch mimar-r4-fixes), fresh clone at /workspace/panel-r21/fannan; the clone was left clean.
Scope: `git diff b4747e3..700297d`, reviews/MIMAR-R20-changes-9cfad70.md, release/UNTESTED.md, reviews/panel-r20/MERGED.md.
Path guard: run.sh exits 99 unless every path contains `panel-r21` and the clone is at 700297d. Self-test with the panel-r20 prompt returned 99.
All times are Gaza time (UTC+3), 12-hour clock.

## Participants
| Reviewer | Result | Time | Cost |
|---|---|---|---|
| Grok (tested once) | 402 "usage balance exhausted"; did not run | 2:18:16–2:18:26 PM | none |
| Opus (one free health call) | 403 "Insufficient account balance"; did not run | 2:18:26–2:18:27 PM | $0 |
| GPT-6.1-Sol (read-only, high) | 7 findings: 6 P2 (5 in A, 1 in B) and 1 P3 | 2:18:30–2:24:10 PM (340 s, rc 0) | 97,610 tokens |
| Mi'mar cross-check | Every finding checked in Chrome 155, 3 full gate runs, mutation proof | about 2:19–2:37 PM | box only |

## Re-checks (Mi'mar, scratch clones)
- At 700297d, the panel-r20, panel-r19, width-screen, integrity, handoff-contract and designer-process tests pass **46/46** (out/mimar-tests-after.log).
- **The R20 tests bite.** With the b4747e3 code and documents in place, the same tests fail **14 of 46**. All 14 failures are ERR_ASSERTION; there are 0 load or export errors (out/mimar-tests-before.log).
- Package tests: 42 OK at 700297d. With the b4747e3 package-r3.py, 2 FAIL: the zip contents test and `test_r20_sections`.

## R20 item status
| Item | Status | Mi'mar evidence |
|---|---|---|
| R20-GPT-01 (one clipping rule) | PARTIAL | Undeclared reveals, partial cuts and the card below the edge now fail. But the rule also fails cropped media and decorative overflow (R21-MIMAR-01). It ignores display:none at 320 (R21-GPT-04). Reveals are matched by DOM path alone (R21-GPT-03, P3). |
| R20-MIMAR-01 (320 floor) | PARTIAL | The table and nav cut at 320 now fail. Content hidden with display:none at 320 still passes (R21-GPT-04). |
| R20-GPT-02 (truncation-fade label) | FIXED | Fitting text under a decorative edge fade is graded by pixels: unreadable 1 in Chrome (mimar-repro-r21d.log). This matches Fadel's ruling. |
| R20-GPT-03 (glyph AA measure) | PARTIAL | The 10th-percentile cut and the glyph mask threshold excuse failing glyphs (R21-GPT-02). |
| R20-GPT-04 (text fingerprints) | FIXED, one P3 remains | An inline span split still makes a static state look script-only (R21-GPT-06). |
| R20-GPT-05 (default JS-off baseline) | PARTIAL | The slotted dialog passes. A script-only state that replaces default content stays INCOMPLETE (R21-GPT-05). |
| R20-GPT-06 (screen type) | FIXED, one P3 remains | Settings passes without generic-hero. The wording is not yet aligned everywhere (R21-GPT-07). |

## Findings
| ID | Part | GPT | Mi'mar final | Location | Evidence (Chrome 155 unless noted) | Fix direction |
|---|---|---|---|---|---|---|
| R21-MIMAR-01 (= R21-GPT-01) | A | P2 | **P2 (pre-identified, confirmed)** | width-screen.mjs:19 (`MEDIA` includes img, svg, video, canvas), :45, :74–86, :225 | Each of these fails at 1440 and 320 as "partly clipped": an oversized img cropped by an overflow:hidden frame, an img centred inside a picture, a 1.08 hover-zoom card, a round avatar crop, a cropped video, and a decorative svg that bleeds out of a section. A decorative contentless div (a blob) cropped by its section fails as rule `clip` even though no content is cut. object-fit:cover and CSS background images pass. In the full gate the image crop gives widths false/false and the state fails (mimar-fixture-r21.log). The Arabic real-site 1440 failure (a section cropping an image) is the same case. The same crops also fail with the b4747e3 code, so this was not introduced by R20; it is P2 under Fadel's ruling. A marquee still fails ("partly clipped" text), which is correct per WCAG 2.2.2. | Apply the partial-cut, lost-at-width and reveal rules to text and controls only (text nodes, input/select/textarea/button, links). Never fail img, picture, video, svg or canvas crops. Never fail an overflow:hidden box whose cut set is empty or only media and decoration. Keep iframe, object and embed as unscanned content. Add positive regressions for every crop above, plus object-fit and backgrounds. Keep the negative text, control and marquee cases. |
| R21-MIMAR-02 | A | (missed) | **P2 (new; the gate is wrong, not the site)** | width-screen.mjs:44 (`shown` has no `checkVisibility`), the offscreenLeft check (ARGON-R5-05) | **The Arabic real site is not buggy.** At 320 the five links (المنتجات, طريقة عملنا, حماية البيانات, تواصل معنا, اطلب عرضاً تجريبياً) sit inside a **closed** `<details class="mnav">` mobile menu. Chrome does not render that content (elementFromPoint returns the page image, not the link). The gate still reads a layout rect at left −134 px and reports offscreenLeft 5. Opening the menu puts every link at 20–300 px, fully on screen, in both languages (mimar-site-r21.log, mimar-site-r21b.log, site-ar-320.png, site-ar-320-open.png). English passes only because its links overflow to the right, which this check does not screen. The same failure happens with the b4747e3 code. A details-based menu in RTL is an ordinary honest pattern, so this is a P2 false positive. visibility.mjs already treats closed details as not rendered; width-screen does not. | In width-screen's `shown`, require `el.checkVisibility()` (content-visibility and closed details), matching visibility.mjs. Add an RTL regression for a closed details menu at 320, and an open one that is truly cut, which must still fail. **For the website team:** nothing to fix for the 320 report; it is a gate false positive. |
| R21-GPT-02 | A | P2 | **P2 (agreed)** | visibility.mjs:452–470 (`GLYPH`: inkDelta 24, best pixel per cluster, 10th percentile) | White 28 px caption over a dark image (#222). With a #c8c8c8 patch under the first word only, that word measures **1.67:1** (`min`), yet the result is **ratio 15.91** and the text passes. With the patch under two words or more, the ratio drops to 1.67 (mimar-repro-r21c.log). With a #e8e8e8 patch, the glyphs on the patch differ by less than 24 per channel, drop out of the mask entirely, and the caption measures 15.91 with `min` 15.91 (mimar-repro-r21b.log). A caption crossing a light area of a photo is ordinary. With a citing wcag-review, the resolver would clear the axe incomplete. | Build the glyph mask from coverage independent of contrast: use a transparent rendering versus a solid opposite-colour rendering, not a delta threshold. Require AA for every glyph cluster (minimum, not a percentile), excluding only the anti-aliased edge. When coverage is uncertain, keep the result INCOMPLETE. Add regressions for one word on a light patch and for a near-background patch. |
| R21-GPT-03 | A | P2 | **P3 (downgraded)** | width-screen.mjs:245 (path-only `shownAt1440.includes`) | Confirmed: an expanded state page that adds a wrapper div gets "reveal unresolved". An unrelated sentence at the same path "reveals" the answer (pass true). Both need the state page's markup to differ structurally from the default page, which is unusual for a generated state page. The false positive is visible and the author can fix it. | Match reveals by normalised text, or by slot identity plus text. Use paths only as locators. Batch with the P3s. |
| R21-GPT-04 | A | P2 | **P2 (agreed)** | width-screen.mjs:44, :225; design-quality.md:23 | A form whose Subscribe button and terms paragraph are `display:none` below 600 px passes at 1440 and 320, with 0 clips (mimar-repro-r21b.log). Content and functionality are lost at 320, which breaks Fadel's 320 floor and WCAG 1.4.10. This is an ordinary responsive-CSS mistake. | Compare text and control identity (normalised text and role) at every width against the 1440 set. A loss fails unless an equivalent is reachable at that width: the same text or the same control name, including inside a declared menu-open reveal state. Add regressions for a hidden CTA (fails) and for nav moved into a menu with a declared open state (passes). |
| R21-GPT-05 | A | P2 | **P2 (agreed)** | integrity.mjs:273–275 | Full gate: a valid `requiresScript` state whose script replaces the default `description` slot with an approved `results-note` slot placed in that state. The state is **INCOMPLETE (content/js-off)**, and `stateOnly` lists results-note (mimar-fixture-r21.log). Script-rendered results or panels that replace default content are ordinary in app screens. | **Tiebreak (Mi'mar):** keep N14 for the default state and for content shared by both states. Compare only the slots the scripted state still shows against the baseline. A default slot that the state removes is allowed only when the copy deck does not place it in that state. Unplaced removals and changes to shared copy stay INCOMPLETE. Add a full-gate replacement regression. |
| R21-GPT-06 | A | P3 | **P3 (agreed)** | visibility.mjs:510 | Confirmed: after `Static <span>state</span> text`, the claim is `valid:true` with onlyScripted 3. Harm needs an unusual combination. | Compare normalised token streams per block. |
| R21-GPT-07 | B | P2 | **P3 (downgraded)** | critic-rubric.md:14, :30; design-quality.md:71; handoff-contract.md:35 | The wording is not aligned between the type-scoped generic-hero rule and the unscoped copy-truth row and critic question. A transferable headline on any screen is still failed by `copy-truth`, which is not type-scoped, so promotional copy on a "functional" signup form is still reviewed. "Settings" names a task and passes copy-truth. This is wording polish, not a missing practice. | Add GPT's sentence to handoff-contract.md:35, scoping the functional type to task screens without promotional hero copy, and align rubric :14 and design-quality :71. |

## Pre-identified item and owner rulings
- **Fadel's tiebreak confirmed in code and Chrome:** rule (3) is applied to images and media, so this is filed as **R21-MIMAR-01 (P2)**. GPT reached the same conclusion from the source.
- Marquee (partly cut moving text, no declared paused state): it fails, which is correct per WCAG 2.2.2. Not filed.
- Fitting text under a decorative fade: graded by pixels, which is correct. Not filed.
- A "read more" clamp (partly cut text) also fails, even with an expanded state declared, because partial cuts always fail. This follows from the same ruling and the no-cut-copy rule. Not filed; noted only.

## Arabic real site (for the website team)
The served build (/workspace/site/astro7-test/dist-astro5-baseline, run on 127.0.0.1:8931 under my own server PID, since stopped) has two Arabic 320 px reports. Neither is a site bug:
1. **"Five links 134 px past the left edge"** is a gate false positive. The links are in the closed mobile-menu `<details>`, which is not rendered. When the menu is opened, all five are on screen at 20–300 px.
2. **The section image crop at 1440** is intentional image cropping. It is not clipped content (R21-MIMAR-01).

No report is needed for the website team. The site was not changed.

## Tiebreaks (Mi'mar, final)
- R21-GPT-03 → P3: it needs structurally divergent state pages, and the failure is visible and fixable by the author.
- R21-GPT-07 → P3: copy-truth still covers promotional copy on every screen type.
- R21-MIMAR-02 is filed as its own item. It is a false positive on a real honest page.
- R21-GPT-05 fix: N14 is kept. Only removals that the copy deck explains are allowed.

## Verdict
**NOT CONVERGED: 5 P2, all in Part A (R21-MIMAR-01/GPT-01, R21-MIMAR-02, R21-GPT-02, R21-GPT-04, R21-GPT-05). Part B has 0 P2. 3 P3 (R21-GPT-03, R21-GPT-06, R21-GPT-07).** No P0 or P1.

## Untested
- R21-GPT-02 through the full gate with a citing wcag-review. Only the glyph measure was run in Chrome.
- R21-GPT-04 and R21-MIMAR-02 in a full gate run. Only the width screen was run in Chrome.
- iframe, object and canvas crops, and clip-path crops of images.
- Opus and Grok did not take part (403 and 402). These fixes had a GPT review only.
