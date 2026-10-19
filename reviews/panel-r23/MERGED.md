# Panel round 23: merged review (Mi'mar cross-check)

- **Head:** `eeeb371` (Fadelwahed/fannan, branch mimar-r4-fixes), fresh clone at /workspace/panel-r23/fannan, left clean.
- **Scope:** `git diff d9e1049..eeeb371`, reviews/MIMAR-R22-changes-698734d.md, release/UNTESTED.md, reviews/panel-r22/MERGED.md.
- **Path guard:** run.sh exits 99 unless every path contains `panel-r23` and the clone is at eeeb371. Self-test with the panel-r22 prompt: rc 99.
- **Times:** Gaza time (UTC+3), 12-hour clock. The run took 5:43 PM to about 6:00 PM.

## Anchored verify (run first)
Command: `python3 -B scripts/package-r3.py verify --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3 --registry-sha256 cb7a044d7e863c79811ac1c7dc27ce0e6d423154d40df7238da745be3ac2bb6d`

- **Result: PASS** (rc 0), registryPin "external", 5:43:45 PM.
- The `--start` value comes from release/PACKAGING.md. I ran `chmod 0444` on both trust files first, as that file documents; git status stays clean.
- `sha256(trust/R3-CHANGES.sha256)` equals the given digest.

## Participants
| Reviewer | Result | Time | Cost |
|---|---|---|---|
| Grok (tested once) | 402 "usage balance exhausted"; did not run | 5:44:08–5:44:18 PM | none |
| Opus (one free health call) | 403 "Insufficient account balance"; did not run | 5:44:18–5:44:19 PM | $0 |
| GPT-6.1-Sol (read-only, high) | 5 findings, all P2, all Part A | 5:44:19–5:55:52 PM (693 s, rc 0; the box was heavily loaded) | 183,580 tokens |
| Mi'mar cross-check | Checked every finding in Chrome 155, plus the mutation proof | about 5:45–6:00 PM | box only |

## Re-checks
**Tests at eeeb371.** Suites: panel-r22, r21, r20, r19, width-screen, integrity, handoff-contract, designer-process.
- First parallel run: 62/64. The two failures were TimeoutErrors under load average 35, in tests 27 (R19 veil) and 48 (R22 zones).
- Run alone, both pass, so the result is **64/64**.

**The R22 tests bite.** With the d9e1049 code and documents:
- **9 of 64 fail, all ERR_ASSERTION, 0 load errors.**
- These are the R22 docs test; R19-MIMAR-01 and R19b (expectations updated for zone a); and R22 tests 48–53.
- In the first parallel run, test 27 failed only on a timeout; run alone it passes.

**Package tests:** 42 OK. With the d9e1049 package-r3.py, 2 FAIL: the zip contents test and `test_r22_sections`.

**My R22 repro pages, rerun on eeeb371 in Chrome:**
- 70% opacity caption: 7.93.
- Thin letters on a light patch: 1.25 at 12 and 14 px.
- Cropped video with fallback text: passes.
- Icon link, button under a same-word heading, and aria-labelledby checkbox, each hidden at 320: all fail.
- Clamp that omits a paragraph: fails.
- "Request a demo" shortened to "Demo": passes.
- Wordmark link left with no name: still fails, correctly.
- Small #767676 text: measures 4.54, which is zone c.
- Animated backgrounds (panning or colour-shifting), with or without reduced motion: stable measures (12.01 and 14.52).

**Owner-decided, not findings:**
- The under-letter shadow caption measures **2.52:1** and fails. That is correct.
- A heading reworded between widths fails as lost text. That is correct.

## R22 item status
| Item | Status |
|---|---|
| R22-GPT-01 (opacity coverage) | FIXED |
| R22-GPT-02 (thin letters kept) | FIXED |
| R22-GPT-03 (media fallback) | FIXED |
| R22-GPT-04 (links and widgets as content) | PARTIAL: some widget roles are missing (R23-GPT-04) and a control's box replaces its text geometry (R23-GPT-03) |
| R22-GPT-05 (typed prints) | FIXED |
| R22-GPT-06 (read-more must show every item) | PARTIAL: a control cut wholly by a clamp is excused (R23-GPT-05) |
| R22-GPT-07 and R22-GPT-08 (docs) | FIXED |
| R22-MIMAR-01 (halo kept in the background shot) | FIXED |
| R22-MIMAR-02 (shortened labels) | PARTIAL: the prefix match pairs different actions, and moves between roles fail (R23-GPT-02) |
| Three-zone rule | PARTIAL: an unmeasured glyph cannot be resolved by review (R23-GPT-01, P3) |

## Findings
| ID | Part | GPT | Mi'mar final | Location | Evidence (Chrome 155 / in-memory) | Fix direction |
|---|---|---|---|---|---|---|
| R23-GPT-02 | A | P2 | **P2 (agreed)** | width-screen.mjs:229, 296, 330 | **Miss:** a toolbar has Save and "Save as"; "Save as" is hidden at 320 and the page passes, because "Save" is a word prefix of "Save as". The same happens with "Cancel subscription" next to "Cancel", and "Compare all plans" next to "Compare". **False positive:** "Export report" moves from a toolbar button into a declared overflow-menu state as `menuitem`, and the page fails as `button:Export report` lost. If it stays a button in the menu, it passes. Moving toolbar actions into a "More" menu is an ordinary responsive pattern. | Apply the prefix match only to the same element (same composed path, or the same control identity at that width), never to another existing control. Treat button, link and menuitem as one "action" family when matching across a declared state. Add regressions for Save/"Save as" (must fail) and for Export moving to a menuitem (must pass). |
| R23-GPT-03 | A | P2 | **P2 (agreed; a regression)** | width-screen.mjs:45, 117 | A link whose nowrap label "Download the annual report" overflows a 100 px `overflow:hidden` wrapper passes at 1440 and 320. It is recorded as a **media crop** (mediaCrops 1), and the text cut is not reported. GPT reports that d9e1049 recorded this as a partial text clip. Labels overflowing fixed-width buttons or links are an ordinary mistake. | Measure a control's box **and** its rendered text ranges, and fail on cut label text. Keep the exemption for crops that are only media. Add the overflowing-label regression. |
| R23-GPT-04 | A | P2 | **P2 (agreed)** | width-screen.mjs:24, 57 (`CONTROLS`) | A custom `role="slider"` named "Volume", hidden below 600 px, passes at 320 with nothing recorded as lost. The list also lacks spinbutton, listbox, option, treeitem, menuitemcheckbox and menuitemradio, which design-system widgets use routinely. | Cover all ARIA widget roles with the same box and name rule. Add a regression for the hidden slider. |
| R23-GPT-05 | A | P2 | **P2 (agreed)** | width-screen.mjs:294, 322 | A two-line clamp ends exactly on a line boundary, so its Download button is cut wholly (whole=control, partial 0). It is classified `reveal` and passes once the expanded state shows the button. Fadel's rule is that a control inside a clamp is never excused. | Before classifying a cut as truncated or reveal, a line-clamp or ellipsis box whose cut set (whole or partial) contains a control fails. Keep ordinary accordion reveals (no clamp). |
| R23-GPT-01 | A | P2 | **P3 (downgraded)** | visibility.mjs:450 | Confirmed in memory: a citing PASS review with worstRegion still leaves glyph results (null, 8) and (null, null) unresolved, while (4, 4) in zone c resolves. That contradicts the owner's zone (c) wording ("or unmeasured"). It fails closed, and none of my honest Chrome pages produced an unmeasured glyph (hairline weight 100: 10.69; 9 px credit: 10.69; emoji-led text: 10.69). So the harm needs an unusual page. | Route an unmeasured glyph through the zone (c) review checks. A measured value below 2.85 in either rendering still fails. Add resolver regressions. Batch. |
| R23-MIMAR-01 | A | (part of GPT-02) | **P3** | width-screen.mjs:229 | Separate controls whose names happen to share a first word ("Cancel subscription" and "Cancel"; "Compare all plans" and "Compare") mask each other's loss. This is covered by the GPT-02 fix and listed only for the regression set. | Same fix as GPT-02. |

## Tiebreaks (Mi'mar, final)
- **R23-GPT-01 → P3:** it fails closed and no ordinary honest page reaches it. The fix still follows Fadel's zone (c) wording.
- **R23-GPT-04 stays P2:** custom listbox and slider widgets are ordinary in design systems, and the fix only completes a list.
- **R23-GPT-05 stays P2:** it breaks Fadel's explicit read-more rule.

## Verdict
**NOT CONVERGED: 4 P2, all in Part A** (R23-GPT-02, R23-GPT-03, R23-GPT-04, R23-GPT-05). **0 in Part B. 2 P3** (R23-GPT-01, R23-MIMAR-01). No P0 or P1.

## Untested
- These were checked with Chrome probes and the resolver only, not a full gate run: GPT-02, GPT-03, GPT-04 and GPT-05.
- GPT-01 was checked on the resolver only; I found no honest page that produces an unmeasured glyph.
- Opus and Grok did not take part.
