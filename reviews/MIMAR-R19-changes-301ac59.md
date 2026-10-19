# Mi'mar R19b note: script-only declared states (Mi'mar's tiebreak)

Branch `mimar-r4-fixes`, from 3dabdf9. Last code/package commit: 301ac59. Written Oct 18 2026, about 12:28 PM Gaza (UTC+3). This note follows the R19 record (`reviews/MIMAR-R19-changes-5890da8.md`, now hashed in the registry) and is the latest round record.

Registry: `trust/R3-CHANGES.sha256` sha256 `d9fd58347b9b5cde262abe7f7c82d7a3a451d4751192b66e131e9cdc87ea6730`. Fadel's floors and the threat model unchanged.

## Decision (Mi'mar, 12:01 PM)

A declared NON-default state that only script can reach (its trigger recorded, no JavaScript-off rendering of it) may resolve an axe colour-contrast incomplete on the scripted rendering alone, when that exact element measured at AA for its size, a PASS `wcag-review` record cites the screenshot, and the declaration has `requiresScript: true`. The default state still needs both renderings. A `requiresScript` claim on a state that renders with JavaScript off fails as a mismatch.

## Implementation

- Contract: `requiresScript` must be a boolean; `true` only on a non-default state with a non-empty `trigger`.
- `requiresScriptCheck` (visibility.mjs): the claim is valid when the state is not `default`, the trigger is recorded and the state does not render with JavaScript off. "Renders with JavaScript off" means every element the scripted rendering shows (measured text, by composed path) is also shown in the JavaScript-off rendering.
- A false claim adds a `requiresScript/js-off` integrity mismatch (state or positional page), so the state fails.
- `resolveContrastIncomplete(..., scriptOnly)` uses the scripted measurement for both conditions only when the claim is valid; otherwise unchanged.

## Results

- Chrome test (`R19b` in `tests/panel-r19.test.mjs`): scripted modal with the claim resolves; without the claim, without a trigger, on `default`, below AA (2.8:1) or without a review it stays blocking; a static state with the claim is a false claim.
- Full pre-handoff run on the scripted modal fixture: state PASS, axe incomplete resolved (`requiresScript.valid` true); the undeclared modal stays blocking; the false claim is `requiresScript/js-off`.
- Before/after (`test-results/r19/R19b-*`; before = 3dabdf9): Chrome 6 of 8 before (the R19b test and the contract test fail at their assertions), 8 of 8 after; docs 12 of 13 before, 13 of 13 after; fixture R19b expectations false before, exit 0 after. No load errors.
- Full suites: node 134/134; without deps 76 + 58 SKIPPED; Python 10; r2 4 + 4; package 41 / 36 + 5 SKIPPED; self-test PASS; syntax 0 failures; lint 0 errors; fixture exit 0; Node 20 128 PASS, 6 FAIL (the known Style Dictionary tests).

## Untested

The trigger is recorded, not executed. A script-only state whose JavaScript-off rendering shows the same elements with different text is refused as a false claim. See `release/UNTESTED.md` (R19b).
